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

const router = require('express').Router();

router.post('/register', register);
router.post('/login', login);
router.post('/avtar/:id', avtar);
router.post('/update-profile', updateProfile);
router.post('/generate-ai-avatar', generateAiAvatar);
router.post('/log-avatar-fallback', logAvatarFallback);
router.get('/user/:id', getUserById);
router.get('/allusers/:id', getAllUsers);
router.get('/contacts-with-last-message/:id', getContactsWithLastMessage);
router.get('/search-users', searchUsers);
router.post('/add-contact', addContact);
router.post('/remove-contact', removeContact);

// Privacy & Security endpoints
router.post('/privacy-settings', updatePrivacySettings);
router.post('/block-user', blockUser);
router.post('/unblock-user', unblockUser);
router.get('/blocked-users/:userId', getBlockedUsers);
router.post('/set-passcode', setPasscode);
router.post('/verify-passcode', verifyPasscode);

module.exports = router;