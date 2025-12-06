require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;
const DB_FILE = 'database.json';

const API_KEY = process.env.GEMINI_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let forumPosts = [];

if (fs.existsSync(DB_FILE)) {
    const data = fs.readFileSync(DB_FILE);
    forumPosts = JSON.parse(data);
}

function saveToDb() {
    fs.writeFileSync(DB_FILE, JSON.stringify(forumPosts, null, 2));
}

async function aiModeratorCheck(text) {
    try {
        const prompt = `Ти модератор. Перевір текст на агресію або мати: "${text}". Відповідай ТІЛЬКИ "ТАК" (якщо токсично) або "НІ".`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text().trim().toUpperCase();
        return answer.includes('НІ');
    } catch (error) {
        return true;
    }
}

async function aiTopicAnalyzer(text) {
    try {
        const prompt = `Проаналізуй текст: "${text}". Обери одну категорію зі списку: "Запитання ❓", "Подяка 🙏", "Технічне 💻", "Обговорення 🗣️". Відповідай ТІЛЬКИ назвою категорії без зайвих слів.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        return 'Обговорення 🗣️';
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/posts', (req, res) => {
    res.json(forumPosts);
});

app.post('/api/posts', async (req, res) => {
    const { user, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Порожньо!' });

    const isSafe = await aiModeratorCheck(content);
    if (!isSafe) {
        return res.status(403).json({ error: 'Заблоковано AI-модератором.' });
    }

    const aiTag = await aiTopicAnalyzer(content);

    const newPost = {
        id: Date.now(),
        user: user || 'Студент',
        content: content,
        tag: aiTag,
        time: new Date().toLocaleString(),
        comments: []
    };

    forumPosts.unshift(newPost);
    saveToDb();
    res.status(201).json(newPost);
});

app.post('/api/comments', async (req, res) => {
    const { postId, user, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Порожньо!' });

    const isSafe = await aiModeratorCheck(content);
    if (!isSafe) return res.status(403).json({ error: 'Коментар заблоковано AI.' });

    const post = forumPosts.find(p => p.id == postId);
    if (post) {
        post.comments.push({
            user: user || 'Гість',
            content: content,
            time: new Date().toLocaleString()
        });
        saveToDb();
        res.status(201).json({ message: 'OK' });
    } else {
        res.status(404).json({ error: 'Пост не знайдено' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});