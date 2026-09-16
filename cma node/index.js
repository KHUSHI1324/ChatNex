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

const userRoutes = require("./routes/userRoutes");
const messageRoute = require("./routes/messages.Routes");

app.use(cors({
  // origin: "http://localhost:3001", // Change this to the origin of your frontend server 
}));
app.use(express.json());
app.use('/uploads', express.static('./uploads'));
app.use("/api/auth", userRoutes);
app.use("/api/messages", messageRoute);

const PORT = process.env.PORT || 1000;
const MONGO_URI = process.env.MONGO_URI;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// Middleware to track online users
const onlineUsers = new Map();

// app.use((req, res, next) => {
//   req.onlineUsers = onlineUsers;
//   next();
// });


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

  socket.on("send-msg", (data) => {
    console.log(`[SEND-MSG EVENT] Received data:`, data);
    const sendUserSocket = onlineUsers.get(data.to);
    console.log(`[SEND-MSG LOOKUP] Receiver userId: "${data.to}", Target socket.id: ${sendUserSocket}`);
    if (sendUserSocket) {
      const payload = {
        from: data.from,
        to: data.to,
        message: data.message || data.msg,
      };
      console.log(`[EMITTING MSG-RECIEVE] Emitting to socket ${sendUserSocket} with payload:`, payload);
      socket.to(sendUserSocket).emit("msg-recieve", payload);
    } else {
      console.log(`[SEND-MSG WARNING] Receiver "${data.to}" is NOT in onlineUsers map! (Offline or add-user not called)`);
    }
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
