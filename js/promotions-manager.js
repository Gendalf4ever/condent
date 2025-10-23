/**
 * Менеджер блока акций на главной странице
 * Отображает 3 случайных товара одной категории со скидкой или 3 случайных разных товара
 */

class PromotionsManager {
    constructor() {
        this.allProducts = [];
        this.saleProducts = [];
        this.categories = {
            'printers': '3D-принтер',
            'scanners': '3D-сканер', 
            'milling': 'Фрезерный станок',
            'milling_tools': 'Фрезер',
            'photopolymers': 'Фотополимер',
            'consumables': 'Расходный материал',
            'post_processing': 'Пост-обработка',
            'sinterising': 'Синтеризация',
            'zirkon': 'Цирконий',
            'equipment': 'Оборудование'
        };
    }

    /**
     * Инициализация менеджера акций
     */
    async init() {
        try {
            await this.waitForFirebase();
            await this.loadProducts();
            this.renderPromotions();
        } catch (error) {
            console.error('Ошибка инициализации менеджера акций:', error);
            this.showError();
        }
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
     * Загружает все товары из Firebase
     */
    async loadProducts() {
        try {
            const db = window.firebaseServices.db;
            const snapshot = await db.collection('products').get();
            
            this.allProducts = [];
            this.saleProducts = [];
            
            snapshot.forEach(doc => {
                const productData = doc.data();
                const product = {
                    id: productData.id || doc.id,
                    ...productData,
                    category: this.determineCategory(productData)
                };
                
                this.allProducts.push(product);
                
                // Проверяем наличие скидки
                const priceSkidka = parseFloat(productData.price_skidka);
                if (priceSkidka && priceSkidka > 0) {
                    this.saleProducts.push(product);
                }
            });

            console.log(`Загружено ${this.allProducts.length} товаров, ${this.saleProducts.length} со скидками`);
            
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            throw error;
        }
    }

    /**
     * Определяет категорию товара
     */
    determineCategory(product) {
        const name = (product.name || '').toLowerCase();
        const tags = (product.tags || []).map(tag => tag.toLowerCase());
        const category = (product.category || '').toLowerCase();
        
        // Проверяем категорию из данных
        if (category) {
            return category;
        }
        
        // Проверяем по тегам и названию
        if (tags.includes('3d-принтер') || tags.includes('3d принтер') || 
            name.includes('принтер') || name.includes('printer')) {
            return 'printers';
        }
        
        if (tags.includes('3d-сканер') || tags.includes('3d сканер') || 
            name.includes('сканер') || name.includes('scanner')) {
            return 'scanners';
        }
        
        if (tags.includes('фрезер') || tags.includes('фрезерный') || 
            name.includes('фрезер') || name.includes('milling') || 
            name.includes('станок')) {
            return 'milling';
        }
        
        if (tags.includes('синтеризация') || tags.includes('синтер') || 
            name.includes('синтеризация') || name.includes('sintering')) {
            return 'sinterising';
        }
        
        if (tags.includes('расходный') || tags.includes('материал') || 
            tags.includes('фотополимер') || tags.includes('смола') ||
            name.includes('расходный') || name.includes('материал') ||
            name.includes('фотополимер') || name.includes('смола')) {
            return 'consumables';
        }
        
        return 'equipment';
    }

    /**
     * Выбирает товары для отображения
     */
    selectProductsToShow() {
        if (this.saleProducts.length === 0) {
            // Если нет товаров со скидками, выбираем 3 случайных товара
            return this.getRandomProducts(this.allProducts, 3);
        }

        // Группируем товары со скидками по категориям
        const productsByCategory = {};
        this.saleProducts.forEach(product => {
            const category = product.category || 'other';
            if (!productsByCategory[category]) {
                productsByCategory[category] = [];
            }
            productsByCategory[category].push(product);
        });

        // Ищем категорию с 3 или более товарами
        for (const [category, products] of Object.entries(productsByCategory)) {
            if (products.length >= 3) {
                return this.getRandomProducts(products, 3);
            }
        }

        // Если нет категории с 3+ товарами, выбираем 3 случайных разных товара со скидками
        return this.getRandomProducts(this.saleProducts, 3);
    }

    /**
     * Получает случайные товары без повторений
     */
    getRandomProducts(products, count) {
        const shuffled = [...products].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, products.length));
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
     * Получает название категории на русском
     */
    getCategoryDisplayName(category) {
        return this.categories[category] || 'Товар';
    }

