require("dotenv").config();
const express = require("express");
const app = express();
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const socket = require("socket.io");
const http = require("http");
const server = http.createServer(app);

require("./models/userModels");
require("./models/groupModel");
require("./models/messageModel");

const userRoutes = require("./routes/userRoutes");
const messageRoute = require("./routes/messages.Routes");
const groupRoute = require("./routes/groupRoutes");

app.use(cors({
  // origin: "http://localhost:3001", // Change this to the origin of your frontend server 
}));
app.use(express.json());
app.use('/uploads', express.static('./uploads'));
app.use("/api/auth", userRoutes);
app.use("/api/messages", messageRoute);
app.use("/api/groups", groupRoute);

const PORT = process.env.PORT || 1000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const MONGO_URI = process.env.MONGO_URI || "mongodb://0.0.0.0:27017/chats";

const connectWithRetry = (attempt = 1, maxAttempts = 5) => {
  console.log(`MongoDB connection attempt ${attempt} of ${maxAttempts}...`);

  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
    })
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((error) => {
      console.error(`MongoDB connection error (attempt ${attempt} of ${maxAttempts}):`, error.message || error);
      if (attempt < maxAttempts) {
        console.log("Retrying connection in 5 seconds...");
        setTimeout(() => connectWithRetry(attempt + 1, maxAttempts), 5000);
      } else {
        console.error("Max MongoDB connection attempts reached. Could not connect to database.");
      }
    });
};

connectWithRetry();

// Middleware to track online users
const onlineUsers = new Map();

const io = socket(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`[SOCKET CONNECTED] Socket ID: ${socket.id}`);

  socket.on("add-user", (userId) => {
    console.log(`[ADD-USER EVENT] Received userId: "${userId}" from socket: ${socket.id}`);
    onlineUsers.set(userId, socket.id);
    console.log(`[ONLINE USERS MAP] Current connected users:`, Array.from(onlineUsers.entries()));
    // Notify all clients about the updated online status
    socket.emit("user-status", true);

    // Notify other clients about the updated online status of this user
    socket.broadcast.emit("user-status", userId, true);
  });

  socket.on("create-group", (data) => {
    console.log(`[CREATE-GROUP EVENT] Received data:`, data);
    const { group, creator } = data || {};
    if (group && group.members) {
      group.members.forEach((member) => {
        const memberId = (member._id || member).toString();
        const creatorId = (creator?._id || creator || "").toString();
        if (memberId !== creatorId) {
          const targetSocket = onlineUsers.get(memberId);
          if (targetSocket) {
            console.log(`[GROUP-CREATED EMIT] Emitting group-created to member ${memberId} on socket ${targetSocket}`);
            socket.to(targetSocket).emit("group-created", { group, creator });
          }
        }
      });
    }
  });

  socket.on("send-msg", (data) => {
    console.log(`[SEND-MSG EVENT] Received data:`, data);
    const payload = {
      from: data.from,
      to: data.to,
      message: data.message || data.msg,
      imgpath: data.imgpath || null,
      files: data.files || [],
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
        if (memberId !== data.from?.toString()) {
          const targetSocket = onlineUsers.get(memberId);
          if (targetSocket) {
            console.log(`[EMITTING GROUP MSG-RECIEVE] to ${memberId} at ${targetSocket}`);
            socket.to(targetSocket).emit("msg-recieve", payload);
          }
        }
      });
    } else {
      const sendUserSocket = onlineUsers.get(data.to);
      console.log(`[SEND-MSG LOOKUP] Receiver userId: "${data.to}", Target socket.id: ${sendUserSocket}`);
      if (sendUserSocket) {
        console.log(`[EMITTING MSG-RECIEVE] Emitting to socket ${sendUserSocket} with payload:`, payload);
        socket.to(sendUserSocket).emit("msg-recieve", payload);
      } else {
        console.log(`[SEND-MSG WARNING] Receiver "${data.to}" is NOT in onlineUsers map! (Offline or add-user not called)`);
      }
    }
  });

  socket.on("mark-read", (data) => {
    console.log(`[MARK-READ EVENT] Received data:`, data);
    const senderSocket = onlineUsers.get(data.to);
    if (senderSocket) {
      socket.to(senderSocket).emit("msg-read", {
        readerId: data.from,
        senderId: data.to,
        isGroup: data.isGroup || false,
      });
    }
  });

  socket.on("group-action", (data) => {
    console.log(`[GROUP-ACTION EVENT] Received data:`, data);
    const { action, groupId, group, targetMemberIds = [] } = data || {};
    // Notify all affected members
    targetMemberIds.forEach((memberId) => {
      const targetSocket = onlineUsers.get(memberId.toString());
      if (targetSocket) {
        socket.to(targetSocket).emit("group-action", { action, groupId, group });
      }
    });
  });


  socket.on("disconnect", () => {
    console.log(`[SOCKET DISCONNECTED] Socket ID: ${socket.id}`);
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`[USER REMOVED] User "${userId}" removed. Remaining online:`, Array.from(onlineUsers.entries()));
        // Notify all clients about the updated online status
        socket.broadcast.emit("user-status", userId, false);
      }
    }
  });
});
module.exports = app;
