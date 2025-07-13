import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [devices, setDevices] = useState([]);
  const [token, setToken] = useState('');
  const API_URL = 'http://iot-backend-alb-1998712882.us-east-1.elb.amazonaws.com'; // Replace with ALB DNS name after Step 9.2

  const login = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/login`, {
        username: 'admin',
        password: 'admin123',
      });
      setToken(response.data.token);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const fetchDevices = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevices(response.data);
    } catch (err) {
      console.error('Fetch devices error:', err);
    }
  }, [token]);

  useEffect(() => {
    login();
  }, []);

  useEffect(() => {
    if (token) fetchDevices();
  }, [token, fetchDevices]);

  const chartData = {
    labels: devices.map(d => d.device_id),
    datasets: [
      {
        label: 'Last Reading',
        data: devices.map(d => d.last_reading || 0),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div>
      <h2>IoT Device Dashboard</h2>
      <table>
        <thead>
          <tr>
            <th>Device ID</th>
            <th>Type</th>
            <th>Location</th>
            <th>Status</th>
            <th>Last Reading</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {devices.map(device => (
            <tr key={device.device_id}>
              <td>{device.device_id}</td>
              <td>{device.type}</td>
              <td>{device.location}</td>
              <td>{device.status}</td>
              <td>{device.last_reading || 'N/A'}</td>
              <td>{new Date(device.last_updated).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ width: '600px', margin: '20px auto' }}>
        <Bar
          data={chartData}
          options={{
            responsive: true,
            plugins: { title: { display: true, text: 'Device Readings' } },
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;
