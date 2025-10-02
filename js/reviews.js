// Система управления отзывами для товаров
class ReviewsManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Ждем инициализации Firebase
        await this.waitForFirebase();
        
        // Проверяем состояние авторизации
        this.checkAuthState();
        
        // Инициализируем обработчики событий
        this.initEventListeners();
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

    checkAuthState() {
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateReviewForms();
        });
    }

    initEventListeners() {
        // Обработчики будут добавлены динамически для каждого товара
    }

    // Создание формы отзыва для товара
    createReviewForm(productId, productName) {
        return `
            <div class="review-form-container" id="review-form-${productId}">
                <h4>Оставить отзыв</h4>
                <form class="review-form" data-product-id="${productId}" data-product-name="${productName}">
                    <div class="rating-input">
                        <label>Оценка:</label>
                        <div class="stars-input">
                            ${this.createStarsInput()}
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="review-text-${productId}">Ваш отзыв:</label>
                        <textarea 
                            id="review-text-${productId}" 
                            name="reviewText" 
                            rows="4" 
                            placeholder="Поделитесь своим мнением о товаре..."
                            required
                        ></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Отправить отзыв</button>
                        <button type="button" class="btn btn-secondary cancel-review">Отмена</button>
                    </div>
                </form>
            </div>
        `;
    }

    createStarsInput() {
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `
                <span class="star-input" data-rating="${i}" title="Оценка ${i} из 5">
                    <i class="fas fa-star"></i>
                    <span class="star-fallback">★</span>
                </span>
            `;
        }
        return starsHtml;
    }

    // Отображение существующих отзывов
    async loadProductReviews(productId, container) {
        try {
            const reviews = await this.db.collection('reviews')
                .where('productId', '==', productId)
                .where('status', '==', 'approved')
                .get();

            if (reviews.empty) {
                container.innerHTML = '<p class="no-reviews">Пока нет отзывов для этого товара</p>';
                return;
            }

            // Сортируем отзывы по дате создания (новые первыми)
            const reviewsArray = [];
            reviews.forEach(doc => {
                reviewsArray.push(doc.data());
            });
            
            reviewsArray.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA; // Новые первыми
            });

            let reviewsHtml = '<h4>Отзывы покупателей</h4>';
            let totalRating = 0;
            let reviewCount = 0;

            reviewsArray.forEach(review => {
                totalRating += review.rating;
                reviewCount++;
                reviewsHtml += this.renderReview(review);
            });

            // Добавляем средний рейтинг
            const avgRating = (totalRating / reviewCount).toFixed(1);
            reviewsHtml = `
                <div class="reviews-summary">
                    <div class="average-rating">
                        <span class="rating-value">${avgRating}</span>
                        <div class="rating-stars">${this.renderStars(Math.round(avgRating))}</div>
                        <span class="reviews-count">(${reviewCount} отзывов)</span>
                    </div>
                </div>
            ` + reviewsHtml;

            container.innerHTML = reviewsHtml;
        } catch (error) {
            console.error('Ошибка загрузки отзывов:', error);
            container.innerHTML = '<p class="error">Ошибка загрузки отзывов</p>';
        }
    }

    renderReview(review) {
        const date = review.createdAt ? review.createdAt.toDate().toLocaleDateString('ru-RU') : '';
        const stars = this.renderStars(review.rating);
        
        return `
            <div class="review-item">
                <div class="review-header">
                    <div class="reviewer-info">
                        <span class="reviewer-name">${review.userName}</span>
                        <span class="review-date">${date}</span>
                    </div>
                    <div class="review-rating">${stars}</div>
                </div>
                <div class="review-text">${review.text}</div>
            </div>
        `;
    }

    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star ${i <= rating ? 'filled' : 'empty'}"></i>`;
        }
        return stars;
    }

    // Добавление отзыва к товару
    async addReview(productId, productName, rating, text) {
        if (!this.currentUser) {
            this.showMessage('Для добавления отзыва необходимо войти в систему', 'error');
            return false;
        }

        try {
            // Проверяем, не оставлял ли пользователь уже отзыв на этот товар
            const existingReview = await this.db.collection('reviews')
                .where('productId', '==', productId)
                .where('userId', '==', this.currentUser.uid)
                .get();

            if (!existingReview.empty) {
                this.showMessage('Вы уже оставили отзыв на этот товар', 'error');
                return false;
            }

            // Добавляем новый отзыв со статусом "на модерации"
            await this.db.collection('reviews').add({
                productId: productId,
                productName: productName,
                userId: this.currentUser.uid,
                userName: this.currentUser.displayName || 'Аноним',
                rating: rating,
                text: text,
                status: 'pending', // pending, approved, rejected
                createdAt: new Date()
            });

            this.showMessage('Отзыв отправлен на модерацию и будет опубликован после проверки администратором', 'info');
            return true;
        } catch (error) {
            console.error('Ошибка добавления отзыва:', error);
            this.showMessage('Ошибка при добавлении отзыва', 'error');
            return false;
        }
    }

    // Инициализация отзывов для товара
    initProductReviews(productId, productName, container) {
        // Загружаем существующие отзывы
        const reviewsContainer = document.createElement('div');
        reviewsContainer.className = 'reviews-container';
        container.appendChild(reviewsContainer);
        
        this.loadProductReviews(productId, reviewsContainer);

        // Добавляем кнопку для написания отзыва
        if (this.currentUser) {
            const reviewButton = document.createElement('button');
            reviewButton.className = 'btn btn-review';
            reviewButton.innerHTML = '<i class="fas fa-star"></i> Оставить отзыв';
            reviewButton.onclick = () => this.showReviewForm(productId, productName, container);
            container.appendChild(reviewButton);
        } else {
            const loginPrompt = document.createElement('p');
            loginPrompt.className = 'login-prompt';
            loginPrompt.innerHTML = '<a href="profile.html">Войдите в систему</a>, чтобы оставить отзыв';
            container.appendChild(loginPrompt);
        }
    }

    showReviewForm(productId, productName, container) {
        // Проверяем, не открыта ли уже форма
        const existingForm = container.querySelector('.review-form-container');
        if (existingForm) {
            existingForm.remove();
        }

        // Создаем форму отзыва
        const formHtml = this.createReviewForm(productId, productName);
        const formContainer = document.createElement('div');
        formContainer.innerHTML = formHtml;
        
        container.appendChild(formContainer.firstElementChild);

        // Инициализируем обработчики для формы
        this.initReviewFormHandlers(productId, productName, container);
        
        // Инициализируем начальное состояние звездочек
        const starsInput = container.querySelectorAll('.star-input');
        console.log('Найдено звездочек для инициализации:', starsInput.length);
        
        // Проверяем, загружен ли FontAwesome
        setTimeout(() => {
            starsInput.forEach(star => {
                const icon = star.querySelector('i.fas');
                if (!icon || getComputedStyle(icon, '::before').content === 'none') {
                    // FontAwesome не загружен, используем fallback
                    star.classList.add('use-fallback');
                    console.log('Используем fallback звездочки для', star);
                }
            });
            this.updateStarsDisplay(starsInput, 0);
        }, 100);
    }

    initReviewFormHandlers(productId, productName, container) {
        const form = container.querySelector('.review-form');
        const starsInput = container.querySelectorAll('.star-input');
        const cancelBtn = container.querySelector('.cancel-review');
        
        let selectedRating = 0;

        // Обработка выбора звезд
        starsInput.forEach((star, index) => {
            star.addEventListener('click', () => {
                selectedRating = index + 1;
                this.updateStarsDisplay(starsInput, selectedRating);
            });

            star.addEventListener('mouseover', () => {
                this.updateStarsDisplay(starsInput, index + 1);
            });
        });

        // Восстановление выбранного рейтинга при уходе мыши
        container.querySelector('.stars-input').addEventListener('mouseleave', () => {
            this.updateStarsDisplay(starsInput, selectedRating);
        });

        // Обработка отправки формы
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (selectedRating === 0) {
                this.showMessage('Пожалуйста, выберите оценку', 'error');
                return;
            }

            const formData = new FormData(form);
            const reviewText = formData.get('reviewText');

            const success = await this.addReview(productId, productName, selectedRating, reviewText);
            if (success) {
                // Удаляем форму и обновляем отзывы
                container.querySelector('.review-form-container').remove();
                const reviewsContainer = container.querySelector('.reviews-container');
                this.loadProductReviews(productId, reviewsContainer);
            }
        });

        // Обработка отмены
        cancelBtn.addEventListener('click', () => {
            container.querySelector('.review-form-container').remove();
        });
    }

    updateStarsDisplay(stars, rating) {
        stars.forEach((star, index) => {
            const icon = star.querySelector('i');
            const fallback = star.querySelector('.star-fallback');
            
            if (index < rating) {
                // Заполненная звезда
                if (icon) {
                    icon.classList.add('filled');
                    icon.classList.remove('empty');
                }
                if (fallback) {
                    fallback.classList.add('filled');
                    fallback.classList.remove('empty');
                }
                star.classList.add('selected');
            } else {
                // Пустая звезда
                if (icon) {
                    icon.classList.add('empty');
                    icon.classList.remove('filled');
                }
                if (fallback) {
                    fallback.classList.add('empty');
                    fallback.classList.remove('filled');
                }
                star.classList.remove('selected');
            }
        });
    }

    updateReviewForms() {
        // Обновляем все формы отзывов на странице
        const reviewButtons = document.querySelectorAll('.btn-review');
        const loginPrompts = document.querySelectorAll('.login-prompt');
        
        if (this.currentUser) {
            // Показываем кнопки отзывов
            reviewButtons.forEach(btn => btn.style.display = 'inline-block');
            loginPrompts.forEach(prompt => prompt.style.display = 'none');
        } else {
            // Скрываем кнопки отзывов
            reviewButtons.forEach(btn => btn.style.display = 'none');
            loginPrompts.forEach(prompt => prompt.style.display = 'block');
        }
    }

    showMessage(text, type = 'info') {
        // Создаем контейнер для сообщений, если его нет
        let container = document.getElementById('reviews-message-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'reviews-message-container';
            container.className = 'message-container';
            document.body.appendChild(container);
        }

        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        
        container.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 5000);
    }
}

// Инициализируем менеджер отзывов
let reviewsManager;

document.addEventListener('DOMContentLoaded', () => {
    reviewsManager = new ReviewsManager();
    // Экспортируем экземпляр в window для использования в других файлах
    window.reviewsManager = reviewsManager;
    console.log('ReviewsManager инициализирован и экспортирован в window');
});

// Экспортируем класс для использования в других файлах
window.ReviewsManager = ReviewsManager;
