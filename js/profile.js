// Система управления профилем пользователя
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.db = null;
        this.auth = null;
        this.init();
    }

    async init() {
        // Ждем инициализации Firebase
        await this.waitForFirebase();
        
        // Инициализируем обработчики событий
        this.initEventListeners();
        
        // Проверяем состояние авторизации
        this.checkAuthState();
        
        // Обновляем кнопку в хедере
        this.updateHeaderButton();
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseServices && window.firebaseServices.auth && window.firebaseServices.db) {
                    this.auth = window.firebaseServices.auth;
                    this.db = window.firebaseServices.db;
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    initEventListeners() {
        // Переключение табов авторизации
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAuthTab(e.target.dataset.tab);
            });
        });

        // Форма входа
        const loginForm = document.getElementById('login-form-element');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(e.target);
            });
        }

        // Форма регистрации
        const registerForm = document.getElementById('register-form-element');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister(e.target);
            });
        }

        // Форма профиля
        const profileForm = document.getElementById('profile-info-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate(e.target);
            });
        }

        // Кнопка выхода
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Меню профиля
        document.querySelectorAll('.profile-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchProfileSection(e.target.dataset.section);
            });
        });

        // Забыли пароль
        const forgotPassword = document.getElementById('forgot-password');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }
    }

    switchAuthTab(tab) {
        // Переключаем активный таб
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Переключаем формы
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        document.getElementById(`${tab}-form`).classList.add('active');
    }

    switchProfileSection(section) {
        // Переключаем активный пункт меню
        document.querySelectorAll('.profile-menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Переключаем секции
        document.querySelectorAll('.profile-section').forEach(s => {
            s.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        // Загружаем данные для секции
        if (section === 'reviews') {
            this.loadUserReviews();
        } else if (section === 'orders') {
            this.loadUserOrders();
        }
    }

    async handleLogin(form) {
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            this.showMessage('Вход выполнен успешно!', 'success');
            this.showProfile();
            this.updateHeaderButton();
        } catch (error) {
            console.error('Ошибка входа:', error);
            this.showMessage(this.getErrorMessage(error.code), 'error');
        }
    }

    async handleRegister(form) {
        const formData = new FormData(form);
        const name = formData.get('name');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        if (password !== confirmPassword) {
            this.showMessage('Пароли не совпадают', 'error');
            return;
        }

        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;

            // Обновляем профиль пользователя
            await userCredential.user.updateProfile({
                displayName: name
            });

            // Сохраняем дополнительную информацию в Firestore
            await this.db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                createdAt: new Date(),
                phone: '',
                company: ''
            });

            // Сохраняем в кеш профиля
            localStorage.setItem('codent_user_profile', JSON.stringify({
                name: name,
                timestamp: Date.now()
            }));

            this.showMessage('Регистрация прошла успешно!', 'success');
            this.showProfile();
            this.updateHeaderButton();
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            this.showMessage(this.getErrorMessage(error.code), 'error');
        }
    }

    async handleProfileUpdate(form) {
        if (!this.currentUser) return;

        const formData = new FormData(form);
        const name = formData.get('name');
        const phone = formData.get('phone');
        const company = formData.get('company');

        try {
            // Обновляем профиль в Firebase Auth
            await this.currentUser.updateProfile({
                displayName: name
            });

            // Обновляем данные в Firestore
            await this.db.collection('users').doc(this.currentUser.uid).update({
                name: name,
                phone: phone,
                company: company,
                updatedAt: new Date()
            });

            // Обновляем кеш профиля
            localStorage.setItem('codent_user_profile', JSON.stringify({
                name: name,
                timestamp: Date.now()
            }));

            this.showMessage('Профиль обновлен успешно!', 'success');
            this.updateHeaderButton();
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            this.showMessage('Ошибка при обновлении профиля', 'error');
        }
    }

    async handleLogout() {
        try {
            await this.auth.signOut();
            this.currentUser = null;
            this.showAuth();
            this.updateHeaderButton();
            this.showMessage('Вы вышли из системы', 'info');
        } catch (error) {
            console.error('Ошибка выхода:', error);
            this.showMessage('Ошибка при выходе из системы', 'error');
        }
    }

    async handleForgotPassword() {
        const email = document.getElementById('login-email').value;
        if (!email) {
            this.showMessage('Введите email для восстановления пароля', 'error');
            return;
        }

        try {
            await this.auth.sendPasswordResetEmail(email);
            this.showMessage('Письмо для восстановления пароля отправлено на ваш email', 'success');
        } catch (error) {
            console.error('Ошибка восстановления пароля:', error);
            this.showMessage(this.getErrorMessage(error.code), 'error');
        }
    }

    checkAuthState() {
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.showProfile();
                this.loadUserProfile();
            } else {
                this.currentUser = null;
                this.showAuth();
            }
            this.updateHeaderButton();
        });
    }

    showAuth() {
        document.getElementById('auth-container').style.display = 'block';
        document.getElementById('profile-container').style.display = 'none';
    }

    showProfile() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('profile-container').style.display = 'block';
    }

    async loadUserProfile() {
        if (!this.currentUser) return;

        try {
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                document.getElementById('profile-name').value = userData.name || '';
                document.getElementById('profile-email').value = userData.email || '';
                document.getElementById('profile-phone').value = userData.phone || '';
                document.getElementById('profile-company').value = userData.company || '';
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
        }
    }

    async loadUserReviews() {
        if (!this.currentUser) return;

        const reviewsList = document.getElementById('user-reviews-list');
        reviewsList.innerHTML = '<p class="loading">Загрузка отзывов...</p>';

        try {
            const reviews = await this.db.collection('reviews')
                .where('userId', '==', this.currentUser.uid)
                .get();

            if (reviews.empty) {
                reviewsList.innerHTML = '<p class="no-reviews">У вас пока нет отзывов</p>';
                return;
            }

            // Сортируем отзывы по дате создания (новые первыми)
            const reviewsArray = [];
            reviews.forEach(doc => {
                reviewsArray.push({ id: doc.id, data: doc.data() });
            });
            
            reviewsArray.sort((a, b) => {
                const dateA = a.data.createdAt ? a.data.createdAt.toDate() : new Date(0);
                const dateB = b.data.createdAt ? b.data.createdAt.toDate() : new Date(0);
                return dateB - dateA; // Новые первыми
            });

            let reviewsHtml = '';
            reviewsArray.forEach(item => {
                reviewsHtml += this.renderReviewItem(item.id, item.data);
            });

            reviewsList.innerHTML = reviewsHtml;
            this.initReviewActions();
        } catch (error) {
            console.error('Ошибка загрузки отзывов:', error);
            reviewsList.innerHTML = '<p class="error">Ошибка загрузки отзывов</p>';
        }
    }

    renderReviewItem(reviewId, review) {
        const stars = this.renderStars(review.rating);
        const date = review.createdAt ? review.createdAt.toDate().toLocaleDateString('ru-RU') : '';
        
        // Определяем статус отзыва
        const status = review.status || 'pending';
        const statusText = {
            'pending': 'На модерации',
            'approved': 'Опубликован',
            'rejected': 'Отклонен'
        };
        const statusClass = {
            'pending': 'status-pending',
            'approved': 'status-approved', 
            'rejected': 'status-rejected'
        };

        return `
            <div class="review-item" data-review-id="${reviewId}">
                <div class="review-header">
                    <div class="review-product">${review.productName}</div>
                    <div class="review-rating">${stars}</div>
                </div>
                <div class="review-status ${statusClass[status]}">${statusText[status]}</div>
                <div class="review-text">${review.text}</div>
                <div class="review-date">Дата: ${date}</div>
                <div class="review-actions">
                    <button class="btn-edit" onclick="profileManager.editReview('${reviewId}')">
                        <i class="fas fa-edit"></i> Редактировать
                    </button>
                    <button class="btn-delete" onclick="profileManager.deleteReview('${reviewId}')">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
        `;
    }

    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<span class="star ${i <= rating ? '' : 'empty'}">★</span>`;
        }
        return stars;
    }

    async deleteReview(reviewId) {
        if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) return;

        try {
            await this.db.collection('reviews').doc(reviewId).delete();
            this.showMessage('Отзыв удален', 'success');
            this.loadUserReviews();
        } catch (error) {
            console.error('Ошибка удаления отзыва:', error);
            this.showMessage('Ошибка при удалении отзыва', 'error');
        }
    }

    async loadUserOrders() {
        const ordersList = document.getElementById('user-orders-list');
        ordersList.innerHTML = '<p class="no-orders">Функция истории заказов будет добавлена позже</p>';
    }

    updateHeaderButton() {
        // Используем глобальный менеджер авторизации если он доступен
        if (window.getAuthStateManager) {
            const authManager = window.getAuthStateManager();
            if (authManager) {
                authManager.forceUpdateProfileButton();
                return;
            }
        }
        
        // Fallback на старую логику
        const profileBtn = document.getElementById('profile-btn');
        const profileText = document.querySelector('.profile-text');
        
        if (profileBtn && profileText) {
            if (this.currentUser) {
                profileText.textContent = this.currentUser.displayName || 'Профиль';
                profileBtn.title = 'Личный кабинет';
                profileBtn.classList.add('authenticated');
            } else {
                profileText.textContent = 'Войти';
                profileBtn.title = 'Войти в личный кабинет';
                profileBtn.classList.remove('authenticated');
            }
        }
    }

    showMessage(text, type = 'info') {
        const container = document.getElementById('message-container');
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        
        container.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 5000);
    }

    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'Пользователь не найден',
            'auth/wrong-password': 'Неверный пароль',
            'auth/email-already-in-use': 'Email уже используется',
            'auth/weak-password': 'Пароль слишком слабый',
            'auth/invalid-email': 'Неверный формат email',
            'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже'
        };
        
        return errorMessages[errorCode] || 'Произошла ошибка. Попробуйте еще раз';
    }

    initReviewActions() {
        // Действия с отзывами инициализируются через onclick в HTML
    }
}

// Инициализируем менеджер профиля
let profileManager;

document.addEventListener('DOMContentLoaded', () => {
    profileManager = new ProfileManager();
});

// Экспортируем для использования в других файлах
window.ProfileManager = ProfileManager;
