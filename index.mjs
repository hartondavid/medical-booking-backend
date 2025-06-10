// app.js

import express from "express"
import dotenv from 'dotenv'
import apiRouter from './src/routes/apiRoute.mjs'
import cors from 'cors'
import db from "./src/utils/database.mjs";

import http from 'http';

const app = express();


dotenv.config()

app.set('trust proxy', true);

app.use(cors({
    origin: '*', // Allow any origin
    exposedHeaders: ['X-Auth-Token', 'X-Message', 'Content-Disposition'], // Expose the custom header

}));
// Serve static files from the 'public' directory
app.use(express.static('public'));

// Middleware to parse x-www-form-urlencoded data
app.use(express.urlencoded({ extended: true }));

// Other middlewares
app.use(express.json());

app.use('/api/', apiRouter)

const port = process.env.SOCKET_PORT || 3001;
const server = http.createServer(app);
// const io = createSocketServer(server);
// server.listen(port, () => {
//     console.log(`SOCKET is running on port ${port}`);
// });

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
});

app.get('/health', async (req, res) => {
    let dbConnection;
    try {
        // Running a simple query to check connection
        await db.raw('SELECT 1+1 AS result');
        dbConnection = "OK";
    } catch (error) {
        console.log("ERROR: ", error)
        dbConnection = false;
    }

    return res.status(200).json({
        status: 'UP',
        uptime: process.uptime(),
        timestamp: Date.now(),
        db_connection: dbConnection
    });
})

export default app;