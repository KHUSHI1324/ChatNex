// routes/messages.Routes.js
const express = require("express");
const router = express.Router();
const multer = require('multer'); 
const { addMessage, getAllMessage, uploadMedia, markAsRead } = require("../controllers/messagesController");

// image storage path
const imgconfig= multer.diskStorage({
    destination:(req,file,callback)=>{
        callback(null,"./uploads")
    },
    filename:(req,file,callback)=>{
        callback(null,`image-${Date.now()}.${file.originalname}`)
    }
})

// image filter
const isImage=(req,file,callback)=>{
    if(file.mimetype.startsWith('image')){
        callback(null,true)
    }else{
        callback(new Error("only image is allowed"))
    }
}

// Configure multer for file uploads
const upload = multer({ 
     storage:imgconfig,
     fileFilter:isImage   
});

// Handle media uploads
router.post('/upload', upload.single('photo'), uploadMedia);

router.post("/addmsg", addMessage);
router.post("/getmsg", getAllMessage);
router.put("/mark-read", markAsRead);
router.post("/mark-read", markAsRead);
module.exports = router;