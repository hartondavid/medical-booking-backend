import { Router } from "express";
import db from "../utils/database.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";

const router = Router();

const SLOT_MS = 30 * 60 * 1000;
const ACTIVE_STATUSES = ["pending", "confirmed"];
/** Aceste statusuri nu ocupă slotul pentru programări noi (răspuns pozitiv când utilizatorul întreabă de disponibilitate). */
const NON_BLOCKING_STATUSES = ["rejected", "finished"];
const DAYS_AHEAD = 7;
const MAX_FREE_SLOTS_PER_DOCTOR = 24;

function getCloudflareConfig() {
    return {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: process.env.CLOUDFLARE_API_TOKEN,
        model: process.env.CLOUDFLARE_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct"
    };
}

/** După fiecare mesaj. Număr din CLINIC_BOOKING_PHONE; dacă lipsește, se folosește X ca placeholder. */
function getBookingCtaFooter() {
    const phone = (process.env.CLINIC_BOOKING_PHONE ?? "").trim();
    const display = phone || "X";
    return `Vă rugăm să sunați la numărul de telefon ${display}.`;
}

/** Ore clinică pe grila UTC (aceeași convenție ca la rezervări). Ultimul slot începe la closeHour:00 − 30 min. */
function getClinicHoursUtc() {
    const open = Number.parseInt(process.env.CLINIC_OPEN_HOUR_UTC ?? "8", 10);
    const close = Number.parseInt(process.env.CLINIC_CLOSE_HOUR_UTC ?? "18", 10);
    const safeOpen = Number.isFinite(open) ? Math.min(23, Math.max(0, open)) : 8;
    const safeClose = Number.isFinite(close) ? Math.min(24, Math.max(0, close)) : 18;
    return { openHour: safeOpen, closeHour: Math.max(safeOpen + 1, safeClose) };
}

function bucketSlotStartUtc(ts) {
    return Math.floor(ts / SLOT_MS) * SLOT_MS;
}

/** Generează toate începuturile de slot de 30 min într-o zi UTC între open și close (ex. 8–18 → până la 17:30). */
function generateDaySlotsUtc(dayStartUtc, openHour, closeHour, now) {
    const slots = [];
    const openMinutes = openHour * 60;
    const closeMinutes = closeHour * 60;
    for (let startMin = openMinutes; startMin + 30 <= closeMinutes; startMin += 30) {
        const h = Math.floor(startMin / 60);
        const m = startMin % 60;
        const slot = new Date(
            Date.UTC(
                dayStartUtc.getUTCFullYear(),
                dayStartUtc.getUTCMonth(),
                dayStartUtc.getUTCDate(),
                h,
                m,
                0,
                0
            )
        );
        if (slot.getTime() > now.getTime()) {
            slots.push(slot);
        }
    }
    return slots;
}

/**
 * Pentru fiecare medic, set de momente UTC (bucket 30 min) ocupate de rezervări active.
 */
async function loadOccupiedSlotsByDoctor(knex, doctorIds, fromUtc, toUtc) {
    const rows = await knex("reservations")
        .whereIn("doctor_id", doctorIds)
        .where("date", ">=", fromUtc.toISOString().slice(0, 19).replace("T", " "))
        .where("date", "<=", toUtc.toISOString().slice(0, 19).replace("T", " "))
        .whereIn("status", ACTIVE_STATUSES)
        .select("doctor_id", "date");

    const map = new Map();
    for (const id of doctorIds) {
        map.set(id, new Set());
    }
    for (const row of rows) {
        const d = new Date(row.date);
        if (Number.isNaN(d.getTime())) continue;
        const key = bucketSlotStartUtc(d.getTime());
        const set = map.get(row.doctor_id);
        if (set) set.add(key);
    }
    return map;
}

