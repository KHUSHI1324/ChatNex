const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const {
  createGroup,
  getUserGroups,
  addMembers,
  removeMember,
  updateGroupAvatar,
  leaveGroup,
  deleteGroup,
  makeAdmin,
  dismissAdmin,
  updateGroupDetails,
} = require("../controllers/groupController");

router.use(verifyToken);

router.post("/create", createGroup);
router.get("/user-groups", getUserGroups);
router.get("/user-groups/:userId", getUserGroups);
router.put("/add-members", addMembers);
router.put("/remove-member", removeMember);
router.put("/make-admin", makeAdmin);
router.put("/dismiss-admin", dismissAdmin);
router.put("/update-avatar", updateGroupAvatar);
router.put("/update-details", updateGroupDetails);
router.post("/leave", leaveGroup);
router.delete("/delete", deleteGroup);

module.exports = router;


