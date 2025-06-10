
exports.up = function (knex) {
    return knex.schema.createTable('reservations', (table) => {
        table.increments('id').primary();

        table.datetime('date').nullable();

        table.string('subject').nullable();

        table.string('description').nullable();

        table.enum('status', ['pending', 'confirmed', 'rejected', 'finished']).defaultTo('pending');

        table.integer('patient_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');

        table.integer('doctor_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');

        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('reservations');
};
