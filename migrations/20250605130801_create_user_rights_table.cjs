
exports.up = function (knex) {
    return knex.schema.createTable('user_rights', function (table) {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');
        table.integer('right_id').unsigned().notNullable()
            .references('id').inTable('rights').onDelete('CASCADE');
        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('user_rights');
};
