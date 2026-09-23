const express = require("express");
const app = express();
const cors = require("cors");
const socket = require("socket.io");
const http = require("http");
const server = http.createServer(app);
const jwt = require("jsonwebtoken");
const { onlineUsers } = require("./presenceStore");

// Register models
const UserModel = require("./models/userModels");
require("./models/groupModel");
require("./models/messageModel");
require("./models/callModel");
require("./models/statusModel");

// Register routes
const userRoutes = require("./routes/userRoutes");
const messageRoute = require("./routes/messages.Routes");
const groupRoute = require("./routes/groupRoutes");
const aiRoutes = require("./routes/aiRoutes");
const statusRoutes = require("./routes/statusRoutes");
const callRoutes = require("./routes/callRoutes");

// Middleware
app.use(cors({
  // origin: "http://localhost:3001", // Change this to the origin of your frontend server 
}));
app.use(express.json());
app.use('/uploads', express.static('./uploads'));

// API endpoints
app.use("/api/auth", userRoutes);
app.use("/api/messages", messageRoute);
app.use("/api/groups", groupRoute);
app.use("/api/ai", aiRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/calls", callRoutes);

// Socket.io initialization
const io = socket(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

// Socket.io JWT Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new Error("Authentication required"));
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return next(new Error("Invalid or expired token"));
    }
    socket.userId = (decoded.id || decoded._id || "").toString();
    socket.username = decoded.username || "";
    next();
  });
});

