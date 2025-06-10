
exports.up = function (knex) {
    return knex.schema.createTable('prescriptions', (table) => {
        table.increments('id').primary();

        table.text('file_path').nullable();

        table.integer('patient_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');

        table.integer('doctor_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');


        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('prescriptions');
};
