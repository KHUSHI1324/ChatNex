const {register,login,avtar,getAllUsers}=require('../controllers/userControllers');

const router=require('express').Router();

router.post('/register',register);
router.post('/login',login);
router.post('/avtar/:id',avtar);
router.get('/allusers/:id',getAllUsers);
module.exports=router;