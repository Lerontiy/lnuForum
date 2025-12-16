let msalInstance = null;

async function initializeApp() {
    try {
        const response = await fetch('/api/msalInstance');
        const config = await response.json();

        msalInstance = new msal.PublicClientApplication({
            auth: {
                clientId: config.clientId, 
                authority: config.authority,
                redirectUri: window.location.origin
            }, 
            cache: {
                cacheLocation: "sessionStorage",
                storeAuthStateInCookie: false,
            }
        });

        const authResult = await msalInstance.handleRedirectPromise();

        if (authResult) {
            await handleServerLogin(authResult.account);
        } else {
            checkSession();
        }
    } catch (error) {
        console.error("Помилка ініціалізації MSAL:", error);
    }
}

async function loginWithMicrosoft() {
    if (!msalInstance) {
        console.error("MSAL ще не готовий!");
        return;
    }
    await msalInstance.loginRedirect({
        scopes: ["User.Read", "openid", "profile"],
        prompt: "select_account"
    });
}

async function handleServerLogin(account) {
    if (!account) return;

    const email = account.username.toLowerCase();

    if (!email.endsWith('@lnu.edu.ua')) {
        alert("Доступ дозволено тільки через корпоративну пошту @lnu.edu.ua");
        //const logoutRequest = { account: account };
        //await msalInstance.logoutRedirect(logoutRequest);
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const data = await response.json();

        if (response.ok) {
            showForum(data.username);
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('username', data.username);
            window.history.replaceState({}, document.title, "/");
        } else {
            alert("Помилка входу на сервер: " + data.error);
        }
    } catch (error) {
        console.error("API Error:", error);
        document.getElementById('login-error').innerText = "Помилка: " + error.message;
    }
}

function checkSession() {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    
    if (token && username) {
        const currentAccounts = msalInstance ? msalInstance.getAllAccounts() : [];
        if (currentAccounts.length > 0) {
            msalInstance.setActiveAccount(currentAccounts[0]);
        }
        showForum(username);
    }
}

function showForum(username) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('forum-screen').style.display = 'block';
    document.getElementById('current-user-display').innerText = username;
    loadPosts();
}

function logout() {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
}

initializeApp();