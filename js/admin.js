document.addEventListener('DOMContentLoaded', () => {
    // Проверяем инициализацию Firebase
    if (!window.firebaseServices) {
        console.error('Firebase services not initialized');
        return;
    }

    const { auth, db, storage } = window.firebaseServices;
    
    // DOM элементы
    const authContainer = document.getElementById('auth-container');
    const adminContainer = document.getElementById('admin-container');
    const loginForm = document.getElementById('login-form');
    const articlesList = document.getElementById('articles-list');
    const editorModal = document.getElementById('editor-modal');
    const articleForm = document.getElementById('article-form');
    const logoutBtn = document.getElementById('logout-btn');
    const addArticleBtn = document.getElementById('add-article-btn');

    // Проверяем существование элементов
    if (!authContainer || !adminContainer || !loginForm) {
        console.error('Required DOM elements not found');
        return;
    }

    // ================= ФУНКЦИИ =================
    function showAuthForm() {
        authContainer.style.display = 'flex';
        adminContainer.style.display = 'none';
    }

    function showAdminPanel() {
        authContainer.style.display = 'none';
        adminContainer.style.display = 'block';
    }

    function showError(message) {
        alert('Ошибка: ' + message);
    }

    async function loadArticles() {
        try {
            const snapshot = await db.collection('articles')
                .orderBy('createdAt', 'desc')
                .get();
            
            if (articlesList) {
                articlesList.innerHTML = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return `
                        <div class="article-item">
                            <h3>${data.title || 'Без названия'}</h3>
                            <p>${data.createdAt?.toDate?.().toLocaleDateString() || ''}</p>
                            <button onclick="editArticle('${doc.id}')">✏️</button>
                            <button onclick="deleteArticle('${doc.id}')">🗑️</button>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            showError('Ошибка загрузки статей');
        }
    }

    window.editArticle = async function(id) {
        try {
            const doc = await db.collection('articles').doc(id).get();
            if (doc.exists && editorModal) {
                document.getElementById('article-id').value = id;
                document.getElementById('article-title').value = doc.data().title || '';
                document.getElementById('article-content').value = doc.data().content || '';
                editorModal.style.display = 'block';
            }
        } catch (error) {
            showError('Ошибка загрузки статьи');
        }
    };

    window.deleteArticle = async function(id) {
        if (confirm('Удалить статью?')) {
            try {
                await db.collection('articles').doc(id).delete();
                loadArticles();
            } catch (error) {
                showError('Ошибка удаления');
            }
        }
    };

    // ================= ОБРАБОТЧИКИ =================
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            showError('Неверные учетные данные');
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.signOut());
    }

    if (addArticleBtn) {
        addArticleBtn.addEventListener('click', () => {
            if (editorModal) {
                document.getElementById('article-id').value = 'art-' + Date.now();
                document.getElementById('article-title').value = '';
                document.getElementById('article-content').value = '';
                editorModal.style.display = 'block';
            }
        });
    }

    if (articleForm) {
        articleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const article = {
                title: document.getElementById('article-title').value,
                content: document.getElementById('article-content').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const id = document.getElementById('article-id').value;
            const file = document.getElementById('article-image')?.files[0];
            
            try {
                if (file) {
                    const storageRef = storage.ref(`articles/${id}`);
                    await storageRef.put(file);
                    article.imageUrl = await storageRef.getDownloadURL();
                }
                
                await db.collection('articles').doc(id).set(article, { merge: true });
                if (editorModal) editorModal.style.display = 'none';
                loadArticles();
            } catch (error) {
                showError('Ошибка сохранения');
            }
        });
    }

    // ================= ИНИЦИАЛИЗАЦИЯ =================
    auth.onAuthStateChanged(user => {
        if (user) {
            showAdminPanel();
            loadArticles();
        } else {
            showAuthForm();
        }
    });
});