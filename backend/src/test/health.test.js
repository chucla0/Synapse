const request = require('supertest');
const express = require('express');

// Create a basic app for testing
const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

describe('Basic Backend API Tests', () => {
  test('GET /api/health should return 200 ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
