const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../../models/userModels');
const {
  register,
  login,
  avtar,
  getUserById,
  getAllUsers,
  getContactsWithLastMessage,
  updateProfile,
  updatePrivacySettings,
  blockUser,
  unblockUser,
  getBlockedUsers,
  setPasscode,
  verifyPasscode,
  searchUsers,
  addContact,
  removeContact,
  applyPrivacyFilter,
  _resetPasscodeAttempts,
} = require('../../controllers/userControllers');

jest.mock('../../models/userModels');
jest.mock('bcrypt');

// Helper to construct mock Express response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockUserId = '507f1f77bcf86cd799439011';
const mockViewerId = '507f1f77bcf86cd799439012';
const mockContactId = '507f1f77bcf86cd799439013';
const mockStrangerId = '507f1f77bcf86cd799439019';

// Helper to construct mock Express request object with authenticated user context
const createMockRequest = (body = {}, params = {}, query = {}, user = { id: mockUserId }) => ({
  body,
  params,
  query,
  user,
});

// Helper to construct chainable Mongoose query object supporting select and populate
const createMockQuery = (doc) => {
  const query = {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(doc),
    then: function (resolve, reject) {
      return Promise.resolve(doc).then(resolve, reject);
    },
    catch: function (reject) {
      return Promise.resolve(doc).catch(reject);
    },
  };
  return query;
};

