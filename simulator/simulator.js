const axios = require('axios');

const devices = ['sensor-001', 'sensor-002', 'sensor-003'];

async function getToken() {
  try {
    const response = await axios.post('http://localhost:3001/api/login', {
      username: 'admin',
      password: 'admin123'
    });
    console.log('Token:', response.data.token); // Log the token
    return response.data.token;
  } catch (err) {
    console.error('Login error:', err.message);
    throw err;
  }
}

async function simulateDevice(device_id) {
  try {
    const token = await getToken();
    setInterval(async () => {
      const temperature = (Math.random() * 10 + 20).toFixed(1); // Random 20-30°C
      try {
        await axios.put(`http://localhost:3001/api/devices/${device_id}`, {
          status: 'online',
          last_reading: temperature
        }, {
          headers: { Authorization: token }
        });
        console.log(`Sent data for ${device_id}: ${temperature}°C`);
      } catch (err) {
        console.error(`Error for ${device_id}:`, err.message);
      }
    }, 10000); // Every 10 seconds
  } catch (err) {
    console.error(`Failed to start simulation for ${device_id}:`, err.message);
  }
}

devices.forEach(device_id => simulateDevice(device_id));