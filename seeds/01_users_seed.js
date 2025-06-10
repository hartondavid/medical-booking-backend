/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('users').del()
  await knex('users').insert([
    {
      id: 1, name: 'David', email: 'david@gmail.com', password: 'e302c093809151cc23e32ac93e775765',
      phone: '07254345', specialization: 'pediatrie', photo: 'https://bing.com/th/id/BCO.337f3a69-8fc3-4493-8fc6-5858e1a6d894.png'
    },
    {
      id: 2, name: 'Alex', email: 'alex@gmail.com', password: '0bf4375c81978b29d0f546a1e9cd6412',
      phone: '0745123457', specialization: 'ortopedie', photo: 'https://bing.com/th/id/BCO.8c16ed42-421c-41dc-922b-d180b02ca2fc.png'
    },
    {
      id: 3, name: 'Razvan', email: 'razvan@gmail.com', password: 'e302c093809151cc23e32ac93e775765',
      phone: '07278345', specialization: '', photo: 'https://bing.com/th/id/BCO.eed70183-11d1-4665-8b49-d1c73622ff79.png'
    },
    {
      id: 4, name: 'Marius', email: 'marius@gmail.com', password: '0bf4375c81978b29d0f546a1e9cd6412',
      phone: '0745983457', specialization: '', photo: 'https://bing.com/th/id/BCO.e94c8b4e-3a07-4bf3-b993-9a53d25a56f0.png'
    },
  ]);
};
