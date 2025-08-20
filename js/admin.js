document.addEventListener('DOMContentLoaded', () => {
    // Инициализация Firebase
    const { auth, db, storage } = window.firebaseServices;
    if (!auth || !db) {
        console.error('Firebase services not initialized');
        return;
    }

    // DOM элементы (УБИРАЕМ поиск кнопки здесь)
    const authContainer = document.getElementById('auth-container');
    const adminContainer = document.getElementById('admin-container');
    const loginForm = document.getElementById('login-form');
    const articlesList = document.getElementById('articles-list');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Элементы модальных окон (оставляем только те, что нужны для логики)
    const addArticleModal = document.getElementById('add-article-modal');
    const addArticleForm = document.getElementById('add-article-form');
    
    // Элементы формы добавления
    const fileInput = document.getElementById('article-image');
    const fileName = document.getElementById('file-name');
    const imagePreview = document.getElementById('image-preview');

    // УБИРАЕМ проверку кнопки отсюда
    console.log('Admin.js initialized');

    // ================= ИНИЦИАЛИЗАЦИЯ =================
    auth.onAuthStateChanged(user => {
        if (user && user.email === "admin@yourdomain.com") {
            showAdminPanel();
            loadArticles();
        } else {
            showAuthForm();
        }
    });

    // ================= АУТЕНТИФИКАЦИЯ =================
    if (loginForm) {
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
    }

    // ================= УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ =================
    // Кнопка "Новая статья" теперь управляется в HTML скрипте

    // Обработка выбора файла
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Выход из системы
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.signOut());
    }

    // ================= ФОРМА ДОБАВЛЕНИЯ СТАТЬИ =================
    if (addArticleForm) {
        addArticleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!validateForm()) return;

            const submitBtn = addArticleForm.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

            try {
                const articleData = {
                    title: document.getElementById('article-title').value.trim(),
                    content: document.getElementById('article-content').value.trim(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Загрузка изображения если есть
                if (fileInput && fileInput.files[0]) {
                    articleData.imageUrl = await uploadImage(fileInput.files[0]);
                }

                // Сохранение статьи
                const articleId = 'art-' + Date.now();
                await db.collection('articles').doc(articleId).set(articleData);

                showSuccess('Статья успешно добавлена!');
                closeAddArticleModal();
                loadArticles();

            } catch (error) {
                console.error('Ошибка сохранения:', error);
                showError('Ошибка при сохранении статьи: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // ================= ФУНКЦИИ МОДАЛЬНЫХ ОКОН =================
    function openAddArticleModal() {
        console.log('Opening add article modal');
        if (addArticleModal) {
            addArticleModal.style.display = 'block';
            resetForm();
        }
    }

    function closeAddArticleModal() {
        if (addArticleModal) {
            addArticleModal.style.display = 'none';
            resetForm();
        }
    }

    function resetForm() {
        if (addArticleForm) {
            addArticleForm.reset();
        }
        if (fileName) {
            fileName.textContent = 'Файл не выбран';
        }
        if (imagePreview) {
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
        }
        clearValidation();
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && fileName) {
            fileName.textContent = file.name;
            
            // Превью изображения
            if (file.type.startsWith('image/') && imagePreview) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Превью" style="max-width: 100%; max-height: 200px;">`;
                    imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        } else if (fileName) {
            fileName.textContent = 'Файл не выбран';
            if (imagePreview) {
                imagePreview.style.display = 'none';
            }
        }
    }

    // ================= ВАЛИДАЦИЯ ФОРМЫ =================
    function validateForm() {
        let isValid = true;
        clearValidation();

        const title = document.getElementById('article-title')?.value.trim();
        const content = document.getElementById('article-content')?.value.trim();

        if (!title) {
            showFieldError('article-title', 'Введите название статьи');
            isValid = false;
        }

        if (!content) {
            showFieldError('article-content', 'Введите содержание статьи');
            isValid = false;
        }

        return isValid;
    }

    function showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            const formGroup = field.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('error');
                const errorElement = formGroup.querySelector('.error-message');
                if (errorElement) {
                    errorElement.textContent = message;
                    errorElement.style.display = 'block';
                }
            }
        }
    }

    function clearValidation() {
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
        });
        document.querySelectorAll('.error-message').forEach(msg => {
            msg.style.display = 'none';
        });
    }

    // ================= ЗАГРУЗКА И ОТОБРАЖЕНИЕ СТАТЕЙ =================
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
                            <h3>${escapeHtml(data.title || 'Без названия')}</h3>
                            <time>${formatDate(data.createdAt?.toDate())}</time>
                            ${data.imageUrl ? `<img src="${data.imageUrl}" class="article-thumb" alt="Превью">` : ''}
                        </div>
                        <div class="article-actions">
                            <button class="edit-btn" onclick="editArticle('${doc.id}')">
                                <i class="fas fa-edit"></i> Редактировать
                            </button>
                            <button class="delete-btn" onclick="deleteArticle('${doc.id}')">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // Обновляем счетчик статей
            const articlesCount = document.getElementById('articles-count');
            if (articlesCount) {
                articlesCount.textContent = snapshot.size;
            }

        } catch (error) {
            console.error('Ошибка загрузки статей:', error);
            if (articlesList) {
                articlesList.innerHTML = '<div class="error-message">Ошибка загрузки статей</div>';
            }
        }
    }

    // ================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =================
    async function uploadImage(file) {
        const storageRef = storage.ref(`articles/${Date.now()}_${file.name}`);
        await storageRef.put(file);
        return await storageRef.getDownloadURL();
    }

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

    function showError(message) {
        alert('Ошибка: ' + message);
    }

    function showSuccess(message) {
        alert('Успех: ' + message);
    }

    function formatDate(date) {
        if (!date) return '';
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ================= ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ КНОПОК =================
    window.editArticle = async function(articleId) {
        console.log('Редактирование статьи:', articleId);
        // Здесь будет логика редактирования
        alert('Редактирование статьи: ' + articleId);
    };

    window.deleteArticle = async function(articleId) {
        if (confirm('Удалить статью?')) {
            try {
                await db.collection('articles').doc(articleId).delete();
                showSuccess('Статья удалена');
                loadArticles();
            } catch (error) {
                console.error('Ошибка удаления:', error);
                showError('Ошибка удаления статьи');
            }
        }
    };

    // Сделаем функции доступными глобально для модального окна
    window.openAddArticleModal = openAddArticleModal;
    window.closeAddArticleModal = closeAddArticleModal;
});