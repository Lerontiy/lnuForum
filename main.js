const express = require('express');
const path = require('path');
const fs = require('fs');
const ollama = require('ollama').default;

const app = express();
const PORT = 3000;
const DB_FILE = 'database.json';

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
            model: 'qwen2.5:3b',
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
        res.json({ success: true, username: username });
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

app.post('/api/posts', async (req, res) => {
    const { user, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Порожньо!' });

    const isSafe = await aiModeratorCheck(content);
    if (!isSafe) {
        return res.status(403).json({ error: 'Заблоковано AI-модератором.' });
    }

    const aiTag = await aiTopicAnalyzer(content);

    const newPost = {
        id: forumPosts.length + 1,
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