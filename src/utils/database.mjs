// import knex from 'knex';
// import knexConfig from './../../knexfile.cjs';

// const db = knex(knexConfig);

// export default db;

import knex from 'knex';
import knexConfig from './../../knexfile.cjs';

let dbInstance = null;

const getDbInstance = () => {
    if (!dbInstance) {
        dbInstance = knex(knexConfig);  // Initialize the instance only once
    }
    // Attach event listener for `updated_at`
    dbInstance.on('query', (queryData) => {
        if (queryData.method === 'update') {
            queryData.bindings.push(new Date());
            queryData.sql += ', updated_at = ?';
        }
    });
    return dbInstance;  // Always return the same instance
};

const db = getDbInstance();  // Ensure the same instance is exported

export default db;