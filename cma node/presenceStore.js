// presenceStore.js
// In-memory store for tracking connected user sockets
const onlineUsers = new Map();

module.exports = {
  onlineUsers,
  resetOnlineUsers: () => {
    onlineUsers.clear();
  },
};
