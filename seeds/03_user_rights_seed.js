/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('user_rights').del()
  await knex('user_rights').insert([
    { id: 1, user_id: 1, right_id: 1 },
    { id: 2, user_id: 2, right_id: 1 },
    { id: 3, user_id: 3, right_id: 2 },
    { id: 4, user_id: 4, right_id: 2 },
  ]);
};
