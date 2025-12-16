function checkSession() {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    
    if (token && username) {
        showForum(username);
    }
}

function showForum(username) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('forum-screen').style.display = 'block';
    document.getElementById('current-user-display').innerText = username;
    loadPosts();
}

async function initializeMsal() {
    const response = await fetch('/api/msalInstance');
    const config = await response.json(); 
    return new msal.PublicClientApplication({
        auth: {
            clientId: config.clientId, 
            authority: config.authority,
            redirectUri: config.redirectUri 
        }
    });
}

async function loginWithMicrosoft() {
    try {
        const msalInstance = await initializeMsal();
        const loginResponse = await msalInstance.loginPopup({
            scopes: ["User.Read", "openid", "profile"]
        });

        const email = loginResponse.account.username.toLowerCase();

        if (!email.endsWith('@lnu.edu.ua')) {
            alert("Доступ дозволено тільки через корпоративну пошту @lnu.edu.ua");
            logout();
            return;
        }

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('username', data.username);
            showForum(data.username);
        } else {
            alert("Помилка входу на сервер: " + data.error);
        }

    } catch (error) {
        document.getElementById('login-error').innerText = "Error: " + error.message;
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

checkSession();