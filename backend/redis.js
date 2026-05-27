const { createClient } = require('redis');
require('dotenv').config();

let client;

const getClient = async () => {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL;

  client = createClient({
    url: redisUrl,
    socket: {
      tls: redisUrl.startsWith('rediss://'),
      rejectUnauthorized: false
    }
  });

  client.on('error', (err) => {
    console.error('Redis error:', err.message);
  });

  await client.connect();
  console.log('Redis connected');
  return client;
};

module.exports = { getClient };