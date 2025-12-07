let currentUser = "";

function checkSession() {
    const savedUser = localStorage.getItem('forumUser');
    if (savedUser) {
        currentUser = savedUser;
        showForum();
    }
}

async function login() {
    const email = document.getElementById('email-input').value;
    const errorMsg = document.getElementById('login-error');
    
    if (!email) return;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (response.ok) {
            currentUser = result.username;
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('forumUser', currentUser);
            showForum();
        } else {
            errorMsg.innerText = result.error;
        }
    } catch (error) {
        console.log(error);
        errorMsg.innerText = "Помилка сервера";
    }
}

function logout() {
    localStorage.removeItem('forumUser');
    location.reload();
}

function showForum() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('forum-screen').style.display = 'block';
    document.getElementById('current-user-display').innerText = currentUser;
    loadPosts();
}

async function sendPost() {
    const messageInput = document.getElementById('message');
    const content = messageInput.value;
    if(!content) return;

    const btn = document.getElementById('sendBtn');
    const token = localStorage.getItem('authToken');

    if (!token) {
        alert("Please login first");
        return;
    }

    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = '⏳...';
    btn.style.opacity = '0.6';

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: content })
        });

        if (response.ok) {
            messageInput.value = '';
            loadPosts();
        } else {
            const data = await response.json();
            alert(data.error);
        }
    } catch (error) {
        console.error(error);
        alert("Помилка з'єднання");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
        btn.style.opacity = '1';
    }
}

async function sendComment(postId) {
    const contentInput = document.getElementById(`comment-${postId}`);
    const content = contentInput.value;
    if(!content) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
        alert("Будь ласка, увійдіть у систему!");
        return;
    }

    const btn = document.querySelector(`button[onclick="sendComment(${postId})"]`);

    btn.disabled = true;
    const oldText = btn.innerText;
    btn.innerText = "⏳...";

    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, user: currentUser, content })
        });

        if (response.ok) {
            loadPosts();
        } else {
            alert('AI-Модератор: Коментар заблоковано!');
        }
    } catch (error) {
        console.log(error);
        alert("Помилка з'єднання!");
    } finally {
        btn.disabled = false;
        btn.innerText = oldText;
    }
}

async function loadPosts() {
    const response = await fetch('/api/posts');
    const posts = await response.json();
    const list = document.getElementById('posts-list');
    list.innerHTML = "";

    posts.forEach(post => {
        let commentsHtml = '';
        post.comments.forEach(c => {
            commentsHtml += `
                <div class="comment">
                    <strong>${c.user}</strong>: ${c.content}
                    <div class="time">${c.time}</div>
                </div>
            `;
        });

        const postDiv = document.createElement('div');
        postDiv.className = 'post';
        
        postDiv.innerHTML = `
            <div class="post-header">
                <strong>${post.user}</strong>
                <span class="ai-tag">${post.tag}</span>
            </div>
            <div class="content">${post.content}</div>
            <small>${post.time}</small>
            
            <div class="comments-section">
                ${commentsHtml}
            </div>

            <div class="reply-form">
                <textarea 
                    id="comment-${post.id}" 
                    placeholder="Відповісти..." 
                    class="mini-input" 
                    autocomplete="off" 
                    rows="1" 
                    style="resize: none; overflow: hidden;"
                    oninput="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'"
                ></textarea>
                <button onclick="sendComment(${post.id})" class="mini-btn">Додати</button>
            </div>
        `;
        list.appendChild(postDiv);
    });
}

checkSession();