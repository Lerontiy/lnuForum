const jwt = require('jsonwebtoken');

exports.login = (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Введіть пошту' });

    const allowedDomain = '@lnu.edu.ua';
    
    if (email.endsWith(allowedDomain)) {
        const username = email.split('@')[0]; 

        const nameParts = username.split('.');
        let cleanUsername = nameParts.slice(0, 2).join(' ').toLowerCase(); 

        let shouldCapitalize = true; 
        let finalName = '';
        for (let i = 0; i < cleanUsername.length; i++) {
            let char = cleanUsername[i];
            if (shouldCapitalize && char >= 'a' && char <= 'z') {
                finalName += char.toUpperCase();
                shouldCapitalize = false; 
            } else {
                finalName += char;
            }
            if (char === ' ' || char === '-') shouldCapitalize = true;
        }

        const token = jwt.sign({ username: finalName }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token: token, username: finalName });
    } else {
        res.status(403).json({ error: `Доступ тільки для корпоративної пошти ${allowedDomain}` });
    }
};

exports.getMsalConfig = (req, res) => {
    res.json({
        clientId: process.env.AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
        redirectUri: `http://${process.env.HOST}:${process.env.PORT}`
    });
};
