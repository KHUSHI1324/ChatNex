require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const server = app.server;

const PORT = process.env.PORT || 1000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://0.0.0.0:27017/chats";

mongoose.connection.on("connected", () => {
  console.log("✅ [MONGODB] Connected successfully to Atlas cluster");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ [MONGODB ERROR]", err.message || err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ [MONGODB] Connection disconnected. Attempting reconnect...");
});

const connectWithRetry = (attempt = 1, maxAttempts = 10) => {
  console.log(`[MONGODB] Connection attempt ${attempt} of ${maxAttempts}...`);

  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    })
    .then(() => {
      console.log("✅ [MONGODB] Connection established");
    })
    .catch((error) => {
      console.error(`❌ [MONGODB ERROR] Connection error (attempt ${attempt}/${maxAttempts}):`, error.message || error);
      if (attempt < maxAttempts) {
        console.log("⏳ [MONGODB] Retrying connection in 4 seconds...");
        setTimeout(() => connectWithRetry(attempt + 1, maxAttempts), 4000);
      } else {
        console.error("🚨 [MONGODB] Max connection attempts reached. Check internet or Atlas IP whitelist.");
      }
    });
};

connectWithRetry();

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
