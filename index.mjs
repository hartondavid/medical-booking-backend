// app.js - Complete version with database functionality

import express from "express"
import dotenv from 'dotenv'
import cors from 'cors'
import path from 'path'
import databaseManager from './src/utils/database.mjs'

const app = express();

// Load environment variables (but don't crash if .env doesn't exist)
try {
    dotenv.config()
} catch (error) {
    console.log('No .env file found, using environment variables');
}

// Basic middleware
app.use(express.json());

// Add CORS for frontend access
app.use(cors({
    origin: '*', // In production, specify your frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Auth-Token']
}));

// Serve static files for both local and production environments
const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
const useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true';

if (!isProduction || useLocalStorage) {
    // Serve static files from public directory for local development
    app.use('/public', express.static(path.join(process.cwd(), 'public')));
    app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
    console.log('📁 Static files served from /public and /uploads');
} else {
    // In production, files are served from Vercel Blob URLs
    console.log('☁️ Static files served from Vercel Blob in production');
}

// Run migrations before starting the server
const runMigrations = async () => {
    try {
        console.log('🔄 Starting database setup...');

        // First, test database connection
        console.log('🔌 Testing database connection...');
        const knex = await databaseManager.getKnex();
        console.log('✅ Database connection successful');

        // Check if database exists and show tables
        try {
            const tables = await knex.raw('SHOW TABLES');
            console.log('📋 Existing tables:', tables[0].map(table => Object.values(table)[0]));
        } catch (error) {
            console.log('⚠️ Could not check tables:', error.message);
        }

        console.log('🔄 Running migrations...');
        await databaseManager.runMigrations();
        console.log('✅ Migrations completed successfully');

        // Check tables after migrations
        try {
            const tablesAfter = await knex.raw('SHOW TABLES');
            console.log('📋 Tables after migrations:', tablesAfter[0].map(table => Object.values(table)[0]));
        } catch (error) {
            console.log('⚠️ Could not check tables after migrations:', error.message);
        }

        // Run seeds after migrations
        console.log('🌱 Running database seeds...');
        await databaseManager.runSeeds();
        console.log('✅ Seeds completed successfully');

        // Check data after seeds
        try {
            const users = await knex('users').select('id', 'name', 'email');
            console.log('👥 Users after seeds:', users);
        } catch (error) {
            console.log('⚠️ Could not check users after seeds:', error.message);
        }

        return true;
    } catch (error) {
        console.error('❌ Migration/Seed failed:', error.message);
        console.error('🔍 Error details:', error.stack);
        return false;
    }
};

// Function to run seed files
const runSeeds = async (options = {}) => {
    try {
        console.log('🌱 Starting seed execution...');

        // Get database connection
        const knex = await databaseManager.getKnex();

        // Default options
        const seedOptions = {
            specific: options.specific,
            directory: options.directory || './seeds',
            loadExtensions: options.loadExtensions || ['.js', '.cjs'],
            recursive: options.recursive !== false
        };

        if (options.specific) {
            console.log(`📦 Running specific seed: ${options.specific}`);
            await knex.seed.run({ specific: options.specific });
            console.log(`✅ Seed ${options.specific} completed successfully`);
        } else {
            console.log('📦 Running all seeds...');
            await knex.seed.run(seedOptions);
            console.log('✅ All seeds completed successfully');
        }

        // Verify seed data if requested
        if (options.verify) {
            console.log('🔍 Verifying seed data...');
            try {
                const users = await knex('users').select('id', 'name', 'email');
                const rights = await knex('rights').select('id', 'name', 'right_code');
                const userRights = await knex('user_rights').select('*');

                console.log('👥 Users seeded:', users.length);
                console.log('🔐 Rights seeded:', rights.length);
                console.log('🔗 User rights seeded:', userRights.length);
            } catch (error) {
                console.log('⚠️ Could not verify seed data:', error.message);
            }
        }

        return true;
    } catch (error) {
        console.error('❌ Seed execution failed:', error.message);
        console.error('🔍 Error details:', error.stack);
        return false;
    }
};


// Import API routes (with error handling)
let apiRoutes = null;
try {
    // Run migrations first
    const migrationsSuccess = await runMigrations();
    if (!migrationsSuccess) {
        console.log('⚠️ Continuing without database migrations');
    }

    const { default: apiRoute } = await import('./src/routes/apiRoute.mjs');
    apiRoutes = apiRoute;
    console.log('✅ Database API routes loaded successfully');
} catch (error) {
    console.log('⚠️ Database API routes not available, using simplified version');
    console.log('🔍 Error:', error.message);
}

// Use API routes if available, otherwise use simplified routes
if (apiRoutes) {
    app.use('/api', apiRoutes);
    console.log('📡 Full API available at /api/*');
} else {
    console.log('📡 Using simplified API (no database)');
}

// Simple test route
app.get('/test', (req, res) => {
    console.log('Test route accessed');
    res.json({
        message: 'Test route working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        port: process.env.PORT || 8080,
        database: apiRoutes ? 'connected' : 'not connected (simplified version)'
    });
});

// Root route
app.get('/', (req, res) => {
    console.log('Root route accessed');
    res.json({
        message: 'Delivery Backend API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        port: process.env.PORT || 8080,
        database: apiRoutes ? 'connected' : 'not connected (simplified version)',
        endpoints: {
            test: '/test',
            health: '/health',
            api: apiRoutes ? '/api/*' : 'not available (simplified version)'
        }
    });
});