io.on("connection", (socket) => {
  console.log(`[SOCKET CONNECTED] Socket ID: ${socket.id}`);

  socket.on("add-user", async () => {
    const uIdStr = socket.userId;
    if (!uIdStr) return;
    console.log(`[ADD-USER EVENT] Received userId: "${uIdStr}" from socket: ${socket.id}`);
    onlineUsers.set(uIdStr, socket.id);
    console.log(`[ONLINE USERS MAP] Current connected users:`, Array.from(onlineUsers.entries()));
    
    // 1. Send all currently online user IDs to the newly connected client
    socket.emit("online-users-list", Array.from(onlineUsers.keys()));

    // 2. Broadcast to all other clients that this user is now online
    socket.broadcast.emit("user-status", { userId: uIdStr, status: true });

    // 3. If this is a first-time connect (new or returning after being offline),
    //    broadcast their basic profile to all other users so new users appear
    //    in contacts without refresh
    try {
      const userDoc = await UserModel.findById(uIdStr).select("_id username email avtarImage isAvtarImageSet");
      if (userDoc) {
        const userInfo = {
          _id: userDoc._id,
          username: userDoc.username,
          email: userDoc.email,
          avtarImage: userDoc.avtarImage,
          isAvtarImageSet: userDoc.isAvtarImageSet,
          isGroup: false,
          latestMessage: null,
          lastMessageTimestamp: null,
        };
        // Broadcast to all other connected sockets
        socket.broadcast.emit("new-user-registered", { user: userInfo });
      }
    } catch (err) {
      console.error("[ADD-USER] Error fetching user profile for broadcast:", err.message);
    }
  });

  socket.on("user-avatar-updated", (data) => {
    console.log(`[USER-AVATAR-UPDATED EVENT] Received data for user:`, socket.userId);
    socket.broadcast.emit("user-avatar-updated", { ...data, userId: socket.userId });
  });

  socket.on("create-group", (data) => {
    console.log(`[CREATE-GROUP EVENT] Received data:`, data);
    const { group, creator } = data || {};
    if (group && group.members) {
      group.members.forEach((member) => {
        const memberId = (member._id || member).toString();
        if (memberId !== socket.userId) {
          const targetSocket = onlineUsers.get(memberId);
          if (targetSocket) {
            console.log(`[GROUP-CREATED EMIT] Emitting group-created to member ${memberId} on socket ${targetSocket}`);
            socket.to(targetSocket).emit("group-created", { group, creator: creator || { _id: socket.userId } });
          }
        }
      });
    }
  });

  socket.on("send-msg", (data) => {
    console.log(`[SEND-MSG EVENT] Received data:`, data);
    const payload = {
      _id: data._id || null,
      from: socket.userId,
      to: data.to,
      message: data.message || data.msg,
      imgpath: data.imgpath || null,
      files: data.files || [],
      replyTo: data.replyTo || null,
      reactions: data.reactions || [],
      isEdited: Boolean(data.isEdited),
      isDeleted: Boolean(data.isDeleted),
      isPinned: Boolean(data.isPinned),
      pinnedAt: data.pinnedAt || null,
      timestamp: data.timestamp || new Date(),
      isGroup: Boolean(data.isGroup),
      groupId: data.isGroup ? data.to : null,
      groupName: data.groupName || null,
      senderName: data.senderName || null,
      senderAvatar: data.senderAvatar || null,
      isSystem: Boolean(data.isSystem),
    };

    const groupRecipients = data.targetMemberIds || data.members;
    if (data.isGroup && Array.isArray(groupRecipients)) {
      console.log(`[GROUP SEND-MSG] Broadcasting to group ${data.to} with ${groupRecipients.length} members`);
      groupRecipients.forEach((member) => {
        const memberId = (member._id || member).toString();
        if (memberId !== socket.userId) {
          const targetSocket = onlineUsers.get(memberId);
          if (targetSocket) {
            socket.to(targetSocket).emit("msg-recieve", payload);
          }
        }
      });
    } else {
      const sendUserSocket = onlineUsers.get(data.to?.toString());
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("msg-recieve", payload);
      }
    }
  });

  // Real-time Emoji Reaction Broadcast
  socket.on("react-msg", (data) => {
    console.log(`[REACT-MSG EVENT]`, data);
    const { messageId, reactions, to, isGroup, targetMemberIds = [] } = data || {};
    if (isGroup && Array.isArray(targetMemberIds)) {
      targetMemberIds.forEach((member) => {
        const memberId = (member._id || member).toString();
        if (memberId !== socket.userId) {
          const targetSocket = onlineUsers.get(memberId);
          if (targetSocket) {
            socket.to(targetSocket).emit("msg-reaction-update", { messageId, reactions, groupId: to });
          }
        }
      });
    } else {
      const targetSocket = onlineUsers.get(to?.toString());
      if (targetSocket) {
        socket.to(targetSocket).emit("msg-reaction-update", { messageId, reactions, from: socket.userId });
      }
    }
  });

  // Real-time Message Edit Broadcast
  socket.on("edit-msg", (data) => {
    console.log(`[EDIT-MSG EVENT]`, data);
    const { messageId, newText, isEdited, to, isGroup, targetMemberIds = [] } = data || {};
    if (isGroup && Array.isArray(targetMemberIds)) {
      targetMemberIds.forEach((member) => {
        const memberId = (member._id || member).toString();
        if (memberId !== socket.userId) {
          const targetSocket = onlineUsers.get(memberId);
          if (targetSocket) {
            socket.to(targetSocket).emit("msg-edited-update", { messageId, newText, isEdited: true, groupId: to });
          }
        }
      });
    } else {
      const targetSocket = onlineUsers.get(to?.toString());
      if (targetSocket) {
        socket.to(targetSocket).emit("msg-edited-update", { messageId, newText, isEdited: true, from: socket.userId });
      }
    }
  });

  // Real-time Message Delete Broadcast (Delete for everyone)
  socket.on("delete-msg", (data) => {
    console.log(`[DELETE-MSG EVENT]`, data);
    const { messageId, to, isGroup, targetMemberIds = [] } = data || {};
    if (isGroup && Array.isArray(targetMemberIds)) {
      targetMemberIds.forEach((member) => {
        const memberId = (member._id || member).toString();
        if (memberId !== socket.userId) {
          const targetSocket = onlineUsers.get(memberId);
          if (targetSocket) {
            socket.to(targetSocket).emit("msg-deleted-update", { messageId, groupId: to });
          }
        }
      });
    } else {
      const targetSocket = onlineUsers.get(to?.toString());
      if (targetSocket) {
        socket.to(targetSocket).emit("msg-deleted-update", { messageId, from: socket.userId });
      }
    }
  });

  // Real-time Message Pin Broadcast
  socket.on("pin-msg", (data) => {
    console.log(`[PIN-MSG EVENT]`, data);
    const { messageId, isPinned, pinnedAt, pinnedByName, to, isGroup, targetMemberIds = [] } = data || {};
    if (isGroup && Array.isArray(targetMemberIds)) {
      targetMemberIds.forEach((member) => {
        const memberId = (member._id || member).toString();
        if (memberId !== socket.userId) {
          const targetSocket = onlineUsers.get(memberId);
          if (targetSocket) {
            socket.to(targetSocket).emit("msg-pinned-update", { messageId, isPinned, pinnedAt, pinnedByName, groupId: to });
          }
        }
      });
    } else {
      const targetSocket = onlineUsers.get(to?.toString());
      if (targetSocket) {
        socket.to(targetSocket).emit("msg-pinned-update", { messageId, isPinned, pinnedAt, pinnedByName, from: socket.userId });
      }
    }
  });

  socket.on("mark-read", (data) => {
    console.log(`[MARK-READ EVENT] Received data:`, data);
    const senderSocket = onlineUsers.get(data.to?.toString());
    if (senderSocket) {
      socket.to(senderSocket).emit("msg-read", {
        readerId: socket.userId,
        senderId: data.to,
        isGroup: data.isGroup || false,
      });
    }
  });

  // Real-time Typing Indicator Broadcast
  socket.on("typing", (data) => {
    const { to, isGroup, username, targetMemberIds = [] } = data || {};
    if (isGroup && Array.isArray(targetMemberIds)) {
      targetMemberIds.forEach((member) => {
        const memberId = (member._id || member).toString();
        if (memberId !== socket.userId) {
          const targetSocket = onlineUsers.get(memberId);
          if (targetSocket) {
            socket.to(targetSocket).emit("user-typing", { from: socket.userId, groupId: to, username });
          }
        }
      });
    } else {
      const targetSocket = onlineUsers.get(to?.toString());
      if (targetSocket) {
        socket.to(targetSocket).emit("user-typing", { from: socket.userId, username });
      }
    }
  });

  socket.on("stop-typing", (data) => {
    const { to, isGroup, targetMemberIds = [] } = data || {};
    if (isGroup && Array.isArray(targetMemberIds)) {
      targetMemberIds.forEach((member) => {
        const memberId = (member._id || member).toString();
        if (memberId !== socket.userId) {
          const targetSocket = onlineUsers.get(memberId);
          if (targetSocket) {
            socket.to(targetSocket).emit("user-stop-typing", { from: socket.userId, groupId: to });
          }
        }
      });
    } else {
      const targetSocket = onlineUsers.get(to?.toString());
      if (targetSocket) {
        socket.to(targetSocket).emit("user-stop-typing", { from: socket.userId });
      }
    }
  });

  socket.on("group-action", (data) => {
    console.log(`[GROUP-ACTION EVENT] Received data:`, data);
    const { action, groupId, group, targetMemberIds = [] } = data || {};
    let memberIds = Array.isArray(targetMemberIds) && targetMemberIds.length > 0
      ? targetMemberIds
      : (Array.isArray(group?.members) ? group.members.map((m) => (m._id || m).toString()) : []);

    if (memberIds.length > 0) {
      memberIds.forEach((memberId) => {
        const targetSocket = onlineUsers.get(memberId.toString());
        if (targetSocket) {
          socket.to(targetSocket).emit("group-action", { action, groupId, group });
        }
      });
    } else {
      socket.broadcast.emit("group-action", { action, groupId, group });
    }
  });

  // WebRTC Live Calling Signaling
  socket.on("call-user", async (data) => {
    const { to, signalData, callType, callerName, callerAvatar, isGroup, groupId } = data || {};
    const from = socket.userId;
    console.log(`[CALL-USER] Call initiation from ${callerName} (${from}) to ${to} (${callType})`);
    
    if (isGroup && groupId) {
      // Broadcast incoming group call to online members
      const { targetMemberIds = [] } = data;
      targetMemberIds.forEach((memberId) => {
        const memStr = (memberId._id || memberId).toString();
        if (memStr !== from) {
          const targetSocket = onlineUsers.get(memStr);
          if (targetSocket) {
            socket.to(targetSocket).emit("incoming-call", {
              from,
              callerName,
              callerAvatar,
              callType,
              signalData,
              isGroup: true,
              groupId,
            });
          }
        }
      });
    } else {
      try {
        const [recipientUser, senderUser] = await Promise.all([
          UserModel.findById(to).select("blockedUsers"),
          UserModel.findById(from).select("blockedUsers"),
        ]);
        if (
          recipientUser?.blockedUsers?.some((b) => b.toString() === from) ||
          senderUser?.blockedUsers?.some((b) => b.toString() === to?.toString())
        ) {
          console.log(`[CALL BLOCKED] Call blocked between ${from} and ${to}`);
          socket.emit("call-ended", { from: to, reason: "blocked" });
          return;
        }
      } catch (e) {
        console.error("Error checking blocked users for call:", e);
      }

      const targetSocket = onlineUsers.get(to?.toString());
      if (targetSocket) {
        socket.to(targetSocket).emit("incoming-call", {
          from,
          callerName,
          callerAvatar,
          callType,
          signalData,
          isGroup: false,
        });
      }
    }
  });

  socket.on("user-blocked", (data) => {
    const { targetUserId } = data || {};
    const targetSocket = onlineUsers.get(targetUserId?.toString());
    if (targetSocket) {
      socket.to(targetSocket).emit("contact-blocked-update", { blockerId: socket.userId, isBlocked: true });
    }
  });

  socket.on("user-unblocked", (data) => {
    const { targetUserId } = data || {};
    const targetSocket = onlineUsers.get(targetUserId?.toString());
    if (targetSocket) {
      socket.to(targetSocket).emit("contact-blocked-update", { blockerId: socket.userId, isBlocked: false });
    }
  });

  socket.on("answer-call", (data) => {
    const { to, signalData } = data || {};
    console.log(`[ANSWER-CALL] Call answered by ${socket.userId} for ${to}`);
    const targetSocket = onlineUsers.get(to?.toString());
    if (targetSocket) {
      socket.to(targetSocket).emit("call-answered", { signalData, from: socket.userId });
    }
  });

  socket.on("ice-candidate", (data) => {
    const { to, candidate } = data || {};
    const targetSocket = onlineUsers.get(to?.toString());
    if (targetSocket) {
      socket.to(targetSocket).emit("ice-candidate", { candidate, from: socket.userId });
    }
  });

  socket.on("call-hold", (data) => {
    const { to, isHold, heldByName } = data || {};
    console.log(`[CALL-HOLD] ${socket.userId} set hold=${isHold} for ${to}`);
    const targetSocket = onlineUsers.get(to?.toString());
    if (targetSocket) {
      socket.to(targetSocket).emit("call-hold", { from: socket.userId, isHold, heldByName });
    }
  });

  socket.on("call-merge", (data) => {
    const { to, participants, isConference } = data || {};
    console.log(`[CALL-MERGE] ${socket.userId} merged call for:`, to);
    if (Array.isArray(to)) {
      to.forEach((targetId) => {
        const targetSocket = onlineUsers.get(targetId?.toString());
        if (targetSocket) {
          socket.to(targetSocket).emit("call-merge", { from: socket.userId, participants, isConference });
        }
      });
    } else if (to) {
      const targetSocket = onlineUsers.get(to?.toString());
      if (targetSocket) {
        socket.to(targetSocket).emit("call-merge", { from: socket.userId, participants, isConference });
      }
    }
  });

  socket.on("end-call", (data) => {
    const { to, reason, isGroup, targetMemberIds = [] } = data || {};
    console.log(`[END-CALL] Call ended by ${socket.userId} for ${to}`);
    if (Array.isArray(to)) {
      to.forEach((targetId) => {
        const targetSocket = onlineUsers.get(targetId?.toString());
        if (targetSocket) {
          socket.to(targetSocket).emit("call-ended", { from: socket.userId, reason });
        }
      });
    } else if (isGroup && Array.isArray(targetMemberIds)) {
      targetMemberIds.forEach((member) => {
        const memStr = (member._id || member).toString();
        if (memStr !== socket.userId) {
          const targetSocket = onlineUsers.get(memStr);
          if (targetSocket) {
            socket.to(targetSocket).emit("call-ended", { from: socket.userId, reason });
          }
        }
      });
    } else if (to) {
      const targetSocket = onlineUsers.get(to?.toString());
      if (targetSocket) {
        socket.to(targetSocket).emit("call-ended", { from: socket.userId, reason });
      }
    }
  });

  // Real-time Status / Stories update broadcast
  socket.on("status-updated", (data) => {
    console.log(`[STATUS-UPDATED] Status updated for user:`, socket.userId);
    socket.broadcast.emit("status-updated-feed", { ...data, userId: socket.userId });
  });

  socket.on("disconnect", () => {
    console.log(`[SOCKET DISCONNECTED] Socket ID: ${socket.id}`);
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`[USER REMOVED] User "${userId}" removed. Remaining online:`, Array.from(onlineUsers.entries()));
        // Notify all clients about the updated online status
        socket.broadcast.emit("user-status", { userId: userId.toString(), status: false });
      }
    }
  });
});

app.server = server;
app.io = io;

module.exports = app;
