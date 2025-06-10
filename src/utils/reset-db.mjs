import knex from 'knex';
import knexConfig from './../../knexfile.cjs';

const db = knex(knexConfig);

async function resetDatabase() {
    try {
        // Drop all tables
        await db.schema.dropTableIfExists('knex_migrations');
        await db.schema.dropTableIfExists('knex_migrations_lock');
        await db.schema.dropTableIfExists('users');
        await db.schema.dropTableIfExists('rights');
        await db.schema.dropTableIfExists('user_rights');
        await db.schema.dropTableIfExists('cakes');
        await db.schema.dropTableIfExists('cake_recipes');
        await db.schema.dropTableIfExists('raw_materials');

        console.log('Database reset successful');
    } catch (error) {
        console.error('Error resetting database:', error);
    } finally {
        await db.destroy();
    }
}

resetDatabase(); 