// knexfile.js
require('dotenv').config({ path: './.env.local' });

module.exports = {
    // --- Development Environment ---
    // Used when you run your app locally with PostgreSQL
    development: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        },
        migrations: {
            directory: './migrations'
        },
        seeds: {
            directory: './seeds'
        },
        pool: {
            min: 2,
            max: 10
        },
        debug: process.env.NODE_ENV === 'development'
    },

    // --- Production Environment ---
    // Used by Vercel when you deploy with PostgreSQL
    production: {
        client: 'pg',
        connection: process.env.DATABASE_URL,
        // SSL is required for connecting to Supabase from a cloud environment like Vercel
        ssl: { rejectUnauthorized: false },
        // The connection pool is managed by Supabase's PgBouncer, 
        // so we use a minimal pool config on the client-side.
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: './migrations'
        },
        seeds: {
            directory: './seeds'
        }
    }
};