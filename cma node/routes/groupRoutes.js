const express = require("express");
const router = express.Router();
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
} = require("../controllers/groupController");

router.post("/create", createGroup);
router.get("/user-groups/:userId", getUserGroups);
router.put("/add-members", addMembers);
router.put("/remove-member", removeMember);
router.put("/make-admin", makeAdmin);
router.put("/dismiss-admin", dismissAdmin);
router.put("/update-avatar", updateGroupAvatar);
router.post("/leave", leaveGroup);
router.delete("/delete", deleteGroup);

module.exports = router;


