const express = require('express');
require('dotenv').config();
const { Pool } = require('pg');
const AWS = require('aws-sdk');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.RDS_HOST,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  database: 'iot_db',
  ssl: { ca: require('fs').readFileSync('./certs/rds-global-bundle.pem') }
});

const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(err => console.error('Redis connection error:', err));

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1'
});
const s3 = new AWS.S3();

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/devices', authenticate, async (req, res) => {
  const { device_id, type, location } = req.body;
  try {
    console.log('Inserting device:', { device_id, type, location });
    const result = await pool.query(
      'INSERT INTO devices (device_id, type, location) VALUES ($1, $2, $3) RETURNING *',
      [device_id, type, location]
    );
    console.log('Database insert result:', result.rows);
    await redisClient.del('devices').catch(err => console.error('Redis del error:', err));
    await s3.putObject({
      Bucket: process.env.S3_BUCKET,
      Key: `audit/${Date.now()}.json`,
      Body: JSON.stringify({ action: 'create', device_id, type, location, user: req.user.username, timestamp: new Date() }),
    }).promise().catch(err => console.error('S3 putObject error:', err));
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/devices error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/devices', authenticate, async (req, res) => {
  try {
    const cached = await redisClient.get('devices');
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const result = await pool.query('SELECT * FROM devices');
    await redisClient.setEx('devices', 60, JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/devices error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/devices/:device_id', authenticate, async (req, res) => {
  const { device_id } = req.params;
  const { status, last_reading } = req.body;
  try {
    const result = await pool.query(
      'UPDATE devices SET status = $1, last_reading = $2, last_updated = CURRENT_TIMESTAMP WHERE device_id = $3 RETURNING *',
      [status, last_reading, device_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    await redisClient.del('devices').catch(err => console.error('Redis del error:', err));
    await s3.putObject({
      Bucket: process.env.S3_BUCKET,
      Key: `audit/${Date.now()}.json`,
      Body: JSON.stringify({ action: 'update', device_id, status, last_reading, user: req.user.username, timestamp: new Date() }),
    }).promise().catch(err => console.error('S3 putObject error:', err));
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/devices error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
