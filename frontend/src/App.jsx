import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import './App.css';

const App = () => {
  const [devices, setDevices] = useState([]);
  const [token, setToken] = useState('');

  // Login to get token
  useEffect(() => {
    axios.post('http://localhost:3001/api/login', {
      username: 'admin',
      password: 'admin123'
    })
      .then(response => {
        setToken(response.data.token);
        console.log('Token:', response.data.token);
      })
      .catch(err => console.error('Login error:', err.message));
  }, []);

  // Fetch devices
  useEffect(() => {
    if (token) {
      axios.get('http://localhost:3001/api/devices', {
        headers: { Authorization: token }
      })
        .then(response => setDevices(response.data))
        .catch(err => console.error('Fetch devices error:', err.message));
    }
  }, [token]);

  return (
    <div>
      <h1>IoT Device Dashboard</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Location</th>
            <th>Status</th>
            <th>Last Reading</th>
          </tr>
        </thead>
        <tbody>
          {devices.map(device => (
            <tr key={device.id}>
              <td>{device.device_id}</td>
              <td>{device.type}</td>
              <td>{device.location}</td>
              <td>{device.status}</td>
              <td>{device.last_reading}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Temperature Trend</h2>
      <LineChart width={600} height={300} data={devices}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="device_id" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="last_reading" stroke="#8884d8" />
      </LineChart>
    </div>
  );
};

export default App;