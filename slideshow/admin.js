import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, push, set, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Login
window.login = async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
};

// Logout
window.logout = async () => {
  await signOut(auth);
};

// Helper: clear the create form fields
function clearForm() {
  document.getElementById('post-type').value = 'text';
  document.getElementById('post-category').value = '';
  document.getElementById('post-title').value = '';
  document.getElementById('post-content').value = '';
  document.getElementById('post-duration').value = '8';

  const btn = document.querySelector('#create-form-btn');
  btn.textContent = '➕ Add Post';
  btn.onclick = addPost;
}

// Add Post
window.addPost = async () => {
  const post = {
    type: document.getElementById('post-type').value,
    category: document.getElementById('post-category').value,
    title: document.getElementById('post-title').value,
    content: document.getElementById('post-content').value,
    url: document.getElementById('post-content').value,
    duration: parseInt(document.getElementById('post-duration').value),
    createdAt: new Date().toISOString()
  };

  const postsRef = ref(db, 'posts');
  await push(postsRef, post);
  alert('Post added!');
  clearForm();
};

// Auth State Listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    loadPosts();
  } else {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('admin-dashboard').style.display = 'none';
  }
});

// Load Posts
function loadPosts() {
  const postsRef = ref(db, 'posts');
  onValue(postsRef, (snapshot) => {
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = '';

    snapshot.forEach(child => {
      const post = child.val();
      const postCard = document.createElement('div');
      postCard.className = 'post-card';
      postCard.innerHTML = `
        <div class="post-preview" style="background: ${getTypeColor(post.type)}; display:flex; align-items:center; justify-content:center; color:white; font-weight:600; font-size:1.5rem;">${post.type.toUpperCase()}</div>
        <h3>${post.title || '(No title)'}</h3>
        <p>${(post.content || '').substring(0, 100)}...</p>
        <div style="margin-top:1rem; display:flex; gap:0.5rem;">
          <button class="btn" onclick="editPost('${child.key}', ${JSON.stringify(post).replace(/'/g, "&#39;")})">✏️ Edit</button>
          <button class="btn btn-danger" onclick="deletePost('${child.key}')">🗑️ Delete</button>
        </div>
      `;
      postsList.appendChild(postCard);
    });
  });
}

window.deletePost = async (postId) => {
  if (confirm('Delete this post?')) {
    const postRef = ref(db, `posts/${postId}`);
    await remove(postRef);
  }
};

window.editPost = (postId, post) => {
  document.getElementById('post-type').value = post.type;
  document.getElementById('post-category').value = post.category || '';
  document.getElementById('post-title').value = post.title || '';
  document.getElementById('post-content').value = post.content || post.url || '';
  document.getElementById('post-duration').value = post.duration || 8;

  const btn = document.querySelector('#create-form-btn');
  btn.textContent = '💾 Update Post';
  btn.onclick = () => updatePost(postId);
};

window.updatePost = async (postId) => {
  const post = {
    type: document.getElementById('post-type').value,
    category: document.getElementById('post-category').value,
    title: document.getElementById('post-title').value,
    content: document.getElementById('post-content').value,
    url: document.getElementById('post-content').value,
    duration: parseInt(document.getElementById('post-duration').value),
    createdAt: new Date().toISOString()
  };

  const postRef = ref(db, `posts/${postId}`);
  await set(postRef, post);
  alert('Post updated!');
  clearForm();
};

function getTypeColor(type) {
  const colors = { text: '#667eea', image: '#f093fb', video: '#4facfe' };
  return colors[type] || '#95a5a6';
}
