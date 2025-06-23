/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('users').del()
  await knex('users').insert([
    {
      id: 1, name: 'Elena', email: 'elena@gmail.com', password: '171c94533cacff0e4c5b85636a9e4fd6', confirm_password: '171c94533cacff0e4c5b85636a9e4fd6',
      phone: '07254345', specialization: 'pediatrie', photo: 'https://bing.com/th/id/BCO.90a15806-1c05-45d0-af8d-9f5e6f3df43b.png'
    },
    {
      id: 2, name: 'Catalina', email: 'catalina@gmail.com', password: '4d4d9eaf4dcb4ec146aa000019b1a5c5', confirm_password: '4d4d9eaf4dcb4ec146aa000019b1a5c5',
      phone: '0745123457', specialization: 'ortopedie', photo: 'https://bing.com/th/id/BCO.5c28f217-3bc0-4e22-a6e7-5fff79ea35c3.png'
    },

  ]);
};
