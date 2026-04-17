/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('users').del()
  await knex('users').insert([
    {
      id: 1, name: 'Elena', email: 'elena@gmail.com', password: '97d68ce9c3d9783f08b6edd44027762d', confirm_password: '97d68ce9c3d9783f08b6edd44027762d',
      phone: '07254345', specialization: 'pediatrie', photo: 'https://bing.com/th/id/BCO.04196a8f-3ab3-4672-9f91-92287c71f7fb.png'
    },
    {
      id: 2, name: 'Catalina', email: 'catalina@gmail.com', password: '48ca362716f48a58bbcf6feb1f101021', confirm_password: '48ca362716f48a58bbcf6feb1f101021',
      phone: '0745123457', specialization: 'ortopedie', photo: 'https://bing.com/th/id/BCO.fea751aa-3b1a-4a1d-b1ea-e7c3f6f0e3aa.png'
    },

  ]);
};
