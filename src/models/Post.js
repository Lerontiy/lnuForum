// Post.js

const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    user: { type: String, required: true },
    content: { type: String, required: true },
    time: { type: String, default: () => new Date().toLocaleString() } 
});

const PostSchema = new mongoose.Schema({
    user: { 
        type: String, 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    tag: { 
        type: String, 
        default: 'Обговорення 🗣️' 
    },
    time: { 
        type: String, 
        default: () => new Date().toLocaleString() 
    },
    comments: [CommentSchema] 
}, {
    timestamps: true 
});

module.exports = mongoose.model('Post', PostSchema);