const mongoose = require('mongoose');
const Call = require('../../models/callModel');
const User = require('../../models/userModels');
const Group = require('../../models/groupModel');
const {
  logCall,
  getUserCallLogs,
  clearCallLogs,
} = require('../../controllers/callController');

jest.mock('../../models/callModel');
jest.mock('../../models/userModels');
jest.mock('../../models/groupModel');

const mockCallerId = '507f1f77bcf86cd799439011';
const mockReceiverId = '507f1f77bcf86cd799439012';
const mockGroupId = '507f1f77bcf86cd799439013';
const mockCallId = '507f1f77bcf86cd799439014';

// Helper to construct mock Express response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to construct mock Express request object with authenticated user context
const createMockRequest = (body = {}, params = {}, query = {}, user = { id: mockCallerId }) => ({
  body,
  params,
  query,
  user,
});

// Helper to construct chainable Mongoose query object
const createMockQuery = (doc) => {
  const query = {
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

describe('callController Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. logCall
  // ---------------------------------------------------------------------------
  describe('1. logCall', () => {
    test('Happy path: logs 1-on-1 call successfully with 201 status using req.user.id as caller', async () => {
      const mockCreatedCall = {
        _id: mockCallId,
        caller: mockCallerId,
        receiver: mockReceiverId,
        callType: 'audio',
        status: 'ended',
        duration: 45,
      };

      Call.create.mockResolvedValue(mockCreatedCall);
      Call.findById.mockReturnValue(createMockQuery({
        ...mockCreatedCall,
        caller: { _id: mockCallerId, username: 'Alice' },
        receiver: { _id: mockReceiverId, username: 'Bob' },
      }));

      const req = createMockRequest({
        receiver: mockReceiverId,
        callType: 'audio',
        status: 'ended',
        duration: 45,
      }, {}, {}, { id: mockCallerId });
      const res = createMockResponse();
      const next = jest.fn();

      await logCall(req, res, next);

      expect(Call.create).toHaveBeenCalledWith(expect.objectContaining({
        caller: expect.any(mongoose.Types.ObjectId),
        callType: 'audio',
        duration: 45,
        status: 'ended',
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: true,
        call: expect.objectContaining({ _id: mockCallId }),
      }));
    });

    test('Happy path: logs group video call successfully with 201 status', async () => {
      const mockCreatedCall = {
        _id: mockCallId,
        caller: mockCallerId,
        isGroup: true,
        groupId: mockGroupId,
        participants: [mockCallerId, mockReceiverId],
        callType: 'video',
        status: 'answered',
      };

      Call.create.mockResolvedValue(mockCreatedCall);
      Call.findById.mockReturnValue(createMockQuery(mockCreatedCall));

      const req = createMockRequest({
        isGroup: true,
        groupId: mockGroupId,
        participants: [mockCallerId, mockReceiverId],
        callType: 'video',
        status: 'answered',
      }, {}, {}, { id: mockCallerId });
      const res = createMockResponse();
      const next = jest.fn();

      await logCall(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: true,
        call: expect.objectContaining({ isGroup: true }),
      }));
    });

    test('Missing caller in req.user returns 400 with { status: false, msg: "Caller ID is required" }', async () => {
      const req = createMockRequest({ receiver: mockReceiverId }, {}, {}, null);
      const res = createMockResponse();
      const next = jest.fn();

      await logCall(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Caller ID is required',
      });
      expect(Call.create).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. getUserCallLogs
  // ---------------------------------------------------------------------------
  describe('2. getUserCallLogs', () => {
    test('Happy path: fetches and formats user call logs with directions using req.user.id', async () => {
      const mockCalls = [
        {
          _id: 'call_1',
          caller: { _id: mockCallerId, username: 'Alice' },
          receiver: { _id: mockReceiverId, username: 'Bob' },
          callType: 'audio',
          status: 'ended',
          duration: 120,
        },
        {
          _id: 'call_2',
          caller: { _id: mockReceiverId, username: 'Bob' },
          receiver: { _id: mockCallerId, username: 'Alice' },
          callType: 'audio',
          status: 'missed',
          duration: 0,
        },
      ];

      Call.find.mockReturnValue(createMockQuery(mockCalls));

      const req = createMockRequest({}, {}, {}, { id: mockCallerId });
      const res = createMockResponse();
      const next = jest.fn();

      await getUserCallLogs(req, res, next);

      expect(Call.find).toHaveBeenCalledWith({
        $or: [
          { caller: expect.any(mongoose.Types.ObjectId) },
          { receiver: expect.any(mongoose.Types.ObjectId) },
          { participants: expect.any(mongoose.Types.ObjectId) },
        ],
      });
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        callLogs: [
          expect.objectContaining({ _id: 'call_1', direction: 'outgoing' }),
          expect.objectContaining({ _id: 'call_2', direction: 'missed' }),
        ],
      });
    });

    test('Empty logs: returns empty array when no calls exist for user', async () => {
      Call.find.mockReturnValue(createMockQuery([]));

      const req = createMockRequest({}, {}, {}, { id: mockCallerId });
      const res = createMockResponse();
      const next = jest.fn();

      await getUserCallLogs(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        callLogs: [],
      });
    });

    test('Invalid or missing userId in req.user returns 400', async () => {
      const req = createMockRequest({}, {}, {}, { id: 'invalid_id' });
      const res = createMockResponse();
      const next = jest.fn();

      await getUserCallLogs(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Valid user ID is required',
      });
      expect(Call.find).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. clearCallLogs
  // ---------------------------------------------------------------------------
  describe('3. clearCallLogs', () => {
    test('Happy path: only deletes logs associated with the authenticated user (req.user.id)', async () => {
      Call.deleteMany.mockResolvedValue({ deletedCount: 4 });

      const req = createMockRequest({}, {}, {}, { id: mockCallerId });
      const res = createMockResponse();
      const next = jest.fn();

      await clearCallLogs(req, res, next);

      expect(Call.deleteMany).toHaveBeenCalledWith({
        $or: [
          { caller: new mongoose.Types.ObjectId(mockCallerId) },
          { receiver: new mongoose.Types.ObjectId(mockCallerId) },
          { participants: new mongoose.Types.ObjectId(mockCallerId) },
        ],
      });
      // Verifies that deleteMany was NOT called with empty filter {}
      expect(Call.deleteMany).not.toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        msg: 'Call history cleared successfully',
      });
    });

    test('Invalid or missing userId in req.user returns 400', async () => {
      const req = createMockRequest({}, {}, {}, { id: 'invalid_mongo_id' });
      const res = createMockResponse();
      const next = jest.fn();

      await clearCallLogs(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Valid user ID is required',
      });
      expect(Call.deleteMany).not.toHaveBeenCalled();
    });
  });
});
