// routes/messages.Routes.js
const express = require("express");
const router = express.Router();
const multer = require('multer'); 
const { addMessage, getAllMessage, uploadMedia, markAsRead } = require("../controllers/messagesController");

// Allowed mime types & extensions
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/ogg",
  "video/avi",
  "video/x-msvideo",
  "video/mpeg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",
  "text/x-csv",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp",
  "mp4", "webm", "mov", "mkv", "avi", "ogg",
  "pdf", "doc", "docx", "xls", "xlsx", "csv"
]);

// File storage path with sanitized naming
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "./uploads");
  },
  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `file-${Date.now()}-${safeName}`);
  },
});

// File filter accepting images, videos, PDF, DOC/DOCX, XLS/XLSX, CSV
const fileFilter = (req, file, callback) => {
  const isImageMime = file.mimetype && file.mimetype.startsWith("image/");
  const isVideoMime = file.mimetype && file.mimetype.startsWith("video/");
  const ext = (file.originalname.split(".").pop() || "").toLowerCase();

  if (ALLOWED_MIME_TYPES.has(file.mimetype) || isImageMime || isVideoMime || ALLOWED_EXTENSIONS.has(ext)) {
    callback(null, true);
  } else {
    callback(new Error(`Invalid file type: "${file.originalname}". Allowed types: Images, Videos, PDF, DOC/DOCX, XLS/XLSX, CSV.`));
  }
};

// Configure multer with 50MB limit per file and up to 10 files
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10,
  },
});

// Handle media uploads with error interception
router.post(
  "/upload",
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ status: 400, error: "File size exceeds 10MB limit per file." });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({ status: 400, error: "Cannot upload more than 10 files at once." });
        }
        return res.status(400).json({ status: 400, error: err.message });
      } else if (err) {
        return res.status(400).json({ status: 400, error: err.message });
      }
      next();
    });
  },
  uploadMedia
);

router.post("/addmsg", addMessage);
router.post("/getmsg", getAllMessage);
router.put("/mark-read", markAsRead);
router.post("/mark-read", markAsRead);
module.exports = router;