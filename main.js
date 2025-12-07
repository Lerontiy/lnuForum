require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const ollama = require('ollama').default;
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const TENANT_ID = process.env.AZURE_TENANT_ID;
const AI_MODEL_NAME = process.env.AI_MODEL;

const app = express();
const DB_FILE = 'database.json';

const client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, function (err, key) {
        if (err) return callback(err);
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
}

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, getKey, { 
        audience: CLIENT_ID, 
        ignoreExpiration: false 
    }, (err, decoded) => {
        if (err) {
            console.log("Token verification failed:", err.message);
            return res.status(403).json({ error: 'Invalid token' });
        }

        const email = (decoded.preferred_username || decoded.email || "").toLowerCase();
        if (!email.endsWith('@lnu.edu.ua')) {
            return res.status(403).json({ error: 'Тільки для студентів ЛНУ!' });
        }
        
        req.user = {
            name: decoded.name || 'Student',
            email: decoded.preferred_username || decoded.email
        };
        next();
    });
}

app.get('/config.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
        const MSA_CONFIG = {
            clientId: "${CLIENT_ID}",
            authority: "https://login.microsoftonline.com/${TENANT_ID}",
            redirectUri: "${BASE_URL}",
            postLogoutRedirectUri: "${BASE_URL}"
        };
    `);
});

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
        const prompt = `
        Ти — суворий адміністратор форуму.
        Твоє завдання — перевірити текст на токсичність.

        Правила:
        1. Якщо текст містить нецензурну лексику, лайку, вульгарний сленг, образи, безмістовний або випадково набраний текст — відповідай "BLOCK".
        2. У всіх інших випадках відповідай "ALLOW".

        Текст для перевірки: "${text}"

        Твій вердикт (тільки одне слово: BLOCK або ALLOW):
        `;
        const response = await ollama.chat({
            model: 'qwen2.5:3b',
            messages: [{ role: 'user', content: prompt }],
        });
        return response.message.content.toUpperCase().includes('ALLOW');
    } catch (error) {
        console.log(error);
        return false; 
    }
}

async function aiTopicAnalyzer(text) {
    try {
        const prompt = `Проаналізуй текст: "${text}". Обери одну категорію зі списку: "Запитання ❓", "Подяка 🙏", "Технічне 💻", "Обговорення 🗣️". Відповідай ТІЛЬКИ назвою категорії без зайвих слів.`;
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
        const token = jwt.sign({ username: username }, process.env.JWT_SECRET);
        res.json({ success: true, token: token, username: username });
    } else {
        res.status(403).json({ error: `Доступ тільки для корпоративної пошти ${allowedDomain}` });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/posts', (req, res) => {
    res.json(forumPosts);
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Потрібна авторизація' });

    try {
        const decoded = jwt.verify(token, MY_SECRET_KEY);
        req.username = decoded.username; 
        next(); 
    } catch (e) {
        return res.status(403).json({ error: 'Невірний токен' });
    }
}

app.post('/api/posts', authenticateToken, async (req, res) => {
    const { content } = req.body;

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!content) return res.status(400).json({ error: 'Порожньо!' });
    if (!token) return res.status(401).json({ error: 'Потрібна авторизація' });

    let username;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        username = decoded.username; 
    } catch (error) {
        console.log(error);
        return res.status(403).json({ error: 'Невірний токен' });
    }
    
    const isSafe = await aiModeratorCheck(content);
    if (!isSafe) {
        return res.status(403).json({ error: 'Заблоковано AI-модератором.' });
    }

    const aiTag = await aiTopicAnalyzer(content);

    const newPost = {
        id: forumPosts.length + 1,
        user: username,
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
    if (!isSafe) return res.status(403).json({ error: 'Коментар заблоковано AI-модератором.' });

    const post = forumPosts.find(p => p.id == postId);
    if (post) {
        post.comments.push({
            user: user,
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