/**
 * Система баннеров со скидками
 * Управляет баннером на главной странице и всплывающими popup'ами
 */

// Проверяем, не был ли класс уже объявлен
if (typeof window.SaleBannersManager === 'undefined') {
    
class SaleBannersManager {
    constructor() {
        this.saleProducts = [];
        this.currentSlideIndex = 0;
        this.slidesToShow = 4; // Количество товаров для показа одновременно
        this.popupTimer = null;
        this.countdownTimer = null;
        this.popupShown = false;
        
        // Настройки popup
        this.popupSettings = {
            showDelay: 30000, // Показать через 30 секунд
            showInterval: 300000, // Показывать каждые 5 минут
            timerDuration: 24 * 60 * 60 * 1000 // 24 часа в миллисекундах
        };
    }

    /**
     * Инициализация системы баннеров
     */
    async init() {
        try {
            await this.waitForFirebase();
            await this.loadSaleProducts();
            
            // Инициализируем баннер только на главной странице
            if (this.isMainPage()) {
                this.initSaleBanner();
            }
            
            // Инициализируем popup на всех страницах
            this.initSalePopup();
            
        } catch (error) {
            console.error('Ошибка инициализации системы баннеров:', error);
        }
    }

    /**
     * Проверяет, является ли текущая страница главной
     */
    isMainPage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        return currentPage === 'index.html' || currentPage === '';
    }

    /**
     * Ожидание инициализации Firebase
     */
    waitForFirebase() {
        return new Promise((resolve, reject) => {
            const checkFirebase = () => {
                if (window.firebaseServices && window.firebaseServices.db) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            
            setTimeout(() => {
                reject(new Error('Firebase не инициализирован в течение 10 секунд'));
            }, 10000);
            
            checkFirebase();
        });
    }

    /**
     * Загружает товары со скидками из Firebase
     */
    async loadSaleProducts() {
        try {
            const db = window.firebaseServices.db;
            const snapshot = await db.collection('products').get();
            
            this.saleProducts = [];
            snapshot.forEach(doc => {
                const productData = doc.data();
                const priceSkidka = parseFloat(productData.price_skidka);
                
                if (priceSkidka && priceSkidka > 0) {
                    this.saleProducts.push({
                        id: productData.id || doc.id,
                        ...productData
                    });
                }
            });

            // Сортируем по размеру скидки
            this.saleProducts.sort((a, b) => {
                const discountA = this.calculateDiscountPercentage(a);
                const discountB = this.calculateDiscountPercentage(b);
                return discountB - discountA;
            });

            console.log(`Загружено ${this.saleProducts.length} товаров со скидками для баннеров`);
            
        } catch (error) {
            console.error('Ошибка загрузки товаров со скидками:', error);
            throw error;
        }
    }

    /**
     * Вычисляет процент скидки
     */
    calculateDiscountPercentage(product) {
        const originalPrice = parseFloat(product.price) || 0;
        const salePrice = parseFloat(product.price_skidka) || 0;
        
        if (originalPrice <= 0 || salePrice <= 0 || salePrice >= originalPrice) {
            return 0;
        }
        
        return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
    }

    /**
     * Инициализация баннера на главной странице
     */
    initSaleBanner() {
        const banner = document.getElementById('sale-banner');
        if (!banner) return;

        this.renderSaleBanner();
        this.setupSliderControls();
        
        // Автопрокрутка каждые 5 секунд
        setInterval(() => {
            this.nextSlide();
        }, 5000);
    }

    /**
     * Отображает товары в баннере
     */
    renderSaleBanner() {
        const container = document.getElementById('sale-products-container');
        if (!container) return;

        if (this.saleProducts.length === 0) {
            container.innerHTML = '<div class="no-sales">Нет активных акций</div>';
            return;
        }

        // Берем первые 8 товаров для слайдера
        const productsToShow = this.saleProducts.slice(0, 8);
        
        container.innerHTML = productsToShow.map(product => {
            const discountPercentage = this.calculateDiscountPercentage(product);
            const originalPrice = parseFloat(product.price) || 0;
            const salePrice = parseFloat(product.price_skidka) || 0;
            
            return `
                <div class="sale-product-item" data-product-id="${product.id}">
                    <div class="sale-product-image">
                        ${product.img_url ? `<img src="${product.img_url}" alt="${product.name}" loading="lazy">` : '<div class="no-image">Нет фото</div>'}
                        <div class="sale-discount-badge">-${discountPercentage}%</div>
                    </div>
                    <div class="sale-product-info">
                        <h4 class="sale-product-name">${product.name}</h4>
                        <div class="sale-product-prices">
                            <span class="sale-old-price">${originalPrice.toLocaleString('ru-RU')} ₽</span>
                            <span class="sale-new-price">${salePrice.toLocaleString('ru-RU')} ₽</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Добавляем обработчики кликов
        container.querySelectorAll('.sale-product-item').forEach(item => {
            item.addEventListener('click', () => {
                const productId = item.dataset.productId;
                const product = this.saleProducts.find(p => p.id === productId);
                if (product) {
                    this.openProductModal(product);
                }
            });
        });
    }

    /**
     * Настройка управления слайдером
     */
    setupSliderControls() {
        const prevBtn = document.getElementById('sale-slider-prev');
        const nextBtn = document.getElementById('sale-slider-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevSlide());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextSlide());
        }
    }

    /**
     * Следующий слайд
     */
    nextSlide() {
        const container = document.getElementById('sale-products-container');
        if (!container) return;

        const items = container.querySelectorAll('.sale-product-item');
        const totalItems = items.length;
        
        if (totalItems <= this.slidesToShow) return;

        this.currentSlideIndex = (this.currentSlideIndex + 1) % (totalItems - this.slidesToShow + 1);
        this.updateSliderPosition();
    }

    /**
     * Предыдущий слайд
     */
    prevSlide() {
        const container = document.getElementById('sale-products-container');
        if (!container) return;

        const items = container.querySelectorAll('.sale-product-item');
        const totalItems = items.length;
        
        if (totalItems <= this.slidesToShow) return;

        this.currentSlideIndex = this.currentSlideIndex === 0 
            ? totalItems - this.slidesToShow 
            : this.currentSlideIndex - 1;
        this.updateSliderPosition();
    }

    /**
     * Обновляет позицию слайдера
     */
    updateSliderPosition() {
        const container = document.getElementById('sale-products-container');
        if (!container) return;

        const itemWidth = 100 / this.slidesToShow;
        const translateX = -this.currentSlideIndex * itemWidth;
        container.style.transform = `translateX(${translateX}%)`;
    }

    /**
     * Инициализация всплывающего popup
     */
    initSalePopup() {
        if (this.saleProducts.length === 0) return;

        // Проверяем, показывался ли popup недавно
        const lastPopupTime = localStorage.getItem('lastSalePopupTime');
        const now = Date.now();
        
        if (lastPopupTime && (now - parseInt(lastPopupTime)) < this.popupSettings.showInterval) {
            return; // Не показываем popup слишком часто
        }

        // Показываем popup через заданное время
        setTimeout(() => {
            this.showSalePopup();
        }, this.popupSettings.showDelay);
    }

    /**
     * Показывает всплывающий popup
     */
    showSalePopup() {
        if (this.popupShown || this.saleProducts.length === 0) return;

        const popup = document.getElementById('sale-popup');
        if (!popup) return;

        // Выбираем случайный товар со скидкой
        const randomProduct = this.saleProducts[Math.floor(Math.random() * this.saleProducts.length)];
        this.renderPopupProduct(randomProduct);
        
        popup.style.display = 'flex';
        this.popupShown = true;
        
        // Сохраняем время показа
        localStorage.setItem('lastSalePopupTime', Date.now().toString());
        
        // Запускаем таймер
        this.startPopupTimer();
        
        // Настраиваем обработчики
        this.setupPopupHandlers(randomProduct);
    }

    /**
     * Отображает товар в popup
     */
    renderPopupProduct(product) {
        const container = document.getElementById('sale-popup-product');
        const actions = document.getElementById('sale-popup-actions');
        
        if (!container || !actions) return;

        const discountPercentage = this.calculateDiscountPercentage(product);
        const originalPrice = parseFloat(product.price) || 0;
        const salePrice = parseFloat(product.price_skidka) || 0;
        const savings = originalPrice - salePrice;

        container.innerHTML = `
            <div class="popup-product-image">
                ${product.img_url ? `<img src="${product.img_url}" alt="${product.name}">` : '<div class="no-image">Нет фото</div>'}
                <div class="popup-discount-badge">-${discountPercentage}%</div>
            </div>
            <div class="popup-product-info">
                <h4 class="popup-product-name">${product.name}</h4>
                <div class="popup-product-prices">
                    <div class="popup-old-price">${originalPrice.toLocaleString('ru-RU')} ₽</div>
                    <div class="popup-new-price">${salePrice.toLocaleString('ru-RU')} ₽</div>
                </div>
                <div class="popup-savings">Экономия: ${savings.toLocaleString('ru-RU')} ₽</div>
            </div>
        `;

        actions.style.display = 'flex';
    }

    /**
     * Настройка обработчиков popup
     */
    setupPopupHandlers(product) {
        const closeBtn = document.getElementById('sale-popup-close');
        const viewBtn = document.getElementById('sale-popup-view');
        const allSalesBtn = document.getElementById('sale-popup-all-sales');
        const overlay = document.getElementById('sale-popup');

        // Закрытие popup
        const closePopup = () => {
            overlay.style.display = 'none';
            this.stopPopupTimer();
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closePopup);
        }

        // Клик по overlay для закрытия
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closePopup();
            }
        });

        // Просмотр товара
        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                this.openProductModal(product);
                closePopup();
            });
        }

        // Все акции
        if (allSalesBtn) {
            allSalesBtn.addEventListener('click', () => {
                window.location.href = 'sale.html';
            });
        }
    }

    /**
     * Запуск таймера popup
     */
    startPopupTimer() {
        const timerElement = document.getElementById('timer-countdown');
        if (!timerElement) return;

        let timeLeft = this.popupSettings.timerDuration;
        
        this.countdownTimer = setInterval(() => {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            timeLeft -= 1000;

            if (timeLeft < 0) {
                this.stopPopupTimer();
                timerElement.textContent = '00:00:00';
            }
        }, 1000);
    }

    /**
     * Остановка таймера popup
     */
    stopPopupTimer() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }

    /**
     * Открывает модальное окно товара
     */
    openProductModal(product) {
        // Используем существующую систему модальных окон из catalog-firebase.js
        if (window.catalogFirebase && typeof window.catalogFirebase.openProductModal === 'function') {
            window.currentProduct = product;
            window.catalogFirebase.openProductModal(product);
        } else {
            // Fallback - переходим на страницу акций
            window.location.href = 'sale.html';
        }
    }
}

// Инициализация системы баннеров
let saleBannersManager = null;

document.addEventListener('DOMContentLoaded', () => {
    // Ждем загрузки Firebase и других компонентов
    setTimeout(() => {
        saleBannersManager = new SaleBannersManager();
        saleBannersManager.init();
    }, 1000);
});

// Экспорт для глобального использования
window.SaleBannersManager = SaleBannersManager;
window.saleBannersManager = saleBannersManager;

} // Закрываем проверку на существование класса
