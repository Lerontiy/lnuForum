// authRouters.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.get('/msalInstance', authController.getMsalConfig);

module.exports = router;