async function getClinicAvailabilitySnapshot() {
    const knex = await db.getKnex();
    const now = new Date();
    const { openHour, closeHour } = getClinicHoursUtc();
    const horizon = new Date(now);
    horizon.setUTCDate(horizon.getUTCDate() + DAYS_AHEAD);

    const doctors = await knex("users")
        .join("user_rights", "users.id", "user_rights.user_id")
        .join("rights", "user_rights.right_id", "rights.id")
        .where("rights.right_code", 1)
        .select("users.id", "users.name", "users.specialization");

    if (!doctors.length) {
        return {
            slotLengthMinutes: 30,
            clinicHoursUtc: { openHour, closeHour },
            doctors: [],
            availabilityByDoctor: [],
            responseTone: { overall: "negative", reason: "no_doctors" },
            statusPolicy: {
                blocksSlotForNewBooking: ACTIVE_STATUSES,
                doesNotBlockSlot: NON_BLOCKING_STATUSES
            },
            summary: "No doctors are configured in the system yet."
        };
    }

    const doctorIds = doctors.map((d) => d.id);
    const day0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const occupiedByDoctor = await loadOccupiedSlotsByDoctor(knex, doctorIds, now, horizon);

    const availabilityByDoctor = doctors.map((doctor) => {
        const occupied = occupiedByDoctor.get(doctor.id) || new Set();
        const freeSlots30Min = [];

        for (let dayOffset = 0; dayOffset < DAYS_AHEAD; dayOffset++) {
            const dayStart = new Date(day0);
            dayStart.setUTCDate(dayStart.getUTCDate() + dayOffset);
            const daySlots = generateDaySlotsUtc(dayStart, openHour, closeHour, now);
            for (const slot of daySlots) {
                const bucket = bucketSlotStartUtc(slot.getTime());
                if (!occupied.has(bucket)) {
                    freeSlots30Min.push({
                        startUtc: slot.toISOString(),
                        labelUtc: slot.toISOString().slice(0, 16).replace("T", " ") + " UTC"
                    });
                    if (freeSlots30Min.length >= MAX_FREE_SLOTS_PER_DOCTOR) break;
                }
            }
            if (freeSlots30Min.length >= MAX_FREE_SLOTS_PER_DOCTOR) break;
        }

        const hasAvailableFreeSlot = freeSlots30Min.length > 0;
        return {
            id: doctor.id,
            name: doctor.name,
            specialization: doctor.specialization || "General",
            hasAvailableInterval30Min: hasAvailableFreeSlot,
            freeSlots30MinCount: freeSlots30Min.length,
            freeSlots30Min
        };
    });

    const withSlots = availabilityByDoctor.filter((d) => d.hasAvailableInterval30Min);
    const withoutSlots = availabilityByDoctor.filter((d) => !d.hasAvailableInterval30Min);
    const hasAnyFreeSlot = withSlots.length > 0;

    const responseTone = {
        overall: hasAnyFreeSlot ? "positive" : "negative",
        reason: hasAnyFreeSlot ? "free_30min_slots_exist" : "no_free_slots_in_window",
        rules: [
            "NEGATIVE / unavailable tone when: (a) there is no free 30-minute slot in the data for the doctor/window asked, OR (b) the user refers to an appointment whose status is pending or confirmed (slot is taken).",
            "POSITIVE / helpful tone when: (a) freeSlots30Min lists at least one slot for the relevant doctor, OR (b) the user refers to an appointment whose status is rejected or finished (completed) — that slot is not blocking a new booking; answer encouragingly."
        ]
    };

    const statusPolicy = {
        blocksSlotForNewBooking: ACTIVE_STATUSES,
        doesNotBlockSlot: NON_BLOCKING_STATUSES,
        note: "pending and confirmed block the 30-minute slot. rejected and finished do not block it."
    };

    let summary;
    if (withSlots.length === 0) {
        summary =
            `Nu s-a gasit niciun slot disponibil de 30 de minute in urmatoarele ${DAYS_AHEAD} zile intre ${openHour}:00–${closeHour}:00 UTC (toate doctorii listati apar complet rezervati in aceasta perioada).`;
    } else {
        const names = withSlots.map((d) => d.name).slice(0, 5);
        summary = `Exista cel putin un slot disponibil de 30 de minute pentru: ${names.join(", ")}${withSlots.length > 5 ? ` (+${withSlots.length - 5} mai mult)` : ""}. Rezervarile se fac in intervale de 30 de minute.`;
        if (withoutSlots.length) {
            summary += ` Unii doctori nu au slot disponibil in aceasta perioada: ${withoutSlots.map((d) => d.name).join(", ")}.`;
        }
    }

    return {
        slotLengthMinutes: 30,
        clinicHoursUtc: { openHour, closeHour, note: "Slots are generated on a 30-minute grid in UTC; match reservation rules." },
        responseTone,
        statusPolicy,
        doctors: availabilityByDoctor.map(({ freeSlots30Min, ...rest }) => ({
            ...rest,
            freeSlots30MinPreview: freeSlots30Min.slice(0, 8)
        })),
        availabilityByDoctor,
        summary
    };
}

