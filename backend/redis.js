const { createClient } = require('redis');
require('dotenv').config();

let client;

const getClient = async () => {
  if (client) return client;

  client = createClient({ url: process.env.REDIS_URL });

  client.on('error', (err) => {
    console.error('Redis error:', err.message);
  });

  await client.connect();
  console.log('Redis connected');
  return client;
};

module.exports = { getClient };