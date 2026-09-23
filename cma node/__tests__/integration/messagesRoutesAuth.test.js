const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock messages controllers before requiring routes
jest.mock('../../controllers/messagesController', () => ({
  addMessage: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'addMessage' })),
  getAllMessage: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'getAllMessage' })),
  uploadMedia: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'uploadMedia' })),
  markAsRead: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'markAsRead' })),
  reactToMessage: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'reactToMessage' })),
  editMessage: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'editMessage' })),
  deleteMessage: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'deleteMessage' })),
  pinMessage: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'pinMessage' })),
  starMessage: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'starMessage' })),
  getAISessions: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'getAISessions' })),
  deleteAISession: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'deleteAISession' })),
}));

const {
  addMessage,
  getAllMessage,
  uploadMedia,
  markAsRead,
  reactToMessage,
  editMessage,
  deleteMessage,
  pinMessage,
  starMessage,
  getAISessions,
  deleteAISession,
} = require('../../controllers/messagesController');

const messagesRoutes = require('../../routes/messages.Routes');

describe('messages.Routes.js JWT Authentication Integration Tests', () => {
  let app;
  const testSecret = 'messages_routes_auth_integration_test_secret_12345';
  const originalEnvSecret = process.env.JWT_SECRET;
  const validUser = { id: '507f1f77bcf86cd799439011', username: 'alice' };

  beforeAll(() => {
    process.env.JWT_SECRET = testSecret;

    app = express();
    app.use(express.json());
    app.use('/api/messages', messagesRoutes);
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalEnvSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const routes = [
    { method: 'post', path: '/api/messages/upload', mock: uploadMedia },
    { method: 'post', path: '/api/messages/addmsg', mock: addMessage },
    { method: 'post', path: '/api/messages/getmsg', mock: getAllMessage },
    { method: 'put', path: '/api/messages/mark-read', mock: markAsRead },
    { method: 'post', path: '/api/messages/mark-read', mock: markAsRead },
    { method: 'post', path: '/api/messages/react', mock: reactToMessage },
    { method: 'put', path: '/api/messages/edit', mock: editMessage },
    { method: 'post', path: '/api/messages/delete', mock: deleteMessage },
    { method: 'put', path: '/api/messages/pin', mock: pinMessage },
    { method: 'put', path: '/api/messages/star', mock: starMessage },
    { method: 'post', path: '/api/messages/getaisessions', mock: getAISessions },
    { method: 'post', path: '/api/messages/deleteaisession', mock: deleteAISession },
  ];

  // ---------------------------------------------------------------------------
  // 1. Unauthenticated Requests -> 401 Rejection
  // ---------------------------------------------------------------------------
  describe('1. Unauthenticated requests are rejected with 401 across all messages routes', () => {
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
          .send({ dummy: 'data' });

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
