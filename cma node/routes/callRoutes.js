const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const {
  logCall,
  getUserCallLogs,
  clearCallLogs,
} = require("../controllers/callController");

// Protect all call endpoints with JWT authentication middleware
router.use(verifyToken);

router.post("/log", logCall);
router.get(["/user", "/user/:userId"], getUserCallLogs);
router.delete(["/clear", "/clear/:userId"], clearCallLogs);

module.exports = router;

