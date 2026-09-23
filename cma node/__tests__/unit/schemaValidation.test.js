const mongoose = require('mongoose');
const UserModel = require('../../models/userModels');
const MessageModel = require('../../models/messageModel');
const GroupModel = require('../../models/groupModel');
const StatusModel = require('../../models/statusModel');
const CallModel = require('../../models/callModel');

describe('Mongoose Schema Validation Unit Tests (validateSync)', () => {
  const validObjectId = () => new mongoose.Types.ObjectId();

  // ---------------------------------------------------------------------------
  // 1. userModels.js
  // ---------------------------------------------------------------------------
  describe('1. userModels.js schema validation', () => {
    test('1a. Missing required fields (username, email, password) returns validation errors', () => {
      const invalidUser = new UserModel({});
      const validationError = invalidUser.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.username).toBeDefined();
      expect(validationError.errors.username.kind).toBe('required');
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.email.kind).toBe('required');
      expect(validationError.errors.password).toBeDefined();
      expect(validationError.errors.password.kind).toBe('required');
    });

    test('1b. Invalid privacySettings enum value fails validation', () => {
      const user = new UserModel({
        username: 'alice',
        email: 'alice@test.com',
        password: 'password123',
        privacySettings: {
          profilePhoto: 'sometimes', // Invalid enum (must be everyone | contacts | nobody)
        },
      });

      const validationError = user.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors['privacySettings.profilePhoto']).toBeDefined();
      expect(validationError.errors['privacySettings.profilePhoto'].kind).toBe('enum');
    });

    test('1c. Valid user with defaults passes validation without errors', () => {
      const validUser = new UserModel({
        username: 'alice',
        email: 'alice@test.com',
        password: 'password123',
      });

      const validationError = validUser.validateSync();
      expect(validationError).toBeUndefined();

      // Check schema defaults
      expect(validUser.about).toBe('Hey there! I am using ChatNex.');
      expect(validUser.avtarImage).toBe('');
      expect(validUser.privacySettings.profilePhoto).toBe('everyone');
      expect(validUser.privacySettings.readReceipts).toBe(true);
      expect(validUser.isPasscodeEnabled).toBe(false);
      expect(validUser.passcode).toBeNull();
    });

    test('1d. Dual model registration ("users" and "User") supports validateSync without conflict', () => {
      expect(mongoose.models.users).toBeDefined();
      expect(mongoose.models.User).toBeDefined();

      const userFromAlias = new mongoose.models.User({
        username: 'bob_user',
        email: 'bob@test.com',
        password: 'secret_password',
      });

      expect(userFromAlias.validateSync()).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. messageModel.js
  // ---------------------------------------------------------------------------
  describe('2. messageModel.js schema validation', () => {
    test('2a. Missing required fields (sender) returns validation error', () => {
      const invalidMsg = new MessageModel({
        message: { text: 'Hello world' },
      });

      const validationError = invalidMsg.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.sender).toBeDefined();
      expect(validationError.errors.sender.kind).toBe('required');
    });

    test('2b. Reactions subdocument missing required emoji field returns validation error', () => {
      const msgWithBadReaction = new MessageModel({
        sender: validObjectId(),
        reactions: [
          {
            userId: validObjectId(),
            username: 'alice',
            // Missing required 'emoji'
          },
        ],
      });

      const validationError = msgWithBadReaction.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors['reactions.0.emoji']).toBeDefined();
      expect(validationError.errors['reactions.0.emoji'].kind).toBe('required');
    });

    test('2c. Valid message document with reactions passes validation and applies defaults', () => {
      const validMsg = new MessageModel({
        sender: validObjectId(),
        message: {
          text: 'Great job!',
          files: [
            {
              url: 'https://example.com/photo.jpg',
              filename: 'photo.jpg',
              fileType: 'image',
              mimeType: 'image/jpeg',
              size: 1024,
            },
          ],
        },
        reactions: [
          {
            userId: validObjectId(),
            username: 'alice',
            emoji: '👍',
          },
        ],
      });

      const validationError = validMsg.validateSync();
      expect(validationError).toBeUndefined();
      expect(validMsg.isEdited).toBe(false);
      expect(validMsg.isDeleted).toBe(false);
      expect(validMsg.isPinned).toBe(false);
      expect(validMsg.read).toBe(false);
      expect(validMsg.isGroup).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. groupModel.js
  // ---------------------------------------------------------------------------
  describe('3. groupModel.js schema validation', () => {
    test('3a. Missing required fields (name, admin) returns validation errors', () => {
      const invalidGroup = new GroupModel({});
      const validationError = invalidGroup.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.name).toBeDefined();
      expect(validationError.errors.name.kind).toBe('required');
      expect(validationError.errors.admin).toBeDefined();
      expect(validationError.errors.admin.kind).toBe('required');
    });

    test('3b. Invalid group permissions enum value returns validation error', () => {
      const groupWithBadPermission = new GroupModel({
        name: 'Dev Team',
        admin: validObjectId(),
        permissions: {
          sendMessages: 'nobody', // Invalid enum (allowed: "everyone" | "admins")
        },
      });

      const validationError = groupWithBadPermission.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors['permissions.sendMessages']).toBeDefined();
      expect(validationError.errors['permissions.sendMessages'].kind).toBe('enum');
    });

    test('3c. Valid group document passes validation and populates defaults', () => {
      const adminId = validObjectId();
      const memberId = validObjectId();

      const validGroup = new GroupModel({
        name: 'Project Alpha',
        admin: adminId,
        admins: [adminId],
        members: [adminId, memberId],
      });

      const validationError = validGroup.validateSync();
      expect(validationError).toBeUndefined();
      expect(validGroup.groupImage).toBe('');
      expect(validGroup.description).toBe('');
      expect(validGroup.permissions.sendMessages).toBe('everyone');
      expect(validGroup.permissions.editGroupInfo).toBe('everyone');
      expect(validGroup.isGroup).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. statusModel.js
  // ---------------------------------------------------------------------------
  describe('4. statusModel.js schema validation', () => {
    test('4a. Missing required fields (user) returns validation error', () => {
      const invalidStatus = new StatusModel({});
      const validationError = invalidStatus.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.user).toBeDefined();
      expect(validationError.errors.user.kind).toBe('required');
    });

    test('4b. Invalid mediaType enum value returns validation error', () => {
      const statusWithBadMediaType = new StatusModel({
        user: validObjectId(),
        mediaType: 'audio', // Invalid enum (allowed: 'image' | 'video' | 'text')
      });

      const validationError = statusWithBadMediaType.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.mediaType).toBeDefined();
      expect(validationError.errors.mediaType.kind).toBe('enum');
    });

    test('4c. Valid status document passes validation and includes defaults', () => {
      const validStatus = new StatusModel({
        user: validObjectId(),
        mediaUrl: 'data:image/jpeg;base64,mock',
        mediaType: 'image',
        caption: 'Beautiful morning!',
      });

      const validationError = validStatus.validateSync();
      expect(validationError).toBeUndefined();
      expect(validStatus.backgroundColor).toBe('#00a884');
      expect(validStatus.viewers).toEqual([]);
    });

    test('4d. TTL index with expireAfterSeconds: 86400 is defined on schema', () => {
      const indexes = StatusModel.schema.indexes();
      const ttlIndex = indexes.find((idx) => idx[0] && idx[0].createdAt === 1 && idx[1]?.expireAfterSeconds === 86400);

      expect(ttlIndex).toBeDefined();
      expect(ttlIndex[1].expireAfterSeconds).toBe(86400); // 24 hours
    });
  });

  // ---------------------------------------------------------------------------
  // 5. callModel.js
  // ---------------------------------------------------------------------------
  describe('5. callModel.js schema validation', () => {
    test('5a. Missing required fields (caller) returns validation error', () => {
      const invalidCall = new CallModel({});
      const validationError = invalidCall.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.caller).toBeDefined();
      expect(validationError.errors.caller.kind).toBe('required');
    });

    test('5b. Invalid callType enum value returns validation error', () => {
      const callWithBadType = new CallModel({
        caller: validObjectId(),
        callType: 'hologram', // Invalid enum (allowed: "audio" | "video")
      });

      const validationError = callWithBadType.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.callType).toBeDefined();
      expect(validationError.errors.callType.kind).toBe('enum');
    });

    test('5c. Invalid call status enum value returns validation error', () => {
      const callWithBadStatus = new CallModel({
        caller: validObjectId(),
        status: 'ringing', // Invalid enum (allowed: "answered" | "missed" | "rejected" | "ended" | "busy")
      });

      const validationError = callWithBadStatus.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.status).toBeDefined();
      expect(validationError.errors.status.kind).toBe('enum');
    });

    test('5d. Valid call log document passes validation and includes defaults', () => {
      const callerId = validObjectId();
      const receiverId = validObjectId();

      const validCall = new CallModel({
        caller: callerId,
        receiver: receiverId,
        callType: 'video',
        status: 'ended',
        duration: 125,
      });

      const validationError = validCall.validateSync();
      expect(validationError).toBeUndefined();
      expect(validCall.isGroup).toBe(false);
      expect(validCall.groupId).toBeNull();
      expect(validCall.participants).toEqual([]);
      expect(validCall.duration).toBe(125);
    });
  });
});
