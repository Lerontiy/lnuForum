// postRouters.js

const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/posts', postController.getPosts);
router.post('/posts', authenticateToken, postController.createPost);
router.post('/comments', authenticateToken, postController.addComment);

module.exports = router;