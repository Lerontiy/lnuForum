const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Потрібна авторизація' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next(); 
    } catch (error) {
        if (error.name !== "TokenExpiredError") {
            console.error(error);
            return res.status(401).json({ error: 'Невірний токен' });
        } 
        return res.status(401).json({ error: 'Термін дії токена вичерпався, залогіньтесь знову' });
        
    }
}