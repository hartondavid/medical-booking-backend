
exports.up = function (knex) {
    return knex.schema.createTable('users', function (table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.string('email', 255).notNullable().unique();
        table.string('password', 255).notNullable();
        table.string('phone', 255).notNullable().unique();
        table.string('specialization', 255).nullable();
        table.string('photo', 255).nullable();
        table.integer('last_login').nullable();
        table.string('confirm_password', 255).notNullable();

        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('users');
};
