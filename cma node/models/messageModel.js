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
      files: [
        {
          url: { type: String },
          filename: { type: String },
          fileType: { type: String },
          mimeType: { type: String },
          size: { type: Number },
        },
      ],
    },
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
