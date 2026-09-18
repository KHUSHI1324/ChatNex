const router = require("express").Router();
const {
  logCall,
  getUserCallLogs,
  clearCallLogs,
} = require("../controllers/callController");

router.post("/log", logCall);
router.get("/user/:userId", getUserCallLogs);
router.delete("/clear/:userId", clearCallLogs);

module.exports = router;
