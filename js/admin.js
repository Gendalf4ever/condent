document.addEventListener('DOMContentLoaded', () => {
    // Инициализация Firebase
    const { auth, db, storage } = window.firebaseServices || {};
    if (!auth || !db) {
        console.error('Firebase services not initialized');
        showError('Ошибка инициализации базы данных');
        return;
    }

    // Конфигурация
    const ADMIN_EMAIL = 'chelovek438@gmail.com'; //  email
    
    // DOM элементы
    const authContainer = document.getElementById('auth-container');
    const adminContainer = document.getElementById('admin-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const addArticleBtn = document.getElementById('add-article-btn');
    const articlesList = document.getElementById('articles-list');
    const editorModal = document.getElementById('editor-modal');
    const passwordChangeModal = document.getElementById('password-change-modal');
    const articleForm = document.getElementById('article-form');
    const changePasswordForm = document.getElementById('change-password-form');

    // Состояние приложения
    let currentUser = null;

    // Инициализация аутентификации
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user && user.email === ADMIN_EMAIL) {
            showAdminPanel();
        } else {
            showAuthForm();
        }
    });

    // ====================== ФУНКЦИИ ====================== //

    // Показать админ панель
    function showAdminPanel() {
        authContainer.style.display = 'none';
        adminContainer.style.display = 'block';
        loadArticles();
    }

    // Показать форму входа
    function showAuthForm() {
        authContainer.style.display = 'flex';
        adminContainer.style.display = 'none';
        document.getElementById('email').value = ADMIN_EMAIL;
    }

    // Показать ошибку
    function showError(message, elementId = 'auth-error') {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            setTimeout(() => errorElement.style.display = 'none', 5000);
        }
    }

    // Генератор ID для статей
    function generateArticleId() {
        return 'art-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // Форматирование даты
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('ru-RU', options);
    }

    // ====================== АУТЕНТИФИКАЦИЯ ====================== //

    // Вход
    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            showError(error.message);
        }
    });

    // Выход
    logoutBtn.addEventListener('click', () => auth.signOut());

    // Смена пароля
    changePasswordBtn.addEventListener('click', () => {
        passwordChangeModal.style.display = 'block';
    });

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword !== confirmPassword) {
            showError('Пароли не совпадают', 'password-error');
            return;
        }
        
        try {
            const credential = firebase.auth.EmailAuthProvider.credential(
                currentUser.email, 
                currentPassword
            );
            
            await currentUser.reauthenticateWithCredential(credential);
            await currentUser.updatePassword(newPassword);
            
            alert('Пароль успешно изменен!');
            passwordChangeModal.style.display = 'none';
            changePasswordForm.reset();
        } catch (error) {
            showError(error.message, 'password-error');
        }
    });

    // ====================== УПРАВЛЕНИЕ СТАТЬЯМИ ====================== //

    // Загрузка списка статей
    async function loadArticles() {
        try {
            articlesList.innerHTML = '<p class="loading">Загрузка статей...</p>';
            
            const snapshot = await db.collection('articles')
                .orderBy('createdAt', 'desc')
                .get();
            
            if (snapshot.empty) {
                articlesList.innerHTML = '<p class="no-articles">Нет статей</p>';
                return;
            }
            
            articlesList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const article = doc.data();
                const articleEl = document.createElement('div');
                articleEl.className = 'article-item';
                articleEl.innerHTML = `
                    <div class="article-info">
                        <h3>${article.title || 'Без названия'}</h3>
                        <time>${formatDate(article.date || article.createdAt?.toDate())}</time>
                        ${article.imageUrl ? `<img src="${article.imageUrl}" class="article-thumbnail">` : ''}
                    </div>
                    <div class="article-actions">
                        <button class="edit-btn" data-id="${doc.id}">Редактировать</button>
                        <button class="delete-btn" data-id="${doc.id}">Удалить</button>
                    </div>
                `;
                articlesList.appendChild(articleEl);
            });
            
            setupArticleActions();
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            articlesList.innerHTML = '<p class="error">Ошибка загрузки статей</p>';
        }
    }

    // Настройка обработчиков для статей
    function setupArticleActions() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => loadArticleForEdit(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteArticle(btn.dataset.id));
        });
    }

    // Загрузка статьи для редактирования
    async function loadArticleForEdit(articleId) {
        try {
            const doc = await db.collection('articles').doc(articleId).get();
            if (doc.exists) {
                openEditor(doc.data());
            } else {
                showError('Статья не найдена');
            }
        } catch (error) {
            showError('Ошибка загрузки статьи');
        }
    }

    // Удаление статьи
    async function deleteArticle(articleId) {
        if (!confirm('Вы уверены, что хотите удалить эту статью?')) return;
        
        try {
            await db.collection('articles').doc(articleId).delete();
            await deleteArticleImage(articleId);
            loadArticles();
        } catch (error) {
            showError('Ошибка удаления статьи');
        }
    }

    // Удаление изображения статьи
    async function deleteArticleImage(articleId) {
        try {
            const imageRef = storage.ref().child(`articles/${articleId}`);
            await imageRef.delete();
        } catch (error) {
            console.log('Изображение не найдено или уже удалено');
        }
    }

    // Открытие редактора
function openEditor(article = null) {
  const form = document.getElementById('article-form');
  const idField = document.getElementById('article-id');
  const titleField = document.getElementById('article-title');
  const dateField = document.getElementById('article-date');
  const contentField = document.getElementById('article-content');
  
  if (!form || !idField || !titleField || !dateField || !contentField) {
    console.error('Не найдены элементы формы');
    showError('Ошибка загрузки редактора');
    return;
  }

  form.reset();
  
  if (article) {
    idField.value = article.id;
    titleField.value = article.title || '';
    dateField.value = article.date || '';
    contentField.value = article.content || '';
  } else {
    idField.value = generateArticleId();
    dateField.value = new Date().toISOString().split('T')[0];
  }
  
  editorModal.style.display = 'block';
}

    // Сохранение статьи
    articleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const articleId = document.getElementById('article-id').value;
        const title = document.getElementById('article-title').value;
        const date = document.getElementById('article-date').value;
        const content = document.getElementById('article-content').value;
        const imageFile = document.getElementById('article-image').files[0];
        
        if (!title) {
            showError('Введите заголовок статьи', 'article-error');
            return;
        }
        
        try {
            // Загрузка изображения
            let imageUrl = null;
            if (imageFile) {
                imageUrl = await uploadImage(articleId, imageFile);
            }
            
            // Сохранение статьи
            await db.collection('articles').doc(articleId).set({
                id: articleId,
                title,
                date,
                content,
                imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            editorModal.style.display = 'none';
            loadArticles();
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            showError('Ошибка сохранения статьи', 'article-error');
        }
    });

    // Загрузка изображения
    async function uploadImage(articleId, file) {
        try {
            const storageRef = storage.ref().child(`articles/${articleId}/${file.name}`);
            await storageRef.put(file);
            return await storageRef.getDownloadURL();
        } catch (error) {
            console.error('Ошибка загрузки изображения:', error);
            throw error;
        }
    }

    // ====================== ЗАКРЫТИЕ МОДАЛЬНЫХ ОКОН ====================== //

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Инициализация
    addArticleBtn.addEventListener('click', () => openEditor());
});