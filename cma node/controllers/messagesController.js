const messageModel = require("../models/messageModel");
const Group = require("../models/groupModel");
const mongoose = require("mongoose");

exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message, isGroup, groupId } = req.body;
    const timestamp = new Date();

    let usersList = [from, to];
    let groupRefId = null;
    const isGroupChat = Boolean(isGroup || groupId);

    if (isGroupChat) {
      groupRefId = groupId || to;
      const groupDoc = await Group.findById(groupRefId);
      if (groupDoc) {
        usersList = groupDoc.members.map((m) => m.toString());
      }
    }

    const data = await messageModel.create({
      message: { text: message },
      users: usersList,
      sender: from,
      groupId: groupRefId,
      isGroup: isGroupChat,
      read: false,
      createdAt: timestamp,
    });

    if (data) return res.json({ msg: "Message added successfully", data });
    return res.json({ msg: "Failed to add message" });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { from, to, isGroup, groupId } = req.body; // 'from' is contactId/groupId, 'to' is currentUserId
    if (!from || !to) {
      return res.status(400).json({ msg: "from and to are required" });
    }

    let filter = {};
    if (isGroup || groupId) {
      const targetGroupId = groupId || from;
      filter = {
        groupId: new mongoose.Types.ObjectId(targetGroupId),
        sender: { $ne: new mongoose.Types.ObjectId(to) },
        read: false,
      };
    } else {
      filter = {
        users: { $all: [from, to] },
        sender: new mongoose.Types.ObjectId(from),
        read: false,
      };
    }

    const result = await messageModel.updateMany(filter, {
      $set: { read: true },
    });

    return res.json({ msg: "Messages marked as read", modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

const getFileType = (mimetype, filename = "") => {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  if (mimetype?.startsWith("video/") || ["mp4", "webm", "mov", "mkv", "avi", "ogg", "m4v"].includes(ext)) {
    return "video";
  }
  if (mimetype === "image/gif" || ext === "gif") {
    return "gif";
  }
  if (mimetype?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "svg", "bmp"].includes(ext)) {
    return "image";
  }
  if (mimetype === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  if (["doc", "docx"].includes(ext) || mimetype?.includes("word") || mimetype?.includes("officedocument.wordprocessingml")) {
    return "doc";
  }
  if (["xls", "xlsx", "csv"].includes(ext) || mimetype?.includes("excel") || mimetype?.includes("spreadsheet") || mimetype?.includes("csv")) {
    return "sheet";
  }
  return "file";
};

exports.getAllMessage = async (req, res, next) => {
  try {
    const { from, to, isGroup, groupId } = req.body;
    let query;

    if (isGroup || groupId) {
      const targetGroupId = groupId || to;
      query = { groupId: new mongoose.Types.ObjectId(targetGroupId) };
    } else {
      query = {
        users: {
          $all: [from, to],
        },
        isGroup: { $ne: true },
      };
    }

    const messages = await messageModel
      .find(query)
      .populate("sender", "username avtarImage email _id")
      .sort({ createdAt: 1 });

    const projectedMessages = messages.map((msg) => {
      let files = msg.message?.files || [];
      if (files.length === 0 && msg.message?.imgpath) {
        files = [
          {
            url: msg.message.imgpath,
            filename: msg.message.imgpath.split("/").pop() || "file",
            fileType: getFileType("", msg.message.imgpath),
            mimeType: "",
            size: 0,
          },
        ];
      }

      const senderObj = msg.sender || {};
      const senderIdStr = (senderObj._id || senderObj).toString();

      return {
        _id: msg._id,
        fromSelf: senderIdStr === from,
        senderId: senderIdStr,
        senderName: senderObj.username || "",
        senderAvatar: senderObj.avtarImage || "",
        message: msg.message?.text || "",
        imgpath: msg.message?.imgpath || (files[0]?.url || ""),
        files: files,
        read: msg.read,
        timestamp: msg.createdAt,
        isGroup: Boolean(msg.isGroup),
        groupId: msg.groupId,
        isSystem: Boolean(msg.isSystem),
      };
    });
    res.json(projectedMessages);
  } catch (error) {
    next(error);
  }
};

// controllers/mediaController.js
exports.uploadMedia = async (req, res, next) => {
  const rawFiles = req.files || (req.file ? [req.file] : []);
  const { from, to, message, isGroup, groupId } = req.body;

  if (!rawFiles || rawFiles.length === 0) {
    return res.status(400).json({ status: 400, error: "No files uploaded" });
  }

  try {
    const formattedFiles = rawFiles.map((file) => {
      const normalizedPath = file.path.replace(/\\/g, "/");
      return {
        url: normalizedPath,
        filename: file.originalname,
        fileType: getFileType(file.mimetype, file.originalname),
        mimeType: file.mimetype,
        size: file.size,
      };
    });

    const primaryImage = formattedFiles.find((f) => f.fileType === "image")?.url || formattedFiles[0].url;

    let usersList = [from, to];
    let groupRefId = null;
    const isGroupChat = Boolean(isGroup === "true" || isGroup === true || groupId);

    if (isGroupChat) {
      groupRefId = groupId || to;
      const groupDoc = await Group.findById(groupRefId);
      if (groupDoc) {
        usersList = groupDoc.members.map((m) => m.toString());
      }
    }

    const userdata = new messageModel({
      message: {
        text: message || "",
        imgpath: primaryImage,
        files: formattedFiles,
      },
      users: usersList,
      sender: new mongoose.Types.ObjectId(from),
      groupId: groupRefId,
      isGroup: isGroupChat,
      read: false,
    });

    const finaldata = await userdata.save();
    return res.status(201).json({
      status: 201,
      finaldata,
      imgpath: primaryImage,
      files: formattedFiles,
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    return res.status(500).json({ error: "An error occurred while saving media message" });
  }
};