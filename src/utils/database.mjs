import knex from 'knex';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const knexConfig = require('../../knexfile.cjs');

class DatabaseManager {
    constructor() {
        this.knex = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            if (!this.knex) {
                console.log('🔌 Connecting to database...');

                // Select the correct environment configuration
                const environment = process.env.NODE_ENV || 'development';
                const config = knexConfig[environment];

                // Validate environment variables for development
                if (environment === 'development') {
                    const hasUrl = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
                    const hasDbVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].every(
                        (key) => process.env[key]
                    );
                    const hasPgVars = !!(
                        process.env.PGHOST &&
                        process.env.PGUSER &&
                        process.env.PGPASSWORD !== undefined &&
                        process.env.PGDATABASE
                    );
                    const knexConfigConn = config.connection;
                    const hasKnexConnection =
                        (typeof knexConfigConn === 'string' && knexConfigConn.length > 0) ||
                        (knexConfigConn &&
                            typeof knexConfigConn === 'object' &&
                            knexConfigConn.host &&
                            knexConfigConn.user &&
                            knexConfigConn.database);

                    if (!hasUrl && !hasDbVars && !hasPgVars && !hasKnexConnection) {
                        throw new Error(
                            'Missing database config: set POSTGRES_URL or DATABASE_URL, or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME (and DB_PORT), or PGHOST/PGUSER/PGPASSWORD/PGDATABASE in .env.local.'
                        );
                    }
                }

                console.log('📊 Database config:', {
                    environment,
                    connection: config.connection
                });

                this.knex = knex(config);

                // Test the connection
                await this.knex.raw('SELECT 1');
                this.isConnected = true;
                console.log('✅ Database connected successfully');

                // Check if database exists (PostgreSQL)
                try {
                    const currentDb = await this.knex.raw('SELECT current_database() as current_db');
                    console.log('🎯 Current database:', currentDb.rows[0].current_db);
                } catch (dbError) {
                    console.log('⚠️ Could not check database:', dbError.message);
                }
            }
            return this.knex;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            console.error('🔍 Connection error details:', error.stack);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.knex) {
                await this.knex.destroy();
                this.knex = null;
                this.isConnected = false;
                console.log('✅ Database disconnected successfully');
            }
        } catch (error) {
            console.error('❌ Database disconnection failed:', error.message);
            throw error;
        }
    }

    async healthCheck() {
        try {
            if (!this.knex) {
                await this.connect();
            }
            await this.knex.raw('SELECT 1');
            return { status: 'healthy', connected: true };
        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message
            };
        }
    }

    async getKnex() {
        if (!this.knex) {
            await this.connect();
        }
        return this.knex;
    }

    async runMigrations() {
        try {
            console.log('🔄 Starting migrations...');
            if (!this.knex) {
                await this.connect();
            }
            console.log('📋 Running migrations...');
            await this.knex.migrate.latest();
            console.log('✅ Migrations completed successfully');
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            console.error('🔍 Migration error details:', error.stack);
            throw error;
        }
    }

    async runSeeds() {
        try {
            console.log('🌱 Starting seeds...');
            if (!this.knex) {
                await this.connect();
            }
            console.log('📦 Running seeds...');
            await this.knex.seed.run();
            console.log('✅ Seeds completed successfully');
        } catch (error) {
            console.error('❌ Seeding failed:', error.message);
            console.error('🔍 Seeding error details:', error.stack);
            throw error;
        }
    }
}

// Create a singleton instance
const databaseManager = new DatabaseManager();

// Export the manager instance as default
export default databaseManager;

// Graceful shutdown handling
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await databaseManager.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await databaseManager.disconnect();
    process.exit(0);
});