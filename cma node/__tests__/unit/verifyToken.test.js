const jwt = require('jsonwebtoken');
const verifyToken = require('../../middleware/verifyToken');

// Helper to construct mock Express response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to construct mock Express request object
const createMockRequest = (headers = {}) => ({
  headers,
});

describe('verifyToken Middleware Unit Tests', () => {
  const testSecret = 'test_secret_key_1234567890_abcdefghijklmnopqrstuvwxyz';
  const originalEnvSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = testSecret;
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalEnvSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Missing Authorization Header
  describe('1. Missing Authorization Header', () => {
    it('returns 401 when authorization header is completely missing', () => {
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'No token provided',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when authorization header is empty string', () => {
      const req = createMockRequest({ authorization: '' });
      const res = createMockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'No token provided',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // 2. Malformed Header
  describe('2. Malformed Authorization Header', () => {
    it('returns 401 when header does not start with "Bearer "', () => {
      const req = createMockRequest({ authorization: 'Basic abcdef12345' });
      const res = createMockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Invalid authorization format',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when header is just "Bearer" without trailing space and token', () => {
      const req = createMockRequest({ authorization: 'Bearer' });
      const res = createMockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Invalid authorization format',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when header is "Bearer " with whitespace only', () => {
      const req = createMockRequest({ authorization: 'Bearer    ' });
      const res = createMockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'No token provided',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // 3. Invalid Signature / Malformed Token
  describe('3. Invalid Signature and Malformed Token', () => {
    it('returns 401 when token is signed with a different secret', () => {
      const differentSecret = 'completely_different_secret_key_987654321';
      const token = jwt.sign({ id: 'user123', username: 'alice' }, differentSecret);

      const req = createMockRequest({ authorization: `Bearer ${token}` });
      const res = createMockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Invalid token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when token string is corrupted/invalid JWT structure', () => {
      const req = createMockRequest({ authorization: 'Bearer invalid.jwt.token' });
      const res = createMockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Invalid token',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // 4. Expired Token
  describe('4. Expired Token', () => {
    it('returns 401 with specific message when token has expired', () => {
      const expiredToken = jwt.sign(
        { id: 'user123', username: 'alice' },
        testSecret,
        { expiresIn: '-1s' }
      );

      const req = createMockRequest({ authorization: `Bearer ${expiredToken}` });
      const res = createMockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Token expired, please log in again',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // 5. Valid Token (Success)
  describe('5. Valid Token Handling', () => {
    it('successfully decodes valid token, attaches req.user and calls next()', () => {
      const payload = { id: '507f1f77bcf86cd799439011', username: 'john_doe' };
      const validToken = jwt.sign(payload, testSecret, { expiresIn: '1h' });

      const req = createMockRequest({ authorization: `Bearer ${validToken}` });
      const res = createMockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(payload.id);
      expect(req.user.username).toBe(payload.username);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('supports uppercase Authorization header key', () => {
      const payload = { id: '507f1f77bcf86cd799439099', username: 'jane_doe' };
      const validToken = jwt.sign(payload, testSecret, { expiresIn: '1h' });

      const req = createMockRequest({ Authorization: `Bearer ${validToken}` });
      const res = createMockResponse();
      const next = jest.fn();

      verifyToken(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toEqual({
        id: payload.id,
        username: payload.username,
      });
    });
  });
});
