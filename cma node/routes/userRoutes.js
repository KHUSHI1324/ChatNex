const {
    register,
    login,
    avtar,
    getAllUsers,
    getContactsWithLastMessage,
    logAvatarFallback,
    getUserById,
    generateAiAvatar,
    updatePrivacySettings,
    blockUser,
    unblockUser,
    getBlockedUsers,
    setPasscode,
    verifyPasscode,
    searchUsers,
    addContact,
    removeContact,
    updateProfile,
} = require('../controllers/userControllers');
const verifyToken = require('../middleware/verifyToken');

const router = require('express').Router();

// Public Authentication endpoints
router.post('/register', register);
router.post('/login', login);

// Protected User Profile & Avatar endpoints
router.post(['/avtar', '/avtar/:id'], verifyToken, avtar);
router.post('/update-profile', verifyToken, updateProfile);
router.post('/generate-ai-avatar', verifyToken, generateAiAvatar);
router.post('/log-avatar-fallback', verifyToken, logAvatarFallback);
router.get('/user/:id', verifyToken, getUserById);
router.get(['/allusers', '/allusers/:id'], verifyToken, getAllUsers);
router.get(['/contacts-with-last-message', '/contacts-with-last-message/:id'], verifyToken, getContactsWithLastMessage);
router.get('/search-users', verifyToken, searchUsers);
router.post('/add-contact', verifyToken, addContact);
router.post('/remove-contact', verifyToken, removeContact);

// Protected Privacy & Security endpoints
router.post('/privacy-settings', verifyToken, updatePrivacySettings);
router.post('/block-user', verifyToken, blockUser);
router.post('/unblock-user', verifyToken, unblockUser);
router.get(['/blocked-users', '/blocked-users/:userId'], verifyToken, getBlockedUsers);
router.post('/set-passcode', verifyToken, setPasscode);
router.post('/verify-passcode', verifyToken, verifyPasscode);

module.exports = router;