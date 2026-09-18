const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    message: {
      text: {
        type: String,
      },
      imgpath: {
        type: String,
      },
      voiceTranscript: {
        type: String,
        default: "",
      },
      files: [
        {
          url: { type: String },
          filename: { type: String },
          fileType: { type: String },
          mimeType: { type: String },
          size: { type: Number },
          voiceTranscript: { type: String, default: "" },
        },
      ],
    },
    replyTo: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "messages", default: null },
      text: { type: String, default: "" },
      senderName: { type: String, default: "" },
      senderId: { type: String, default: "" },
      fileType: { type: String, default: "" },
      imgpath: { type: String, default: "" },
    },
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
        username: { type: String, default: "" },
        emoji: { type: String, required: true },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
      },
    ],
    users: [String], // Assuming users are stored as strings (user IDs)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isAi: {
      type: Boolean,
      default: false,
    },
    isAiGenerated: {
      type: Boolean,
      default: false,
    },
    sessionId: {
      type: String,
      default: null,
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically generate createdAt and updatedAt fields
  }
);

module.exports = mongoose.models.messages || mongoose.model("messages", messageSchema);
