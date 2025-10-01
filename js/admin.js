document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin.js loaded');
    
    // Ждем инициализации Firebase
    waitForFirebaseServices().then(() => {
        initializeAdminInterface();
    }).catch(error => {
        console.error('Failed to initialize Firebase services:', error);
    });
});

// Функция ожидания инициализации Firebase
function waitForFirebaseServices() {
    return new Promise((resolve, reject) => {
        const checkFirebase = () => {
            if (window.firebaseServices && window.firebaseServices.auth && window.firebaseServices.db) {
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        
        // Таймаут через 10 секунд
        setTimeout(() => {
            reject(new Error('Firebase services not initialized in 10 seconds'));
        }, 10000);
        
        checkFirebase();
    });
}

// Инициализация админ-интерфейса
function initializeAdminInterface() {
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
    const productsList = document.getElementById('products-list');
    const logoutBtn = document.getElementById('logout-btn');
    const addArticleForm = document.getElementById('add-article-form');
    const editArticleForm = document.getElementById('edit-article-form');
    const addProductForm = document.getElementById('add-product-form');
    const editProductForm = document.getElementById('edit-product-form');
    const userEmailSpan = document.getElementById('user-email');

    // Переменные для хранения состояния
    let currentEditingArticleId = null;
    let currentArticleImageUrl = null;
    let currentEditingProductId = null;
    let allProducts = [];

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

    // ================= ФОРМА ДОБАВЛЕНИЯ ТОВАРА =================
    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('product-name').value.trim();
            const type = document.getElementById('product-type').value;
            const imgUrl = document.getElementById('product-img-url').value.trim();
            const description = document.getElementById('product-description').value.trim();
            const characteristics = document.getElementById('product-characteristics').value.trim();
            const price = document.getElementById('product-price').value.trim();
            const priceSkidka = document.getElementById('product-price-skidka').value.trim();
            
            if (!name || !type || !imgUrl) {
                alert('Заполните все обязательные поля');
                return;
            }

            const submitBtn = addProductForm.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

            try {
                const productData = {
                    name: name,
                    category: type,
                    img_url: imgUrl,
                    description: description,
                    characteristics: characteristics,
                    price: price || 'По запросу',
                    price_skidka: priceSkidka || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('products').add(productData);

                alert('Товар успешно добавлен!');
                closeAddProductModal();
                loadProducts();

            } catch (error) {
                console.error('Ошибка сохранения:', error);
                alert('Ошибка при сохранении товара: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // ================= ФОРМА РЕДАКТИРОВАНИЯ ТОВАРА =================
    if (editProductForm) {
        editProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('edit-product-name').value.trim();
            const type = document.getElementById('edit-product-type').value;
            const imgUrl = document.getElementById('edit-product-img-url').value.trim();
            const description = document.getElementById('edit-product-description').value.trim();
            const characteristics = document.getElementById('edit-product-characteristics').value.trim();
            const price = document.getElementById('edit-product-price').value.trim();
            const priceSkidka = document.getElementById('edit-product-price-skidka').value.trim();
            
            if (!name || !type || !imgUrl) {
                alert('Заполните все обязательные поля');
                return;
            }

            const submitBtn = editProductForm.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обновление...';

            try {
                const productData = {
                    name: name,
                    category: type,
                    img_url: imgUrl,
                    description: description,
                    characteristics: characteristics,
                    price: price || 'По запросу',
                    price_skidka: priceSkidka || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('products').doc(currentEditingProductId).update(productData);

                alert('Товар успешно обновлен!');
                closeEditProductModal();
                loadProducts();

            } catch (error) {
                console.error('Ошибка обновления:', error);
                alert('Ошибка при обновлении товара: ' + error.message);
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
            const API_KEY = '0b770dfcb1e3a1958a8d0a7cb7ae1962'; //  ключ
            
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

    // ================= УПРАВЛЕНИЕ ТОВАРАМИ =================
    
    let currentCategory = 'all';

    // Функция загрузки товаров
    window.loadProducts = async function() {
        try {
            console.log('🔄 Загружаем товары...');
            console.log('👤 Текущий пользователь:', auth.currentUser?.email);
            
            const productsList = document.getElementById('products-list');
            if (productsList) {
                productsList.innerHTML = '<div class="loading-articles">Загрузка товаров...</div>';
            }

            const productsSnapshot = await db.collection('products').get();
            allProducts = [];
            
            productsSnapshot.forEach(doc => {
                allProducts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log('✅ Товары загружены:', allProducts.length);
            renderProducts();
        } catch (error) {
            console.error('❌ Ошибка загрузки товаров:', error);
            console.error('📧 Пользователь:', auth.currentUser?.email);
            console.error('🔑 Токен:', auth.currentUser?.accessToken ? 'есть' : 'отсутствует');
            
            const productsList = document.getElementById('products-list');
            if (productsList) {
                productsList.innerHTML = `
                    <div class="error-message">
                        <h3>Ошибка загрузки товаров</h3>
                        <p>Проверьте правила безопасности Firebase</p>
                        <small>Пользователь: ${auth.currentUser?.email || 'не авторизован'}</small>
                    </div>
                `;
            }
        }
    };

    // Функция отображения товаров
    function renderProducts() {
        const productsList = document.getElementById('products-list');
        if (!productsList) return;

        if (allProducts.length === 0) {
            productsList.innerHTML = '<div class="no-articles">Товары отсутствуют</div>';
            return;
        }

        // Фильтруем по категории
        const filteredProducts = currentCategory === 'all' 
            ? allProducts 
            : allProducts.filter(product => product.category === currentCategory);

        if (filteredProducts.length === 0) {
            productsList.innerHTML = '<div class="no-articles">Товары в данной категории отсутствуют</div>';
            return;
        }

        const productsHTML = filteredProducts.map(product => {
            const categoryNames = {
                'printers': 'Принтеры',
                'scanners': 'Сканеры',
                'milling': 'Фрезерные',
                'post-processing': 'Постобработка',
                'materials': 'Материалы',
                'zirkon': 'Цирконий',
                'other': 'Прочее'
            };

            const priceHTML = product.price_skidka && product.price_skidka.trim() 
                ? `<div class="product-price">
                     <span class="current">${product.price_skidka}</span>
                     <span class="original">${product.price}</span>
                   </div>`
                : `<div class="product-price">
                     <span class="current">${product.price || 'Цена по запросу'}</span>
                   </div>`;

            return `
                <div class="product-card" data-id="${product.id}">
                    <div class="product-image">
                        ${product.img_url ? `<img src="${product.img_url}" alt="${product.name}" onerror="this.style.display='none'">` : '<i class="fas fa-image" style="font-size: 3rem; color: #ccc;"></i>'}
                    </div>
                    <div class="product-info">
                        <div class="product-category">${categoryNames[product.category] || product.category}</div>
                        <div class="product-name">${product.name}</div>
                        ${priceHTML}
                        <div class="product-description">${product.description}</div>
                        <div class="product-actions">
                            <button class="edit-product-btn" onclick="editProduct('${product.id}')">
                                <i class="fas fa-edit"></i> Изменить
                            </button>
                            <button class="delete-product-btn" onclick="deleteProduct('${product.id}')">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        productsList.innerHTML = productsHTML;
    }

    // Функция фильтрации по категориям
    window.filterProductsByCategory = function(category) {
        currentCategory = category;
        renderProducts();
    };

    // Функция добавления товара
    window.addProduct = async function(productData) {
        try {
            console.log('➕ Добавляем товар:', productData);
            
            const docRef = await db.collection('products').add({
                ...productData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ Товар добавлен с ID:', docRef.id);
            
            // Перезагружаем товары
            await loadProducts();
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка добавления товара:', error);
            alert('Ошибка при добавлении товара: ' + error.message);
            return false;
        }
    };

    // Функция редактирования товара
    window.editProduct = function(productId) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        currentEditingProductId = productId;

        // Заполняем форму редактирования
        document.getElementById('edit-product-name').value = product.name || '';
        document.getElementById('edit-product-category').value = product.category || '';
        document.getElementById('edit-product-price').value = product.price || '';
        document.getElementById('edit-product-sale-price').value = product.price_skidka || '';
        document.getElementById('edit-product-image-url').value = product.img_url || '';
        document.getElementById('edit-product-description').value = product.description || '';
        document.getElementById('edit-product-characteristics').value = product.characteristics || '';

        // Показываем модальное окно
        const editModal = document.getElementById('edit-product-modal');
        if (editModal) editModal.style.display = 'block';
    };

    // Функция обновления товара
    window.updateProduct = async function(productData) {
        try {
            console.log('🔄 Обновляем товар:', currentEditingProductId, productData);
            
            await db.collection('products').doc(currentEditingProductId).update({
                ...productData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ Товар обновлен');
            
            // Перезагружаем товары
            await loadProducts();
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления товара:', error);
            alert('Ошибка при обновлении товара: ' + error.message);
            return false;
        }
    };

    // Функция удаления товара
    window.deleteProduct = async function(productId) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        if (!confirm(`Удалить товар "${product.name}"?`)) return;

        try {
            console.log('🗑️ Удаляем товар:', productId);
            
            await db.collection('products').doc(productId).delete();
            
            console.log('✅ Товар удален');
            
            // Перезагружаем товары
            await loadProducts();
            
        } catch (error) {
            console.error('❌ Ошибка удаления товара:', error);
            alert('Ошибка при удалении товара: ' + error.message);
        }
    };

    // ================= ИМПОРТ ИЗ GOOGLE SHEETS =================

    // Получаем URL для Google Sheets из api-keys.js
    function getSheetsCSVUrl() {
        const spreadsheetId = typeof window.getGoogleSheetsId !== 'undefined' 
            ? window.getGoogleSheetsId() 
            : '1Hxmx_tznE64ifvKON4-waL6x7BYQ7plf1nWta5nsMlI'; // fallback
        return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
    }
    
    let previewData = [];

    // Функция определения категории по названию товара
    function determineCategory(productName) {
        const name = productName.toLowerCase();
        
        if (name.includes('принтер') || name.includes('printer')) {
            return 'printers';
        }
        if (name.includes('сканер') || name.includes('scanner')) {
            return 'scanners';
        }
        if (name.includes('фрез') || name.includes('milling') || name.includes('mill')) {
            return 'milling';
        }
        if (name.includes('полимер') || name.includes('смола') || name.includes('resin') || name.includes('материал')) {
            return 'materials';
        }
        if (name.includes('постобработка') || name.includes('post') || name.includes('cure') || name.includes('wash')) {
            return 'post-processing';
        }
        if (name.includes('цирконий') || name.includes('zirkon') || name.includes('циркон')) {
            return 'zirkon';
        }
        if (name.includes('компрессор') || name.includes('compressor')) {
            return 'other';
        }
        
        return 'other'; // По умолчанию
    }

    // Функция парсинга CSV данных
    function parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        console.log('📊 Заголовки CSV:', headers);
        
        const products = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Простой парсинг CSV с учетом запятых внутри кавычек
            const values = [];
            let currentValue = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentValue.trim().replace(/"/g, ''));
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            values.push(currentValue.trim().replace(/"/g, ''));
            
            if (values.length >= 6 && values[1] && values[1].trim()) { // Проверяем наличие названия
                const product = {
                    id: values[0] || '',
                    name: values[1] || '',
                    price: values[2] || '',
                    price_skidka: values[3] || '',
                    description: values[4] || '',
                    img_url: values[5] || '',
                    characteristics: values[6] || '',
                    category: determineCategory(values[1] || '')
                };
                
                products.push(product);
            }
        }
        
        console.log('📦 Обработано товаров:', products.length);
        return products;
    }

    // Функция предпросмотра данных
    window.previewSheetsData = async function() {
        const previewBtn = document.getElementById('preview-import-btn');
        const originalText = previewBtn.innerHTML;
        
        try {
            console.log('🔄 Загружаем данные из Google Sheets...');
            
            previewBtn.disabled = true;
            previewBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
            
            const response = await fetch(getSheetsCSVUrl());
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            previewData = parseCSV(csvText);
            
            if (previewData.length === 0) {
                throw new Error('Не найдено товаров для импорта');
            }
            
            // Показываем предпросмотр
            displayPreview(previewData.slice(0, 5)); // Первые 5 товаров
            
            document.getElementById('total-products').textContent = previewData.length;
            document.getElementById('import-preview').style.display = 'block';
            document.getElementById('start-import-btn').disabled = false;
            
            console.log('✅ Предпросмотр готов:', previewData.length, 'товаров');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            alert('Ошибка загрузки данных из Google Sheets: ' + error.message);
        } finally {
            previewBtn.disabled = false;
            previewBtn.innerHTML = originalText;
        }
    };

    // Функция отображения предпросмотра
    function displayPreview(products) {
        const previewTable = document.getElementById('preview-table');
        
        const categoryNames = {
            'printers': 'Принтеры',
            'scanners': 'Сканеры',
            'milling': 'Фрезерные',
            'post-processing': 'Постобработка',
            'materials': 'Материалы',
            'zirkon': 'Цирконий',
            'other': 'Прочее'
        };
        
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Название</th>
                        <th>Категория</th>
                        <th>Цена</th>
                        <th>Изображение</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td>${product.name}</td>
                            <td><span class="category-badge">${categoryNames[product.category] || product.category}</span></td>
                            <td>${product.price}</td>
                            <td>${product.img_url ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i>'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        previewTable.innerHTML = tableHTML;
    }

    // Функция импорта данных
    window.importSheetsData = async function() {
        if (previewData.length === 0) {
            alert('Сначала выполните предпросмотр данных');
            return;
        }
        
        try {
            console.log('🚀 Начинаем импорт товаров...');
            
            const progressDiv = document.getElementById('import-progress');
            const progressFill = document.getElementById('progress-fill');
            const progressText = document.getElementById('progress-text');
            const resultsDiv = document.getElementById('import-results');
            const startBtn = document.getElementById('start-import-btn');
            
            // Показываем прогресс
            progressDiv.style.display = 'block';
            startBtn.disabled = true;
            
            let successCount = 0;
            let errorCount = 0;
            let updatedCount = 0;
            
            const total = previewData.length;
            
            // Импортируем товары по одному
            for (let i = 0; i < total; i++) {
                const product = previewData[i];
                
                try {
                    progressText.textContent = `Импортируем: ${product.name} (${i + 1}/${total})`;
                    progressFill.style.width = `${((i + 1) / total) * 100}%`;
                    
                    // Проверяем, существует ли товар
                    const existingQuery = await db.collection('products')
                        .where('name', '==', product.name)
                        .get();
                    
                    const productData = {
                        name: product.name,
                        category: product.category,
                        price: product.price,
                        price_skidka: product.price_skidka || '',
                        description: product.description,
                        img_url: product.img_url,
                        characteristics: product.characteristics,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    if (!existingQuery.empty) {
                        // Обновляем существующий товар
                        const docId = existingQuery.docs[0].id;
                        await db.collection('products').doc(docId).update(productData);
                        updatedCount++;
                        console.log('🔄 Обновлен:', product.name);
                    } else {
                        // Создаем новый товар
                        await db.collection('products').add({
                            ...productData,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        successCount++;
                        console.log('➕ Добавлен:', product.name);
                    }
                    
                    // Небольшая задержка чтобы не перегружать Firebase
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error('❌ Ошибка импорта товара:', product.name, error);
                    errorCount++;
                }
            }
            
            // Показываем результаты
            progressDiv.style.display = 'none';
            resultsDiv.style.display = 'block';
            
            document.getElementById('success-count').textContent = successCount;
            document.getElementById('error-count').textContent = errorCount;
            document.getElementById('updated-count').textContent = updatedCount;
            
            const logDiv = document.getElementById('import-log');
            logDiv.innerHTML = `
                <div class="log-entry success">✅ Успешно добавлено: ${successCount} товаров</div>
                <div class="log-entry updated">🔄 Обновлено: ${updatedCount} товаров</div>
                ${errorCount > 0 ? `<div class="log-entry error">❌ Ошибок: ${errorCount}</div>` : ''}
                <div class="log-entry info">📊 Всего обработано: ${total} товаров</div>
            `;
            
            console.log('✅ Импорт завершен!', { successCount, updatedCount, errorCount });
            
            // Перезагружаем список товаров
            if (window.loadProducts) {
                await window.loadProducts();
            }
            
        } catch (error) {
            console.error('❌ Критическая ошибка импорта:', error);
            alert('Критическая ошибка импорта: ' + error.message);
        }
    };

    // ================= ФУНКЦИИ ДЛЯ РАБОТЫ С ТОВАРАМИ =================
    
    // Загрузка товаров
    async function loadProducts() {
        try {
            if (!productsList) return;
            
            productsList.innerHTML = '<div class="loading-articles">Загрузка товаров...</div>';

            const snapshot = await db.collection('products')
                .orderBy('createdAt', 'desc')
                .get();
            
            if (snapshot.empty) {
                productsList.innerHTML = '<div class="no-articles">Товары не найдены</div>';
                allProducts = [];
                return;
            }

            allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProducts(allProducts);

        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            if (productsList) {
                productsList.innerHTML = '<div class="error-message">Ошибка загрузки товаров</div>';
            }
        }
    }

    // Отрисовка товаров
    function renderProducts(products) {
        if (!productsList) return;

        if (products.length === 0) {
            productsList.innerHTML = '<div class="no-articles">Товары не найдены в этой категории</div>';
            return;
        }

        productsList.innerHTML = products.map(product => {
            const categoryNames = {
                'printers': 'Принтер',
                'scanners': 'Сканер',
                'milling': 'Фрезерный станок',
                'post-processing': 'Постобработка',
                'materials': 'Материалы',
                'zirkon': 'Цирконий',
                'other': 'Прочее'
            };

            return `
                <div class="product-item">
                    <img src="${product.img_url || ''}" class="product-image" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    <div class="product-info">
                        <span class="product-type">${categoryNames[product.category] || product.category}</span>
                        <h3>${product.name || 'Без названия'}</h3>
                        ${product.description ? `<p class="product-description">${product.description.substring(0, 100)}${product.description.length > 100 ? '...' : ''}</p>` : ''}
                        ${product.price ? `<p><strong>Цена:</strong> ${product.price}</p>` : ''}
                    </div>
                    <div class="product-actions">
                        <button onclick="editProduct('${product.id}')" class="edit-btn">
                            <i class="fas fa-edit"></i> Редактировать
                        </button>
                        <button onclick="deleteProduct('${product.id}', '${product.name}')" class="delete-btn">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Фильтрация товаров по категории
    function filterProductsByCategory(category) {
        if (category === 'all') {
            renderProducts(allProducts);
        } else {
            const filtered = allProducts.filter(p => p.category === category);
            renderProducts(filtered);
        }
    }

    // Редактирование товара
    window.editProduct = async function(productId) {
        try {
            const doc = await db.collection('products').doc(productId).get();
            if (!doc.exists) {
                alert('Товар не найден');
                return;
            }

            const data = doc.data();
            currentEditingProductId = productId;

            document.getElementById('edit-product-name').value = data.name || '';
            document.getElementById('edit-product-type').value = data.category || '';
            document.getElementById('edit-product-img-url').value = data.img_url || '';
            document.getElementById('edit-product-description').value = data.description || '';
            document.getElementById('edit-product-characteristics').value = data.characteristics || '';
            document.getElementById('edit-product-price').value = data.price || '';
            document.getElementById('edit-product-price-skidka').value = data.price_skidka || '';

            openEditProductModal();

        } catch (error) {
            console.error('Ошибка при загрузке товара:', error);
            alert('Ошибка при загрузке товара');
        }
    };

    // Удаление товара
    window.deleteProduct = async function(productId, productName) {
        if (!confirm(`Удалить товар "${productName}"?`)) {
            return;
        }

        try {
            await db.collection('products').doc(productId).delete();
            alert('Товар успешно удален!');
            loadProducts();
        } catch (error) {
            console.error('Ошибка при удалении товара:', error);
            alert('Ошибка при удалении товара: ' + error.message);
        }
    };

    // Открытие/закрытие модальных окон товаров
    function closeAddProductModal() {
        const modal = document.getElementById('add-product-modal');
        if (modal) {
            modal.style.display = 'none';
            if (addProductForm) addProductForm.reset();
        }
    }

    function openEditProductModal() {
        const modal = document.getElementById('edit-product-modal');
        if (modal) modal.style.display = 'block';
    }

    function closeEditProductModal() {
        const modal = document.getElementById('edit-product-modal');
        if (modal) {
            modal.style.display = 'none';
            if (editProductForm) editProductForm.reset();
            currentEditingProductId = null;
        }
    }

    // Экспортируем функции
    window.loadProducts = loadProducts;
    window.filterProductsByCategory = filterProductsByCategory;
}