const PostModel = require('../models/postModel');
const aiService = require('../services/aiService');

exports.getPosts = (req, res) => {
    res.json(PostModel.getAll());
};

exports.createPost = async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Порожньо!' });

    const isSafe = await aiService.checkToxicity(content);
    if (!isSafe) return res.status(403).json({ error: 'Заблоковано AI-модератором.' });

    const aiTag = await aiService.analyzeTopic(content);

    const newPost = PostModel.create({
        user: req.user.username,
        content: content,
        tag: aiTag,
        time: new Date().toLocaleString(),
    });

    res.status(201).json(newPost);
};

exports.addComment = async (req, res) => {
    const { postId, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Порожньо!' });

    const isSafe = await aiService.checkToxicity(content);
    if (!isSafe) return res.status(403).json({ error: 'Коментар заблоковано AI.' });

    const success = PostModel.addComment(postId, {
        user: req.user.username,
        content: content,
        time: new Date().toLocaleString()
    });

    if (success) {
        res.status(201).json({ message: 'OK' });
    } else {
        res.status(404).json({ error: 'Пост не знайдено' });
    }
};