const messageModel = require("../models/messageModel");
const Group = require("../models/groupModel");
const User = require("../models/userModels");
const mongoose = require("mongoose");
const { generateAIReply, generateAIImage } = require("./aiController");

const AI_BOT_AVATAR = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16"/>
        <stop offset="50%" stop-color="#062e26"/>
        <stop offset="100%" stop-color="#19173d"/>
      </linearGradient>
      <linearGradient id="ringG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00a884"/>
        <stop offset="50%" stop-color="#00d2d3"/>
        <stop offset="100%" stop-color="#818cf8"/>
      </linearGradient>
      <linearGradient id="helmG" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="60" fill="url(#bgG)"/>
    <circle cx="60" cy="60" r="54" fill="none" stroke="url(#ringG)" stroke-width="2.5" opacity="0.9"/>
    <circle cx="28" cy="32" r="1.8" fill="#38bdf8"/>
    <circle cx="92" cy="36" r="2.2" fill="#00a884"/>
    <circle cx="24" cy="86" r="2" fill="#818cf8"/>
    <circle cx="96" cy="82" r="1.8" fill="#38bdf8"/>
    <path d="M34 114 C36 92, 48 88, 60 88 C72 88, 84 92, 86 114 Z" fill="url(#helmG)" stroke="url(#ringG)" stroke-width="1.5"/>
    <polygon points="60,94 65,101 60,108 55,101" fill="#00f2fe"/>
    <rect x="36" y="32" width="48" height="48" rx="22" fill="url(#helmG)" stroke="url(#ringG)" stroke-width="2"/>
    <rect x="29" y="46" width="7" height="20" rx="3.5" fill="#00a884"/>
    <rect x="84" y="46" width="7" height="20" rx="3.5" fill="#38bdf8"/>
    <path d="M58 24 L62 24 L61 32 L59 32 Z" fill="#38bdf8"/>
    <circle cx="60" cy="21" r="3.5" fill="#00f2fe"/>
    <rect x="42" y="44" width="36" height="18" rx="9" fill="#06121e" stroke="rgba(0,242,254,0.7)" stroke-width="1.2"/>
    <ellipse cx="50" cy="53" rx="4.5" ry="5" fill="#00f2fe"/>
    <ellipse cx="70" cy="53" rx="4.5" ry="5" fill="#00f2fe"/>
    <circle cx="50.5" cy="52" r="2" fill="#ffffff"/>
    <circle cx="70.5" cy="52" r="2" fill="#ffffff"/>
    <path d="M51 70 Q60 76 69 70" fill="none" stroke="#00a884" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`
).toString("base64")}`;

exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message, isGroup, groupId, replyTo } = req.body;
    const timestamp = new Date();

    let usersList = [from, to];
    let groupRefId = null;
    const isGroupChat = Boolean(isGroup || groupId);

    if (isGroupChat) {
      groupRefId = groupId || to;
      const groupDoc = await Group.findById(groupRefId);
      if (groupDoc) {
        const isMember = (groupDoc.members || []).some((m) => m.toString() === from.toString());
        if (!isMember) {
          return res.status(403).json({
            status: false,
            msg: "You can't send messages to this group because you're no longer a participant.",
          });
        }
        usersList = groupDoc.members.map((m) => m.toString());
      }
    }

    let parsedReplyTo = null;
    if (replyTo && typeof replyTo === 'object' && (replyTo.text || replyTo.messageId || replyTo.fileType)) {
      parsedReplyTo = {
        messageId: replyTo.messageId ? new mongoose.Types.ObjectId(replyTo.messageId) : null,
        text: replyTo.text || "",
        senderName: replyTo.senderName || "",
        senderId: replyTo.senderId || "",
        fileType: replyTo.fileType || "",
        imgpath: replyTo.imgpath || "",
      };
    }

    // Enforce Block List Check for direct 1-on-1 chats
    if (!isGroupChat && to !== "chatnex_ai_bot" && from !== "chatnex_ai_bot") {
      const [senderUser, recipientUser] = await Promise.all([
        User.findById(from).select("blockedUsers"),
        User.findById(to).select("blockedUsers"),
      ]);

      if (senderUser?.blockedUsers?.some((b) => b.toString() === to.toString())) {
        return res.json({
          status: false,
          blocked: true,
          isBlockedByMe: true,
          msg: "You have blocked this contact. Unblock to send messages.",
        });
      }

      if (recipientUser?.blockedUsers?.some((b) => b.toString() === from.toString())) {
        return res.json({
          status: false,
          blocked: true,
          isBlockedByThem: true,
          msg: "Message not delivered. You are blocked by this contact.",
        });
      }
    }

    // 1. Direct 1-on-1 AI Assistant Conversation
    if (to === "chatnex_ai_bot") {
      const activeSessionId = sessionId || `session_${Date.now()}`;
      const userMsg = await messageModel.create({
        message: { text: message },
        replyTo: parsedReplyTo,
        users: [from, "chatnex_ai_bot"],
        sender: from,
        sessionId: activeSessionId,
        groupId: null,
        isGroup: false,
        isAi: false,
        read: true,
        createdAt: timestamp,
      });

      const isImagine = /^\/(imagine|generate|draw|art)\s+/i.test(message);
      let aiMsg;

      if (isImagine) {
        const imgResult = await generateAIImage(message);
        aiMsg = await messageModel.create({
          message: {
            text: `✨ Generated image for: "${imgResult.prompt}"`,
            imgpath: imgResult.imageUrl,
            files: [
              {
                url: imgResult.imageUrl,
                filename: `ai-gen-${Date.now()}.jpg`,
                fileType: "image",
                mimeType: "image/jpeg",
                size: 0,
              },
            ],
          },
          users: [from, "chatnex_ai_bot"],
          sender: from,
          sessionId: activeSessionId,
          isAi: true,
          isAiGenerated: true,
          read: true,
          createdAt: new Date(Date.now() + 150),
        });
      } else {
        const replyText = await generateAIReply(message, "User");
        aiMsg = await messageModel.create({
          message: { text: replyText },
          users: [from, "chatnex_ai_bot"],
          sender: from,
          sessionId: activeSessionId,
          isAi: true,
          isAiGenerated: false,
          read: true,
          createdAt: new Date(Date.now() + 150),
        });
      }

      return res.json({
        msg: "Message added successfully",
        data: userMsg,
        sessionId: activeSessionId,
        aiReply: {
          _id: aiMsg._id,
          fromSelf: false,
          senderId: "chatnex_ai_bot",
          senderName: "ChatNex AI",
          senderAvatar: AI_BOT_AVATAR,
          message: aiMsg.message.text,
          imgpath: aiMsg.message.imgpath || "",
          files: aiMsg.message.files || [],
          replyTo: null,
          reactions: [],
          isAi: true,
          isAiGenerated: Boolean(aiMsg.isAiGenerated),
          sessionId: activeSessionId,
          read: true,
          timestamp: aiMsg.createdAt,
        },
      });
    }

    const data = await messageModel.create({
      message: { text: message },
      replyTo: parsedReplyTo,
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

    if (from === "chatnex_ai_bot" || to === "chatnex_ai_bot") {
      return res.json({ msg: "AI messages already read", modifiedCount: 0 });
    }

    let filter = {};
    if (isGroup || groupId) {
      const targetGroupId = groupId || from;
      const validGroupId = mongoose.isValidObjectId(targetGroupId) ? new mongoose.Types.ObjectId(targetGroupId) : null;
      const validTo = mongoose.isValidObjectId(to) ? new mongoose.Types.ObjectId(to) : null;
      if (!validGroupId) return res.json({ msg: "Invalid group ID", modifiedCount: 0 });

      filter = {
        groupId: validGroupId,
        ...(validTo ? { sender: { $ne: validTo } } : {}),
        read: false,
      };
    } else {
      const validFrom = mongoose.isValidObjectId(from) ? new mongoose.Types.ObjectId(from) : null;
      filter = {
        users: { $all: [from, to] },
        ...(validFrom ? { sender: validFrom } : {}),
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
  if (
    mimetype?.startsWith("audio/") ||
    ["mp3", "wav", "m4a", "aac", "opus", "weba"].includes(ext) ||
    (ext === "ogg" && mimetype?.includes("audio"))
  ) {
    return "audio";
  }
  if (
    mimetype?.startsWith("video/") ||
    ["mp4", "mov", "mkv", "avi", "m4v"].includes(ext) ||
    (ext === "webm" && (!mimetype || !mimetype.startsWith("audio/"))) ||
    (ext === "ogg" && (!mimetype || !mimetype.startsWith("audio/")))
  ) {
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
    const { from, to, isGroup, groupId, sessionId } = req.body;
    let query;

    if (isGroup || groupId) {
      const targetGroupId = groupId || to;
      query = { groupId: new mongoose.Types.ObjectId(targetGroupId) };
    } else if (to === "chatnex_ai_bot" || from === "chatnex_ai_bot") {
      const userOtherId = to === "chatnex_ai_bot" ? from : to;
      query = {
        users: { $all: [userOtherId, "chatnex_ai_bot"] },
        isGroup: { $ne: true },
      };
      if (sessionId && sessionId !== "all") {
        if (sessionId === "default") {
          query.$or = [{ sessionId: "default" }, { sessionId: null }, { sessionId: { $exists: false } }];
        } else {
          query.sessionId = sessionId;
        }
      }
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
      .populate("pinnedBy", "username _id")
      .sort({ createdAt: 1 });

    const projectedMessages = messages
      .filter((msg) => {
        // Exclude if deleted for current user ("Delete for me")
        const deletedForList = (msg.deletedFor || []).map((u) => u.toString());
        return !deletedForList.includes(from);
      })
      .map((msg) => {
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
        const isAiMsg = Boolean(msg.isAi);
        const senderIdStr = isAiMsg ? "chatnex_ai_bot" : (senderObj._id || senderObj).toString();
        const starredList = (msg.starredBy || []).map((s) => s.toString());

        return {
          _id: msg._id,
          fromSelf: isAiMsg ? false : senderIdStr === from,
          senderId: senderIdStr,
          senderName: isAiMsg ? "ChatNex AI" : (senderObj.username || ""),
          senderAvatar: isAiMsg ? AI_BOT_AVATAR : (senderObj.avtarImage || ""),
          message: msg.message?.text || "",
          imgpath: msg.message?.imgpath || (files[0]?.url || ""),
          files: files,
          voiceTranscript: msg.message?.voiceTranscript || (files[0]?.voiceTranscript || ""),
          replyTo: msg.replyTo || null,
          reactions: msg.reactions || [],
          isEdited: Boolean(msg.isEdited),
          isDeleted: Boolean(msg.isDeleted),
          isPinned: Boolean(msg.isPinned),
          pinnedAt: msg.pinnedAt || null,
          pinnedByName: msg.pinnedBy?.username || "",
          isStarred: starredList.includes(from),
          sessionId: msg.sessionId || "default",
          read: msg.read,
          timestamp: msg.createdAt,
          isGroup: Boolean(msg.isGroup),
          groupId: msg.groupId,
          isSystem: Boolean(msg.isSystem),
          isAi: isAiMsg,
          isAiGenerated: Boolean(msg.isAiGenerated),
        };
      });

    res.json(projectedMessages);
  } catch (error) {
    next(error);
  }
};

// Get all AI chat conversation sessions for a user
exports.getAISessions = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ status: false, msg: "userId is required" });
    }

    const messages = await messageModel
      .find({
        users: { $all: [userId, "chatnex_ai_bot"] },
        isGroup: { $ne: true },
      })
      .sort({ createdAt: 1 });

    const sessionsMap = {};

    for (const msg of messages) {
      const sid = msg.sessionId || "default";
      if (!sessionsMap[sid]) {
        sessionsMap[sid] = {
          sessionId: sid,
          title: "",
          firstPrompt: "",
          lastMessage: "",
          messageCount: 0,
          createdAt: msg.createdAt,
          updatedAt: msg.createdAt,
        };
      }

      sessionsMap[sid].messageCount += 1;
      sessionsMap[sid].updatedAt = msg.createdAt;

      if (!sessionsMap[sid].firstPrompt && !msg.isAi && msg.message?.text) {
        let cleanText = msg.message.text.replace(/^\/(imagine|generate|draw|art)\s+/i, "🎨 Image: ").trim();
        if (cleanText.length > 50) {
          cleanText = cleanText.substring(0, 50) + "...";
        }
        sessionsMap[sid].firstPrompt = cleanText;
        sessionsMap[sid].title = cleanText;
      }

      if (msg.message?.text) {
        sessionsMap[sid].lastMessage = msg.message.text.substring(0, 60);
      }
    }

    const sessionList = Object.values(sessionsMap)
      .map((s) => ({
        ...s,
        title: s.title || (s.sessionId === "default" ? "General Conversation" : "New AI Conversation"),
      }))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return res.json({ status: true, sessions: sessionList });
  } catch (error) {
    next(error);
  }
};

