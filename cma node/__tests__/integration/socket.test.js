const ioClient = require('socket.io-client');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const UserModel = require('../../models/userModels');
const { onlineUsers, resetOnlineUsers } = require('../../presenceStore');

jest.mock('../../models/userModels');

describe('Socket.io Real-time Layer Integration Tests', () => {
  let serverPort;
  const activeSockets = new Set();
  const testSecret = 'socket_integration_test_jwt_secret_12345';
  let originalEnvSecret;

  const userA = '507f1f77bcf86cd799439001';
  const userB = '507f1f77bcf86cd799439002';
  const userC = '507f1f77bcf86cd799439003';

  const generateToken = (userId, username = 'testuser') => {
    return jwt.sign({ id: userId, username }, testSecret, { expiresIn: '1h' });
  };

  // Helper to connect a real socket.io client to the running test server
  const createClientSocket = (token) => {
    return new Promise((resolve, reject) => {
      const clientSocket = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        auth: token !== undefined ? { token } : undefined,
      });

      const timeout = setTimeout(() => {
        clientSocket.disconnect();
        reject(new Error('Client socket connection timed out after 3000ms'));
      }, 3000);

      clientSocket.on('connect', () => {
        clearTimeout(timeout);
        activeSockets.add(clientSocket);
        resolve(clientSocket);
      });

      clientSocket.on('connect_error', (err) => {
        clearTimeout(timeout);
        clientSocket.disconnect();
        reject(err);
      });
    });
  };

  // Helper to wait for a specific socket event with a hard timeout rejection
  const waitForEvent = (socket, eventName, timeoutMs = 2000) => {
    return new Promise((resolve, reject) => {
      let handler;
      const timer = setTimeout(() => {
        if (handler) socket.off(eventName, handler);
        reject(new Error(`Timed out waiting for event "${eventName}" after ${timeoutMs}ms`));
      }, timeoutMs);

      handler = (payload) => {
        clearTimeout(timer);
        socket.off(eventName, handler);
        resolve(payload);
      };

      socket.on(eventName, handler);
    });
  };

  beforeAll((done) => {
    originalEnvSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = testSecret;

    // Spin up server on a random available port for all tests in this file
    app.server.listen(0, () => {
      serverPort = app.server.address().port;
      done();
    });
  });

  afterAll((done) => {
    process.env.JWT_SECRET = originalEnvSecret;
    for (const socket of activeSockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    activeSockets.clear();
    app.server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetOnlineUsers();
  });

  afterEach(() => {
    for (const socket of activeSockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    activeSockets.clear();
  });

  // ---------------------------------------------------------------------------
  // 0. Socket.io JWT Authentication Middleware
  // ---------------------------------------------------------------------------
  describe('0. Socket.io JWT handshake authentication', () => {
    test('0a. Connection WITHOUT a token is rejected with connect_error "Authentication required"', async () => {
      await expect(createClientSocket()).rejects.toThrow(/Authentication required/);
    });

    test('0b. Connection WITH an invalid token is rejected with connect_error "Invalid or expired token"', async () => {
      await expect(createClientSocket('invalid.garbage.token')).rejects.toThrow(/Invalid or expired token/);
    });

    test('0c. Connection WITH a valid token succeeds and socket.userId is authenticated', async () => {
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const tokenA = generateToken(userA, 'Alice');
      const client = await createClientSocket(tokenA);
      expect(client.connected).toBe(true);

      // add-user no longer needs a payload: it automatically uses socket.userId
      client.emit('add-user');
      const onlineList = await waitForEvent(client, 'online-users-list');
      expect(onlineList).toContain(userA);
      expect(onlineUsers.get(userA)).toBe(client.id);
    });
  });

  // ---------------------------------------------------------------------------
  // 1. add-user
  // ---------------------------------------------------------------------------
  describe('1. add-user event handling', () => {
    test('1a. Happy path: registers user, sends online list back, and broadcasts status:true to other clients', async () => {
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const client1 = await createClientSocket(generateToken(userA, 'Alice'));
      const client2 = await createClientSocket(generateToken(userB, 'Bob'));

      // Register client1 first so it can listen for client2's broadcast
      client1.emit('add-user');
      const listPromise1 = waitForEvent(client1, 'online-users-list');
      const list1 = await listPromise1;
      expect(list1).toContain(userA);

      // Listen on client1 for user-status broadcast from client2
      const userStatusPromise = waitForEvent(client1, 'user-status');
      const listPromise2 = waitForEvent(client2, 'online-users-list');

      client2.emit('add-user');

      const [statusEvent, list2] = await Promise.all([userStatusPromise, listPromise2]);

      expect(statusEvent).toEqual({ userId: userB, status: true });
      expect(list2).toContain(userA);
      expect(list2).toContain(userB);
      expect(onlineUsers.get(userB)).toBe(client2.id);
    });

    test('1b. Broadcasts new-user-registered event when UserModel.findById finds a user profile', async () => {
      const mockUserProfile = {
        _id: userB,
        username: 'bob_user',
        email: 'bob@test.com',
        avtarImage: 'avatar_b_base64',
        isAvtarImageSet: true,
      };

      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserProfile),
      });

      const client1 = await createClientSocket(generateToken(userA, 'Alice'));
      const client2 = await createClientSocket(generateToken(userB, 'bob_user'));

      const newRegisteredPromise = waitForEvent(client1, 'new-user-registered');

      client2.emit('add-user');

      const registeredPayload = await newRegisteredPromise;

      expect(registeredPayload).toEqual({
        user: expect.objectContaining({
          _id: userB,
          username: 'bob_user',
          email: 'bob@test.com',
          avtarImage: 'avatar_b_base64',
        }),
      });
    });

    test('1c. UserModel.findById error is caught gracefully and does NOT crash socket connection', async () => {
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database query failure')),
      });

      const client = await createClientSocket(generateToken(userA, 'Alice'));
      const listPromise = waitForEvent(client, 'online-users-list');

      client.emit('add-user');

      const onlineList = await listPromise;
      expect(onlineList).toContain(userA);
      expect(client.connected).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. send-msg
  // ---------------------------------------------------------------------------
  describe('2. send-msg event handling', () => {
    test('2a. 1-on-1: delivers normalized message payload to online recipient', async () => {
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const clientA = await createClientSocket(generateToken(userA, 'Alice'));
      const clientB = await createClientSocket(generateToken(userB, 'Bob'));

      clientA.emit('add-user');
      clientB.emit('add-user');

      await Promise.all([
        waitForEvent(clientA, 'online-users-list'),
        waitForEvent(clientB, 'online-users-list'),
      ]);

      const msgReceivePromise = waitForEvent(clientB, 'msg-recieve');

      const messagePayload = {
        _id: 'msg_101',
        to: userB,
        message: 'Hello Bob from Alice!',
        isGroup: false,
      };

      clientA.emit('send-msg', messagePayload);

      const received = await msgReceivePromise;

      expect(received).toEqual(
        expect.objectContaining({
          _id: 'msg_101',
          from: userA,
          to: userB,
          message: 'Hello Bob from Alice!',
          isGroup: false,
          isDeleted: false,
          isEdited: false,
          files: [],
        })
      );
    });

    test('2b. Recipient is NOT online: silent no-op without error or delivery', async () => {
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const clientA = await createClientSocket(generateToken(userA, 'Alice'));
      const offlineUserBClient = await createClientSocket(generateToken(userB, 'Bob')); // Connected to server but NOT registered via add-user

      clientA.emit('add-user');
      await waitForEvent(clientA, 'online-users-list');

      // Send to userB who was never added to onlineUsers
      clientA.emit('send-msg', {
        to: userB,
        message: 'Message to offline user',
        isGroup: false,
      });

      // Assert that offline socket never receives msg-recieve within timeout
      await expect(waitForEvent(offlineUserBClient, 'msg-recieve', 500)).rejects.toThrow(
        /Timed out waiting for event "msg-recieve"/
      );
      expect(clientA.connected).toBe(true);
    });

    test('2c. Group message: broadcasts to other members in targetMemberIds but NOT to sender', async () => {
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const clientA = await createClientSocket(generateToken(userA, 'Alice'));
      const clientB = await createClientSocket(generateToken(userB, 'Bob'));
      const clientC = await createClientSocket(generateToken(userC, 'Charlie'));

      clientA.emit('add-user');
      clientB.emit('add-user');
      clientC.emit('add-user');

      await Promise.all([
        waitForEvent(clientA, 'online-users-list'),
        waitForEvent(clientB, 'online-users-list'),
        waitForEvent(clientC, 'online-users-list'),
      ]);

      const groupPayload = {
        _id: 'group_msg_202',
        to: 'group_999',
        isGroup: true,
        message: 'Hello everyone in group!',
        targetMemberIds: [userA, userB, userC],
      };

      const msgReceiveBPromise = waitForEvent(clientB, 'msg-recieve');
      const msgReceiveCPromise = waitForEvent(clientC, 'msg-recieve');

      clientA.emit('send-msg', groupPayload);

      const [msgB, msgC] = await Promise.all([msgReceiveBPromise, msgReceiveCPromise]);

      expect(msgB).toEqual(expect.objectContaining({ _id: 'group_msg_202', from: userA, isGroup: true }));
      expect(msgC).toEqual(expect.objectContaining({ _id: 'group_msg_202', from: userA, isGroup: true }));

      // Sender (clientA) should NOT receive their own message back
      await expect(waitForEvent(clientA, 'msg-recieve', 500)).rejects.toThrow(
        /Timed out waiting for event "msg-recieve"/
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. call-user
  // ---------------------------------------------------------------------------
  describe('3. call-user event handling', () => {
    test('3a. Happy path: unblocked call delivers incoming-call event to recipient', async () => {
      UserModel.findById.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({ blockedUsers: [] }),
      }));

      const clientA = await createClientSocket(generateToken(userA, 'Alice'));
      const clientB = await createClientSocket(generateToken(userB, 'Bob'));

      clientA.emit('add-user');
      clientB.emit('add-user');

      await Promise.all([
        waitForEvent(clientA, 'online-users-list'),
        waitForEvent(clientB, 'online-users-list'),
      ]);

      const incomingCallPromise = waitForEvent(clientB, 'incoming-call');

      clientA.emit('call-user', {
        to: userB,
        callerName: 'Alice',
        callType: 'audio',
        signalData: { sdp: 'mock_sdp_offer' },
      });

      const incomingData = await incomingCallPromise;

      expect(incomingData).toEqual(
        expect.objectContaining({
          from: userA,
          callerName: 'Alice',
          callType: 'audio',
          isGroup: false,
          signalData: { sdp: 'mock_sdp_offer' },
        })
      );
    });

    test('3b. Blocked scenario: recipient blocked caller -> caller receives call-ended (reason: blocked), recipient receives nothing', async () => {
      UserModel.findById.mockImplementation((id) => {
        const idStr = id?.toString();
        if (idStr === userB) {
          // Recipient (userB) has blocked caller (userA)
          return { select: jest.fn().mockResolvedValue({ blockedUsers: [userA] }) };
        }
        return { select: jest.fn().mockResolvedValue({ blockedUsers: [] }) };
      });

      const clientA = await createClientSocket(generateToken(userA, 'Alice'));
      const clientB = await createClientSocket(generateToken(userB, 'Bob'));

      clientA.emit('add-user');
      clientB.emit('add-user');

      await Promise.all([
        waitForEvent(clientA, 'online-users-list'),
        waitForEvent(clientB, 'online-users-list'),
      ]);

      const callEndedPromise = waitForEvent(clientA, 'call-ended');

      clientA.emit('call-user', {
        to: userB,
        callerName: 'Alice',
        callType: 'video',
      });

      const callEndedData = await callEndedPromise;

      expect(callEndedData).toEqual({
        from: userB,
        reason: 'blocked',
      });

      // Recipient should NEVER receive incoming-call
      await expect(waitForEvent(clientB, 'incoming-call', 500)).rejects.toThrow(
        /Timed out waiting for event "incoming-call"/
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 4. disconnect
  // ---------------------------------------------------------------------------
  describe('4. disconnect event handling', () => {
    test('4a. When client disconnects, remaining clients receive user-status with status:false', async () => {
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const clientA = await createClientSocket(generateToken(userA, 'Alice'));
      const clientB = await createClientSocket(generateToken(userB, 'Bob'));

      clientA.emit('add-user');
      clientB.emit('add-user');

      await Promise.all([
        waitForEvent(clientA, 'online-users-list'),
        waitForEvent(clientB, 'online-users-list'),
      ]);

      expect(onlineUsers.get(userA)).toBe(clientA.id);

      const statusFalsePromise = waitForEvent(clientB, 'user-status');

      clientA.disconnect();

      const statusPayload = await statusFalsePromise;

      expect(statusPayload).toEqual({
        userId: userA,
        status: false,
      });
    });

    test('4b. onlineUsers presence map no longer contains disconnected user ID', async () => {
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const clientA = await createClientSocket(generateToken(userA, 'Alice'));
      clientA.emit('add-user');
      await waitForEvent(clientA, 'online-users-list');

      expect(onlineUsers.has(userA)).toBe(true);

      const clientB = await createClientSocket(generateToken(userB, 'Bob'));
      const statusPromise = waitForEvent(clientB, 'user-status');

      clientA.disconnect();

      await statusPromise;

      expect(onlineUsers.has(userA)).toBe(false);
    });

    test('4c. Client disconnects without ever calling add-user -> no crash, no user-status broadcast fires', async () => {
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      // 1. Connect unregistered client (no add-user)
      const unregisteredClient = await createClientSocket(generateToken(userA, 'Alice'));

      // 2. Connect observer client (calls add-user)
      const observerClient = await createClientSocket(generateToken(userB, 'Bob'));
      observerClient.emit('add-user');
      await waitForEvent(observerClient, 'online-users-list');

      // 3. Disconnect unregistered client
      unregisteredClient.disconnect();

      // 4. Observer should NOT receive user-status broadcast
      await expect(waitForEvent(observerClient, 'user-status', 500)).rejects.toThrow(
        /Timed out waiting for event "user-status"/
      );

      // 5. Subsequent add-user from a fresh client still functions normally
      const freshClient = await createClientSocket(generateToken(userC, 'Charlie'));
      const statusPromise = waitForEvent(observerClient, 'user-status');
      freshClient.emit('add-user');

      const statusPayload = await statusPromise;
      expect(statusPayload).toEqual({ userId: userC, status: true });
      expect(onlineUsers.get(userC)).toBe(freshClient.id);
    });
  });
});
