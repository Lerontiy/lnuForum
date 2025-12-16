const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../../database.json');

const readData = () => {
    if (!fs.existsSync(DB_FILE)) return [];
    return JSON.parse(fs.readFileSync(DB_FILE));
};

const writeData = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

module.exports = {
    getAll: () => readData(),
    
    getById: (id) => readData().find(p => p.id == id),
    
    create: (postData) => {
        const posts = readData();
        const newPost = { id: posts.length + 1, ...postData, comments: [] };
        posts.unshift(newPost);
        writeData(posts);
        return newPost;
    },

    addComment: (postId, commentData) => {
        const posts = readData();
        const post = posts.find(p => p.id == postId);
        if (post) {
            post.comments.push(commentData);
            writeData(posts);
            return true;
        }
        return false;
    }
};