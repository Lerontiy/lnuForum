require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const ollama = require('ollama').default;
const jwt = require('jsonwebtoken');

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const TENANT_ID = process.env.AZURE_TENANT_ID;
const AI_MODEL_NAME = process.env.AI_MODEL;

const app = express();
const DB_FILE = 'database.json';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
});

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
        const prompt = `
        Ти — суворий, але надзвичайно буквальний модератор форуму.
        Твоє завдання — перевірити текст ВИКЛЮЧНО на токсичність та незв'язність.

        **Тобі заборонено аналізувати або блокувати текст на основі потенційної "провокації" чи "ідентифікації".**

        Правила для BLOCK (БЛОКУВАННЯ):
        1.  Текст містить **неприпустиму лексику** (лайка, образи, вульгарний сленг, мова ворожнечі).
        2.  Текст є **незрозумілим, незв'язним набором випадкових символів** ("!!!asdfgh123!!!").

        У ВСІХ ІНШИХ ВИПАДКАХ, якщо текст є зрозумілим і не містить токсичних слів з правила №1, відповідай "ALLOW".

        Текст для перевірки: "${text}"

        Твій вердикт (тільки одне слово: BLOCK або ALLOW.):
        `;
        const response = await ollama.chat({  // . Пояснення
            model: 'qwen2.5:3b',
            messages: [{ role: 'user', content: prompt }],
        });
        //console.log(response);
        return response.message.content.toUpperCase().includes('ALLOW');
    } catch (error) {
        console.log(error);
        return false; 
    }
}

async function aiTopicAnalyzer(text) {
    try {
        const prompt = `
        Проаналізуй текст: "${text}".

        Твоя відповідь ПОВИННА бути ОДНИМ елементом, обраним з наступного списку (включно з емодзі):
        ["Запитання ❓", "Подяка 🙏", "Технічне 💻", "Обговорення 🗣️", "Знайомство 🤝"]

        Відповідай ТІЛЬКИ назвою категорії та її емодзі. **Категорично заборонено** додавати будь-які пояснення, привітання, вступні фрази чи знаки пунктуації.
        `;
        const response = await ollama.chat({
            model: AI_MODEL_NAME,
            messages: [{ role: 'user', content: prompt }],
        });
        return response.message.content.trim();
    } catch (error) {
        console.log(error);
        return 'Обговорення 🗣️';
    }
}

app.post('/api/login', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Введіть пошту' });

    const allowedDomain = '@lnu.edu.ua';
    
    if (email.endsWith(allowedDomain)) {
        const username = email.split('@')[0]; 
        const token = jwt.sign({ username: username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token: token, username: username });
    } else {
        res.status(403).json({ error: `Доступ тільки для корпоративної пошти ${allowedDomain}` });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/msalInstance', (req, res) => {
    res.json({
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: `${BASE_URL}`
    });
});

app.get('/api/posts', (req, res) => {
    res.json(forumPosts);
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Потрібна авторизація' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next(); 
    } catch (error) {
        console.log(error);
        return res.status(403).json({ error: 'Невірний токен' });
    }
}

app.post('/api/posts', authenticateToken, async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Порожньо!' });
    
    const isSafe = await aiModeratorCheck(content);
    if (!isSafe) {
        return res.status(403).json({ error: 'Заблоковано AI-модератором.' });
    }

    const aiTag = await aiTopicAnalyzer(content);

    const newPost = {
        id: forumPosts.length + 1,
        user: req.user.username,
        content: content,
        tag: aiTag,
        time: new Date().toLocaleString(),
        comments: []
    };

    forumPosts.unshift(newPost);
    saveToDb();
    res.status(201).json(newPost);
});

app.post('/api/comments', authenticateToken, async (req, res) => {
    const { postId, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Порожньо!' });

    const isSafe = await aiModeratorCheck(content);
    if (!isSafe) return res.status(403).json({ error: 'Коментар заблоковано AI-модератором.' });

    const post = forumPosts.find(p => p.id == postId);
    if (post) {
        post.comments.push({
            user: req.user.username,
            content: content,
            time: new Date().toLocaleString()
        });
        saveToDb();
        res.status(201).json({ message: 'OK' });
    } else {
        res.status(404).json({ error: 'Пост не знайдено' });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on ${BASE_URL}`);
});