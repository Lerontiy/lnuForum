loadPosts();

async function sendPost() {
    const userInput = document.getElementById('username');
    const contentInput = document.getElementById('message');
    const status = document.getElementById('status-msg');
    const btn = document.querySelector('.post-form button');

    const user = userInput.value;
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
            body: JSON.stringify({ user, content })
        });

        const result = await response.json();

        if (response.ok) {
            contentInput.value = "";
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
    const userInput = document.getElementById(`user-${postId}`);
    const contentInput = document.getElementById(`comment-${postId}`);
    const btn = document.querySelector(`button[onclick="sendComment(${postId})"]`);

    const user = userInput.value;
    const content = contentInput.value;
    
    if(!content) return;

    btn.disabled = true;
    const oldText = btn.innerText;
    btn.innerText = "⏳...";

    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, user, content })
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
                <input type="text" id="user-${post.id}" placeholder="Ваше ім'я" class="mini-input" autocomplete="off">
                <textarea 
                    id="comment-${post.id}" 
                    placeholder="Коментар..." 
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