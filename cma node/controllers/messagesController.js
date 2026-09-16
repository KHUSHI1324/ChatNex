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
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
        timestamp: msg.createdAt,
      };
    });
    res.json(projectedMessages);
  } catch (error) {
    next(error);
  }
};

// controllers/mediaController.js
exports.uploadMedia = async (req, res) => {
  const file = req.file;
  const { from, to} = req.body;
  if(!file|| !file.path){
    res.status(401).json({status:401,error:"no file uploaded"})
   }else{
    const userdata = new messageModel({
      // users:[from, to],
      // sender:from,
      imgpath: req.file.path
     });
   
  try {
   const finaldata = await userdata.save();
   res.status(201).json({status:201,finaldata});
  } catch (error) {
    console.error('Error uploading media:', error);
    return res.status(500).json({ error: 'An error occuring while saving the msg' });
  }
};
}