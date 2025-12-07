const msalInstance = new msal.PublicClientApplication({
    auth: {
        clientId: MSA_CONFIG.clientId,
        authority: MSA_CONFIG.authority,
        redirectUri: MSA_CONFIG.redirectUri
    }
});

window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        showForumScreen(savedUser);
    }
});

async function loginWithMicrosoft() {
    try {
        const response = await msalInstance.loginPopup();
        const username = response.account.username;
        
        localStorage.setItem('currentUser', username);
        
        showForumScreen(username);

    } catch (error) {
        console.error(error);
        document.getElementById('login-error').innerText = "Помилка: " + error.message;
    }
}

function showForumScreen(username) {
    document.getElementById('current-user-display').innerText = username;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('forum-screen').style.display = 'block';

    if (typeof renderPosts === "function") {
        renderPosts();
    } else if (typeof loadPosts === "function") {
        loadPosts();
    } else {
        console.log("Увага: не знайдено функції для показу постів у script.js");
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    location.reload();
}