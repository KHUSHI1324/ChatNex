const { register, login, avtar, getAllUsers, getContactsWithLastMessage, logAvatarFallback, getUserById, generateAiAvatar } = require('../controllers/userControllers');

const router = require('express').Router();

router.post('/register', register);
router.post('/login', login);
router.post('/avtar/:id', avtar);
router.post('/generate-ai-avatar', generateAiAvatar);
router.post('/log-avatar-fallback', logAvatarFallback);
router.get('/user/:id', getUserById);
router.get('/allusers/:id', getAllUsers);
router.get('/contacts-with-last-message/:id', getContactsWithLastMessage);
module.exports = router;