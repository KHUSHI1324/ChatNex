const mongoose = require('mongoose');
const Group = require('../../models/groupModel');
const messageModel = require('../../models/messageModel');
const User = require('../../models/userModels');
const {
  createGroup,
  getUserGroups,
  addMembers,
  removeMember,
  makeAdmin,
  dismissAdmin,
  updateGroupAvatar,
  updateGroupDetails,
  leaveGroup,
  deleteGroup,
} = require('../../controllers/groupController');

jest.mock('../../models/groupModel');
jest.mock('../../models/messageModel');
jest.mock('../../models/userModels');

const mockAdminId = '507f1f77bcf86cd799439011';
const mockMemberId1 = '507f1f77bcf86cd799439012';
const mockMemberId2 = '507f1f77bcf86cd799439013';
const mockNonMemberId = '507f1f77bcf86cd799439019';
const mockGroupId = '507f1f77bcf86cd799439020';

// Helper to construct mock Express response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to construct mock Express request object with authenticated user context
const createMockRequest = (body = {}, params = {}, query = {}, user = { id: mockAdminId }) => ({
  body,
  params,
  query,
  user,
});

// Helper to construct chainable Mongoose query object supporting populate and sort
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

describe('groupController Unit Tests', () => {
  const defaultAdminUser = {
    _id: mockAdminId,
    username: 'AdminUser',
    email: 'admin@test.com',
  };

  const defaultMember1User = {
    _id: mockMemberId1,
    username: 'MemberOne',
    email: 'member1@test.com',
  };

  const defaultMember2User = {
    _id: mockMemberId2,
    username: 'MemberTwo',
    email: 'member2@test.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    User.findById.mockImplementation((id) => {
      const idStr = id?.toString();
      if (idStr === mockAdminId) return Promise.resolve(defaultAdminUser);
      if (idStr === mockMemberId1) return Promise.resolve(defaultMember1User);
      if (idStr === mockMemberId2) return Promise.resolve(defaultMember2User);
      return Promise.resolve(null);
    });

    User.find.mockImplementation(({ _id }) => {
      const ids = _id?.$in || [];
      const idStrs = ids.map((i) => i.toString());
      const users = [];
      if (idStrs.includes(mockAdminId)) users.push(defaultAdminUser);
      if (idStrs.includes(mockMemberId1)) users.push(defaultMember1User);
      if (idStrs.includes(mockMemberId2)) users.push(defaultMember2User);
      return Promise.resolve(users);
    });

    messageModel.create.mockResolvedValue({
      _id: '507f1f77bcf86cd799439099',
      createdAt: new Date(),
    });
  });

  // ---------------------------------------------------------------------------
  // 1. updateGroupAvatar — Authorization & Mutation Tests
  // ---------------------------------------------------------------------------
  describe('1. updateGroupAvatar', () => {
    test('Rejects non-member attempting to update group avatar with 403', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Secret Admin Group',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId)],
        pastMembers: [],
        groupImage: 'old-avatar',
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockImplementation((id) => {
        if (id?.toString() === mockGroupId) {
          return createMockQuery(mockGroupDoc);
        }
        return createMockQuery(null);
      });

      // Caller is mockNonMemberId
      const req = createMockRequest({
        groupId: mockGroupId,
        groupImage: 'hacked-avatar-base64',
      }, {}, {}, { id: mockNonMemberId });
      const res = createMockResponse();
      const next = jest.fn();

      await updateGroupAvatar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Only group members can update the group photo',
      });
      expect(mockGroupDoc.save).not.toHaveBeenCalled();
    });

    test('Happy path: regular non-admin member successfully updates avatar', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Team Chat',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
        pastMembers: [],
        groupImage: 'old-avatar',
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

      const req = createMockRequest({
        groupId: mockGroupId,
        groupImage: 'data:image/png;base64,memberuploadedavatar',
      }, {}, {}, { id: mockMemberId1 });
      const res = createMockResponse();
      const next = jest.fn();

      await updateGroupAvatar(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          msg: 'Group photo updated successfully',
        })
      );
      expect(mockGroupDoc.groupImage).toBe('data:image/png;base64,memberuploadedavatar');
      expect(mockGroupDoc.save).toHaveBeenCalled();
    });

    test('Happy path: legitimate admin updates avatar successfully', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Team Chat',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId)],
        pastMembers: [],
        groupImage: 'old-avatar',
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

      const req = createMockRequest({
        groupId: mockGroupId,
        groupImage: 'data:image/png;base64,validnewavatar',
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await updateGroupAvatar(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          msg: 'Group photo updated successfully',
        })
      );
      expect(mockGroupDoc.groupImage).toBe('data:image/png;base64,validnewavatar');
      expect(mockGroupDoc.save).toHaveBeenCalled();
    });

    test('Missing groupId returns 400', async () => {
      const req = createMockRequest({
        groupImage: 'new-avatar',
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await updateGroupAvatar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Group ID is required',
      });
    });

    test('Missing authenticated user (req.user) returns 401 fail-closed', async () => {
      const req = createMockRequest({
        groupId: mockGroupId,
        groupImage: 'new-avatar',
      }, {}, {}, null);
      const res = createMockResponse();
      const next = jest.fn();

      await updateGroupAvatar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
    });

    test('Group not found returns 404', async () => {
      Group.findById.mockReturnValue(createMockQuery(null));

      const req = createMockRequest({
        groupId: mockGroupId,
        groupImage: 'new-avatar',
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await updateGroupAvatar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Group not found',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 2. isGroupAdmin validation logic
  // ---------------------------------------------------------------------------
  describe('2. isGroupAdmin validation logic', () => {
    test('Returns 403 for a user who is in group.admins but NOT currently in group.members (removed admin)', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Project Alpha',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockMemberId1)], // mockAdminId is missing from members!
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

      const req = createMockRequest({
        groupId: mockGroupId,
        memberIdToPromote: mockMemberId1,
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await makeAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Only group admins can make another member an admin',
      });
      expect(mockGroupDoc.save).not.toHaveBeenCalled();
    });

    test('Correctly identifies admin when group.admin is a populated object instead of a raw ObjectId', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Project Alpha',
        admin: { _id: new mongoose.Types.ObjectId(mockAdminId), username: 'AdminUser' },
        admins: [{ _id: new mongoose.Types.ObjectId(mockAdminId) }],
        members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

      const req = createMockRequest({
        groupId: mockGroupId,
        memberIdToPromote: mockMemberId1,
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await makeAdmin(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          msg: `${defaultMember1User.username} is now a group admin`,
        })
      );
      expect(mockGroupDoc.save).toHaveBeenCalled();
    });

    test('Safely returns 401 fail-closed when req.user is missing in request', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Project Alpha',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

      const req = createMockRequest({
        groupId: mockGroupId,
        memberIdToPromote: mockMemberId1,
      }, {}, {}, null);
      const res = createMockResponse();
      const next = jest.fn();

      await makeAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });
      expect(mockGroupDoc.save).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Last-admin edge cases
  // ---------------------------------------------------------------------------
  describe('3. Last-admin edge cases', () => {
    test('leaveGroup: sole admin leaves while other members remain -> ownership auto-transfers to remainingMembers[0]', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Dev Team',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
        pastMembers: [],
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

      const req = createMockRequest({
        groupId: mockGroupId,
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await leaveGroup(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          deleted: false,
          msg: 'Left group successfully',
        })
      );
      expect(mockGroupDoc.members.map((m) => m.toString())).toEqual([mockMemberId1]);
      expect(mockGroupDoc.admins.map((a) => a.toString())).toEqual([mockMemberId1]);
      expect(mockGroupDoc.admin.toString()).toBe(mockMemberId1);
      expect(mockGroupDoc.pastMembers.map((p) => p.toString())).toContain(mockAdminId);
      expect(mockGroupDoc.save).toHaveBeenCalled();
    });

    test('leaveGroup: last member (who is sole admin) leaves -> group is orphaned (not deleted), admin is null', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Solo Group',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId)],
        pastMembers: [],
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));
      Group.findByIdAndDelete = jest.fn();

      const req = createMockRequest({
        groupId: mockGroupId,
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await leaveGroup(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          deleted: false,
        })
      );
      expect(mockGroupDoc.members).toEqual([]);
      expect(mockGroupDoc.admin).toBeNull();
      expect(mockGroupDoc.admins).toEqual([]);
      expect(mockGroupDoc.pastMembers.map((p) => p.toString())).toContain(mockAdminId);
      expect(mockGroupDoc.save).toHaveBeenCalled();
      expect(Group.findByIdAndDelete).not.toHaveBeenCalled();
    });

    test('dismissAdmin: attempting to dismiss the sole remaining admin -> requester is auto-restored, never 0 admins', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Engineering',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

      const req = createMockRequest({
        groupId: mockGroupId,
        memberIdToDismiss: mockAdminId,
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await dismissAdmin(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          msg: expect.stringContaining('is no longer an admin'),
        })
      );
      expect(mockGroupDoc.admins.map((a) => a.toString())).toContain(mockAdminId);
      expect(mockGroupDoc.admins.length).toBeGreaterThan(0);
      expect(mockGroupDoc.save).toHaveBeenCalled();
    });

    test('removeMember: removing the last admin -> auto-promotes group.members[0] to admin', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Designers',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockMemberId1)],
        members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
        pastMembers: [],
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

      const req = createMockRequest({
        groupId: mockGroupId,
        memberIdToRemove: mockMemberId1,
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await removeMember(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          msg: 'Member removed successfully',
        })
      );
      expect(mockGroupDoc.members.map((m) => m.toString())).toEqual([mockAdminId]);
      expect(mockGroupDoc.admins.map((a) => a.toString())).toEqual([mockAdminId]);
      expect(mockGroupDoc.admin.toString()).toBe(mockAdminId);
      expect(mockGroupDoc.save).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. addMembers
  // ---------------------------------------------------------------------------
  describe('4. addMembers', () => {
    test('Happy path: admin adds new members atomically with $addToSet and $pull', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Project Room',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
        pastMembers: [new mongoose.Types.ObjectId(mockMemberId2)],
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));
      Group.findByIdAndUpdate = jest.fn().mockResolvedValue(mockGroupDoc);

      const req = createMockRequest({
        groupId: mockGroupId,
        newMemberIds: [mockMemberId1, mockMemberId2],
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await addMembers(req, res, next);

      expect(Group.findByIdAndUpdate).toHaveBeenCalledWith(
        mockGroupId,
        expect.objectContaining({
          $addToSet: {
            members: {
              $each: [
                new mongoose.Types.ObjectId(mockMemberId1),
                new mongoose.Types.ObjectId(mockMemberId2),
              ],
            },
          },
        })
      );
      expect(Group.findByIdAndUpdate).toHaveBeenCalledWith(
        mockGroupId,
        expect.objectContaining({
          $pull: {
            pastMembers: {
              $in: [
                new mongoose.Types.ObjectId(mockMemberId1),
                new mongoose.Types.ObjectId(mockMemberId2),
              ],
            },
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: true,
          msg: 'Members added successfully',
        })
      );
    });

    test('Non-admin caller receives 403', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Project Room',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

      const req = createMockRequest({
        groupId: mockGroupId,
        newMemberIds: [mockMemberId2],
      }, {}, {}, { id: mockMemberId1 });
      const res = createMockResponse();
      const next = jest.fn();

      await addMembers(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Only active group admins can add new members',
      });
      expect(mockGroupDoc.save).not.toHaveBeenCalled();
    });

    test('Missing or invalid req.user returns HTTP 401 or 400 validation error', async () => {
      // 1. Missing req.user
      const reqMissing = createMockRequest({
        groupId: mockGroupId,
        newMemberIds: [mockMemberId1],
      }, {}, {}, null);
      const resMissing = createMockResponse();
      const nextMissing = jest.fn();

      await addMembers(reqMissing, resMissing, nextMissing);

      expect(resMissing.status).toHaveBeenCalledWith(401);
      expect(resMissing.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Authentication required',
      });

      // 2. Malformed req.user.id
      const reqInvalid = createMockRequest({
        groupId: mockGroupId,
        newMemberIds: [mockMemberId1],
      }, {}, {}, { id: 'INVALID_OBJECT_ID' });
      const resInvalid = createMockResponse();
      const nextInvalid = jest.fn();

      await addMembers(reqInvalid, resInvalid, nextInvalid);

      expect(resInvalid.status).toHaveBeenCalledWith(400);
      expect(resInvalid.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Invalid admin ID format',
      });
    });

    test('Atomic $addToSet ensures concurrent member additions both succeed without lost updates', async () => {
      let sharedMembers = [mockAdminId];
      let sharedPastMembers = [];

      Group.findByIdAndUpdate.mockImplementation(async (id, update) => {
        if (update.$addToSet?.members?.$each) {
          update.$addToSet.members.$each.forEach((newId) => {
            const idStr = newId.toString();
            if (!sharedMembers.some((m) => (m._id || m).toString() === idStr)) {
              sharedMembers.push(newId);
            }
          });
        }
        if (update.$pull?.pastMembers?.$in) {
          const pullSet = new Set(update.$pull.pastMembers.$in.map((pid) => pid.toString()));
          sharedPastMembers = sharedPastMembers.filter((pm) => !pullSet.has((pm._id || pm).toString()));
        }
        return { _id: mockGroupId, members: sharedMembers, pastMembers: sharedPastMembers };
      });

      let callCount = 0;
      Group.findById.mockImplementation(() => {
        callCount++;
        const currentCall = callCount;
        const currentSnapshot = {
          _id: mockGroupId,
          name: 'Concurrent Test Group',
          admin: new mongoose.Types.ObjectId(mockAdminId),
          admins: [new mongoose.Types.ObjectId(mockAdminId)],
          members: [...sharedMembers],
          pastMembers: [...sharedPastMembers],
        };

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, currentCall === 1 ? 5 : 15));
            return {
              ...currentSnapshot,
              members: sharedMembers.map((m) => ({
                _id: (m._id || m).toString(),
                username: 'User_' + (m._id || m).toString(),
                email: 'user@test.com',
                avtarImage: '',
              })),
              admin: { _id: mockAdminId, username: 'Admin', email: 'admin@test.com', avtarImage: '' },
              admins: [{ _id: mockAdminId, username: 'Admin', email: 'admin@test.com', avtarImage: '' }],
            };
          }),
          then: async function (resolve, reject) {
            try {
              await new Promise((resolveTimeout) => setTimeout(resolveTimeout, currentCall === 1 ? 5 : 15));
              const result = {
                ...currentSnapshot,
                members: sharedMembers.map((m) => ({
                  _id: (m._id || m).toString(),
                  username: 'User_' + (m._id || m).toString(),
                  email: 'user@test.com',
                  avtarImage: '',
                })),
                admin: { _id: mockAdminId, username: 'Admin', email: 'admin@test.com', avtarImage: '' },
                admins: [{ _id: mockAdminId, username: 'Admin', email: 'admin@test.com', avtarImage: '' }],
              };
              return resolve(result);
            } catch (err) {
              if (reject) return reject(err);
              throw err;
            }
          },
          catch: function (reject) {
            return this.then(undefined, reject);
          },
        };
        return mockQuery;
      });

      const req1 = createMockRequest({
        groupId: mockGroupId,
        newMemberIds: [mockMemberId1],
      }, {}, {}, { id: mockAdminId });
      const req2 = createMockRequest({
        groupId: mockGroupId,
        newMemberIds: [mockMemberId2],
      }, {}, {}, { id: mockAdminId });

      const res1 = createMockResponse();
      const res2 = createMockResponse();
      const next1 = jest.fn();
      const next2 = jest.fn();

      await Promise.all([
        addMembers(req1, res1, next1),
        addMembers(req2, res2, next2),
      ]);

      const finalMemberStrs = sharedMembers.map((m) => (m._id || m).toString());
      expect(finalMemberStrs).toContain(mockAdminId);
      expect(finalMemberStrs).toContain(mockMemberId1);
      expect(finalMemberStrs).toContain(mockMemberId2);
      expect(finalMemberStrs).toHaveLength(3);

      expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ status: true }));
      expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ status: true }));
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Member management endpoints (removeMember, makeAdmin, dismissAdmin)
  // ---------------------------------------------------------------------------
  describe('5. Member management endpoints (removeMember, makeAdmin, dismissAdmin)', () => {
    describe('removeMember', () => {
      test('Happy path: admin removes regular member', async () => {
        const mockGroupDoc = {
          _id: mockGroupId,
          name: 'Core Team',
          admin: new mongoose.Types.ObjectId(mockAdminId),
          admins: [new mongoose.Types.ObjectId(mockAdminId)],
          members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
          pastMembers: [],
          save: jest.fn().mockResolvedValue(true),
        };

        Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

        const req = createMockRequest({
          groupId: mockGroupId,
          memberIdToRemove: mockMemberId1,
        }, {}, {}, { id: mockAdminId });
        const res = createMockResponse();
        const next = jest.fn();

        await removeMember(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: true,
            msg: 'Member removed successfully',
            removedMemberId: mockMemberId1,
          })
        );
        expect(mockGroupDoc.members.map((m) => m.toString())).toEqual([mockAdminId]);
        expect(mockGroupDoc.pastMembers.map((p) => p.toString())).toContain(mockMemberId1);
        expect(mockGroupDoc.save).toHaveBeenCalled();
      });

      test('Non-admin attempting removeMember returns 403', async () => {
        const mockGroupDoc = {
          _id: mockGroupId,
          name: 'Core Team',
          admin: new mongoose.Types.ObjectId(mockAdminId),
          admins: [new mongoose.Types.ObjectId(mockAdminId)],
          members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1), new mongoose.Types.ObjectId(mockMemberId2)],
          save: jest.fn().mockResolvedValue(true),
        };

        Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

        const req = createMockRequest({
          groupId: mockGroupId,
          memberIdToRemove: mockMemberId2,
        }, {}, {}, { id: mockMemberId1 });
        const res = createMockResponse();
        const next = jest.fn();

        await removeMember(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Only group admins can remove members',
        });
        expect(mockGroupDoc.save).not.toHaveBeenCalled();
      });
    });

    describe('makeAdmin', () => {
      test('Happy path: admin makes member an admin', async () => {
        const mockGroupDoc = {
          _id: mockGroupId,
          name: 'Core Team',
          admin: new mongoose.Types.ObjectId(mockAdminId),
          admins: [new mongoose.Types.ObjectId(mockAdminId)],
          members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
          save: jest.fn().mockResolvedValue(true),
        };

        Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

        const req = createMockRequest({
          groupId: mockGroupId,
          memberIdToPromote: mockMemberId1,
        }, {}, {}, { id: mockAdminId });
        const res = createMockResponse();
        const next = jest.fn();

        await makeAdmin(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: true,
            msg: `${defaultMember1User.username} is now a group admin`,
          })
        );
        expect(mockGroupDoc.admins.map((a) => a.toString())).toContain(mockMemberId1);
        expect(mockGroupDoc.save).toHaveBeenCalled();
      });

      test('Non-admin attempting makeAdmin returns 403', async () => {
        const mockGroupDoc = {
          _id: mockGroupId,
          name: 'Core Team',
          admin: new mongoose.Types.ObjectId(mockAdminId),
          admins: [new mongoose.Types.ObjectId(mockAdminId)],
          members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1), new mongoose.Types.ObjectId(mockMemberId2)],
          save: jest.fn().mockResolvedValue(true),
        };

        Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

        const req = createMockRequest({
          groupId: mockGroupId,
          memberIdToPromote: mockMemberId2,
        }, {}, {}, { id: mockMemberId1 });
        const res = createMockResponse();
        const next = jest.fn();

        await makeAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Only group admins can make another member an admin',
        });
        expect(mockGroupDoc.save).not.toHaveBeenCalled();
      });
    });

    describe('dismissAdmin', () => {
      test('Happy path: admin dismisses a co-admin', async () => {
        const mockGroupDoc = {
          _id: mockGroupId,
          name: 'Core Team',
          admin: new mongoose.Types.ObjectId(mockAdminId),
          admins: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
          members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
          save: jest.fn().mockResolvedValue(true),
        };

        Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

        const req = createMockRequest({
          groupId: mockGroupId,
          memberIdToDismiss: mockMemberId1,
        }, {}, {}, { id: mockAdminId });
        const res = createMockResponse();
        const next = jest.fn();

        await dismissAdmin(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: true,
            msg: `${defaultMember1User.username} is no longer an admin`,
          })
        );
        expect(mockGroupDoc.admins.map((a) => a.toString())).toEqual([mockAdminId]);
        expect(mockGroupDoc.save).toHaveBeenCalled();
      });

      test('Non-admin attempting dismissAdmin returns 403', async () => {
        const mockGroupDoc = {
          _id: mockGroupId,
          name: 'Core Team',
          admin: new mongoose.Types.ObjectId(mockAdminId),
          admins: [new mongoose.Types.ObjectId(mockAdminId)],
          members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
          save: jest.fn().mockResolvedValue(true),
        };

        Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));

        const req = createMockRequest({
          groupId: mockGroupId,
          memberIdToDismiss: mockAdminId,
        }, {}, {}, { id: mockMemberId1 });
        const res = createMockResponse();
        const next = jest.fn();

        await dismissAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          status: false,
          msg: 'Only group admins can dismiss other admins',
        });
        expect(mockGroupDoc.save).not.toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 6. deleteGroup
  // ---------------------------------------------------------------------------
  describe('6. deleteGroup', () => {
    test('Happy path: admin permanently deletes group -> Group and messages deleted', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Project Sunset',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
        pastMembers: [],
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));
      Group.findByIdAndDelete = jest.fn().mockResolvedValue(mockGroupDoc);
      messageModel.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });

      const req = createMockRequest({
        groupId: mockGroupId,
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await deleteGroup(req, res, next);

      expect(Group.findByIdAndDelete).toHaveBeenCalledWith(mockGroupId);
      expect(messageModel.deleteMany).toHaveBeenCalledWith({ groupId: mockGroupId });
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        removedForUser: false,
        msg: 'Group permanently deleted successfully',
        groupId: mockGroupId,
      });
    });

    test('Non-admin active member attempting delete returns 403', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Project Sunset',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId), new mongoose.Types.ObjectId(mockMemberId1)],
        pastMembers: [],
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));
      Group.findByIdAndDelete = jest.fn();
      messageModel.deleteMany = jest.fn();

      const req = createMockRequest({
        groupId: mockGroupId,
      }, {}, {}, { id: mockMemberId1 });
      const res = createMockResponse();
      const next = jest.fn();

      await deleteGroup(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Only group admins can permanently delete the group',
      });
      expect(Group.findByIdAndDelete).not.toHaveBeenCalled();
      expect(messageModel.deleteMany).not.toHaveBeenCalled();
    });

    test('Past member calls deleteGroup -> removes from their pastMembers only, group NOT deleted', async () => {
      const mockGroupDoc = {
        _id: mockGroupId,
        name: 'Project Sunset',
        admin: new mongoose.Types.ObjectId(mockAdminId),
        admins: [new mongoose.Types.ObjectId(mockAdminId)],
        members: [new mongoose.Types.ObjectId(mockAdminId)],
        pastMembers: [new mongoose.Types.ObjectId(mockMemberId1), new mongoose.Types.ObjectId(mockMemberId2)],
        save: jest.fn().mockResolvedValue(true),
      };

      Group.findById.mockReturnValue(createMockQuery(mockGroupDoc));
      Group.findByIdAndDelete = jest.fn();
      messageModel.deleteMany = jest.fn();

      const req = createMockRequest({
        groupId: mockGroupId,
      }, {}, {}, { id: mockMemberId1 });
      const res = createMockResponse();
      const next = jest.fn();

      await deleteGroup(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: true,
        removedForUser: true,
        msg: 'Group removed from your chats',
        groupId: mockGroupId,
      });
      expect(mockGroupDoc.pastMembers.map((pm) => pm.toString())).not.toContain(mockMemberId1);
      expect(mockGroupDoc.save).toHaveBeenCalled();
      expect(Group.findByIdAndDelete).not.toHaveBeenCalled();
      expect(messageModel.deleteMany).not.toHaveBeenCalled();
    });

    test('Group not found returns 404', async () => {
      Group.findById.mockReturnValue(createMockQuery(null));

      const req = createMockRequest({
        groupId: mockGroupId,
      }, {}, {}, { id: mockAdminId });
      const res = createMockResponse();
      const next = jest.fn();

      await deleteGroup(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        msg: 'Group not found',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Fail-Closed Authentication Verification across Group Controllers
  // ---------------------------------------------------------------------------
  describe('7. Fail-Closed Authentication: Rejects unauthenticated invocations with 401 without trusting body/params/query', () => {
    const protectedControllers = [
      { name: 'createGroup', handler: createGroup, req: { body: { name: 'Test Group', admin: mockAdminId }, user: undefined } },
      { name: 'getUserGroups', handler: getUserGroups, req: { params: { userId: mockAdminId }, user: undefined } },
      { name: 'addMembers', handler: addMembers, req: { body: { groupId: mockGroupId, addedBy: mockAdminId, newMemberIds: [mockMemberId1] }, user: undefined } },
      { name: 'removeMember', handler: removeMember, req: { body: { groupId: mockGroupId, removedBy: mockAdminId, memberIdToRemove: mockMemberId1 }, user: undefined } },
      { name: 'makeAdmin', handler: makeAdmin, req: { body: { groupId: mockGroupId, requestedBy: mockAdminId, memberIdToPromote: mockMemberId1 }, user: undefined } },
      { name: 'dismissAdmin', handler: dismissAdmin, req: { body: { groupId: mockGroupId, requestedBy: mockAdminId, memberIdToDismiss: mockMemberId1 }, user: undefined } },
      { name: 'updateGroupAvatar', handler: updateGroupAvatar, req: { body: { groupId: mockGroupId, userId: mockAdminId, updatedBy: mockAdminId }, user: undefined } },
      { name: 'updateGroupDetails', handler: updateGroupDetails, req: { body: { groupId: mockGroupId, updatedBy: mockAdminId, name: 'New Name' }, user: undefined } },
      { name: 'leaveGroup', handler: leaveGroup, req: { body: { groupId: mockGroupId, userId: mockAdminId }, user: undefined } },
      { name: 'deleteGroup', handler: deleteGroup, req: { body: { groupId: mockGroupId, userId: mockAdminId }, user: undefined } },
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
        expect(Group.findById).not.toHaveBeenCalled();
        expect(Group.create).not.toHaveBeenCalled();
        expect(Group.find).not.toHaveBeenCalled();
      });
    });
  });
});
