/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('rights').del()
  await knex('rights').insert([
    { id: 1, name: 'doctor', right_code: 1 },
    { id: 2, name: 'patient', right_code: 2 }
  ]);
};
