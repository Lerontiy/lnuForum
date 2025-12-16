require('dotenv').config();
const express = require('express');
const path = require('path');

const authRoutes = require('./src/routes/authRoutes');
const postRoutes = require('./src/routes/postRoutes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
});

app.use('/api', authRoutes); 
app.use('/api', postRoutes); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(process.env.PORT, () => {
    console.log(`Сервер запущено на http://${process.env.HOST}:${process.env.PORT}`);
});