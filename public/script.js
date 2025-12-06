loadPosts();

async function sendPost() {
    const user = document.getElementById('username').value;
    const content = document.getElementById('message').value;
    const status = document.getElementById('status-msg');
    
    status.innerText = "";
    
    const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, content })
    });

    const result = await response.json();

    if (response.ok) {
        document.getElementById('message').value = "";
        loadPosts();
    } else {
        status.innerText = result.error;
    }
}

async function sendComment(postId) {
    const user = document.getElementById(`user-${postId}`).value;
    const content = document.getElementById(`comment-${postId}`).value;
    
    if(!content) return;

    const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, user, content })
    });

    if (response.ok) {
        loadPosts();
    } else {
        alert('AI-Модератор: Коментар містить заборонені слова!');
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
                <input type="text" id="user-${post.id}" placeholder="Ваше ім'я" class="mini-input">
                <textarea type="text" id="comment-${post.id}" placeholder="Відповісти..." class="mini-input"></textarea>
                <button onclick="sendComment(${post.id})" class="mini-btn">Reply</button>
            </div>
        `;
        list.appendChild(postDiv);
    });
}