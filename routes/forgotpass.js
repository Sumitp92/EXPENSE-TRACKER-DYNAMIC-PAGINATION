const express = require('express');
const userController = require('../controllers/Auth');
const router = express.Router();

router.post('/forgotpassword', userController.forgotPassword);
router.get('/resetpassword/:resetId', userController.validateResetRequest);
router.post('/updatepassword/:resetId', userController.updatePassword);

module.exports = router;
