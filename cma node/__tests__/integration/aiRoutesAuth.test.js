const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock AI controllers before requiring routes
jest.mock('../../controllers/aiController', () => ({
  askAI: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'askAI' })),
  translateMessage: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'translateMessage' })),
  imagineImage: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'imagineImage' })),
  transcribeAudio: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'transcribeAudio' })),
  rewriteMessage: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'rewriteMessage' })),
}));

const {
  askAI,
  translateMessage,
  imagineImage,
  transcribeAudio,
  rewriteMessage,
} = require('../../controllers/aiController');

const aiRoutes = require('../../routes/aiRoutes');

describe('aiRoutes JWT Authentication Integration Tests', () => {
  let app;
  const testSecret = 'ai_routes_auth_integration_test_secret_12345';
  const originalEnvSecret = process.env.JWT_SECRET;
  const validUser = { id: '507f1f77bcf86cd799439011', username: 'alice' };

  beforeAll(() => {
    process.env.JWT_SECRET = testSecret;

    app = express();
    app.use(express.json());
    app.use('/api/ai', aiRoutes);
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalEnvSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const routes = [
    { method: 'post', path: '/api/ai/chat', mock: askAI },
    { method: 'post', path: '/api/ai/translate', mock: translateMessage },
    { method: 'post', path: '/api/ai/imagine', mock: imagineImage },
    { method: 'post', path: '/api/ai/transcribe', mock: transcribeAudio },
    { method: 'post', path: '/api/ai/rewrite', mock: rewriteMessage },
  ];

  // ---------------------------------------------------------------------------
  // 1. Unauthenticated Requests -> 401 Rejection
  // ---------------------------------------------------------------------------
  describe('1. Unauthenticated requests are rejected with 401 across all AI routes', () => {
    routes.forEach(({ method, path, mock }) => {
      it(`rejects unauthenticated ${method.toUpperCase()} ${path} with 401`, async () => {
        const res = await request(app)[method](path).send({});

        expect(res.status).toBe(401);
        expect(res.body).toEqual({
          status: false,
          msg: 'No token provided',
        });
        expect(mock).not.toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Invalid Token Requests -> 401 Rejection
  // ---------------------------------------------------------------------------
  describe('2. Invalid token requests are rejected with 401', () => {
    routes.forEach(({ method, path, mock }) => {
      it(`rejects invalid token for ${method.toUpperCase()} ${path} with 401`, async () => {
        const res = await request(app)[method](path)
          .set('Authorization', 'Bearer invalid.token.payload')
          .send({});

        expect(res.status).toBe(401);
        expect(res.body).toEqual({
          status: false,
          msg: 'Invalid token',
        });
        expect(mock).not.toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Authenticated Requests -> 200 and req.user Populated Correctly
  // ---------------------------------------------------------------------------
  describe('3. Authenticated requests succeed and populate req.user', () => {
    const token = jwt.sign(validUser, testSecret, { expiresIn: '1h' });

    routes.forEach(({ method, path, mock }) => {
      it(`authenticates ${method.toUpperCase()} ${path} and populates req.user`, async () => {
        const res = await request(app)[method](path)
          .set('Authorization', `Bearer ${token}`)
          .send({ prompt: 'test', text: 'test' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe(true);
        expect(res.body.user).toEqual(expect.objectContaining({
          id: validUser.id,
          username: validUser.username,
        }));
        expect(mock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
