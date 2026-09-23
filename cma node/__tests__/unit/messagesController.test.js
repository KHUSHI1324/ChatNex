const mongoose = require('mongoose');
const messageModel = require('../../models/messageModel');
const Group = require('../../models/groupModel');
const User = require('../../models/userModels');
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

jest.mock('../../models/messageModel');
jest.mock('../../models/groupModel');
jest.mock('../../models/userModels');
jest.mock('../../controllers/aiController', () => ({
  generateAIReply: jest.fn().mockResolvedValue('Mock AI reply'),
  generateAIImage: jest.fn().mockResolvedValue({ prompt: 'test', imageUrl: 'http://img.test/ai.jpg' }),
}));

// Helper to construct mock Express response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to construct mock Express request object with authenticated user by default
const createMockRequest = (
  body = {},
  params = {},
  query = {},
  file = null,
  files = null,
  user = { id: '507f1f77bcf86cd799439011', username: 'testuser' }
) => ({
  body,
  params,
  query,
  file,
  files,
  user,
});

// Helper to reliably mock findById returning a promise/query chain
const mockFindById = (doc) => {
  messageModel.findById.mockImplementation(() => {
    if (!doc) {
      const q = Promise.resolve(null);
      q.populate = jest.fn().mockResolvedValue(null);
      q.select = jest.fn().mockResolvedValue(null);
      return q;
    }
    const q = Promise.resolve(doc);
    q.populate = jest.fn().mockResolvedValue(doc);
    q.select = jest.fn().mockResolvedValue(doc);
    return q;
  });
};