// Simple health check route
app.get('/health', (req, res) => {
    console.log('Health route accessed');
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        port: process.env.PORT || 8080,
        database: apiRoutes ? 'connected' : 'not connected (simplified version)'
    });
});

// Test database endpoint (not protected)
app.get('/test-db', async (req, res) => {
    try {
        console.log('🔍 Testing database connection...');

        // Test database connection
        const knex = await databaseManager.getKnex();
        await knex.raw('SELECT 1');
        console.log('✅ Database connection successful');

        // Get all users
        const users = await knex('users').select('id', 'name', 'email', 'phone');
        console.log('📋 Found users:', users.length);

        res.json({
            success: true,
            message: "Database test successful",
            data: {
                connection: 'successful',
                usersCount: users.length,
                users: users
            }
        });
    } catch (error) {
        console.error("Database test error:", error);
        res.status(500).json({
            success: false,
            message: "Database test failed",
            data: {
                error: error.message,
                stack: error.stack
            }
        });
    }
});

// Manual seed endpoint (not protected) - for emergency use
app.post('/run-seeds', async (req, res) => {
    try {
        console.log('🌱 Manually running seeds...');

        // Run seeds
        await databaseManager.runSeeds();
        console.log('✅ Manual seeds completed successfully');

        // Get all users after seeding
        const knex = await databaseManager.getKnex();
        const users = await knex('users').select('id', 'name', 'email', 'phone');
        console.log('📋 Users after manual seeding:', users);

        res.json({
            success: true,
            message: "Manual seeding completed successfully",
            data: {
                usersCount: users.length,
                users: users
            }
        });
    } catch (error) {
        console.error("Manual seeding error:", error);
        res.status(500).json({
            success: false,
            message: "Manual seeding failed",
            data: {
                error: error.message,
                stack: error.stack
            }
        });
    }
});

// Test token endpoint (not protected)
app.post('/test-token', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token is required",
                data: []
            });
        }

        console.log('🔍 Testing token:', token.substring(0, 20) + '...');

        // Verify token
        const JWT_SECRET = process.env.JWT_SECRET;

        if (!JWT_SECRET || JWT_SECRET === 'your_jwt_secret') {
            console.error('❌ JWT_SECRET not properly configured! Please set JWT_SECRET environment variable.');
            return res.status(500).json({
                success: false,
                message: "Server configuration error - JWT_SECRET not set",
                data: []
            });
        }

        const jwt = await import('jsonwebtoken');
        const decodedToken = jwt.default.verify(token, JWT_SECRET);

        console.log('✅ Token verified:', decodedToken);

        // Get user from database
        const knex = await databaseManager.getKnex();
        const user = await knex('users').where({ id: decodedToken.id }).first();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                data: []
            });
        }

        res.json({
            success: true,
            message: "Token is valid",
            data: {
                token: decodedToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                }
            }
        });
    } catch (error) {
        console.error("Token test error:", error);
        res.status(400).json({
            success: false,
            message: "Invalid token",
            data: {
                error: error.message
            }
        });
    }
});

// Login endpoint (not protected)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
                data: []
            });
        }

        console.log('🔍 Login attempt for:', email);

        // Get user from database
        const knex = await databaseManager.getKnex();
        const user = await knex('users').where({ email }).first();

        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
                data: []
            });
        }

        console.log('✅ User found:', { id: user.id, name: user.name, email: user.email });

        // Hash password for comparison
        const crypto = await import('crypto');
        const hashedPassword = crypto.default.createHash('md5').update(password + password).digest('hex');
        console.log('🔐 Password check:', { provided: hashedPassword, stored: user.password });

        if (hashedPassword !== user.password) {
            console.log('❌ Password mismatch');
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
                data: []
            });
        }

        console.log('✅ Password verified successfully');

        // Generate JWT token
        const JWT_SECRET = process.env.JWT_SECRET;

        if (!JWT_SECRET || JWT_SECRET === 'your_jwt_secret') {
            console.error('❌ JWT_SECRET not properly configured! Please set JWT_SECRET environment variable.');
            return res.status(500).json({
                success: false,
                message: "Server configuration error - JWT_SECRET not set",
                data: []
            });
        }

        const jwt = await import('jsonwebtoken');
        const token = jwt.default.sign(
            { id: user.id, phone: user.phone, guest: false, employee: true },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        console.log('🎫 Token generated:', token.substring(0, 20) + '...');

        // Update last login
        await knex('users')
            .where({ id: user.id })
            .update({ last_login: parseInt(Date.now() / 1000) });

        // Set custom header
        res.set('X-Auth-Token', token);

        res.json({
            success: true,
            message: "Successfully logged in!",
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                },
                token: token
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            data: []
        });
    }
});

// Load API routes
try {
    console.log('📡 Loading API routes...');
    const { default: apiRouter } = await import('./src/routes/apiRoute.mjs');
    app.use('/api', apiRouter);
    apiRoutes = true;
    console.log('✅ Database API routes loaded successfully');
} catch (error) {
    console.error('❌ Failed to load API routes:', error.message);
    console.log('⚠️ Database API routes not available, using simplified version');
    apiRoutes = false;
}

console.log('📡 Full API available at /api/*');

// 404 handler for undefined routes
app.use('*', (req, res) => {
    console.log('404 route accessed:', req.originalUrl);
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        availableRoutes: {
            root: '/',
            test: '/test',
            health: '/health',
            testDb: '/test-db',
            runSeeds: '/run-seeds',
            testToken: '/test-token',
            login: '/login',
            api: apiRoutes ? '/api/*' : 'not available (simplified version)'
        }
    });
});

export default app;