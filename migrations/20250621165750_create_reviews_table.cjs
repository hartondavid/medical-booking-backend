exports.up = function (knex) {
    return knex.schema.createTable('reviews', (table) => {
        table.increments('id').primary();
        table.float('rating').notNullable();
        table.integer('pacient_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.integer('doctor_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.integer('reservation_id').unsigned().notNullable().references('id').inTable('reservations').onDelete('CASCADE');


        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('reviews');
};
