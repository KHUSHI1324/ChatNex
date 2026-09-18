const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createStatus,
  getStatuses,
  viewStatus,
  deleteStatus,
} = require('../controllers/statusController');

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, './uploads');
  },
  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    callback(null, `status-${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB limit for stories
});

router.post('/create', upload.single('media'), createStatus);
router.get('/get/:userId', getStatuses);
router.post('/view', viewStatus);
router.delete('/delete/:statusId', deleteStatus);

module.exports = router;
