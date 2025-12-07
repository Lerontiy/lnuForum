const msalInstance = new msal.PublicClientApplication({
    auth: {
        clientId: MSA_CONFIG.clientId,
        authority: MSA_CONFIG.authority,
        redirectUri: MSA_CONFIG.redirectUri
    }
});

window.addEventListener('load', () => {
    const token = localStorage.getItem('authToken');
    const userName = localStorage.getItem('userName');
    
    if (token && userName) {
        showForumScreen(userName);
    }
});

async function loginWithMicrosoft() {
    try {
        const loginResponse = await msalInstance.loginPopup({
            scopes: ["User.Read", "openid", "profile"]
        });

        const email = loginResponse.account.username.toLowerCase();

        if (!email.endsWith('@lnu.edu.ua')) {
            alert("Доступ дозволено тільки через корпоративну пошту @lnu.edu.ua");
            localStorage.clear();
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
            
            showForumScreen(data.username);
        } else {
            alert("Помилка входу на сервер: " + data.error);
        }

    } catch (error) {
        console.error(error);
        document.getElementById('login-error').innerText = "Error: " + error.message;
    }
}

function showForumScreen(username) {
    document.getElementById('current-user-display').innerText = username;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('forum-screen').style.display = 'block';

    if (typeof loadPosts === "function") loadPosts();
}

function logout() {
    localStorage.clear();
    location.reload();
}