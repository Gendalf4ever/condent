// Каталог товаров с фильтрацией по тегам

/**
 * Ожидает загрузку Firebase
 */
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        const checkFirebase = () => {
            if (window.firebaseServices && window.firebaseServices.db) {
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        
        // Таймаут через 10 секунд
        setTimeout(() => {
            reject(new Error('Firebase не инициализирован в течение 10 секунд'));
        }, 10000);
        
        checkFirebase();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, нужно ли отключить инициализацию Firebase (для Google Sheets страниц)
    if (window.DISABLE_FIREBASE_INIT) {
        console.log('Firebase инициализация отключена для этой страницы (Google Sheets)');
        updateCartCount();
        setupEventListeners();
        return;
    }
    
    waitForFirebase().then(() => {
        loadAllProductsFromFirebase();
        setupFilterButtons();
    }).catch(error => {
        console.error('Ошибка инициализации Firebase:', error);
        showError('Ошибка подключения к базе данных');
    });
    updateCartCount();
    setupEventListeners();
});

let allProducts = [];
let filteredProducts = [];

/**
 * Загружает все товары из Firebase
 */
async function loadAllProductsFromFirebase() {
    const container = document.getElementById('products-container');
    container.innerHTML = '<div class="loading">Загружаем каталог товаров...</div>';

    try {
        if (!window.firebaseServices || !window.firebaseServices.db) {
            throw new Error('Firebase не инициализирован');
        }
        const db = window.firebaseServices.db;
        const snapshot = await db.collection('products').get();

        if (snapshot.empty) {
            showError('Товары не найдены.');
            return;
        }

        allProducts = [];
        snapshot.forEach(doc => {
            const productData = doc.data();
            allProducts.push({
                id: productData.id || doc.id,
                ...productData,
                // Определяем категорию на основе тегов или названия
                category: determineCategory(productData)
            });
        });

        console.log(`Загружено ${allProducts.length} товаров`);
        filteredProducts = [...allProducts];
        renderProducts(filteredProducts);
    } catch (error) {
        console.error('Ошибка загрузки товаров из Firebase:', error);
        showError('Не удалось загрузить каталог. Пожалуйста, попробуйте позже.');
    }
}

/**
 * Определяет категорию товара на основе тегов или названия
 */
function determineCategory(product) {
    const name = (product.name || '').toLowerCase();
    const tags = (product.tags || []).map(tag => tag.toLowerCase());
    const description = (product.description || '').toLowerCase();
    
    // Проверяем теги
    if (tags.includes('3d-принтер') || tags.includes('3d принтер') || 
        name.includes('принтер') || name.includes('printer')) {
        return '3d-printers';
    }
    
    if (tags.includes('3d-сканер') || tags.includes('3d сканер') || 
        name.includes('сканер') || name.includes('scanner')) {
        return '3d-scanners';
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
    
    return 'other';
}

/**
 * Настройка кнопок фильтрации
 */
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Убираем активный класс со всех кнопок
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Добавляем активный класс к нажатой кнопке
            button.classList.add('active');
            
            // Фильтруем товары
            const category = button.dataset.category;
            filterProducts(category);
        });
    });
}

/**
 * Фильтрует товары по категории
 */
function filterProducts(category) {
    if (category === 'all') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => product.category === category);
    }
    
    renderProducts(filteredProducts);
    
    // Показываем количество найденных товаров
    const container = document.getElementById('products-container');
    const count = filteredProducts.length;
    const categoryName = getCategoryName(category);
    
    if (count === 0) {
        container.innerHTML = `<div class="no-products">В категории "${categoryName}" товары не найдены</div>`;
    } else {
        console.log(`Показано ${count} товаров в категории "${categoryName}"`);
    }
}

/**
 * Возвращает название категории
 */
function getCategoryName(category) {
    const names = {
        'all': 'Все товары',
        '3d-printers': '3D-принтеры',
        '3d-scanners': '3D-сканеры',
        'milling': 'Фрезерные станки',
        'sinterising': 'Синтеризация',
        'consumables': 'Расходные материалы',
        'other': 'Прочее'
    };
    return names[category] || 'Неизвестная категория';
}

/**
 * Отображает товары в контейнере
 */
