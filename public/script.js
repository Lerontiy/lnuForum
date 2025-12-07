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
            localStorage.setItem('forumUser', currentUser);
            showForum();
        } else {
            errorMsg.innerText = result.error;
        }
    } catch (e) {
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
    const contentInput = document.getElementById('message');
    const status = document.getElementById('status-msg');
    const btn = document.querySelector('#forum-screen .post-form button');

    const content = contentInput.value;
    if (!content) return;

    btn.disabled = true;
    const oldText = btn.innerText;
    btn.innerText = "⏳ AI перевіряє...";
    status.innerText = "";

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: currentUser, content })
        });

        const result = await response.json();

        if (response.ok) {
            contentInput.value = "";
            contentInput.style.height = '42px';
            loadPosts();
        } else {
            status.innerText = result.error;
        }
    } catch (error) {
        status.innerText = "Помилка з'єднання!";
    } finally {
        btn.disabled = false;
        btn.innerText = oldText;
    }
}

async function sendComment(postId) {
    const contentInput = document.getElementById(`comment-${postId}`);
    const btn = document.querySelector(`button[onclick="sendComment(${postId})"]`);

    const content = contentInput.value;
    if(!content) return;

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
                <button onclick="sendComment(${post.id})" class="mini-btn">Reply</button>
            </div>
        `;
        list.appendChild(postDiv);
    });
}

checkSession();