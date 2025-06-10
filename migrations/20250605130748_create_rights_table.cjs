
exports.up = function (knex) {
    return knex.schema.createTable('rights', function (table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable().unique();
        table.integer('right_code').notNullable().unique();
        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('rights');
};