describe('userControllers Unit Tests', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockViewerId = '507f1f77bcf86cd799439012';
  const mockContactId = '507f1f77bcf86cd799439013';
  const mockStrangerId = '507f1f77bcf86cd799439019';

  beforeEach(() => {
    jest.clearAllMocks();
    _resetPasscodeAttempts();
  });

  // ---------------------------------------------------------------------------
  // 1. Authentication (login / register)
  // ---------------------------------------------------------------------------
  describe('1. Authentication logic (register, login)', () => {
    describe('register', () => {
      test('Happy path: registers a new user with hashed password and returns user without password', async () => {
        User.findOne.mockResolvedValue(null); // Neither username nor email exists
        bcrypt.hash.mockResolvedValue('hashed_secret123');

        const mockCreatedUser = {
          _id: mockUserId,
          username: 'alice',
          email: 'alice@example.com',
          password: 'hashed_secret123',
        };
        User.create.mockResolvedValue(mockCreatedUser);

        const req = createMockRequest({
          username: 'alice',
          email: 'alice@example.com',
          password: 'secret123',
        });
        const res = createMockResponse();
        const next = jest.fn();

        await register(req, res, next);

        expect(User.findOne).toHaveBeenCalledWith({ username: 'alice' });
        expect(User.findOne).toHaveBeenCalledWith({ email: 'alice@example.com' });
        expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
        expect(User.create).toHaveBeenCalledWith({
          email: 'alice@example.com',
          username: 'alice',
          password: 'hashed_secret123',
        });
        expect(res.json).toHaveBeenCalledWith({
          status: true,
          user: expect.objectContaining({
            _id: mockUserId,
            username: 'alice',
            email: 'alice@example.com',
          }),
          token: expect.any(String),
        });
        expect(mockCreatedUser.password).toBeUndefined();
      });

      test('Returns status false when username already exists', async () => {
        User.findOne.mockResolvedValueOnce({ _id: 'existing_id', username: 'alice' });

        const req = createMockRequest({
          username: 'alice',
          email: 'alice@example.com',
          password: 'secret123',
        });
        const res = createMockResponse();
        const next = jest.fn();

        await register(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Username already used',
        });
        expect(User.create).not.toHaveBeenCalled();
      });

      test('Returns status false when email already exists', async () => {
        User.findOne
          .mockResolvedValueOnce(null) // username check passes
          .mockResolvedValueOnce({ _id: 'existing_id', email: 'alice@example.com' }); // email check fails

        const req = createMockRequest({
          username: 'alice',
          email: 'alice@example.com',
          password: 'secret123',
        });
        const res = createMockResponse();
        const next = jest.fn();

        await register(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Email already used',
        });
        expect(User.create).not.toHaveBeenCalled();
      });

      test('E11000 duplicate key error on username collision returns clean status false response', async () => {
        User.findOne.mockResolvedValue(null); // Both concurrent requests pass findOne
        bcrypt.hash.mockResolvedValue('hashed_pwd');

        const mongoDuplicateKeyError = new Error('E11000 duplicate key error collection: index: username_1 dup key');
        mongoDuplicateKeyError.code = 11000;
        mongoDuplicateKeyError.keyPattern = { username: 1 };
        mongoDuplicateKeyError.keyValue = { username: 'concurrent_user' };
        User.create.mockRejectedValue(mongoDuplicateKeyError);

        const req = createMockRequest({
          username: 'concurrent_user',
          email: 'concurrent@example.com',
          password: 'secret123',
        });
        const res = createMockResponse();
        const next = jest.fn();

        await register(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Username already used',
        });
        expect(next).not.toHaveBeenCalled();
      });

      test('E11000 duplicate key error on email collision returns clean status false response', async () => {
        User.findOne.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue('hashed_pwd');

        const mongoDuplicateKeyError = new Error('E11000 duplicate key error collection: index: email_1 dup key');
        mongoDuplicateKeyError.code = 11000;
        mongoDuplicateKeyError.keyPattern = { email: 1 };
        mongoDuplicateKeyError.keyValue = { email: 'concurrent@example.com' };
        User.create.mockRejectedValue(mongoDuplicateKeyError);

        const req = createMockRequest({
          username: 'concurrent_user2',
          email: 'concurrent@example.com',
          password: 'secret123',
        });
        const res = createMockResponse();
        const next = jest.fn();

        await register(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Email already used',
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('login', () => {
      test('Happy path: logs in with valid credentials and returns user without password', async () => {
        const mockDbUser = {
          _id: mockUserId,
          username: 'alice',
          email: 'alice@example.com',
          password: '$2b$10$hashedpassword',
        };
        User.findOne.mockResolvedValue(mockDbUser);
        bcrypt.compare.mockResolvedValue(true);

        const req = createMockRequest({
          username: 'alice',
          password: 'secret123',
        });
        const res = createMockResponse();
        const next = jest.fn();

        await login(req, res, next);

        expect(bcrypt.compare).toHaveBeenCalledWith('secret123', '$2b$10$hashedpassword');
        expect(res.json).toHaveBeenCalledWith({
          status: true,
          user: expect.objectContaining({
            _id: mockUserId,
            username: 'alice',
          }),
          token: expect.any(String),
        });
        expect(mockDbUser.password).toBeUndefined();
      });

      test('Returns generic invalid error when password does not match', async () => {
        const mockDbUser = {
          _id: mockUserId,
          username: 'alice',
          password: '$2b$10$hashedpassword',
        };
        User.findOne.mockResolvedValue(mockDbUser);
        bcrypt.compare.mockResolvedValue(false);

        const req = createMockRequest({
          username: 'alice',
          password: 'wrongpassword',
        });
        const res = createMockResponse();
        const next = jest.fn();

        await login(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Invalid email or password',
        });
      });

      test('Returns generic invalid error when user is not found', async () => {
        User.findOne.mockResolvedValue(null);

        const req = createMockRequest({
          username: 'nonexistent',
          password: 'anypassword',
        });
        const res = createMockResponse();
        const next = jest.fn();

        await login(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Invalid email or password',
        });
        expect(bcrypt.compare).not.toHaveBeenCalled();
      });

      test('Returns generic invalid error when username or password is missing', async () => {
        const req = createMockRequest({
          username: '',
          password: 'secret',
        });
        const res = createMockResponse();
        const next = jest.fn();

        await login(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Invalid email or password',
        });
        expect(User.findOne).not.toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 2. applyPrivacyFilter & Privacy Enforcement
  // ---------------------------------------------------------------------------
  describe('2. applyPrivacyFilter & Privacy Enforcement', () => {
    const baseTargetUser = {
      _id: mockUserId,
      username: 'targetuser',
      email: 'target@example.com',
      about: 'Target user biography',
      avtarImage: 'data:image/png;base64,targetavatar',
      isAvtarImageSet: true,
      savedContacts: [mockContactId],
      privacySettings: {
        profilePhoto: 'everyone',
        email: 'everyone',
        about: 'everyone',
        lastSeen: 'everyone',
      },
    };

    test("2a. 'everyone' setting -> fields remain visible to any viewer", () => {
      const target = {
        ...baseTargetUser,
        privacySettings: {
          profilePhoto: 'everyone',
          email: 'everyone',
          about: 'everyone',
          lastSeen: 'everyone',
        },
      };

      const result = applyPrivacyFilter(target, mockStrangerId);

      expect(result.avtarImage).toBe('data:image/png;base64,targetavatar');
      expect(result.isAvtarImageSet).toBe(true);
      expect(result.email).toBe('target@example.com');
      expect(result.about).toBe('Target user biography');
    });

    test("2b. 'contacts' setting -> visible only if viewer is in savedContacts, hidden otherwise", () => {
      const target = {
        ...baseTargetUser,
        savedContacts: [mockContactId],
        privacySettings: {
          profilePhoto: 'contacts',
          email: 'contacts',
          about: 'contacts',
          lastSeen: 'contacts',
        },
      };

      // Case 1: Viewer is in savedContacts
      const contactResult = applyPrivacyFilter(target, mockContactId);
      expect(contactResult.avtarImage).toBe('data:image/png;base64,targetavatar');
      expect(contactResult.isAvtarImageSet).toBe(true);
      expect(contactResult.email).toBe('target@example.com');
      expect(contactResult.about).toBe('Target user biography');

      // Case 2: Viewer is NOT in savedContacts (stranger)
      const strangerResult = applyPrivacyFilter(target, mockStrangerId);
      expect(strangerResult.avtarImage).toBe('');
      expect(strangerResult.isAvtarImageSet).toBe(false);
      expect(strangerResult.email).toBe('');
      expect(strangerResult.about).toBe('');
      expect(strangerResult.lastSeen).toBeNull();
    });

    test("2c. 'nobody' setting -> hidden from everyone except when viewer is target user (self)", () => {
      const target = {
        ...baseTargetUser,
        privacySettings: {
          profilePhoto: 'nobody',
          email: 'nobody',
          about: 'nobody',
          lastSeen: 'nobody',
        },
      };

      // Case 1: Stranger viewing
      const strangerResult = applyPrivacyFilter(target, mockStrangerId);
      expect(strangerResult.avtarImage).toBe('');
      expect(strangerResult.isAvtarImageSet).toBe(false);
      expect(strangerResult.email).toBe('');
      expect(strangerResult.about).toBe('');

      // Case 2: Saved contact viewing (still hidden under 'nobody')
      const contactResult = applyPrivacyFilter(target, mockContactId);
      expect(contactResult.avtarImage).toBe('');
      expect(contactResult.email).toBe('');
      expect(contactResult.about).toBe('');

      // Case 3: Target viewing own profile (self can always see own data)
      const selfResult = applyPrivacyFilter(target, mockUserId);
      expect(selfResult.avtarImage).toBe('data:image/png;base64,targetavatar');
      expect(selfResult.isAvtarImageSet).toBe(true);
      expect(selfResult.email).toBe('target@example.com');
      expect(selfResult.about).toBe('Target user biography');
    });

    test('2d. Missing/no viewerId provided -> treated as anonymous viewer with most restrictive filtering', () => {
      const target = {
        ...baseTargetUser,
        privacySettings: {
          profilePhoto: 'contacts',
          email: 'nobody',
          about: 'contacts',
          lastSeen: 'contacts',
        },
      };

      // Call with null/undefined viewerId
      const anonymousResult = applyPrivacyFilter(target, null);

      expect(anonymousResult.avtarImage).toBe('');
      expect(anonymousResult.isAvtarImageSet).toBe(false);
      expect(anonymousResult.email).toBe('');
      expect(anonymousResult.about).toBe('');
      expect(anonymousResult.lastSeen).toBeNull();
    });

    test('End-to-end endpoint verification: getUserById applies privacy filter based on viewerId query param', async () => {
      const mockDbUser = {
        ...baseTargetUser,
        privacySettings: {
          profilePhoto: 'contacts',
          email: 'nobody',
          about: 'everyone',
        },
      };

      User.findById.mockReturnValue(createMockQuery(mockDbUser));

      const req = createMockRequest({}, { id: mockUserId }, {}, { id: mockStrangerId });
      const res = createMockResponse();
      const next = jest.fn();

      await getUserById(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        user: expect.objectContaining({
          _id: mockUserId,
          username: 'targetuser',
          avtarImage: '', // Filtered: stranger under 'contacts'
          email: '', // Filtered: stranger under 'nobody'
          about: 'Target user biography', // Visible: 'everyone'
        }),
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. verifyPasscode Rate Limiting
  // ---------------------------------------------------------------------------
  describe('3. verifyPasscode Rate Limiting', () => {
    test('3a. Happy path: correct passcode on first attempt succeeds and verifies', async () => {
      const mockUserWithPasscode = {
        _id: mockUserId,
        passcode: '$2b$10$hashedpasscode',
      };
      User.findById.mockReturnValue(createMockQuery(mockUserWithPasscode));
      bcrypt.compare.mockResolvedValue(true);

      const req = createMockRequest({
        passcode: '1234',
      }, {}, {}, { id: mockUserId });
      const res = createMockResponse();
      const next = jest.fn();

      await verifyPasscode(req, res, next);

      expect(bcrypt.compare).toHaveBeenCalledWith('1234', '$2b$10$hashedpasscode');
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        msg: 'Passcode verified',
      });
    });

    test('3b. 5 consecutive failed attempts trigger rate-limiting; 6th attempt returns 429 without calling bcrypt.compare', async () => {
      const mockUserWithPasscode = {
        _id: mockUserId,
        passcode: '$2b$10$hashedpasscode',
      };
      User.findById.mockReturnValue(createMockQuery(mockUserWithPasscode));
      bcrypt.compare.mockResolvedValue(false); // All attempts fail

      // Execute 4 failed attempts
      for (let i = 1; i <= 4; i++) {
        const req = createMockRequest({ passcode: '0000' }, {}, {}, { id: mockUserId });
        const res = createMockResponse();
        await verifyPasscode(req, res, jest.fn());
        expect(res.json).toHaveBeenCalledWith({ status: false, msg: 'Incorrect passcode PIN' });
      }

      // 5th failed attempt: reaches threshold, locks account and returns 429
      const req5 = createMockRequest({ passcode: '0000' }, {}, {}, { id: mockUserId });
      const res5 = createMockResponse();
      await verifyPasscode(req5, res5, jest.fn());
      expect(res5.status).toHaveBeenCalledWith(429);
      expect(res5.json).toHaveBeenCalledWith({
        status: false,
        msg: expect.stringContaining('Too many attempts'),
      });

      // 6th attempt: blocked upfront by rate limiter without calling bcrypt.compare
      const req6 = createMockRequest({ passcode: '0000' }, {}, {}, { id: mockUserId });
      const res6 = createMockResponse();
      await verifyPasscode(req6, res6, jest.fn());

      expect(res6.status).toHaveBeenCalledWith(429);
      expect(res6.json).toHaveBeenCalledWith({
        status: false,
        msg: expect.stringContaining('Too many attempts'),
      });

      // bcrypt.compare was only called for the first 5 attempts, not the 6th
      expect(bcrypt.compare).toHaveBeenCalledTimes(5);
    });

    test('3c. Successful verification resets the attempt counter', async () => {
      const mockUserWithPasscode = {
        _id: mockUserId,
        passcode: '$2b$10$hashedpasscode',
      };
      User.findById.mockReturnValue(createMockQuery(mockUserWithPasscode));

      // Attempt 1: Failed
      bcrypt.compare.mockResolvedValueOnce(false);
      const req1 = createMockRequest({ passcode: '0000' }, {}, {}, { id: mockUserId });
      const res1 = createMockResponse();
      await verifyPasscode(req1, res1, jest.fn());
      expect(res1.json).toHaveBeenCalledWith({ status: false, msg: 'Incorrect passcode PIN' });

      // Attempt 2: Failed
      bcrypt.compare.mockResolvedValueOnce(false);
      const req2 = createMockRequest({ passcode: '0000' }, {}, {}, { id: mockUserId });
      const res2 = createMockResponse();
      await verifyPasscode(req2, res2, jest.fn());
      expect(res2.json).toHaveBeenCalledWith({ status: false, msg: 'Incorrect passcode PIN' });

      // Attempt 3: SUCCESSFUL -> Resets attempt counter
      bcrypt.compare.mockResolvedValueOnce(true);
      const req3 = createMockRequest({ passcode: '1234' }, {}, {}, { id: mockUserId });
      const res3 = createMockResponse();
      await verifyPasscode(req3, res3, jest.fn());
      expect(res3.json).toHaveBeenCalledWith({ status: true, msg: 'Passcode verified' });

      // Attempt 4 & 5 (after reset): Failed -> should NOT trigger lockout because counter was reset
      bcrypt.compare.mockResolvedValueOnce(false);
      const req4 = createMockRequest({ passcode: '0000' }, {}, {}, { id: mockUserId });
      const res4 = createMockResponse();
      await verifyPasscode(req4, res4, jest.fn());
      expect(res4.json).toHaveBeenCalledWith({ status: false, msg: 'Incorrect passcode PIN' });

      bcrypt.compare.mockResolvedValueOnce(false);
      const req5 = createMockRequest({ passcode: '0000' }, {}, {}, { id: mockUserId });
      const res5 = createMockResponse();
      await verifyPasscode(req5, res5, jest.fn());
      expect(res5.json).toHaveBeenCalledWith({ status: false, msg: 'Incorrect passcode PIN' });

      // bcrypt.compare was called 5 times total, but no 429 was returned since counter was reset
      expect(res5.status).not.toHaveBeenCalledWith(429);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. blockUser / unblockUser
  // ---------------------------------------------------------------------------
  describe('4. blockUser and unblockUser', () => {
    test('blockUser happy path: adds target user to blockedUsers via $addToSet', async () => {
      const mockUpdatedUser = {
        _id: mockUserId,
        blockedUsers: [
          { _id: mockStrangerId, username: 'blockedUser', email: 'blocked@test.com' },
        ],
      };

      User.findByIdAndUpdate.mockReturnValue(createMockQuery(mockUpdatedUser));

      const req = createMockRequest({
        targetUserId: mockStrangerId,
      }, {}, {}, { id: mockUserId });
      const res = createMockResponse();
      const next = jest.fn();

      await blockUser(req, res, next);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { $addToSet: { blockedUsers: mockStrangerId } },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        blockedUsers: mockUpdatedUser.blockedUsers,
      });
    });

    test('unblockUser happy path: removes target user from blockedUsers via $pull', async () => {
      const mockUpdatedUser = {
        _id: mockUserId,
        blockedUsers: [],
      };

      User.findByIdAndUpdate.mockReturnValue(createMockQuery(mockUpdatedUser));

      const req = createMockRequest({
        targetUserId: mockStrangerId,
      }, {}, {}, { id: mockUserId });
      const res = createMockResponse();
      const next = jest.fn();

      await unblockUser(req, res, next);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { $pull: { blockedUsers: mockStrangerId } },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        blockedUsers: [],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Fail-Closed Authentication Verification across Protected Controllers
  // ---------------------------------------------------------------------------
  describe('5. Fail-Closed Authentication: Rejects unauthenticated invocations with 401 without trusting body/query/params', () => {
    const protectedControllers = [
      { name: 'avtar', handler: avtar, req: { body: { userId: mockUserId, image: 'avatar_data' }, user: undefined } },
      { name: 'getUserById', handler: getUserById, req: { params: { id: mockContactId, userId: mockUserId }, user: undefined } },
      { name: 'getAllUsers', handler: getAllUsers, req: { query: { viewerId: mockUserId }, body: { userId: mockUserId }, user: undefined } },
      { name: 'getContactsWithLastMessage', handler: getContactsWithLastMessage, req: { body: { userId: mockUserId }, user: undefined } },
      { name: 'updateProfile', handler: updateProfile, req: { body: { userId: mockUserId, username: 'hacker' }, user: undefined } },
      { name: 'updatePrivacySettings', handler: updatePrivacySettings, req: { body: { userId: mockUserId, privacySettings: {} }, user: undefined } },
      { name: 'blockUser', handler: blockUser, req: { body: { userId: mockUserId, targetUserId: mockStrangerId }, user: undefined } },
      { name: 'unblockUser', handler: unblockUser, req: { body: { userId: mockUserId, targetUserId: mockStrangerId }, user: undefined } },
      { name: 'getBlockedUsers', handler: getBlockedUsers, req: { body: { userId: mockUserId }, user: undefined } },
      { name: 'setPasscode', handler: setPasscode, req: { body: { userId: mockUserId, passcode: '1234' }, user: undefined } },
      { name: 'verifyPasscode', handler: verifyPasscode, req: { body: { userId: mockUserId, passcode: '1234' }, user: undefined } },
      { name: 'searchUsers', handler: searchUsers, req: { query: { q: 'alice', viewerId: mockUserId }, user: undefined } },
      { name: 'addContact', handler: addContact, req: { body: { userId: mockUserId, contactId: mockContactId }, user: undefined } },
      { name: 'removeContact', handler: removeContact, req: { body: { userId: mockUserId, contactId: mockContactId }, user: undefined } },
    ];

    protectedControllers.forEach(({ name, handler, req }) => {
      test(`${name} returns 401 fail-closed when req.user is missing despite userId supplied in body/params/query`, async () => {
        const res = createMockResponse();
        const next = jest.fn();

        await handler(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Authentication required',
        });
        expect(User.findById).not.toHaveBeenCalled();
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(User.find).not.toHaveBeenCalled();
        expect(User.aggregate).not.toHaveBeenCalled();
      });
    });
  });
});