    /**
     * Отображает блок акций
     */
    renderPromotions() {
        const container = document.getElementById('promotions-grid');
        if (!container) return;

        const productsToShow = this.selectProductsToShow();
        
        if (productsToShow.length === 0) {
            container.innerHTML = '<div class="promotions-loading">Нет доступных товаров</div>';
            return;
        }

        const promotionsHTML = productsToShow.map(product => {
            const discountPercentage = this.calculateDiscountPercentage(product);
            const originalPrice = parseFloat(product.price) || 0;
            const salePrice = parseFloat(product.price_skidka) || originalPrice;
            const categoryName = this.getCategoryDisplayName(product.category);
            
            return `
                <a href="#" class="promotion-card" data-product-id="${product.id}" onclick="promotionsManager.openProductModal('${product.id}'); return false;">
                    <div class="promotion-badge">Выбор покупателей</div>
                    ${discountPercentage > 0 ? `<div class="promotion-discount">-${discountPercentage}%</div>` : ''}
                    <div class="promotion-image">
                        ${product.img_url ? `<img src="${product.img_url}" alt="${product.name}" loading="lazy">` : '<div class="no-image">📦</div>'}
                    </div>
                    <h3 class="promotion-title">${product.name}</h3>
                    <p class="promotion-subtitle">${categoryName}</p>
                    <div class="promotion-price">
                        <span class="price-current">${salePrice.toLocaleString('ru-RU')} ₽</span>
                        ${discountPercentage > 0 ? `<span class="price-old">${originalPrice.toLocaleString('ru-RU')} ₽</span>` : ''}
                    </div>
                    <div class="promotion-code">Код товара: ${product.id}</div>
                </a>
            `;
        }).join('');

        container.innerHTML = promotionsHTML;
    }

    /**
     * Открывает модальное окно товара
     */
    openProductModal(productId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (!product) return;

        this.renderProductModal(product);
    }

    /**
     * Отображает модальное окно товара
     */
    renderProductModal(product) {
        const modal = document.getElementById('productModal');
        if (!modal) {
            console.error('Модальное окно товара не найдено');
            return;
        }

        // Заполняем основную информацию
        document.getElementById('modal-product-name').textContent = product.name;
        document.getElementById('modal-product-code').textContent = `(Код товара: ${product.id})`;

        // Изображение товара
        const productImage = document.getElementById('modal-product-image');
        if (product.img_url && product.img_url.trim() !== '') {
            productImage.src = product.img_url;
            productImage.alt = product.name;
            productImage.style.display = 'block';
            productImage.onerror = function() {
                this.style.display = 'none';
                this.parentElement.innerHTML = '<div class="no-image-modal">Изображение недоступно</div>';
            };
        } else {
            productImage.style.display = 'none';
            productImage.parentElement.innerHTML = '<div class="no-image-modal">Изображение недоступно</div>';
        }

        // Бренд
        const brandElement = document.getElementById('modal-product-brand');
        if (brandElement) {
            const brand = this.extractBrand(product.name);
            brandElement.textContent = brand ? `Бренд: ${brand}` : '';
        }

        // Цена товара
        const priceContainer = document.getElementById('modal-product-price');
        const originalPrice = parseFloat(product.price) || 0;
        const salePrice = parseFloat(product.price_skidka) || 0;
        
        if (originalPrice > 0) {
            if (salePrice > 0 && salePrice < originalPrice) {
                const discountPercentage = this.calculateDiscountPercentage(product);
                priceContainer.innerHTML = `
                    <div class="product-price">
                        <span class="product-old-price">${originalPrice.toLocaleString('ru-RU')} ₽</span>
                        <span class="product-new-price">${salePrice.toLocaleString('ru-RU')} ₽</span>
                        <span class="discount-badge">-${discountPercentage}%</span>
                    </div>
                `;
            } else {
                priceContainer.innerHTML = `<div class="product-price">${originalPrice.toLocaleString('ru-RU')} ₽</div>`;
            }
        } else {
            priceContainer.innerHTML = '<div class="product-price">Цена по запросу</div>';
        }

        // Описание товара
        document.getElementById('modal-product-description').textContent = product.description || 'Описание отсутствует';

        // Характеристики товара
        this.renderProductSpecs(product);

        // Похожие товары
        this.renderSimilarProducts(product);

        // Настраиваем табы
        this.setupTabs();

        // Настраиваем обработчики
        this.setupModalHandlers();

        // Настраиваем клик по изображению для увеличения
        this.setupImageClick();

        // Сохраняем текущий товар
        window.currentProduct = product;

        // Показываем модальное окно
        modal.style.display = 'block';
    }

    /**
     * Извлекает бренд из названия товара
     */
    extractBrand(productName) {
        const brands = ['Shining', 'Elegoo', 'Phrozen', 'Asiga', 'Philden', 'Uniformation', 'Sonic'];
        for (const brand of brands) {
            if (productName.toLowerCase().includes(brand.toLowerCase())) {
                return brand;
            }
        }
        return null;
    }