function renderProducts(products) {
    const container = document.getElementById('products-container');
    
    if (products.length === 0) {
        container.innerHTML = '<div class="no-products">Товары не найдены</div>';
        return;
    }

    container.innerHTML = products.map(product => {
        const originalPrice = parseFloat(product.price) || 0;
        const promoPrice = parseFloat(product.price_skidka) || 0;
        const hasDiscount = promoPrice > 0 && promoPrice < originalPrice;
        const displayPrice = hasDiscount ? promoPrice : originalPrice;
        const discountPercentage = hasDiscount ? 
            Math.round(((originalPrice - promoPrice) / originalPrice) * 100) : 0;

        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image-wrapper">
                    ${product.img_url && product.img_url.trim() !== '' ? 
                        `<img src="${product.img_url}" alt="${product.name}" class="product-thumbnail" loading="lazy" 
                             onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div class=\\'no-image\\'>Нет фото</div>';">` : 
                        '<div class="no-image">Нет фото</div>'
                    }
                    ${hasDiscount ? `<div class="sale-label">-${discountPercentage}%</div>` : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price-container">
                        <span class="product-price">${displayPrice.toLocaleString('ru-RU')} ₽</span>
                        ${hasDiscount ? `<span class="product-old-price">${originalPrice.toLocaleString('ru-RU')} ₽</span>` : ''}
                    </div>
                    <div class="product-category">${getCategoryName(product.category)}</div>
                </div>
            </div>
        `;
    }).join('');

    // Добавляем обработчики кликов
    container.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.dataset.productId;
            const product = products.find(p => p.id === productId);
            if (product) {
                openProductModal(product);
            }
        });
    });
}

/**
 * Показывает ошибку
 */
function showError(message) {
    const container = document.getElementById('products-container');
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

/**
 * Открывает модальное окно с детальной информацией о товаре
 */
function openProductModal(product) {
    // Используем новый менеджер промоакций для рендеринга модального окна
    if (window.promotionsManager && typeof window.promotionsManager.renderProductModal === 'function') {
        window.currentProduct = product;
        window.promotionsManager.renderProductModal(product);
    } else {
        console.error('PromotionsManager не инициализирован или не имеет метода renderProductModal');
        // Fallback: используем старую логику с новой структурой
        openProductModalFallbackCatalog(product);
    }
}

/**
 * Fallback функция для открытия модального окна (если PromotionsManager недоступен)
 */
function openProductModalFallbackCatalog(product) {
    const modal = document.getElementById('productModal');
    if (!modal) {
        console.error('Модальное окно товара не найдено');
        return;
    }
    
    // Заполняем основную информацию
    const nameElement = document.getElementById('modal-product-name');
    if (nameElement) nameElement.textContent = product.name;
    
    // Код товара
    const productCodeElement = document.getElementById('modal-product-code');
    if (productCodeElement) {
        productCodeElement.textContent = `(Код товара: ${product.id})`;
    }
    
    // Изображение товара
    const productImage = document.getElementById('modal-product-image');
    if (productImage) {
        if (product.img_url && product.img_url.trim() !== '') {
            productImage.src = product.img_url;
            productImage.alt = product.name;
            productImage.style.display = 'block';
            productImage.onerror = function() {
                this.style.display = 'none';
                this.parentElement.innerHTML = '<div class="no-image-modal">Изображение недоступно</div>';
            };
            
            // Добавляем обработчик клика для увеличения изображения
            productImage.onclick = function() {
                openImageModalCatalog(this.src, this.alt);
            };
        } else {
            productImage.style.display = 'none';
            productImage.parentElement.innerHTML = '<div class="no-image-modal">Изображение недоступно</div>';
        }
    }
    
    // Бренд
    const brandElement = document.getElementById('modal-product-brand');
    if (brandElement) {
        const brand = extractBrandFromNameCatalog(product.name);
        brandElement.textContent = brand ? `Бренд: ${brand}` : '';
    }
    
    // Цена товара
    const priceContainer = document.getElementById('modal-product-price');
    if (priceContainer) {
        const originalPrice = parseFloat(product.price) || 0;
        const salePrice = parseFloat(product.price_skidka) || 0;
        
        if (originalPrice > 0) {
            if (salePrice > 0 && salePrice < originalPrice) {
                const discountPercentage = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
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
    }
    
    // Описание товара
    const descriptionElement = document.getElementById('modal-product-description');
    if (descriptionElement) {
        descriptionElement.textContent = product.description || 'Описание отсутствует';
    }
    
    // Характеристики товара
    renderProductSpecsFallbackCatalog(product);
    
    // Похожие товары (заглушка)
    const similarProductsGrid = document.getElementById('similar-products-grid');
    if (similarProductsGrid) {
        similarProductsGrid.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Похожие товары загружаются...</div>';
    }
    
    // Настраиваем табы
    setupTabsFallbackCatalog();
    
    // Сбрасываем количество на 1
    const quantityInput = document.getElementById('param-quantity');
    if (quantityInput) quantityInput.value = 1;
    
    // Сохраняем текущий товар для добавления в корзину
    window.currentProduct = product;
    
    modal.style.display = 'block';
}

/**
 * Извлекает бренд из названия товара (для catalog.js)
 */
function extractBrandFromNameCatalog(productName) {
    if (!productName) return null;
    
    const brands = [
        'Medit', 'Phrozen', 'Elegoo', 'Anycubic', 'Formlabs', 'NextDent', 
        'KeyPrint', 'Detax', 'Asiga', 'SprintRay', 'Roland', 'Imes-icore',
        'Amann Girrbach', 'Sirona', 'Straumann', 'Nobel Biocare', 'Zimmer',
        'Carestream', '3Shape', 'Planmeca', 'Dentsply', 'Ivoclar', 'GC',
        'Shofu', 'Vita', 'Kulzer', 'Heraeus', 'Kuraray', 'Tokuyama'
    ];
    
    for (const brand of brands) {
        if (productName.toLowerCase().includes(brand.toLowerCase())) {
            return brand;
        }
    }
    
    // Если не найден известный бренд, попробуем взять первое слово
    const firstWord = productName.split(' ')[0];
    if (firstWord && firstWord.length > 2) {
        return firstWord;
    }
    
    return null;
}

/**
 * Рендерит характеристики товара (fallback версия для catalog.js)
 */
function renderProductSpecsFallbackCatalog(product) {
    const specsContainer = document.getElementById('modal-product-specs');
    if (!specsContainer) return;
    
    specsContainer.innerHTML = '';
    
    // Собираем характеристики из разных полей
    const specs = [];
    
    if (product.characteristics && product.characteristics.trim() !== '') {
        const characteristics = product.characteristics.split('\n').filter(line => line.trim() !== '');
        characteristics.forEach(char => {
            if (char.includes(':')) {
                const [name, value] = char.split(':').map(s => s.trim());
                specs.push({ name, value });
            } else {
                specs.push({ name: 'Характеристика', value: char.trim() });
            }
        });
    }
    
    // Добавляем базовые характеристики
    if (product.category) {
        specs.push({ name: 'Категория', value: product.category });
    }
    
    if (product.brand) {
        specs.push({ name: 'Бренд', value: product.brand });
    }
    
    if (product.model) {
        specs.push({ name: 'Модель', value: product.model });
    }
    
    if (specs.length === 0) {
        specsContainer.innerHTML = '<div class="no-specs">Характеристики не указаны</div>';
        return;
    }
    
    specs.forEach(spec => {
        const specItem = document.createElement('div');
        specItem.className = 'spec-item';
        specItem.innerHTML = `
            <div class="spec-name">${spec.name}:</div>
            <div class="spec-value">${spec.value}</div>
        `;
        specsContainer.appendChild(specItem);
    });
}

/**
 * Настраивает табы (fallback версия для catalog.js)
 */
function setupTabsFallbackCatalog() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Убираем активный класс со всех кнопок и панелей
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Добавляем активный класс к выбранной кнопке и панели
            button.classList.add('active');
            const targetPane = document.getElementById(`tab-${targetTab}`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
}

/**
 * Открывает модальное окно с увеличенным изображением (для catalog.js)
 */
function openImageModalCatalog(imageSrc, imageAlt) {
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
 * Настройка обработчиков событий для модальных окон
 */
function setupEventListeners() {
    // Обработчики модальных окон
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        };
    });
    
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
    
    // Обработчик кнопки корзины
    const cartButton = document.getElementById('cart-button');
    if (cartButton) {
        cartButton.addEventListener('click', function() {
            const cartModal = document.getElementById('cartModal');
            if (cartModal) cartModal.style.display = 'block';
        });
    }
    
    // Обработчик добавления в корзину
    const addToCartBtn = document.querySelector('.add-to-cart');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            if (window.currentProduct) {
                // Здесь можно добавить логику добавления в корзину
                alert(`Товар "${window.currentProduct.name}" добавлен в корзину`);
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        });
    }
}

/**
 * Обновляет счетчик корзины
 */
function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        // Здесь можно добавить логику подсчета товаров в корзине
        cartCount.textContent = '0';
    }
}

// Добавляем стили для фильтров
const style = document.createElement('style');
style.textContent = `
.catalog-filters {
    background: #f8f9fa;
    padding: 20px 0;
    margin-bottom: 30px;
    border-bottom: 1px solid #e9ecef;
}

.catalog-filters-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.catalog-filters h3 {
    margin: 0 0 15px 0;
    color: #2c3e50;
    font-size: 1.2rem;
}

.filter-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.filter-btn {
    background: white;
    border: 2px solid #e9ecef;
    color: #6c757d;
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
    font-weight: 500;
}

.filter-btn:hover {
    border-color: #007bff;
    color: #007bff;
}

.filter-btn.active {
    background: #007bff;
    border-color: #007bff;
    color: white;
}

.product-category {
    font-size: 12px;
    color: #6c757d;
    margin-top: 5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.no-products, .error-message {
    text-align: center;
    padding: 50px 20px;
    color: #6c757d;
    font-size: 1.1rem;
}

.error-message {
    color: #dc3545;
}
`;
document.head.appendChild(style);