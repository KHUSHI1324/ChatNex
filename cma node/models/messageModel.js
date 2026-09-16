const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    message: {
      text: {
        type: String
      },
      imgpath: {
        type:String
      },
    },
    users: [String], // Assuming users are stored as strings (user IDs)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true, // Automatically generate createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("messages", messageSchema);