async function callWorkersAi({ userMessage, availability }) {
    const { accountId, apiToken, model } = getCloudflareConfig();

    if (!accountId || !apiToken) {
        throw new Error("Cloudflare Workers AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.");
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const systemPrompt =
        "You are a helpful clinic assistant. Appointments are only in 30-minute slots. " +
        "Follow responseTone.overall from the JSON: use a POSITIVE, encouraging tone when it is \"positive\"; use a NEGATIVE, honest tone (apologetic, clear that no slot is available) when it is \"negative\". " +
        "Status rules (statusPolicy): pending and confirmed mean the slot is taken — tell the user they cannot book that interval (negative message). " +
        "rejected or finished (completed) mean the slot is NOT blocked for new bookings — answer with a POSITIVE, reassuring tone about booking another time. " +
        "The JSON includes precomputed freeSlots30Min per doctor: each entry is an available 30-minute interval (startUtc). " +
        "If hasAvailableInterval30Min is true for a doctor, there exists at least one free 30-minute slot in the computed window. " +
        "Only suggest times that appear in freeSlots30Min (or freeSlots30MinPreview). If none are listed for a doctor, say they have no free slot in the current search window. " +
        "Be concise and practical. Respond in the same language as the user when possible. " +
        "Do not ask the user to call a phone number at the end — the system appends that line automatically.";

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "system",
                    content: `Clinic availability (30-minute slots, UTC): ${JSON.stringify(availability)}`
                },
                { role: "user", content: userMessage }
            ]
        })
    });

    const data = await response.json();
    if (!response.ok || !data?.success) {
        const errorMessage = data?.errors?.[0]?.message || data?.result?.error || "Workers AI request failed";
        throw new Error(errorMessage);
    }

    const text =
        data?.result?.response ||
        data?.result?.output_text ||
        (Array.isArray(data?.result?.messages)
            ? data.result.messages.find((message) => message.role === "assistant")?.content
            : null);

    if (!text) {
        throw new Error("Workers AI returned an empty response.");
    }

    return text;
}

router.post("/chat", async (req, res) => {
    try {
        const { message } = req.body || {};
        const userMessage = typeof message === "string" ? message.trim() : "";

        if (!userMessage) {
            return sendJsonResponse(res, false, 400, "Message is required", []);
        }

        const availability = await getClinicAvailabilitySnapshot();
        const assistantReply = await callWorkersAi({ userMessage, availability });
        const bookingCtaFooter = getBookingCtaFooter();

        return sendJsonResponse(res, true, 200, "Assistant reply generated", {
            reply: assistantReply.trim(),
            bookingCtaFooter,
            availabilitySummary: availability.summary,
            responseTone: availability.responseTone,
            statusPolicy: availability.statusPolicy,
            slotLengthMinutes: availability.slotLengthMinutes,
            clinicHoursUtc: availability.clinicHoursUtc,
            availabilityByDoctor: availability.availabilityByDoctor.map((d) => ({
                id: d.id,
                name: d.name,
                specialization: d.specialization,
                hasAvailableInterval30Min: d.hasAvailableInterval30Min,
                freeSlots30Min: d.freeSlots30Min
            }))
        });
    } catch (error) {
        console.error("Assistant chat error:", error);
        return sendJsonResponse(res, false, 500, error.message || "Could not generate assistant reply", []);
    }
});

export default router;
