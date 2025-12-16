// postController.js

const Post = require('../models/Post');
const aiService = require('../services/aiService');

exports.getPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Помилка сервера при отриманні постів' });
    }
};

exports.createPost = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Порожньо!' });

        const isSafe = await aiService.checkToxicity(content);
        if (!isSafe) return res.status(422).json({ error: 'Заблоковано AI-модератором.' });

        const aiTag = await aiService.analyzeTopic(content);

        const newPost = await Post.create({
            user: req.user.username,
            content: content,
            tag: aiTag,
        });

        res.status(201).json(newPost);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Не вдалося створити пост' });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { postId, content } = req.body;
        if (!content) return res.status(400).json({ error: 'Порожньо!' });

        const isSafe = await aiService.checkToxicity(content);
        if (!isSafe) return res.status(422).json({ error: 'Коментар заблоковано AI-модератором.' });

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Пост не знайдено' });
        }

        post.comments.push({
            user: req.user.username,
            content: content,
            time: new Date().toLocaleString()
        });

        await post.save();

        res.status(201).json({ message: 'OK', comments: post.comments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Помилка при додаванні коментаря' });
    }
};