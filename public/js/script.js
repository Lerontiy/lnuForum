// script.js

function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function autoResizeTextarea(element) {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
}

document.addEventListener('input', function (e) {
    if (e.target.tagName.toLowerCase() === 'textarea') {
        autoResizeTextarea(e.target);
    }
});


async function sendPost() {
    const messageInput = document.getElementById('message');
    const content = messageInput.value.trim();
    
    if (!content) return;

    const token = localStorage.getItem('authToken');
    if (!token) { 
        logout(); 
        return; 
    }

    const btn = document.getElementById('sendBtn');
    const originalText = btn.innerText;
    setButtonLoading(btn, true);

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
            messageInput.style.height = 'auto'; 
            statusDiv.innerText = '';
            loadPosts(); 
        } else {
            handleErrorResponse(response.status, data.error, statusDiv);
        }
    } catch (error) {
        console.error("Network Error:", error);
        alert("Помилка з'єднання з сервером");
    } finally {
        setButtonLoading(btn, false, originalText);
    }
}

async function sendComment(postId) {
    const contentInput = document.getElementById(`comment-${postId}`);
    const content = contentInput.value.trim();
    if (!content) return;

    const token = localStorage.getItem('authToken');
    if (!token) { logout(); return; }

    const btn = contentInput.nextElementSibling;
    const originalText = btn.innerText;
    setButtonLoading(btn, true, "⏳");

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
        } else {
            handleErrorResponse(response.status, data.error);
        }
    } catch (error) {
        alert("Не вдалося відправити коментар");
    } finally {
        setButtonLoading(btn, false, originalText);
    }
}

async function loadPosts() {
    try {
        const response = await fetch('/api/posts');
        if (!response.ok) throw new Error('Failed to fetch posts');
        
        const posts = await response.json();
        renderPosts(posts);
    } catch (e) {
        console.error("Critical Error loading posts:", e);
        document.getElementById('posts-list').innerText = "Не вдалося завантажити форум 😔";
    }
}

function renderPosts(posts) {
    const list = document.getElementById('posts-list');
    list.innerHTML = ""; 

    posts.forEach(post => {
        const commentsHtml = post.comments.map(c => `
            <div class="comment">
                <strong>${escapeHtml(c.user)}</strong>: ${escapeHtml(c.content)}
                <div class="time">${c.time}</div>
            </div>
        `).join('');

        const postDiv = document.createElement('div');
        postDiv.className = 'post';
        
        postDiv.innerHTML = `
            <div class="post-header">
                <strong>${escapeHtml(post.user)}</strong>
                <span class="ai-tag">${escapeHtml(post.tag)}</span>
            </div>
            <div class="content">${escapeHtml(post.content)}</div>
            <small>${post.time}</small>
            
            <div class="comments-section">
                ${commentsHtml}
            </div>

            <div class="reply-form">
                <textarea 
                    id="comment-${post._id}" 
                    placeholder="Відповісти..." 
                    class="mini-input" 
                    rows="1"
                ></textarea>
                <button onclick="sendComment('${post._id}')" class="mini-btn">Додати</button>
            </div>
        `;
        list.appendChild(postDiv);
    });
}

function setButtonLoading(btn, isLoading, originalText = "") {
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.innerText; 
        btn.innerText = originalText || '⏳...';
        btn.style.opacity = '0.6';
    } else {
        btn.disabled = false;
        btn.innerText = originalText || btn.dataset.originalText;
        btn.style.opacity = '1';
    }
}

function handleErrorResponse(status, errorMessage, statusDiv = null) {
    if (status === 401) {
        alert("Ваша сесія закінчилася. Будь ласка, увійдіть знову.");
        logout();
    } else if (status === 422) {
        const msg = `⚠️ AI попередження: ${errorMessage}`;
        if (statusDiv) {
            statusDiv.innerText = msg;
            statusDiv.style.color = 'orange'; 
        } else {
            alert(msg);
        }
    } else {
        if (statusDiv) {
            statusDiv.innerText = `Помилка: ${errorMessage}`;
            statusDiv.style.color = 'red';
        } else {
            alert(errorMessage);
        }
    }
}