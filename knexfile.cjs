// knexfile.js
require('dotenv').config({ path: './.env.local' });

// This is the base configuration that will be shared
const baseConfig = {
    client: 'pg', // Changed from 'mysql2' to 'pg' for PostgreSQL
    migrations: {
        directory: './migrations'
    },
    seeds: {
        directory: './seeds'
    }
};

module.exports = {
    // --- Development Environment ---
    // Used when you run your app locally
    development: {
        ...baseConfig,
        connection: process.env.DATABASE_URL, // Reads the connection string from your .env.local file
    },

    // --- Production Environment ---
    // Used by Vercel when you deploy
    production: {
        ...baseConfig,
        connection: process.env.DATABASE_URL,
        // SSL is required for connecting to Supabase from a cloud environment like Vercel
        ssl: { rejectUnauthorized: false },
        // The connection pool is managed by Supabase's PgBouncer, 
        // so we use a minimal pool config on the client-side.
        pool: {
            min: 2,
            max: 10
        }
    }
};