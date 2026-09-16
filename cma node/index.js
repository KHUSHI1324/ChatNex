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
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    // Notify all clients about the updated online status
    socket.emit("user-status", true);

    // Notify other clients about the updated online status of this user
    socket.broadcast.emit("user-status", userId, true);

  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        // Notify all clients about the updated online status
        socket.broadcast.emit("user-status", userId, false);

      }
    }
  });
});
module.exports = app;