describe('messagesController Unit Tests', () => {
  const mockUserId1 = '507f1f77bcf86cd799439011';
  const mockUserId2 = '507f1f77bcf86cd799439012';
  const mockMessageId = '507f1f77bcf86cd799439013';
  const mockGroupId = '507f1f77bcf86cd799439014';

  beforeEach(() => {
    jest.clearAllMocks();
    messageModel.findOneAndUpdate = jest.fn().mockResolvedValue({});
    messageModel.create = jest.fn().mockResolvedValue({ _id: mockMessageId });
    messageModel.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    messageModel.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
    messageModel.distinct = jest.fn().mockResolvedValue(['session1', 'session2']);
  });

  // =========================================================================
  // 1. reactToMessage
  // =========================================================================
  describe('1. reactToMessage', () => {
    it('1a. Happy path: adds new reaction using atomic operators', async () => {
      const mockDoc = {
        _id: mockMessageId,
        reactions: [],
      };
      const populatedDoc = {
        _id: mockMessageId,
        reactions: [
          {
            userId: { _id: mockUserId1, username: 'Alice', avtarImage: 'alice.png', email: 'alice@test.com' },
            emoji: '❤️',
          },
        ],
      };

      messageModel.findById.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(mockDoc),
        populate: jest.fn().mockResolvedValue(populatedDoc),
      }));

      const req = createMockRequest({
        messageId: mockMessageId,
        username: 'Alice',
        emoji: '❤️',
      });
      const res = createMockResponse();
      const next = jest.fn();

      await reactToMessage(req, res, next);

      expect(messageModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockMessageId },
        { $pull: { reactions: { userId: expect.any(mongoose.Types.ObjectId) } } }
      );
      expect(messageModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockMessageId },
        {
          $push: {
            reactions: {
              userId: expect.any(mongoose.Types.ObjectId),
              username: 'Alice',
              emoji: '❤️',
            },
          },
        }
      );
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        messageId: mockMessageId,
        reactions: [
          {
            userId: mockUserId1,
            username: 'Alice',
            userAvatar: 'alice.png',
            emoji: '❤️',
          },
        ],
      });
    });

    it('1b. Happy path: replaces existing reaction with a different emoji', async () => {
      const mockDoc = {
        _id: mockMessageId,
        reactions: [
          {
            userId: new mongoose.Types.ObjectId(mockUserId1),
            username: 'Alice',
            emoji: '❤️',
          },
        ],
      };
      const populatedDoc = {
        _id: mockMessageId,
        reactions: [
          {
            userId: { _id: mockUserId1, username: 'Alice', avtarImage: 'alice.png', email: 'alice@test.com' },
            emoji: '🔥',
          },
        ],
      };

      messageModel.findById.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(mockDoc),
        populate: jest.fn().mockResolvedValue(populatedDoc),
      }));

      const req = createMockRequest({
        messageId: mockMessageId,
        username: 'Alice',
        emoji: '🔥',
      });
      const res = createMockResponse();
      const next = jest.fn();

      await reactToMessage(req, res, next);

      expect(messageModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockMessageId },
        { $pull: { reactions: { userId: expect.any(mongoose.Types.ObjectId) } } }
      );
      expect(messageModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockMessageId },
        {
          $push: {
            reactions: {
              userId: expect.any(mongoose.Types.ObjectId),
              username: 'Alice',
              emoji: '🔥',
            },
          },
        }
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          reactions: expect.arrayContaining([
            expect.objectContaining({ emoji: '🔥' }),
          ]),
        })
      );
    });

    it('1c. Happy path: removes reaction when same emoji is clicked twice (toggle off without $push)', async () => {
      const mockDoc = {
        _id: mockMessageId,
        reactions: [
          {
            userId: new mongoose.Types.ObjectId(mockUserId1),
            username: 'Alice',
            emoji: '👍',
          },
        ],
      };
      const populatedDoc = {
        _id: mockMessageId,
        reactions: [],
      };

      messageModel.findById.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(mockDoc),
        populate: jest.fn().mockResolvedValue(populatedDoc),
      }));

      const req = createMockRequest({
        messageId: mockMessageId,
        username: 'Alice',
        emoji: '👍',
      });
      const res = createMockResponse();
      const next = jest.fn();

      await reactToMessage(req, res, next);

      expect(messageModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(messageModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockMessageId },
        { $pull: { reactions: { userId: expect.any(mongoose.Types.ObjectId) } } }
      );
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        messageId: mockMessageId,
        reactions: [],
      });
    });

    it('1d. Atomic operators prevent duplicate reaction entries on concurrent interleaved calls', async () => {
      let sharedReactions = [];

      messageModel.findOneAndUpdate.mockImplementation(async (filter, update) => {
        if (update.$pull) {
          const pullUid = update.$pull.reactions.userId.toString();
          sharedReactions = sharedReactions.filter(
            (r) => (r.userId?._id || r.userId || '').toString() !== pullUid
          );
        }
        if (update.$push) {
          sharedReactions.push(update.$push.reactions);
        }
        return { _id: mockMessageId, reactions: sharedReactions };
      });

      let callCount = 0;
      messageModel.findById.mockImplementation(() => {
        callCount++;
        const currentCall = callCount;
        return {
          select: jest.fn().mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, currentCall === 1 ? 5 : 15));
            return { _id: mockMessageId, reactions: [...sharedReactions] };
          }),
          populate: jest.fn().mockImplementation(async () => {
            return {
              _id: mockMessageId,
              reactions: sharedReactions.map((r) => ({
                userId: {
                  _id: (r.userId?._id || r.userId || '').toString(),
                  username: r.username || 'Alice',
                  avtarImage: 'avatar.png',
                  email: 'alice@test.com',
                },
                emoji: r.emoji,
                username: r.username || 'Alice',
              })),
            };
          }),
        };
      });

      const req1 = createMockRequest({ messageId: mockMessageId, username: 'Alice', emoji: '❤️' });
      const req2 = createMockRequest({ messageId: mockMessageId, username: 'Alice', emoji: '🔥' });

      const res1 = createMockResponse();
      const res2 = createMockResponse();
      const next1 = jest.fn();
      const next2 = jest.fn();

      await Promise.all([
        reactToMessage(req1, res1, next1),
        reactToMessage(req2, res2, next2),
      ]);

      const userReactions = sharedReactions.filter(
        (r) => (r.userId?._id || r.userId || '').toString() === mockUserId1
      );
      expect(userReactions).toHaveLength(1);
      expect(['❤️', '🔥']).toContain(userReactions[0].emoji);

      expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ status: true }));
      expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ status: true }));
    });

    it('1e. Missing required params returns 400', async () => {
      const req = createMockRequest({ messageId: '', emoji: '❤️' });
      const res = createMockResponse();
      const next = jest.fn();

      await reactToMessage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'messageId and emoji are required',
      });
    });

    it('1f. Message not found returns 404', async () => {
      mockFindById(null);

      const req = createMockRequest({ messageId: mockMessageId, emoji: '❤️' });
      const res = createMockResponse();
      const next = jest.fn();

      await reactToMessage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Message not found',
      });
    });
  });

  // =========================================================================
  // 2. uploadMedia
  // =========================================================================
  describe('2. uploadMedia', () => {
    it('2a. Happy path: saves valid media files and returns status 201', async () => {
      const mockSavedDoc = {
        _id: mockMessageId,
        message: { text: 'Check this image', imgpath: 'uploads/photo.jpg', files: [] },
        users: [mockUserId1, mockUserId2],
        sender: new mongoose.Types.ObjectId(mockUserId1),
        read: false,
      };

      messageModel.mockImplementation(() => ({
        save: jest.fn().mockResolvedValueOnce(mockSavedDoc),
      }));

      User.findById
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce({ blockedUsers: [] }) })
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce({ blockedUsers: [] }) });

      const mockFile = {
        filename: 'photo.jpg',
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };

      const req = createMockRequest(
        {
          to: mockUserId2,
          message: 'Check this image',
        },
        {},
        {},
        mockFile,
        [mockFile]
      );
      const res = createMockResponse();
      const next = jest.fn();

      await uploadMedia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 201,
          finaldata: mockSavedDoc,
          imgpath: 'uploads/photo.jpg',
        })
      );
    });

    it('2b. Missing files returns status 400 with error shape', async () => {
      const req = createMockRequest({ to: mockUserId2 }, {}, {}, null, []);
      const res = createMockResponse();
      const next = jest.fn();

      await uploadMedia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 400,
        error: 'No files uploaded',
      });
    });

    it('2c. Non-member sending media to a group returns status 403', async () => {
      Group.findById.mockResolvedValueOnce({
        _id: mockGroupId,
        members: [new mongoose.Types.ObjectId(mockUserId2)], // mockUserId1 is NOT a member
      });

      const mockFile = { filename: 'doc.pdf', originalname: 'doc.pdf', mimetype: 'application/pdf', size: 2048 };
      const req = createMockRequest(
        {
          to: mockGroupId,
          groupId: mockGroupId,
          isGroup: true,
        },
        {},
        {},
        mockFile,
        [mockFile]
      );
      const res = createMockResponse();
      const next = jest.fn();

      await uploadMedia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 403,
        error: "You can't send files to this group because you're no longer a participant.",
      });
    });

    it('2d. Blocked contact returns status 403 with blocked: true', async () => {
      User.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValueOnce({
            blockedUsers: [new mongoose.Types.ObjectId(mockUserId2)], // Sender blocked recipient
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValueOnce({ blockedUsers: [] }),
        });

      const mockFile = { filename: 'image.png', originalname: 'image.png', mimetype: 'image/png', size: 1024 };
      const req = createMockRequest(
        { to: mockUserId2 },
        {},
        {},
        mockFile,
        [mockFile]
      );
      const res = createMockResponse();
      const next = jest.fn();

      await uploadMedia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 403,
        blocked: true,
        isBlockedByMe: true,
        error: 'You have blocked this contact. Unblock to send files.',
      });
    });

    it('2e. Malformed replyTo JSON gracefully falls back to null without crashing', async () => {
      const mockSavedDoc = { _id: mockMessageId, replyTo: null };
      messageModel.create.mockResolvedValueOnce(mockSavedDoc);
      messageModel.findById.mockImplementation(() => ({
        populate: jest.fn().mockResolvedValueOnce(mockSavedDoc),
      }));

      User.findById
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce({ blockedUsers: [] }) })
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce({ blockedUsers: [] }) });

      const mockFile = { filename: 'image.png', originalname: 'image.png', mimetype: 'image/png', size: 1024 };
      const req = createMockRequest(
        {
          to: mockUserId2,
          replyTo: 'INVALID_CORRUPT_JSON{{{',
        },
        {},
        {},
        mockFile,
        [mockFile]
      );
      const res = createMockResponse();
      const next = jest.fn();

      await uploadMedia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 201,
          replyTo: null,
        })
      );
    });

    it('2f. Invalid from or to ObjectId string returns clean HTTP 400 validation error', async () => {
      const mockFile = { filename: 'file.txt', originalname: 'file.txt', mimetype: 'text/plain', size: 500 };

      // 1. Invalid 'from' via req.user.id
      const reqInvalidFrom = createMockRequest(
        {
          to: mockUserId2,
        },
        {},
        {},
        mockFile,
        [mockFile],
        { id: 'NOT_A_VALID_OBJECT_ID_123' }
      );
      const resInvalidFrom = createMockResponse();
      const nextInvalidFrom = jest.fn();

      await uploadMedia(reqInvalidFrom, resInvalidFrom, nextInvalidFrom);

      expect(resInvalidFrom.status).toHaveBeenCalledWith(400);
      expect(resInvalidFrom.json).toHaveBeenCalledWith({
        status: 400,
        error: 'Invalid sender ID format',
      });

      // 2. Missing 'to'
      const reqMissingTo = createMockRequest(
        {},
        {},
        {},
        mockFile,
        [mockFile]
      );
      const resMissingTo = createMockResponse();
      const nextMissingTo = jest.fn();

      await uploadMedia(reqMissingTo, resMissingTo, nextMissingTo);

      expect(resMissingTo.status).toHaveBeenCalledWith(400);
      expect(resMissingTo.json).toHaveBeenCalledWith({
        status: 400,
        error: 'Recipient ID (to) is required',
      });
    });
  });

  // =========================================================================
  // 3. getAllMessage
  // =========================================================================
  describe('3. getAllMessage', () => {
    it('3a. Happy path: retrieves messages with populated sender, pinnedBy, and reactions', async () => {
      const mockMessages = [
        {
          _id: mockMessageId,
          message: { text: 'Hello world', imgpath: '', files: [] },
          sender: { _id: mockUserId1, username: 'Alice', avtarImage: 'avatar.png' },
          pinnedBy: { _id: mockUserId1, username: 'Alice' },
          reactions: [
            {
              userId: { _id: mockUserId2, username: 'Bob', avtarImage: 'bob.png' },
              emoji: '❤️',
            },
          ],
          deletedFor: [],
          starredBy: [mockUserId1],
          isPinned: true,
          createdAt: new Date(),
          read: true,
        },
      ];

      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValueOnce(mockMessages),
      };
      messageModel.find.mockReturnValue(chain);

      const req = createMockRequest({ to: mockUserId2 });
      const res = createMockResponse();
      const next = jest.fn();

      await getAllMessage(req, res, next);

      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          _id: mockMessageId,
          fromSelf: true,
          senderName: 'Alice',
          senderAvatar: 'avatar.png',
          message: 'Hello world',
          isPinned: true,
          pinnedByName: 'Alice',
          isStarred: true,
          reactions: [
            {
              userId: mockUserId2,
              username: 'Bob',
              userAvatar: 'bob.png',
              emoji: '❤️',
            },
          ],
        }),
      ]);
    });

    it('3b. Empty collection returns empty array', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValueOnce([]),
      };
      messageModel.find.mockReturnValue(chain);

      const req = createMockRequest({ to: mockUserId2 });
      const res = createMockResponse();
      const next = jest.fn();

      await getAllMessage(req, res, next);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('3c. Invalid group ObjectId throws CastError and calls next(error)', async () => {
      const req = createMockRequest({ to: 'INVALID_GROUP_ID', isGroup: true });
      const res = createMockResponse();
      const next = jest.fn();

      await getAllMessage(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.json).not.toHaveBeenCalled();
    });

    it('3d. Populated field returning null uses fallback values without crashing', async () => {
      const mockMessages = [
        {
          _id: mockMessageId,
          message: { text: 'Deleted user message' },
          sender: null,
          pinnedBy: null,
          reactions: [{ userId: null, emoji: '👏' }],
          deletedFor: [],
          starredBy: [],
          createdAt: new Date(),
        },
      ];

      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValueOnce(mockMessages),
      };
      messageModel.find.mockReturnValue(chain);

      const req = createMockRequest({ to: mockUserId2 });
      const res = createMockResponse();
      const next = jest.fn();

      await getAllMessage(req, res, next);

      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          senderName: '',
          senderAvatar: '',
          pinnedByName: '',
          reactions: [
            expect.objectContaining({
              username: 'User',
              emoji: '👏',
            }),
          ],
        }),
      ]);
    });
  });

  // =========================================================================
  // 4. markAsRead
  // =========================================================================
  describe('4. markAsRead', () => {
    const mockRecipientId = '507f1f77bcf86cd799439011'; // Authenticated reader (Alice)
    const mockSenderId = '507f1f77bcf86cd799439012';    // Message sender (Bob)

    it('4a. 1-on-1 Happy path: recipient (Alice) marks messages sent by sender (Bob) as read with exact filter', async () => {
      messageModel.updateMany.mockResolvedValueOnce({ modifiedCount: 3 });

      // Alice is authenticated (req.user.id = mockRecipientId), marking messages from Bob (req.body.from = mockSenderId)
      const req = createMockRequest(
        { from: mockSenderId },
        {},
        {},
        null,
        null,
        { id: mockRecipientId, username: 'Alice' }
      );
      const res = createMockResponse();
      const next = jest.fn();

      await markAsRead(req, res, next);

      // Verify exact filter: only unread messages in [Bob, Alice] conversation where sender is Bob
      expect(messageModel.updateMany).toHaveBeenCalledWith(
        {
          users: { $all: [mockSenderId, mockRecipientId] },
          sender: new mongoose.Types.ObjectId(mockSenderId),
          read: false,
        },
        { $set: { read: true } }
      );

      expect(res.json).toHaveBeenCalledWith({
        msg: 'Messages marked as read',
        modifiedCount: 3,
      });
    });

    it('4b. Group Happy path: group member (Alice) marks group messages from other participants as read (sender != Alice)', async () => {
      messageModel.updateMany.mockResolvedValueOnce({ modifiedCount: 5 });

      const req = createMockRequest(
        { groupId: mockGroupId, isGroup: true, from: mockGroupId },
        {},
        {},
        null,
        null,
        { id: mockRecipientId, username: 'Alice' }
      );
      const res = createMockResponse();
      const next = jest.fn();

      await markAsRead(req, res, next);

      // Verify exact group filter: unread messages in group where sender is NOT Alice
      expect(messageModel.updateMany).toHaveBeenCalledWith(
        {
          groupId: new mongoose.Types.ObjectId(mockGroupId),
          sender: { $ne: new mongoose.Types.ObjectId(mockRecipientId) },
          read: false,
        },
        { $set: { read: true } }
      );

      expect(res.json).toHaveBeenCalledWith({
        msg: 'Messages marked as read',
        modifiedCount: 5,
      });
    });

    it('4c. Invalid group ID gracefully returns 200 with message and modifiedCount 0', async () => {
      const req = createMockRequest({
        from: 'INVALID_GROUP_ID',
        isGroup: true,
      });
      const res = createMockResponse();
      const next = jest.fn();

      await markAsRead(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        msg: 'Invalid group ID',
        modifiedCount: 0,
      });
    });
  });

  // =========================================================================
  // 5. editMessage, deleteMessage, pinMessage, starMessage
  // =========================================================================
  describe('5. editMessage', () => {
    it('5a. Happy path: edits message successfully', async () => {
      const mockDoc = {
        _id: mockMessageId,
        sender: new mongoose.Types.ObjectId(mockUserId1),
        message: { text: 'Old text' },
        isEdited: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockFindById(mockDoc);

      const req = createMockRequest({
        messageId: mockMessageId,
        newText: 'Updated text',
      });
      const res = createMockResponse();
      const next = jest.fn();

      await editMessage(req, res, next);

      expect(mockDoc.message.text).toBe('Updated text');
      expect(mockDoc.isEdited).toBe(true);
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        messageId: mockMessageId,
        newText: 'Updated text',
        isEdited: true,
      });
    });

    it('5b. Unauthorized user editing another users message returns 403', async () => {
      const mockDoc = {
        _id: mockMessageId,
        sender: new mongoose.Types.ObjectId(mockUserId2),
      };
      mockFindById(mockDoc);

      const req = createMockRequest(
        {
          messageId: mockMessageId,
          newText: 'Hacked text',
        },
        {},
        {},
        null,
        null,
        { id: mockUserId1 }
      );
      const res = createMockResponse();
      const next = jest.fn();

      await editMessage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'You can only edit your own messages',
      });
    });

    it('5c. Message not found returns 404', async () => {
      mockFindById(null);

      const req = createMockRequest({
        messageId: mockMessageId,
        newText: 'Some text',
      });
      const res = createMockResponse();
      const next = jest.fn();

      await editMessage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Message not found',
      });
    });
  });

  describe('5. deleteMessage', () => {
    it('5d. Happy path: delete for everyone replaces text and marks isDeleted', async () => {
      const mockDoc = {
        _id: mockMessageId,
        sender: new mongoose.Types.ObjectId(mockUserId1),
        message: { text: 'Secret message', files: ['file.jpg'], imgpath: 'file.jpg' },
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockFindById(mockDoc);

      const req = createMockRequest({
        messageId: mockMessageId,
        deleteType: 'everyone',
      });
      const res = createMockResponse();
      const next = jest.fn();

      await deleteMessage(req, res, next);

      expect(mockDoc.isDeleted).toBe(true);
      expect(mockDoc.message.text).toBe('🚫 This message was deleted');
      expect(mockDoc.message.files).toEqual([]);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          deleteType: 'everyone',
          isDeleted: true,
        })
      );
    });

    it('5e. Happy path: delete for me adds userId to deletedFor array', async () => {
      const mockDoc = {
        _id: mockMessageId,
        deletedFor: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockFindById(mockDoc);

      const req = createMockRequest({
        messageId: mockMessageId,
        deleteType: 'me',
      });
      const res = createMockResponse();
      const next = jest.fn();

      await deleteMessage(req, res, next);

      expect(mockDoc.deletedFor).toHaveLength(1);
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        messageId: mockMessageId,
        deleteType: 'me',
      });
    });

    it('5f. Unauthorized delete for everyone by non-sender returns 403', async () => {
      const mockDoc = {
        _id: mockMessageId,
        sender: new mongoose.Types.ObjectId(mockUserId2),
      };
      mockFindById(mockDoc);

      const req = createMockRequest(
        {
          messageId: mockMessageId,
          deleteType: 'everyone',
        },
        {},
        {},
        null,
        null,
        { id: mockUserId1 }
      );
      const res = createMockResponse();
      const next = jest.fn();

      await deleteMessage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'You can only delete for everyone on your own messages',
      });
    });
  });

  describe('5. pinMessage & starMessage', () => {
    it('5g. Pin message: sets isPinned and pinnedAt correctly', async () => {
      const mockDoc = {
        _id: mockMessageId,
        isPinned: false,
        pinnedAt: null,
        pinnedBy: null,
        save: jest.fn().mockResolvedValue(true),
      };
      mockFindById(mockDoc);

      const req = createMockRequest({
        messageId: mockMessageId,
        isPinned: true,
      });
      const res = createMockResponse();
      const next = jest.fn();

      await pinMessage(req, res, next);

      expect(mockDoc.isPinned).toBe(true);
      expect(mockDoc.pinnedAt).toBeInstanceOf(Date);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          messageId: mockMessageId,
          isPinned: true,
        })
      );
    });

    it('5h. Star message: toggles star state correctly', async () => {
      const mockDoc = {
        _id: mockMessageId,
        starredBy: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockFindById(mockDoc);

      const req = createMockRequest({
        messageId: mockMessageId,
      });
      const res = createMockResponse();
      const next = jest.fn();

      await starMessage(req, res, next);

      expect(mockDoc.starredBy).toHaveLength(1);
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        messageId: mockMessageId,
        isStarred: true,
      });
    });
  });

  // =========================================================================
  // 6. Fail-Closed Authentication Tests (All 11 Controller Functions)
  // =========================================================================
  describe('6. Fail-Closed Authentication Tests', () => {
    const unauthenticatedReq = { body: {}, params: {}, query: {}, user: undefined };

    it('6a. addMessage rejects unauthenticated request with 401', async () => {
      const res = createMockResponse();
      const next = jest.fn();

      await addMessage(unauthenticatedReq, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });

    it('6b. uploadMedia rejects unauthenticated request with 401', async () => {
      const res = createMockResponse();
      const next = jest.fn();

      await uploadMedia(unauthenticatedReq, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });

    it('6c. getAllMessage rejects unauthenticated request with 401', async () => {
      const res = createMockResponse();
      const next = jest.fn();

      await getAllMessage(unauthenticatedReq, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });

    it('6d. markAsRead rejects unauthenticated request with 401', async () => {
      const res = createMockResponse();
      const next = jest.fn();

      await markAsRead(unauthenticatedReq, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });

    it('6e. reactToMessage rejects unauthenticated request with 401', async () => {
      const res = createMockResponse();
      const next = jest.fn();

      await reactToMessage(unauthenticatedReq, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });

    it('6f. editMessage rejects unauthenticated request with 401', async () => {
      const res = createMockResponse();
      const next = jest.fn();

      await editMessage(unauthenticatedReq, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });

    it('6g. deleteMessage rejects unauthenticated request with 401', async () => {
      const res = createMockResponse();
      const next = jest.fn();

      await deleteMessage(unauthenticatedReq, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });

    it('6h. pinMessage rejects unauthenticated request with 401', async () => {
      const res = createMockResponse();
      const next = jest.fn();

      await pinMessage(unauthenticatedReq, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });

    it('6i. starMessage rejects unauthenticated request with 401', async () => {
      const res = createMockResponse();
      const next = jest.fn();

      await starMessage(unauthenticatedReq, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });

    it('6j. getAISessions rejects unauthenticated request with 401', async () => {
      const res = createMockResponse();
      const next = jest.fn();

      await getAISessions(unauthenticatedReq, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });

    it('6k. deleteAISession rejects unauthenticated request with 401', async () => {
      const res = createMockResponse();
      const next = jest.fn();

      await deleteAISession(unauthenticatedReq, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });
  });
});