    /**
     * Отображает характеристики товара
     */
    renderProductSpecs(product) {
        const specsContainer = document.getElementById('modal-product-specs');
        specsContainer.innerHTML = '';
        
        if (product.characteristics && product.characteristics.trim() !== '') {
            const characteristics = product.characteristics.split('\n').filter(line => line.trim() !== '');
            
            characteristics.forEach(characteristic => {
                const specItem = document.createElement('div');
                specItem.className = 'spec-item';
                
                const colonIndex = characteristic.indexOf(':');
                if (colonIndex > 0) {
                    const specName = characteristic.substring(0, colonIndex).trim();
                    const specValue = characteristic.substring(colonIndex + 1).trim();
                    specItem.innerHTML = `
                        <div class="spec-name">${specName}:</div>
                        <div class="spec-value">${specValue}</div>
                    `;
                } else {
                    specItem.innerHTML = `<div class="spec-value">${characteristic}</div>`;
                }
                
                specsContainer.appendChild(specItem);
            });
        } else {
            specsContainer.innerHTML = '<p>Характеристики не указаны</p>';
        }
    }

    /**
     * Отображает похожие товары
     */
    renderSimilarProducts(product) {
        const container = document.getElementById('similar-products-grid');
        if (!container) {
            console.log('Контейнер для похожих товаров не найден');
            return;
        }

        console.log('Поиск похожих товаров для:', product.name);
        console.log('Категория товара:', product.category);
        console.log('Теги товара:', product.tags);
        console.log('Всего товаров для поиска:', this.allProducts.length);

        // Находим похожие товары по тегам и категории
        const similarProducts = this.findSimilarProducts(product, 6);
        
        console.log('Найдено похожих товаров:', similarProducts.length);
        
        if (similarProducts.length === 0) {
            console.log('Похожие товары не найдены, скрываем секцию');
            document.getElementById('similar-products-section').style.display = 'none';
            return;
        }

        document.getElementById('similar-products-section').style.display = 'block';
        
        const similarHTML = similarProducts.map(similarProduct => {
            const price = parseFloat(similarProduct.price_skidka) || parseFloat(similarProduct.price) || 0;
            return `
                <a href="#" class="similar-product-card" onclick="promotionsManager.openProductModal('${similarProduct.id}'); return false;">
                    <div class="similar-product-image">
                        ${similarProduct.img_url ? `<img src="${similarProduct.img_url}" alt="${similarProduct.name}" loading="lazy">` : '<div class="no-image">📦</div>'}
                    </div>
                    <div class="similar-product-name">${similarProduct.name}</div>
                    <div class="similar-product-price">${price > 0 ? price.toLocaleString('ru-RU') + ' ₽' : 'По запросу'}</div>
                </a>
            `;
        }).join('');

        container.innerHTML = similarHTML;
    }

    /**
     * Находит похожие товары по тегам и категории
     */
    findSimilarProducts(product, limit = 6) {
        const productTags = (product.tags || []).map(tag => tag.toLowerCase());
        const productCategory = product.category;
        const productName = (product.name || '').toLowerCase();
        
        console.log('Поиск похожих товаров - категория:', productCategory, 'теги:', productTags);
        
        // Исключаем текущий товар
        const otherProducts = this.allProducts.filter(p => p.id !== product.id);
        console.log('Товаров для поиска (исключая текущий):', otherProducts.length);
        
        let similarProducts = [];
        
        // 1. Сначала ищем товары с похожими тегами
        if (productTags.length > 0) {
            const similarByTags = otherProducts.filter(p => {
                const pTags = (p.tags || []).map(tag => tag.toLowerCase());
                return pTags.some(tag => productTags.includes(tag));
            });
            similarProducts.push(...similarByTags);
            console.log('Найдено по тегам:', similarByTags.length);
        }
        
        // 2. Если недостаточно, ищем по категории
        if (similarProducts.length < limit && productCategory) {
            const similarByCategory = otherProducts.filter(p => 
                p.category === productCategory && 
                !similarProducts.some(sp => sp.id === p.id)
            );
            similarProducts.push(...similarByCategory);
            console.log('Найдено по категории:', similarByCategory.length);
        }
        
        // 3. Если все еще недостаточно, ищем по ключевым словам в названии
        if (similarProducts.length < limit) {
            const keywords = this.extractKeywords(productName);
            console.log('Ключевые слова из названия:', keywords);
            
            const similarByKeywords = otherProducts.filter(p => {
                const pName = (p.name || '').toLowerCase();
                return keywords.some(keyword => pName.includes(keyword)) &&
                       !similarProducts.some(sp => sp.id === p.id);
            });
            similarProducts.push(...similarByKeywords);
            console.log('Найдено по ключевым словам:', similarByKeywords.length);
        }
        
        // 4. Если все еще недостаточно, добавляем случайные товары
        if (similarProducts.length < limit) {
            const remaining = otherProducts.filter(p => 
                !similarProducts.some(sp => sp.id === p.id)
            );
            const randomProducts = this.getRandomProducts(remaining, limit - similarProducts.length);
            similarProducts.push(...randomProducts);
            console.log('Добавлено случайных товаров:', randomProducts.length);
        }
        
        const result = similarProducts.slice(0, limit);
        console.log('Итого похожих товаров:', result.length);
        return result;
    }

