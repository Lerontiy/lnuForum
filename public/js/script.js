async function sendPost() {
    const messageInput = document.getElementById('message');
    const content = messageInput.value;
    if(!content) return;

    const btn = document.getElementById('sendBtn');
    const token = localStorage.getItem('authToken');

    if (!token) {
        alert("Будь ласка, увійдіть у систему!");
        logout();
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
        const data = await response.json();
        
        const statusDiv = document.getElementById('status-msg');
        if (response.ok) {
            messageInput.value = '';
            statusDiv.innerText = '';
            loadPosts();
        } else if (response.status==401) {
            alert(data.error);
            logout();
        } else {
            statusDiv.innerText = data.error;
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
        logout();
        return;
    }

    const btn = document.querySelector(`button[onclick="sendComment('${postId}')"]`);

    btn.disabled = true;
    const oldText = btn.innerText;
    btn.innerText = "⏳...";

    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ postId, content })
        });
        const data = await response.json();

        if (response.ok) {
            loadPosts();
        } else if (response.status==401 || response.status==403) {
            alert(data.error);
            logout();
        } else { // if (data.error == "Коментар заблоковано AI-модератором.")
            alert(data.error);
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
                    id="comment-${post._id}" 
                    placeholder="Відповісти..." 
                    class="mini-input" 
                    autocomplete="off" 
                    rows="1" 
                    style="resize: none; overflow: hidden;"
                    oninput="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'"
                ></textarea>
                <button onclick="sendComment('${post._id}')" class="mini-btn">Додати</button>
            </div>
        `;
        list.appendChild(postDiv);
    });
}