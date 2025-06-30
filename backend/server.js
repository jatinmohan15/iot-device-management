const express = require('express');
const { Pool } = require('pg');
const Redis = require('redis');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3001;

app.use(express.json());

// PostgreSQL (RDS) connection
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'your-rds-endpoint',
  database: 'iot_db',
  password: process.env.DB_PASSWORD || 'yourpassword',
  port: 5432,
});

// Redis (ElastiCache) connection
const redisClient = Redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'your-elasticache-endpoint'}:6379`
});
redisClient.connect().catch(console.error);

// AWS S3 for audit logs
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: 'us-east-1',
});

// Middleware for JWT authentication
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, 'your-secret-key', (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

// Create devices table
pool.query(`
  CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50),
    location VARCHAR(100),
    status VARCHAR(20),
    last_reading FLOAT
  )
`).catch(err => console.error('Table creation error:', err));

// Login endpoint for admins
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') { // Replace with secure auth in production
    const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Register a device
app.post('/api/devices', authenticate, async (req, res) => {
  const { device_id, type, location } = req.body;
  try {
    await pool.query('INSERT INTO devices (device_id, type, location, status) VALUES ($1, $2, $3, $4)', 
      [device_id, type, location, 'offline']);
    // Log to S3
    await s3.putObject({
      Bucket: 'your-audit-bucket',
      Key: `audit/${Date.now()}.json`,
      Body: JSON.stringify({ action: 'register', device_id, user: req.user.username, timestamp: new Date() }),
    }).promise();
    res.json({ message: 'Device registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update device status/reading
app.put('/api/devices/:device_id', authenticate, async (req, res) => {
  const { device_id } = req.params;
  const { status, last_reading } = req.body;
  try {
    await pool.query('UPDATE devices SET status = $1, last_reading = $2 WHERE device_id = $3', 
      [status, last_reading, device_id]);
    // Cache in Redis
    await redisClient.setEx(`device:${device_id}`, 3600, JSON.stringify({ status, last_reading }));
    // Log to S3
    await s3.putObject({
      Bucket: 'your-audit-bucket',
      Key: `audit/${Date.now()}.json`,
      Body: JSON.stringify({ action: 'update', device_id, status, last_reading, user: req.user.username, timestamp: new Date() }),
    }).promise();
    res.json({ message: 'Device updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all devices
app.get('/api/devices', authenticate, async (req, res) => {
  try {
    const cached = await redisClient.get('devices');
    if (cached) return res.json(JSON.parse(cached));
    const result = await pool.query('SELECT * FROM devices');
    await redisClient.setEx('devices', 60, JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});