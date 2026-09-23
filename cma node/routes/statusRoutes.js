const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require('../middleware/verifyToken');
const {
  createStatus,
  getStatuses,
  viewStatus,
  deleteStatus,
} = require('../controllers/statusController');

router.use(verifyToken);

const storage = multer.memoryStorage();
const MAX_STATUS_FILE_SIZE = 30 * 1024 * 1024; // 30MB limit for stories

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_STATUS_FILE_SIZE },
});

// Handle status creation with Multer error interception
router.post(
  '/create',
  (req, res, next) => {
    upload.single('media')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ status: false, msg: 'File size exceeds 30MB limit for stories' });
        }
        return res.status(400).json({ status: false, msg: err.message });
      } else if (err) {
        return res.status(400).json({ status: false, msg: err.message });
      }
      next();
    });
  },
  createStatus
);
router.get('/get', getStatuses);
router.get('/get/:userId', getStatuses);
router.post('/view', viewStatus);
router.delete('/delete/:statusId', deleteStatus);

module.exports = router;
