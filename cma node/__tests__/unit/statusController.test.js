const mongoose = require('mongoose');
const Status = require('../../models/statusModel');
const User = require('../../models/userModels');
const {
  createStatus,
  getStatuses,
  viewStatus,
  deleteStatus,
} = require('../../controllers/statusController');

jest.mock('../../models/statusModel');
jest.mock('../../models/userModels');

const mockUserId = '507f1f77bcf86cd799439011';
const mockContactId = '507f1f77bcf86cd799439012';
const mockStatusId = '507f1f77bcf86cd799439013';

// Helper to construct mock Express response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to construct mock Express request object with authenticated user context
const createMockRequest = (body = {}, params = {}, query = {}, file = null, user = { id: mockUserId }) => ({
  body,
  params,
  query,
  file,
  user,
  protocol: 'http',
  get: jest.fn().mockReturnValue('localhost:5000'),
});

// Helper to construct chainable Mongoose query object
const createMockQuery = (doc) => {
  const query = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
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

describe('statusController Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. createStatus
  // ---------------------------------------------------------------------------
  describe('1. createStatus', () => {
    test('Happy path: creates a text status successfully', async () => {
      const mockCreatedStatus = {
        _id: mockStatusId,
        user: mockUserId,
        caption: 'Hello World Story',
        mediaType: 'text',
        backgroundColor: '#00a884',
        viewers: [],
      };

      Status.create.mockResolvedValue(mockCreatedStatus);
      Status.findById.mockReturnValue(createMockQuery({
        ...mockCreatedStatus,
        user: { _id: mockUserId, username: 'Alice' },
      }));

      const req = createMockRequest({
        caption: 'Hello World Story',
        mediaType: 'text',
        backgroundColor: '#00a884',
      });
      const res = createMockResponse();
      const next = jest.fn();

      await createStatus(req, res, next);

      expect(Status.create).toHaveBeenCalledWith(expect.objectContaining({
        user: mockUserId,
        caption: 'Hello World Story',
        mediaType: 'text',
        backgroundColor: '#00a884',
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: true,
        newStatus: expect.objectContaining({
          _id: mockStatusId,
          caption: 'Hello World Story',
        }),
      }));
    });

    test('Happy path: creates a media status with uploaded file buffer', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image-content'),
        mimetype: 'image/png',
      };

      const mockCreatedStatus = {
        _id: mockStatusId,
        user: mockUserId,
        mediaUrl: 'data:image/png;base64,' + Buffer.from('test-image-content').toString('base64'),
        mediaType: 'image',
      };

      Status.create.mockResolvedValue(mockCreatedStatus);
      Status.findById.mockReturnValue(createMockQuery(mockCreatedStatus));

      const req = createMockRequest(
        { caption: 'Photo Status' },
        {},
        {},
        mockFile
      );
      const res = createMockResponse();
      const next = jest.fn();

      await createStatus(req, res, next);

      expect(Status.create).toHaveBeenCalledWith(expect.objectContaining({
        user: mockUserId,
        mediaType: 'image',
        mediaUrl: expect.stringContaining('data:image/png;base64,'),
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: true }));
    });

    test('Missing authenticated user returns 401 fail-closed', async () => {
      const req = createMockRequest({ caption: 'Story with no user' }, {}, {}, null, null);
      const res = createMockResponse();
      const next = jest.fn();

      await createStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
      expect(Status.create).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. getStatuses
  // ---------------------------------------------------------------------------
  describe('2. getStatuses', () => {
    test('Happy path: separates myStatuses and contactStatuses with unseen status tracking', async () => {
      const now = new Date();
      const mockActiveStatuses = [
        {
          _id: 'status_1',
          user: { _id: { toString: () => mockUserId }, username: 'Me' },
          caption: 'My status update',
          createdAt: now,
          viewers: [],
        },
        {
          _id: 'status_2',
          user: { _id: { toString: () => mockContactId }, username: 'Bob' },
          caption: 'Bobs status update',
          createdAt: now,
          viewers: [{ user: { _id: { toString: () => 'other_user_id' } } }],
        },
      ];

      Status.find.mockReturnValue(createMockQuery(mockActiveStatuses));

      const req = createMockRequest({}, { userId: mockUserId });
      const res = createMockResponse();
      const next = jest.fn();

      await getStatuses(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        myStatuses: [expect.objectContaining({ _id: 'status_1' })],
        contactStatuses: [
          expect.objectContaining({
            hasUnseen: true, // mockUserId has not viewed status_2
            stories: [expect.objectContaining({ _id: 'status_2' })],
          }),
        ],
      });
    });

    test('Empty case: returns empty arrays when no active statuses exist', async () => {
      Status.find.mockReturnValue(createMockQuery([]));

      const req = createMockRequest({}, { userId: mockUserId });
      const res = createMockResponse();
      const next = jest.fn();

      await getStatuses(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        myStatuses: [],
        contactStatuses: [],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. viewStatus
  // ---------------------------------------------------------------------------
  describe('3. viewStatus', () => {
    test('Happy path: adds new viewer to viewers array and saves', async () => {
      const mockStatusDoc = {
        _id: mockStatusId,
        viewers: [],
        save: jest.fn().mockResolvedValue(true),
      };

      Status.findById
        .mockReturnValueOnce(Promise.resolve(mockStatusDoc)) // Initial fetch
        .mockReturnValueOnce(createMockQuery({ ...mockStatusDoc, viewers: [{ user: mockUserId }] })); // Populated fetch

      const req = createMockRequest({
        statusId: mockStatusId,
      });
      const res = createMockResponse();
      const next = jest.fn();

      await viewStatus(req, res, next);

      expect(mockStatusDoc.viewers).toHaveLength(1);
      expect(mockStatusDoc.viewers[0].user).toBe(mockUserId);
      expect(mockStatusDoc.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: true }));
    });

    test('Already viewed status: does not add duplicate viewer entry', async () => {
      const mockStatusDoc = {
        _id: mockStatusId,
        viewers: [{ user: mockUserId.toString(), viewedAt: new Date() }],
        save: jest.fn().mockResolvedValue(true),
      };

      Status.findById
        .mockReturnValueOnce(Promise.resolve(mockStatusDoc))
        .mockReturnValueOnce(createMockQuery(mockStatusDoc));

      const req = createMockRequest({
        statusId: mockStatusId,
      });
      const res = createMockResponse();
      const next = jest.fn();

      await viewStatus(req, res, next);

      expect(mockStatusDoc.viewers).toHaveLength(1);
      expect(mockStatusDoc.save).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: true }));
    });

    test('Missing statusId returns 200 with { status: false, msg: "Missing statusId or viewerId" }', async () => {
      const req = createMockRequest({}); // missing statusId
      const res = createMockResponse();
      const next = jest.fn();

      await viewStatus(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Missing statusId or viewerId',
      });
      expect(Status.findById).not.toHaveBeenCalled();
    });

    test('Status not found returns 200 with { status: false, msg: "Status not found" }', async () => {
      Status.findById.mockResolvedValue(null);

      const req = createMockRequest({
        statusId: mockStatusId,
      });
      const res = createMockResponse();
      const next = jest.fn();

      await viewStatus(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Status not found',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. deleteStatus
  // ---------------------------------------------------------------------------
  describe('4. deleteStatus', () => {
    test('Happy path: owner successfully deletes own status', async () => {
      const mockStatusDoc = {
        _id: mockStatusId,
        user: { toString: () => mockUserId },
      };

      Status.findById.mockResolvedValue(mockStatusDoc);
      Status.findByIdAndDelete = jest.fn().mockResolvedValue(mockStatusDoc);

      const req = createMockRequest({}, { statusId: mockStatusId }, {}, null, { id: mockUserId });
      const res = createMockResponse();
      const next = jest.fn();

      await deleteStatus(req, res, next);

      expect(Status.findByIdAndDelete).toHaveBeenCalledWith(mockStatusId);
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        msg: 'Status deleted successfully',
      });
    });

    test('Unauthorized user (non-owner) returns 200 with status false per established pattern', async () => {
      const mockStatusDoc = {
        _id: mockStatusId,
        user: { toString: () => mockUserId },
      };

      Status.findById.mockResolvedValue(mockStatusDoc);
      Status.findByIdAndDelete = jest.fn();

      const req = createMockRequest({}, { statusId: mockStatusId }, {}, null, { id: 'different_user_id' });
      const res = createMockResponse();
      const next = jest.fn();

      await deleteStatus(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Unauthorized to delete this status',
      });
      expect(Status.findByIdAndDelete).not.toHaveBeenCalled();
    });

    test('Status not found returns 200 with { status: false, msg: "Status not found" }', async () => {
      Status.findById.mockResolvedValue(null);

      const req = createMockRequest({}, { statusId: mockStatusId }, {}, null, { id: mockUserId });
      const res = createMockResponse();
      const next = jest.fn();

      await deleteStatus(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Status not found',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. TTL / Expiration Mechanism Verification
  // ---------------------------------------------------------------------------
  describe('5. TTL and 24-hour Expiration Filtering', () => {
    test('Queries active statuses using $gte 24-hour cutoff timestamp filter', async () => {
      Status.find.mockReturnValue(createMockQuery([]));

      const beforeCall = Date.now() - 24 * 60 * 60 * 1000;
      const req = createMockRequest({}, { userId: mockUserId });
      const res = createMockResponse();
      const next = jest.fn();

      await getStatuses(req, res, next);

      expect(Status.find).toHaveBeenCalledWith({
        createdAt: { $gte: expect.any(Date) },
      });

      const filterArg = Status.find.mock.calls[0][0];
      const appliedCutoff = filterArg.createdAt.$gte.getTime();
      expect(appliedCutoff).toBeGreaterThanOrEqual(beforeCall - 1000);
      expect(appliedCutoff).toBeLessThanOrEqual(Date.now() - 24 * 60 * 60 * 1000 + 1000);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Fail-Closed Authentication Verification across Status Controllers
  // ---------------------------------------------------------------------------
  describe('6. Fail-Closed Authentication: Rejects unauthenticated invocations with 401 without trusting body/params/query', () => {
    const protectedControllers = [
      { name: 'createStatus', handler: createStatus, req: { body: { userId: mockUserId, caption: 'Hello' }, user: undefined } },
      { name: 'getStatuses', handler: getStatuses, req: { params: { userId: mockUserId }, user: undefined } },
      { name: 'viewStatus', handler: viewStatus, req: { body: { statusId: mockStatusId, viewerId: mockUserId }, user: undefined } },
      { name: 'deleteStatus', handler: deleteStatus, req: { params: { statusId: mockStatusId }, body: { userId: mockUserId }, user: undefined } },
    ];

    protectedControllers.forEach(({ name, handler, req }) => {
      test(`${name} returns 401 fail-closed when req.user is missing despite identity field supplied in body/params`, async () => {
        const res = createMockResponse();
        const next = jest.fn();

        await handler(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Authentication required',
        });
        expect(Status.findById).not.toHaveBeenCalled();
        expect(Status.create).not.toHaveBeenCalled();
        expect(Status.find).not.toHaveBeenCalled();
      });
    });
  });
});
