const messageModel = require("../models/messageModel");
const mongoose = require("mongoose");

exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    const timestamp = new Date();

    const data = await messageModel.create({
      message: { text: message },
      users: [from, to],
      sender: from,
      read: false,
      createdAt: timestamp,
    });

    if (data) return res.json({ msg: "Message added successfully" });
    return res.json({ msg: "Failed to add message" });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { from, to } = req.body; // 'from' is contactId (sender), 'to' is currentUserId (receiver)
    if (!from || !to) {
      return res.status(400).json({ msg: "from and to are required" });
    }

    const result = await messageModel.updateMany(
      {
        users: { $all: [from, to] },
        sender: new mongoose.Types.ObjectId(from), // Only messages sent BY the contact, TO the current user
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    return res.json({ msg: "Messages marked as read", modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

exports.getAllMessage = async (req, res, next) => {
  try {
    const { from, to } = req.body;
    const messages = await messageModel
      .find({
        users: {
          $all: [from, to],
        },
      })
      .sort({ createdAt: 1 }); // Sort by createdAt field to get the messages in chronological order

    const projectedMessages = messages.map((msg) => {
      return {
        _id: msg._id,
        fromSelf: msg.sender.toString() === from,
        message: msg.message?.text || "",
        imgpath: msg.message?.imgpath || "",
        read: msg.read,
        timestamp: msg.createdAt,
      };
    });
    res.json(projectedMessages);
  } catch (error) {
    next(error);
  }
};

// controllers/mediaController.js
exports.uploadMedia = async (req, res, next) => {
  const file = req.file;
  const { from, to, message } = req.body;
  if (!file || !file.path) {
    return res.status(400).json({ status: 400, error: "no file uploaded" });
  }

  try {
    const normalizedPath = file.path.replace(/\\/g, "/");
    console.log("[BACKEND UPLOADMEDIA SAVING TO DB]", {
      "message.text": message || "",
      "message.imgpath": normalizedPath,
      from,
      to,
    });
    const userdata = new messageModel({
      message: {
        text: message || "",
        imgpath: normalizedPath,
      },
      users: [from, to],
      sender: new mongoose.Types.ObjectId(from),
      read: false,
    });

    const finaldata = await userdata.save();
    return res.status(201).json({ status: 201, finaldata, imgpath: normalizedPath });
  } catch (error) {
    console.error('Error uploading media:', error);
    return res.status(500).json({ error: 'An error occurred while saving the media message' });
  }
};