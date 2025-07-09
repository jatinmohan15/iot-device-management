const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({ url: process.env.REDIS_URL });

client.on('error', (err) => console.error('Redis Client Error:', err));
client.on('connect', () => console.log('Connected to Redis'));

(async () => {
  await client.connect();
  await client.set('test', 'Redis is working');
  const value = await client.get('test');
  console.log('Test value:', value);
  await client.quit();
})();
