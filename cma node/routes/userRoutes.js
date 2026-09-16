const { register, login, avtar, getAllUsers, getContactsWithLastMessage } = require('../controllers/userControllers');

const router = require('express').Router();

router.post('/register', register);
router.post('/login', login);
router.post('/avtar/:id', avtar);
router.get('/allusers/:id', getAllUsers);
router.get('/contacts-with-last-message/:id', getContactsWithLastMessage);
module.exports = router;