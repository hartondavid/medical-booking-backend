CREATE TABLE:
npx knex migrate:make alter_file_name_table --knexfile knexfile.cjs
RUN MIGRATIONS:
npx knex migrate:latest --knexfile knexfile.cjs
ROLLBACK:
npx knex migrate:rollback --knexfile knexfile.cjs
ALTER:
npx knex migrate:make rename_file_name --knexfile knexfile.cjs
create seed:
npx knex seed:make file_name_seed
run seed:
npx knex seed:run --knexfile knexfile.cjs
specific seed
npx knex seed:run --specific=file_name_seed.cjs --knexfile knexfile.cjs