    /**
     * Извлекает ключевые слова из названия товара
     */
    extractKeywords(productName) {
        const keywords = [];
        const name = productName.toLowerCase();
        
        // Ключевые слова для разных категорий
        const categoryKeywords = {
            'принтер': ['принтер', 'printer', '3d'],
            'сканер': ['сканер', 'scanner', '3d'],
            'фрезер': ['фрезер', 'mill', 'фрезерн'],
            'печь': ['печь', 'oven', 'синтер', 'синтеризация', 'sintering'],
            'полимер': ['полимер', 'resin', 'смола'],
            'диск': ['диск', 'disc', 'циркон'],
            'фреза': ['фреза', 'bur', 'бор']
        };
        
        // Бренды
        const brands = ['medit', 'phrozen', 'elegoo', 'anycubic', 'formlabs', 'roland', 'sirona', 'upcera', 'zetin', 'cysi'];
        
        // Проверяем категории
        for (const [category, words] of Object.entries(categoryKeywords)) {
            if (words.some(word => name.includes(word))) {
                keywords.push(...words);
            }
        }
        
        // Проверяем бренды
        brands.forEach(brand => {
            if (name.includes(brand)) {
                keywords.push(brand);
            }
        });
        
        return [...new Set(keywords)]; // Убираем дубликаты
    }

    /**
     * Настраивает табы
     */
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Убираем активный класс со всех кнопок и панелей
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Добавляем активный класс к выбранным элементам
                button.classList.add('active');
                document.getElementById(`tab-${targetTab}`).classList.add('active');
            });
        });
    }

    /**
     * Настраивает обработчики модального окна
     */
    setupModalHandlers() {
        const modal = document.getElementById('productModal');
        const closeBtn = modal.querySelector('.close-modal');
        
        // Закрытие по клику на крестик
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        // Закрытие по клику вне модального окна
        modal.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        // Закрытие по Escape
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }

    /**
     * Настраивает клик по изображению для увеличения
     */
    setupImageClick() {
        const productImage = document.getElementById('modal-product-image');
        if (productImage) {
            productImage.addEventListener('click', () => {
                this.openImageModal(productImage.src, productImage.alt);
            });
        }
    }

    /**
     * Открывает модальное окно с увеличенным изображением
     */
    openImageModal(imageSrc, imageAlt) {
        const imageModal = document.getElementById('imageModal');
        const imageModalImg = document.getElementById('imageModalImg');
        const imageModalClose = document.getElementById('imageModalClose');
        
        if (!imageModal || !imageModalImg) return;

        imageModalImg.src = imageSrc;
        imageModalImg.alt = imageAlt;
        imageModal.classList.add('active');

        // Обработчики закрытия
        const closeImageModal = () => {
            imageModal.classList.remove('active');
        };

        // Закрытие по клику на крестик
        if (imageModalClose) {
            imageModalClose.onclick = closeImageModal;
        }

        // Закрытие по клику вне изображения
        imageModal.onclick = (event) => {
            if (event.target === imageModal) {
                closeImageModal();
            }
        };

        // Закрытие по Escape
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                closeImageModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    /**
     * Показывает ошибку загрузки
     */
    showError() {
        const container = document.getElementById('promotions-grid');
        if (container) {
            container.innerHTML = '<div class="promotions-loading">Ошибка загрузки акций</div>';
        }
    }
}

// Инициализация менеджера акций
let promotionsManager = null;

// Инициализируем только на главной странице
if (window.location.pathname.includes('index.html') || 
    window.location.pathname === '/' || 
    window.location.pathname === '') {
    
    document.addEventListener('DOMContentLoaded', () => {
        // Ждем загрузки Firebase и других компонентов
        setTimeout(() => {
            promotionsManager = new PromotionsManager();
            promotionsManager.init();
        }, 1500); // Увеличиваем задержку для надежности
    });
}

// Экспорт для глобального использования
window.PromotionsManager = PromotionsManager;
window.promotionsManager = promotionsManager;
