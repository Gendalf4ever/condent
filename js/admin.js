document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin.js loaded');
    
    // Инициализация Firebase
    const { auth, db, storage } = window.firebaseServices;
    if (!auth || !db) {
        console.error('Firebase services not initialized');
        return;
    }

    // Основные элементы
    const authContainer = document.getElementById('auth-container');
    const adminContainer = document.getElementById('admin-container');
    const articlesList = document.getElementById('articles-list');
    const logoutBtn = document.getElementById('logout-btn');
    const addArticleForm = document.getElementById('add-article-form');
    const editArticleForm = document.getElementById('edit-article-form');
    const userEmailSpan = document.getElementById('user-email');

    // Переменные для хранения состояния
    let currentEditingArticleId = null;
    let currentArticleImageUrl = null;

    // ================= ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ ВХОДА =================
    window.handleLogin = async function(email, password) {
        try {
            console.log('Attempting login with:', email);
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('Login successful, checking admin status...');
            
            // Проверяем, является ли пользователь администратором
            const isAdmin = await checkAdminStatus(user.email);
            
            if (!isAdmin) {
                console.log('Admin check failed, logging out...');
                await auth.signOut();
                throw new Error('access-denied');
            }
            
            console.log('Admin access granted!');
            return true;
            
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Ошибка входа';
            
            switch (error.code || error.message) {
                case 'auth/invalid-email':
                    errorMessage = 'Неверный формат email';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Пользователь заблокирован';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Пользователь с таким email не найден';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Неверный пароль';
                    break;
                case 'access-denied':
                    errorMessage = 'Доступ запрещен. Только для администраторов.';
                    break;
                default:
                    errorMessage = error.message || 'Неизвестная ошибка';
            }
            
            alert(errorMessage);
            return false;
        }
    };

    // ================= ПРОВЕРКА СТАТУСА АДМИНИСТРАТОРА =================
    async function checkAdminStatus(userEmail) {
        try {
            console.log('🔍 Checking admin status for:', userEmail);
            
            // Проверяем наличие документа с ID = email пользователя
            const adminDoc = await db.collection('admins').doc(userEmail).get();
            
            if (adminDoc.exists) {
                console.log('✅ User is admin (individual document)');
                return true;
            }
            
            // Проверяем документ codent-admins с массивом emails
            const codentAdminsDoc = await db.collection('admins').doc('codent-admins').get();
            
            if (codentAdminsDoc.exists) {
                const data = codentAdminsDoc.data();
                if (data.emails && data.emails.includes(userEmail)) {
                    console.log('✅ User is admin (in codent-admins list)');
                    return true;
                }
            }
            
            console.log('❌ Access denied');
            return false;
            
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    // ================= АУТЕНТИФИКАЦИЯ =================
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('Auth state changed, user:', user.email);
            
            try {
                // Обновляем отображение email пользователя
                if (userEmailSpan) {
                    userEmailSpan.textContent = user.email;
                }
                
                // Проверяем, является ли пользователь администратором
                const isAdmin = await checkAdminStatus(user.email);
                
                if (isAdmin) {
                    console.log('Showing admin panel');
                    showAdminPanel();
                    loadArticles();
                } else {
                    console.log('Access denied, logging out');
                    alert('Доступ запрещен. Только для администраторов.');
                    await auth.signOut();
                }
            } catch (error) {
                console.error('Error in auth state change:', error);
                alert('Ошибка проверки прав доступа');
                await auth.signOut();
            }
        } else {
            console.log('No user, showing auth form');
            showAuthForm();
        }
    });

    // ================= ВЫХОД ИЗ СИСТЕМЫ =================
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                alert('Вы вышли из системы');
            } catch (error) {
                console.error('Logout error:', error);
                alert('Ошибка при выходе из системы');
            }
        });
    }

    // ================= ФОРМА ДОБАВЛЕНИЯ СТАТЬИ =================
    if (addArticleForm) {
        addArticleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('article-title').value.trim();
            const content = window.quillAdd ? window.quillAdd.root.innerHTML : '';
            
            if (!title || !content || content === '<p><br></p>') {
                alert('Заполните все обязательные поля');
                return;
            }

            const submitBtn = addArticleForm.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

            try {
                const articleData = {
                    title: title,
                    content: content,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    authorId: auth.currentUser.uid,
                    authorEmail: auth.currentUser.email
                };

                // Загрузка изображения
                const fileInput = document.getElementById('article-image');
                if (fileInput && fileInput.files[0]) {
                    articleData.imageUrl = await uploadImage(fileInput.files[0]);
                }

                // Сохранение статьи
                const articleId = 'art-' + Date.now();
                await db.collection('articles').doc(articleId).set(articleData);

                alert('Статья успешно добавлена!');
                if (typeof window.closeAddArticleModal === 'function') {
                    window.closeAddArticleModal();
                }
                loadArticles();

            } catch (error) {
                console.error('Ошибка сохранения:', error);
                alert('Ошибка при сохранении статьи: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // ================= ФОРМА РЕДАКТИРОВАНИЯ СТАТЬИ =================
    if (editArticleForm) {
        editArticleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('edit-article-title').value.trim();
            const content = window.quillEdit ? window.quillEdit.root.innerHTML : '';
            
            if (!title || !content || content === '<p><br></p>') {
                alert('Заполните все обязательные поля');
                return;
            }

            const submitBtn = editArticleForm.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обновление...';

            try {
                const articleData = {
                    title: title,
                    content: content,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Загрузка нового изображения
                const fileInput = document.getElementById('edit-article-image');
                if (fileInput && fileInput.files[0]) {
                    articleData.imageUrl = await uploadImage(fileInput.files[0]);
                } else if (document.getElementById('remove-image-checkbox').checked) {
                    // Удаляем изображение
                    articleData.imageUrl = null;
                } else {
                    // Сохраняем текущее изображение
                    articleData.imageUrl = currentArticleImageUrl;
                }

                // Обновление статьи
                await db.collection('articles').doc(currentEditingArticleId).update(articleData);

                alert('Статья успешно обновлена!');
                if (typeof window.closeEditArticleModal === 'function') {
                    window.closeEditArticleModal();
                }
                loadArticles();

            } catch (error) {
                console.error('Ошибка обновления:', error);
                alert('Ошибка при обновлении статьи: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // ================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =================
    async function loadArticles() {
        try {
            if (!articlesList) return;
            
            articlesList.innerHTML = '<div class="loading-articles">Загрузка статей...</div>';

            const snapshot = await db.collection('articles')
                .orderBy('createdAt', 'desc')
                .get();
            
            if (snapshot.empty) {
                articlesList.innerHTML = '<div class="no-articles">Статьи не найдены</div>';
                return;
            }

            articlesList.innerHTML = snapshot.docs.map(doc => {
                const data = doc.data();
                return `
                    <div class="article-item">
                        <div class="article-info">
                            <h3>${data.title || 'Без названия'}</h3>
                            <time>${formatDate(data.createdAt?.toDate())}</time>
                            ${data.imageUrl ? `<img src="${data.imageUrl}" class="article-thumb" alt="Превью">` : ''}
                            <div class="article-author">Автор: ${data.authorEmail || 'Неизвестно'}</div>
                            <div class="article-updated">Обновлено: ${formatDate(data.updatedAt?.toDate())}</div>
                        </div>
                        <div class="article-actions">
                            <button onclick="editArticle('${doc.id}')" class="edit-btn">
                                <i class="fas fa-edit"></i> Редактировать
                            </button>
                            <button onclick="deleteArticle('${doc.id}')" class="delete-btn">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Ошибка загрузки:', error);
            if (articlesList) {
                articlesList.innerHTML = '<div class="error-message">Ошибка загрузки статей</div>';
            }
        }
    }

    async function uploadImage(file) {
        try {
            const API_KEY = 'get_some_key'; //  ключ
            
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки на ImgBB');
            }
            
            const data = await response.json();
            console.log('✅ Изображение загружено на ImgBB:', data.data.url);
            return data.data.url;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
            
            const fileName = file.name.substring(0, 15);
            return `https://via.placeholder.com/800x400/3498db/ffffff?text=${encodeURIComponent(fileName)}`;
        }
    }

    // ================= ФУНКЦИИ РЕДАКТИРОВАНИЯ =================
    window.editArticle = async function(articleId) {
        try {
            console.log('Редактирование статьи:', articleId);
            currentEditingArticleId = articleId;
            
            // Загружаем данные статьи
            const articleDoc = await db.collection('articles').doc(articleId).get();
            
            if (!articleDoc.exists) {
                alert('Статья не найдена');
                return;
            }
            
            const articleData = articleDoc.data();
            currentArticleImageUrl = articleData.imageUrl || null;
            
            // Заполняем форму редактирования
            document.getElementById('edit-article-title').value = articleData.title || '';
            
            // Заполняем редактор контентом
            if (window.quillEdit) {
                window.quillEdit.root.innerHTML = articleData.content || '';
            }
            
            // Показываем текущее изображение
            const imagePreview = document.getElementById('edit-image-preview');
            const removeImageContainer = document.getElementById('remove-image-container');
            
            if (currentArticleImageUrl) {
                imagePreview.innerHTML = `
                    <div class="current-image">
                        <img src="${currentArticleImageUrl}" alt="Текущее изображение" style="max-width: 200px;">
                        <div class="image-actions">
                            <label class="remove-image-label">
                                <input type="checkbox" id="remove-image-checkbox">
                                Удалить изображение
                            </label>
                        </div>
                    </div>
                `;
                imagePreview.style.display = 'block';
                
                // Показываем контейнер для удаления
                if (removeImageContainer) {
                    removeImageContainer.style.display = 'block';
                }
            } else {
                imagePreview.innerHTML = '';
                imagePreview.style.display = 'none';
                
                // Скрываем контейнер для удаления
                if (removeImageContainer) {
                    removeImageContainer.style.display = 'none';
                }
            }
            
            // Открываем модальное окно редактирования
            if (typeof window.openEditArticleModal === 'function') {
                window.openEditArticleModal();
            } else {
                console.error('Функция openEditArticleModal не найдена');
            }
            
        } catch (error) {
            console.error('Ошибка загрузки статьи:', error);
            alert('Ошибка при загрузке статьи для редактирования');
        }
    };

    window.openEditArticleModal = function() {
        const editModal = document.getElementById('edit-article-modal');
        if (editModal) {
            editModal.style.display = 'block';
        }
    };

    window.closeEditArticleModal = function() {
        const editModal = document.getElementById('edit-article-modal');
        if (editModal) {
            editModal.style.display = 'none';
            // Сбрасываем форму
            if (editArticleForm) editArticleForm.reset();
            const imagePreview = document.getElementById('edit-image-preview');
            if (imagePreview) {
                imagePreview.innerHTML = '';
                imagePreview.style.display = 'none';
            }
            // Очищаем редактор
            if (window.quillEdit) {
                window.quillEdit.root.innerHTML = '';
            }
            // Сбрасываем чекбокс удаления
            const removeCheckbox = document.getElementById('remove-image-checkbox');
            if (removeCheckbox) {
                removeCheckbox.checked = false;
            }
            currentEditingArticleId = null;
            currentArticleImageUrl = null;
        }
    };

    // Обработчик для кнопки отмены редактирования
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', window.closeEditArticleModal);
    }

    // Обработчик для закрытия модального окна
    const closeEditModal = document.getElementById('close-edit-modal');
    if (closeEditModal) {
        closeEditModal.addEventListener('click', window.closeEditArticleModal);
    }

    // Закрытие по клику вне окна
    window.addEventListener('click', function(event) {
        const editModal = document.getElementById('edit-article-modal');
        if (event.target === editModal) {
            window.closeEditArticleModal();
        }
    });

    function showAdminPanel() {
        if (authContainer && adminContainer) {
            authContainer.style.display = 'none';
            adminContainer.style.display = 'block';
        }
    }

    function showAuthForm() {
        if (authContainer && adminContainer) {
            authContainer.style.display = 'flex';
            adminContainer.style.display = 'none';
        }
    }

    function formatDate(date) {
        if (!date) return 'Неизвестно';
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ================= ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ КНОПОК =================
    window.deleteArticle = async function(articleId) {
        if (confirm('Удалить статью?')) {
            try {
                await db.collection('articles').doc(articleId).delete();
                alert('Статья удалена');
                loadArticles();
            } catch (error) {
                console.error('Ошибка удаления:', error);
                alert('Ошибка удаления статьи');
            }
        }
    };
});