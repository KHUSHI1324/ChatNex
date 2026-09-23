const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock user controllers before requiring routes
jest.mock('../../controllers/userControllers', () => ({
  register: jest.fn((req, res) => res.status(200).json({ status: true, action: 'register' })),
  login: jest.fn((req, res) => res.status(200).json({ status: true, action: 'login' })),
  avtar: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'avtar' })),
  updateProfile: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'updateProfile' })),
  generateAiAvatar: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'generateAiAvatar' })),
  logAvatarFallback: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'logAvatarFallback' })),
  getUserById: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'getUserById' })),
  getAllUsers: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'getAllUsers' })),
  getContactsWithLastMessage: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'getContactsWithLastMessage' })),
  searchUsers: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'searchUsers' })),
  addContact: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'addContact' })),
  removeContact: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'removeContact' })),
  updatePrivacySettings: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'updatePrivacySettings' })),
  blockUser: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'blockUser' })),
  unblockUser: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'unblockUser' })),
  getBlockedUsers: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'getBlockedUsers' })),
  setPasscode: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'setPasscode' })),
  verifyPasscode: jest.fn((req, res) => res.status(200).json({ status: true, user: req.user, action: 'verifyPasscode' })),
}));

const {
  register,
  login,
  avtar,
  updateProfile,
  getUserById,
  getAllUsers,
  getContactsWithLastMessage,
  searchUsers,
  addContact,
  removeContact,
  updatePrivacySettings,
  blockUser,
  unblockUser,
  getBlockedUsers,
  setPasscode,
  verifyPasscode,
} = require('../../controllers/userControllers');

const userRoutes = require('../../routes/userRoutes');

describe('userRoutes JWT Authentication Integration Tests', () => {
  let app;
  const testSecret = 'user_routes_auth_integration_test_secret_12345';
  const originalEnvSecret = process.env.JWT_SECRET;
  const validUser = { id: '507f1f77bcf86cd799439011', username: 'alice' };

  beforeAll(() => {
    process.env.JWT_SECRET = testSecret;

    app = express();
    app.use(express.json());
    app.use('/api/auth', userRoutes);
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalEnvSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Public Routes (/register, /login)
  // ---------------------------------------------------------------------------
  describe('1. Public Routes without Token', () => {
    it('allows POST /api/auth/register without Authorization header', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'alice', email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe('register');
      expect(register).toHaveBeenCalledTimes(1);
    });

    it('allows POST /api/auth/login without Authorization header', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe('login');
      expect(login).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Protected Routes without Token -> 401 Rejection
  // ---------------------------------------------------------------------------
  describe('2. Protected Routes Reject Requests without Token', () => {
    const protectedEndpoints = [
      { method: 'post', path: '/api/auth/avtar' },
      { method: 'post', path: '/api/auth/update-profile' },
      { method: 'post', path: '/api/auth/generate-ai-avatar' },
      { method: 'post', path: '/api/auth/log-avatar-fallback' },
      { method: 'get', path: '/api/auth/user/507f1f77bcf86cd799439011' },
      { method: 'get', path: '/api/auth/allusers' },
      { method: 'get', path: '/api/auth/contacts-with-last-message' },
      { method: 'get', path: '/api/auth/search-users' },
      { method: 'post', path: '/api/auth/add-contact' },
      { method: 'post', path: '/api/auth/remove-contact' },
      { method: 'post', path: '/api/auth/privacy-settings' },
      { method: 'post', path: '/api/auth/block-user' },
      { method: 'post', path: '/api/auth/unblock-user' },
      { method: 'get', path: '/api/auth/blocked-users' },
      { method: 'post', path: '/api/auth/set-passcode' },
      { method: 'post', path: '/api/auth/verify-passcode' },
    ];

    protectedEndpoints.forEach(({ method, path }) => {
      it(`rejects unauthenticated ${method.toUpperCase()} ${path} with 401`, async () => {
        const res = await request(app)[method](path);
        expect(res.status).toBe(401);
        expect(res.body).toEqual({
          status: false,
          msg: 'No token provided',
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Protected Routes with Valid Token -> Passes req.user
  // ---------------------------------------------------------------------------
  describe('3. Protected Routes with Valid Token', () => {
    it('passes through on GET /api/auth/user/:id with valid token and populates req.user', async () => {
      const token = jwt.sign(validUser, testSecret, { expiresIn: '1h' });

      const res = await request(app)
        .get('/api/auth/user/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(getUserById).toHaveBeenCalledTimes(1);
      expect(res.body).toEqual({
        status: true,
        action: 'getUserById',
        user: {
          id: validUser.id,
          username: validUser.username,
        },
      });
    });

    it('passes through on POST /api/auth/update-profile with valid token and populates req.user', async () => {
      const token = jwt.sign(validUser, testSecret, { expiresIn: '1h' });

      const res = await request(app)
        .post('/api/auth/update-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ about: 'New about text' });

      expect(res.status).toBe(200);
      expect(updateProfile).toHaveBeenCalledTimes(1);
      expect(res.body.user).toEqual({
        id: validUser.id,
        username: validUser.username,
      });
    });

    it('passes through on POST /api/auth/block-user with valid token and populates req.user', async () => {
      const token = jwt.sign(validUser, testSecret, { expiresIn: '1h' });

      const res = await request(app)
        .post('/api/auth/block-user')
        .set('Authorization', `Bearer ${token}`)
        .send({ targetUserId: '507f1f77bcf86cd799439099' });

      expect(res.status).toBe(200);
      expect(blockUser).toHaveBeenCalledTimes(1);
      expect(res.body.user).toEqual({
        id: validUser.id,
        username: validUser.username,
      });
    });
  });
});
