const Call = require("../models/callModel");
const User = require("../models/userModels");
const Group = require("../models/groupModel");
const mongoose = require("mongoose");

// Log a call event to database
exports.logCall = async (req, res, next) => {
  try {
    const {
      caller,
      receiver,
      isGroup,
      groupId,
      participants = [],
      callType = "audio",
      status = "ended",
      duration = 0,
      startedAt,
      endedAt,
    } = req.body;

    if (!caller) {
      return res.status(400).json({ status: false, msg: "Caller ID is required" });
    }

    const callerObjId = new mongoose.Types.ObjectId(caller);
    const receiverObjId = receiver && mongoose.isValidObjectId(receiver) ? new mongoose.Types.ObjectId(receiver) : null;
    const groupObjId = groupId && mongoose.isValidObjectId(groupId) ? new mongoose.Types.ObjectId(groupId) : null;

    const participantIds = Array.isArray(participants)
      ? participants
          .filter((p) => mongoose.isValidObjectId(p._id || p))
          .map((p) => new mongoose.Types.ObjectId(p._id || p))
      : [];

    const newCall = await Call.create({
      caller: callerObjId,
      receiver: receiverObjId,
      isGroup: Boolean(isGroup),
      groupId: groupObjId,
      participants: participantIds,
      callType: callType === "video" ? "video" : "audio",
      status: ["answered", "missed", "rejected", "ended", "busy"].includes(status) ? status : "ended",
      duration: Number(duration) || 0,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      endedAt: endedAt ? new Date(endedAt) : new Date(),
    });

    const populated = await Call.findById(newCall._id)
      .populate("caller", "username avtarImage email _id")
      .populate("receiver", "username avtarImage email _id")
      .populate("participants", "username avtarImage email _id")
      .populate("groupId", "name groupImage _id");

    return res.status(201).json({ status: true, call: populated });
  } catch (error) {
    console.error("Error logging call:", error);
    next(error);
  }
};

// Get call history for a user
exports.getUserCallLogs = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ status: false, msg: "Valid user ID is required" });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);

    const calls = await Call.find({
      $or: [
        { caller: userObjId },
        { receiver: userObjId },
        { participants: userObjId },
      ],
    })
      .populate("caller", "username avtarImage email _id")
      .populate("receiver", "username avtarImage email _id")
      .populate("participants", "username avtarImage email _id")
      .populate("groupId", "name groupImage _id")
      .sort({ createdAt: -1 })
      .limit(100);

    const formatted = calls.map((c) => {
      const isCaller = (c.caller?._id || c.caller || "").toString() === userId.toString();
      let direction = "incoming";
      if (isCaller) {
        direction = "outgoing";
      } else if (c.status === "missed" || c.status === "rejected") {
        direction = "missed";
      }

      // Identify the other party contact info
      let contactObj = null;
      if (c.isGroup && c.groupId) {
        contactObj = {
          _id: c.groupId._id,
          username: c.groupId.name,
          avtarImage: c.groupId.groupImage,
          isGroup: true,
        };
      } else if (isCaller) {
        contactObj = c.receiver || (c.participants && c.participants[0]) || { username: "Unknown" };
      } else {
        contactObj = c.caller || { username: "Unknown" };
      }

      return {
        _id: c._id,
        caller: c.caller,
        receiver: c.receiver,
        contact: contactObj,
        isGroup: Boolean(c.isGroup),
        groupId: c.groupId,
        participants: c.participants || [],
        callType: c.callType,
        direction,
        status: c.status,
        duration: c.duration,
        timestamp: c.createdAt || c.startedAt,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
      };
    });

    return res.json({ status: true, callLogs: formatted });
  } catch (error) {
    console.error("Error fetching call logs:", error);
    next(error);
  }
};

// Clear call logs for a user
exports.clearCallLogs = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ status: false, msg: "Valid user ID is required" });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);

    await Call.deleteMany({
      $or: [
        { caller: userObjId },
        { receiver: userObjId },
        { participants: userObjId },
      ],
    });

    return res.json({ status: true, msg: "Call history cleared successfully" });
  } catch (error) {
    console.error("Error clearing call logs:", error);
    next(error);
  }
};
