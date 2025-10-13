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
    const modal = document.getElementById('productModal');
    if (!modal) {
        console.error('Модальное окно товара не найдено');
        return;
    }
    
    // Заполняем данные товара
    const nameElement = document.getElementById('modal-product-name');
    if (nameElement) nameElement.textContent = product.name;
    
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
        } else {
            productImage.style.display = 'none';
            productImage.parentElement.innerHTML = '<div class="no-image-modal">Изображение недоступно</div>';
        }
    }
    
    // Цена товара
    const priceContainer = document.getElementById('modal-product-price');
    if (priceContainer) {
        const price = parseFloat(product.price) || 0;
        const promoPrice = parseFloat(product.price_skidka) || 0;
        
        if (price > 0) {
            const formattedPrice = price.toLocaleString('ru-RU') + ' ₽';
            
            if (promoPrice > 0 && promoPrice < price) {
                const formattedPromoPrice = promoPrice.toLocaleString('ru-RU') + ' ₽';
                priceContainer.innerHTML = `
                    <div class="product-price">
                        <span class="product-old-price">${formattedPrice}</span>
                        ${formattedPromoPrice}
                    </div>
                `;
            } else {
                priceContainer.innerHTML = `<div class="product-price">${formattedPrice}</div>`;
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
    const specsContainer = document.getElementById('modal-product-specs');
    if (specsContainer) {
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
        }
    }
    
    // Сбрасываем количество на 1
    const quantityInput = document.getElementById('param-quantity');
    if (quantityInput) quantityInput.value = 1;
    
    // Сохраняем текущий товар для добавления в корзину
    window.currentProduct = product;
    
    modal.style.display = 'block';
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