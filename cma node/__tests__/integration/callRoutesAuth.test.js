const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// 1. Mock the call controller methods before loading routes
jest.mock('../../controllers/callController', () => ({
  logCall: jest.fn((req, res) =>
    res.status(201).json({ status: true, user: req.user, action: 'logCall' })
  ),
  getUserCallLogs: jest.fn((req, res) =>
    res.status(200).json({ status: true, user: req.user, action: 'getUserCallLogs' })
  ),
  clearCallLogs: jest.fn((req, res) =>
    res.status(200).json({ status: true, user: req.user, action: 'clearCallLogs' })
  ),
}));

const { logCall, getUserCallLogs, clearCallLogs } = require('../../controllers/callController');
const callRoutes = require('../../routes/callRoutes');

describe('callRoutes JWT Authentication Integration Tests', () => {
  let app;
  const testSecret = 'integration_test_secret_for_call_routes_auth_789456123';
  const originalEnvSecret = process.env.JWT_SECRET;
  const validUserPayload = { id: '507f1f77bcf86cd799439011', username: 'alice_caller' };

  beforeAll(() => {
    process.env.JWT_SECRET = testSecret;

    app = express();
    app.use(express.json());
    app.use('/api/calls', callRoutes);
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalEnvSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Missing Authorization Header
  // ---------------------------------------------------------------------------
  describe('1. Request WITHOUT Authorization Header', () => {
    it('returns 401 on POST /api/calls/log and does not invoke controller', async () => {
      const res = await request(app)
        .post('/api/calls/log')
        .send({ callType: 'audio' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: false,
        msg: 'No token provided',
      });
      expect(logCall).not.toHaveBeenCalled();
    });

    it('returns 401 on GET /api/calls/user and does not invoke controller', async () => {
      const res = await request(app).get('/api/calls/user');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: false,
        msg: 'No token provided',
      });
      expect(getUserCallLogs).not.toHaveBeenCalled();
    });

    it('returns 401 on DELETE /api/calls/clear and does not invoke controller', async () => {
      const res = await request(app).delete('/api/calls/clear');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: false,
        msg: 'No token provided',
      });
      expect(clearCallLogs).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Invalid Token
  // ---------------------------------------------------------------------------
  describe('2. Request WITH Invalid Token', () => {
    it('returns 401 on invalid signature token and does not invoke controller', async () => {
      const wrongSecretToken = jwt.sign(validUserPayload, 'different_unrecognized_secret');

      const res = await request(app)
        .get('/api/calls/user')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: false,
        msg: 'Invalid token',
      });
      expect(getUserCallLogs).not.toHaveBeenCalled();
    });

    it('returns 401 on expired token and does not invoke controller', async () => {
      const expiredToken = jwt.sign(validUserPayload, testSecret, { expiresIn: '-1s' });

      const res = await request(app)
        .post('/api/calls/log')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ callType: 'video' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: false,
        msg: 'Token expired, please log in again',
      });
      expect(logCall).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Valid Token (Pass-through and req.user population)
  // ---------------------------------------------------------------------------
  describe('3. Request WITH Valid Token', () => {
    it('passes through on POST /api/calls/log, calls controller, and correctly populates req.user', async () => {
      const validToken = jwt.sign(validUserPayload, testSecret, { expiresIn: '1h' });

      const res = await request(app)
        .post('/api/calls/log')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ callType: 'audio', duration: 30 });

      expect(res.status).toBe(201);
      expect(logCall).toHaveBeenCalledTimes(1);
      expect(res.body).toEqual({
        status: true,
        action: 'logCall',
        user: {
          id: validUserPayload.id,
          username: validUserPayload.username,
        },
      });
    });

    it('passes through on GET /api/calls/user, calls controller, and correctly populates req.user', async () => {
      const validToken = jwt.sign(validUserPayload, testSecret, { expiresIn: '1h' });

      const res = await request(app)
        .get('/api/calls/user')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(getUserCallLogs).toHaveBeenCalledTimes(1);
      expect(res.body).toEqual({
        status: true,
        action: 'getUserCallLogs',
        user: {
          id: validUserPayload.id,
          username: validUserPayload.username,
        },
      });
    });

    it('passes through on DELETE /api/calls/clear, calls controller, and correctly populates req.user', async () => {
      const validToken = jwt.sign(validUserPayload, testSecret, { expiresIn: '1h' });

      const res = await request(app)
        .delete('/api/calls/clear')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(clearCallLogs).toHaveBeenCalledTimes(1);
      expect(res.body).toEqual({
        status: true,
        action: 'clearCallLogs',
        user: {
          id: validUserPayload.id,
          username: validUserPayload.username,
        },
      });
    });
  });
});
