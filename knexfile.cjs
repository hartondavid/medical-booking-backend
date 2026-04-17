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
        // SSL is required for connecting to Neon from Vercel
        ssl: { rejectUnauthorized: false },
        // Connection pool configuration for Neon
        pool: {
            min: 1,
            max: 5,

        }
    }
};