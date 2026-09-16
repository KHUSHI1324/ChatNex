const User = require("../models/userModels");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');

module.exports.register=async(req,res,next)=>{

    try{
        const{username,email,password}=req.body;
    const usernameCheck=await User.findOne({username});
    if(usernameCheck)
    return res.json({msg: 'username already used',status:false});

   const emailCheck=await User.findOne({email});
   if(emailCheck) 
   return res.json({msg: 'email already used',status:false});
   
   const hashedPassword =await bcrypt.hash(password,10);
   const user =await User.create({
       email,username,
       password: hashedPassword,
   });
   delete user.password;
   return res.json({status:true,user});
}catch(ex){
    next(ex);
 }
};

module.exports.login=async(req,res,next)=>{

    try{
        const {username,password}=req.body;
    const user=await User.findOne({username});
    if(!user)
    return res.json({msg:'Incorrect username',status:false});

   const isPasswordValid=await bcrypt.compare(password,user.password);  
  if(!isPasswordValid)
  return res.json({msg: "Incorrect password",status:false});
   delete user.password;
   return res.json({status:true,user});
}catch(ex){
    next(ex);
 } };
 module.exports.avtar=async(req,res,next)=>{
    try{
const userId=req.params.id;
const avtarImage=req.body.image;
const userData=await User.findByIdAndUpdate(userId,{
    isAvtarImageSet:true,
    avtarImage,
});
return res.json({isSet: userData.isAvtarImageSet,
                 image: userData.avtarImage,
});
}catch(ex){
 next(ex)
}
};

module.exports.getAllUsers=async(req,res,next)=>{
    try {
        const users=await User.find({_id:{$ne:req.params.id}}).select([
            "email",
            "username",
            "avtarImage",
            "_id",
        ]);
        return res.json(users);
    } catch (ex) {
        next(ex);
    }
};

module.exports.getContactsWithLastMessage = async (req, res, next) => {
    try {
        const currentUserId = new mongoose.Types.ObjectId(req.params.id);
        const currentUserIdStr = req.params.id.toString();

        const contacts = await User.aggregate([
            {
                $match: {
                    _id: { $ne: currentUserId }
                }
            },
            {
                $lookup: {
                    from: "messages",
                    let: { contactIdStr: { $toString: "$_id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: [currentUserIdStr, "$users"] },
                                        { $in: ["$$contactIdStr", "$users"] }
                                    ]
                                }
                            }
                        },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 },
                        {
                            $project: {
                                _id: 1,
                                message: "$message.text",
                                sender: 1,
                                createdAt: 1
                            }
                        }
                    ],
                    as: "lastMessageData"
                }
            },
            {
                $lookup: {
                    from: "messages",
                    let: { contactIdStr: { $toString: "$_id" }, contactObjId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: [currentUserIdStr, "$users"] },
                                        { $in: ["$$contactIdStr", "$users"] },
                                        { $eq: ["$sender", "$$contactObjId"] },
                                        { $eq: ["$read", false] }
                                    ]
                                }
                            }
                        },
                        { $count: "count" }
                    ],
                    as: "unreadData"
                }
            },
            {
                $addFields: {
                    lastMessageObj: { $arrayElemAt: ["$lastMessageData", 0] },
                    unreadCountVal: { $ifNull: [{ $arrayElemAt: ["$unreadData.count", 0] }, 0] }
                }
            },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    email: 1,
                    avtarImage: 1,
                    isAvtarImageSet: 1,
                    latestMessage: {
                        message: "$lastMessageObj.message",
                        timestamp: "$lastMessageObj.createdAt",
                        sender: "$lastMessageObj.sender"
                    },
                    lastMessageTimestamp: {
                        $ifNull: ["$lastMessageObj.createdAt", new Date(0)]
                    },
                    unreadCount: "$unreadCountVal"
                }
            },
            {
                $sort: {
                    lastMessageTimestamp: -1,
                    username: 1
                }
            }
        ]);

        return res.json(contacts);
    } catch (ex) {
        next(ex);
    }
};