// Delete an entire AI session
exports.deleteAISession = async (req, res, next) => {
  try {
    const { userId, sessionId } = req.body;
    if (!userId || !sessionId) {
      return res.status(400).json({ status: false, msg: "userId and sessionId are required" });
    }

    const filter = {
      users: { $all: [userId, "chatnex_ai_bot"] },
      ...(sessionId === "default"
        ? { $or: [{ sessionId: "default" }, { sessionId: null }, { sessionId: { $exists: false } }] }
        : { sessionId }),
    };

    await messageModel.deleteMany(filter);

    return res.json({ status: true, msg: "AI session deleted successfully" });
  } catch (error) {
    next(error);
  }
};

exports.uploadMedia = async (req, res, next) => {
  const rawFiles = req.files || (req.file ? [req.file] : []);
  const { from, to, message, isGroup, groupId, replyTo, voiceTranscript } = req.body;

  if (!rawFiles || rawFiles.length === 0) {
    return res.status(400).json({ status: 400, error: "No files uploaded" });
  }

  try {
    const formattedFiles = rawFiles.map((file) => {
      let fileUrl = "";
      if (file.buffer) {
        fileUrl = `data:${file.mimetype || "application/octet-stream"};base64,${file.buffer.toString("base64")}`;
      } else if (file.path) {
        fileUrl = file.path.replace(/\\/g, "/");
      } else if (file.filename) {
        fileUrl = `uploads/${file.filename}`;
      }

      return {
        url: fileUrl,
        filename: file.originalname,
        fileType: getFileType(file.mimetype, file.originalname),
        mimeType: file.mimetype,
        size: file.size,
        voiceTranscript: voiceTranscript || "",
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
        const isMember = (groupDoc.members || []).some((m) => m.toString() === from.toString());
        if (!isMember) {
          return res.status(403).json({
            status: 403,
            error: "You can't send files to this group because you're no longer a participant.",
          });
        }
        usersList = groupDoc.members.map((m) => m.toString());
      }
    }

    let parsedReplyTo = null;
    if (replyTo) {
      try {
        const r = typeof replyTo === 'string' ? JSON.parse(replyTo) : replyTo;
        if (r && (r.text || r.messageId || r.fileType)) {
          parsedReplyTo = {
            messageId: r.messageId ? new mongoose.Types.ObjectId(r.messageId) : null,
            text: r.text || "",
            senderName: r.senderName || "",
            senderId: r.senderId || "",
            fileType: r.fileType || "",
            imgpath: r.imgpath || "",
          };
        }
      } catch (e) {}
    }

    // Enforce Block List Check for direct 1-on-1 media uploads
    if (!isGroupChat && to !== "chatnex_ai_bot" && from !== "chatnex_ai_bot") {
      const [senderUser, recipientUser] = await Promise.all([
        User.findById(from).select("blockedUsers"),
        User.findById(to).select("blockedUsers"),
      ]);

      if (senderUser?.blockedUsers?.some((b) => b.toString() === to.toString())) {
        return res.status(403).json({
          status: 403,
          blocked: true,
          isBlockedByMe: true,
          error: "You have blocked this contact. Unblock to send files.",
        });
      }

      if (recipientUser?.blockedUsers?.some((b) => b.toString() === from.toString())) {
        return res.status(403).json({
          status: 403,
          blocked: true,
          isBlockedByThem: true,
          error: "File not delivered. You are blocked by this contact.",
        });
      }
    }

    const userdata = new messageModel({
      message: {
        text: message || "",
        imgpath: primaryImage,
        files: formattedFiles,
        voiceTranscript: voiceTranscript || "",
      },
      replyTo: parsedReplyTo,
      users: usersList,
      sender: new mongoose.Types.ObjectId(from),
      groupId: groupRefId,
      isGroup: isGroupChat,
      read: false,
    });

    const finaldata = await userdata.save();

    let aiReplyObj = null;
    if (to === "chatnex_ai_bot") {
      const promptContext = voiceTranscript 
        ? `I received your voice audio ("${voiceTranscript}").` 
        : message 
        ? `I received your attachment along with your message: "${message}".` 
        : `I received your uploaded media file! Let me know if you want me to analyze, summarize, or generate anything based on it.`;

      const aiReplyText = await generateAIReply(promptContext, "User");
      const aiMsgDoc = await messageModel.create({
        message: { text: aiReplyText },
        users: [from, "chatnex_ai_bot"],
        sender: from,
        isAi: true,
        isAiGenerated: false,
        read: true,
        createdAt: new Date(Date.now() + 150),
      });

      aiReplyObj = {
        _id: aiMsgDoc._id,
        fromSelf: false,
        senderId: "chatnex_ai_bot",
        senderName: "ChatNex AI",
        senderAvatar: AI_BOT_AVATAR,
        message: aiMsgDoc.message.text,
        imgpath: "",
        files: [],
        replyTo: null,
        reactions: [],
        isAi: true,
        isAiGenerated: false,
        read: true,
        timestamp: aiMsgDoc.createdAt,
      };
    }

    return res.status(201).json({
      status: 201,
      finaldata,
      imgpath: primaryImage,
      files: formattedFiles,
      voiceTranscript: voiceTranscript || "",
      replyTo: parsedReplyTo,
      aiReply: aiReplyObj,
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    return res.status(500).json({ error: "An error occurred while saving media message" });
  }
};

// React to Message (Add / Toggle Emoji Reaction)
exports.reactToMessage = async (req, res, next) => {
  try {
    const { messageId, userId, username, emoji } = req.body;
    if (!messageId || !userId || !emoji) {
      return res.status(400).json({ status: false, msg: "messageId, userId, and emoji are required" });
    }

    const msg = await messageModel.findById(messageId);
    if (!msg) {
      return res.status(404).json({ status: false, msg: "Message not found" });
    }

    const userIdStr = userId.toString();
    const existingIndex = (msg.reactions || []).findIndex(
      (r) => (r.userId || r.user || "").toString() === userIdStr
    );

    if (existingIndex > -1) {
      if (msg.reactions[existingIndex].emoji === emoji) {
        // Toggle off reaction if exact same emoji clicked again
        msg.reactions.splice(existingIndex, 1);
      } else {
        // Update to new emoji
        msg.reactions[existingIndex].emoji = emoji;
        msg.reactions[existingIndex].username = username || msg.reactions[existingIndex].username;
      }
    } else {
      // Add new reaction
      msg.reactions.push({
        userId: new mongoose.Types.ObjectId(userId),
        username: username || "",
        emoji,
      });
    }

    await msg.save();
    return res.json({ status: true, messageId, reactions: msg.reactions });
  } catch (error) {
    next(error);
  }
};

// Edit Message Text
exports.editMessage = async (req, res, next) => {
  try {
    const { messageId, userId, newText } = req.body;
    if (!messageId || !userId || !newText?.trim()) {
      return res.status(400).json({ status: false, msg: "messageId, userId, and newText are required" });
    }

    const msg = await messageModel.findById(messageId);
    if (!msg) {
      return res.status(404).json({ status: false, msg: "Message not found" });
    }

    if (msg.sender.toString() !== userId.toString()) {
      return res.status(403).json({ status: false, msg: "You can only edit your own messages" });
    }

    if (msg.isDeleted) {
      return res.status(400).json({ status: false, msg: "Cannot edit deleted message" });
    }

    msg.message.text = newText.trim();
    msg.isEdited = true;
    await msg.save();

    return res.json({
      status: true,
      messageId,
      newText: msg.message.text,
      isEdited: true,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Message ("everyone" vs "me")
exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId, userId, deleteType } = req.body; // deleteType: 'everyone' | 'me'
    if (!messageId || !userId || !deleteType) {
      return res.status(400).json({ status: false, msg: "messageId, userId, and deleteType are required" });
    }

    const msg = await messageModel.findById(messageId);
    if (!msg) {
      return res.status(404).json({ status: false, msg: "Message not found" });
    }

    if (deleteType === "everyone") {
      if (msg.sender.toString() !== userId.toString()) {
        return res.status(403).json({ status: false, msg: "You can only delete for everyone on your own messages" });
      }

      msg.isDeleted = true;
      msg.message.text = "🚫 This message was deleted";
      msg.message.files = [];
      msg.message.imgpath = "";
      await msg.save();

      return res.json({
        status: true,
        messageId,
        deleteType: "everyone",
        isDeleted: true,
        messageText: "🚫 This message was deleted",
      });
    } else {
      // Delete for me
      const userObjId = new mongoose.Types.ObjectId(userId);
      const exists = (msg.deletedFor || []).some((u) => u.toString() === userId.toString());
      if (!exists) {
        msg.deletedFor.push(userObjId);
        await msg.save();
      }

      return res.json({
        status: true,
        messageId,
        deleteType: "me",
      });
    }
  } catch (error) {
    next(error);
  }
};

// Pin / Unpin Message
exports.pinMessage = async (req, res, next) => {
  try {
    const { messageId, userId, isPinned } = req.body;
    if (!messageId) {
      return res.status(400).json({ status: false, msg: "messageId is required" });
    }

    const msg = await messageModel.findById(messageId);
    if (!msg) {
      return res.status(404).json({ status: false, msg: "Message not found" });
    }

    const shouldPin = Boolean(isPinned);
    msg.isPinned = shouldPin;
    msg.pinnedAt = shouldPin ? new Date() : null;
    msg.pinnedBy = shouldPin && userId ? new mongoose.Types.ObjectId(userId) : null;
    await msg.save();

    return res.json({
      status: true,
      messageId,
      isPinned: msg.isPinned,
      pinnedAt: msg.pinnedAt,
    });
  } catch (error) {
    next(error);
  }
};

// Star / Unstar Message
exports.starMessage = async (req, res, next) => {
  try {
    const { messageId, userId } = req.body;
    if (!messageId || !userId) {
      return res.status(400).json({ status: false, msg: "messageId and userId are required" });
    }

    const msg = await messageModel.findById(messageId);
    if (!msg) {
      return res.status(404).json({ status: false, msg: "Message not found" });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const starIndex = (msg.starredBy || []).findIndex((u) => u.toString() === userId.toString());

    let isStarred = false;
    if (starIndex > -1) {
      msg.starredBy.splice(starIndex, 1);
      isStarred = false;
    } else {
      msg.starredBy.push(userObjId);
      isStarred = true;
    }

    await msg.save();
    return res.json({
      status: true,
      messageId,
      isStarred,
    });
  } catch (error) {
    next(error);
  }
};