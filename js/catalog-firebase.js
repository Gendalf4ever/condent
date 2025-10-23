/**
 * Система каталога товаров с Firebase Firestore
 * Загружает товары по категориям и отображает их на соответствующих страницах
 */

// Маппинг категорий товаров на страницы каталога
const CATEGORY_MAPPING = {
    '3d-printers': 'printers',
    '3d-scaners': 'scanners', 
    'milling': 'milling',
    'frezy': 'milling_tools',
    'photo-polymers': 'photopolymers',
    '3d-consumables': 'consumables',
    'post-obrabotka': 'post_processing',
    'post-processing': 'post_processing',
    'sinterising': 'sinterising',
    'zirkon': 'zirkon',
    'compressors': 'equipment'
};

// Обратный маппинг для определения категории по странице
const PAGE_TO_CATEGORY = {};
Object.keys(CATEGORY_MAPPING).forEach(page => {
    PAGE_TO_CATEGORY[page] = CATEGORY_MAPPING[page];
});

let currentProduct = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Ждем инициализации Firebase
    waitForFirebase().then(() => {
        // Определяем категорию по текущей странице
        const category = getCurrentCategory();
        if (category) {
            loadProductsFromFirebase(category);
        } else {
            showError('Не удалось определить категорию товаров для этой страницы');
        }
    }).catch(error => {
        console.error('Ошибка инициализации Firebase:', error);
        showError('Ошибка подключения к базе данных');
    });
    
    updateCartCount();
    setupEventListeners();
});

// Функция ожидания инициализации Firebase
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

/**
 * Определяет категорию товаров по текущей странице
 */
function getCurrentCategory() {
    // Если категория задана явно через window.CATALOG_CATEGORY, используем её
    if (window.CATALOG_CATEGORY) {
        return window.CATALOG_CATEGORY;
    }
    
    const pageId = window.location.pathname
        .split('/')
        .pop()
        .replace('.html', '');
    
    return PAGE_TO_CATEGORY[pageId] || null;
}

/**
 * Загружает товары из Firebase по категории
 */
async function loadProductsFromFirebase(category) {
    const container = document.getElementById('products-container');
    container.innerHTML = '<div class="loading">Загружаем каталог товаров...</div>';
    
    try {
        // Проверяем, что Firebase инициализирован
        if (!window.firebaseServices || !window.firebaseServices.db) {
            throw new Error('Firebase не инициализирован');
        }
        
        const db = window.firebaseServices.db;
        
        // Загружаем товары по категории
        const snapshot = await db.collection('products')
            .where('category', '==', category)
            .get();
        
        if (snapshot.empty) {
            showError('Товары в данной категории не найдены');
            return;
        }
        
        const products = [];
        snapshot.forEach(doc => {
            const productData = doc.data();
            products.push({
                id: productData.id || doc.id, // Используем id из данных или doc.id как fallback
                ...productData
            });
        });
        
        // Сортируем товары по названию на стороне клиента
        products.sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB, 'ru');
        });
        
        console.log(`Загружено ${products.length} товаров категории ${category}`);
        renderProducts(products);
        
    } catch (error) {
        console.error('Ошибка загрузки товаров из Firebase:', error);
        showError('Не удалось загрузить товары. Пожалуйста, попробуйте позже.');
    }
}

/**
 * Отображает товары на странице
 */
function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';
    
    if (products.length === 0) {
        showError('Нет товаров для отображения');
        return;
    }
    
    products.forEach(product => {
        const card = createProductCard(product);
        container.appendChild(card);
    });
}

/**
 * Создает карточку товара
 */
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-product-id', product.id);
    
    // Формируем HTML для цены
    let priceHtml = '';
    const price = parseFloat(product.price) || 0;
    const promoPrice = parseFloat(product.price_skidka) || 0;
    
    if (price > 0) {
        const formattedPrice = price.toLocaleString('ru-RU') + ' ₽';
        
        if (promoPrice > 0) {
            const formattedPromoPrice = promoPrice.toLocaleString('ru-RU') + ' ₽';
            priceHtml = `
                <div class="product-price">
                    <span class="product-old-price">${formattedPrice}</span>
                    ${formattedPromoPrice}
                </div>
            `;
        } else {
            priceHtml = `<div class="product-price">${formattedPrice}</div>`;
        }
    } else {
        priceHtml = '<div class="product-price">Цена по запросу</div>';
    }
    
    // Формируем HTML для изображения с контейнером
    let imageHtml = '';
    if (product.img_url && product.img_url.trim() !== '') {
        imageHtml = `
            <div class="product-image-wrapper">
                <img src="${product.img_url}" alt="${product.name}" class="product-thumbnail" loading="lazy" 
                     onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div class=\\'no-image\\'>Нет фото</div>';">
            </div>
        `;
    } else {
        imageHtml = `
            <div class="product-image-wrapper">
                <div class="no-image">Нет фото</div>
            </div>
        `;
    }
    
    card.innerHTML = `
        ${imageHtml}
        <div class="product-info">
            <div class="product-name">${product.name}</div>
            ${priceHtml}
        </div>
    `;
    
    // Добавляем обработчик клика
    card.addEventListener('click', function() {
        currentProduct = product;
        openProductModal(product);
    });
    
    return card;
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
        openProductModalFallback(product);
    }
}

/**
 * Fallback функция для открытия модального окна (если PromotionsManager недоступен)
 */
function openProductModalFallback(product) {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    
    // Заполняем основную информацию
    document.getElementById('modal-product-name').textContent = product.name;
    
    // Код товара
    const productCodeElement = document.getElementById('modal-product-code');
    if (productCodeElement) {
        productCodeElement.textContent = `(Код товара: ${product.id})`;
    }
    
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
        
        // Добавляем обработчик клика для увеличения изображения
        productImage.onclick = function() {
            openImageModal(this.src, this.alt);
        };
    } else {
        productImage.style.display = 'none';
        productImage.parentElement.innerHTML = '<div class="no-image-modal">Изображение недоступно</div>';
    }
    
    // Бренд
    const brandElement = document.getElementById('modal-product-brand');
    if (brandElement) {
        const brand = extractBrandFromName(product.name);
        brandElement.textContent = brand ? `Бренд: ${brand}` : '';
    }
    
    // Цена товара
    const priceContainer = document.getElementById('modal-product-price');
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
    
    // Описание товара
    document.getElementById('modal-product-description').textContent = product.description || 'Описание отсутствует';
    
    // Характеристики товара
    renderProductSpecsFallback(product);
    
    // Похожие товары (заглушка)
    const similarProductsGrid = document.getElementById('similar-products-grid');
    if (similarProductsGrid) {
        similarProductsGrid.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Похожие товары загружаются...</div>';
    }
    
    // Настраиваем табы
    setupTabsFallback();
    
    // Сбрасываем количество на 1
    const quantityInput = document.getElementById('param-quantity');
    if (quantityInput) quantityInput.value = 1;
    
    // Сохраняем текущий товар
    window.currentProduct = product;
    
    // Показываем модальное окно
    modal.style.display = 'block';
}

/**
 * Извлекает бренд из названия товара
 */
function extractBrandFromName(productName) {
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
 * Рендерит характеристики товара (fallback версия)
 */
function renderProductSpecsFallback(product) {
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
 * Настраивает табы (fallback версия)
 */
function setupTabsFallback() {
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
 * Открывает модальное окно с увеличенным изображением
 */
function openImageModal(imageSrc, imageAlt) {
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
 * Добавляет товар в корзину
 */
function addToCart() {
    if (!currentProduct) return;
    
    const quantity = parseInt(document.getElementById('param-quantity').value) || 1;
    
    // Проверяем, есть ли уже такой товар в корзине
    const existingItemIndex = cart.findIndex(item => 
        item.product.id === currentProduct.id
    );
    
    if (existingItemIndex !== -1) {
        // Если товар уже есть в корзине, увеличиваем количество
        cart[existingItemIndex].quantity += quantity;
    } else {
        // Если товара нет в корзине, добавляем новый
        const cartItem = {
            product: currentProduct,
            quantity: quantity
        };
        cart.push(cartItem);
    }
    
    // Сохраняем корзину в localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Обновляем счетчик корзины
    updateCartCount();
    
    alert(`Товар "${currentProduct.name}" добавлен в корзину`);
    closeModal();
}

/**
 * Открывает модальное окно корзины
 */
function openCartModal() {
    renderCartItems();
    document.getElementById('cartModal').style.display = 'block';
}

/**
 * Отображает товары в корзине
 */
function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalContainer = document.getElementById('cart-total-price');
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart-message">Ваша корзина пуста</div>';
        totalContainer.textContent = '0 ₽';
        return;
    }
    
    container.innerHTML = '';
    let totalPrice = 0;
    
    cart.forEach((item, index) => {
        const promoPrice = parseFloat(item.product.price_skidka) || 0;
        const regularPrice = parseFloat(item.product.price) || 0;
        const price = promoPrice > 0 ? promoPrice : regularPrice;
        const itemPrice = price * item.quantity;
        totalPrice += itemPrice;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">
                ${item.product.img_url ? `<img src="${item.product.img_url}" alt="${item.product.name}">` : ''}
            </div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.product.name}</div>
                <div class="cart-item-price">${price.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-controls">
                    <button class="quantity-btn minus" data-index="${index}">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn plus" data-index="${index}">+</button>
                </div>
                <button class="remove-item" data-index="${index}">Удалить</button>
            </div>
        `;
        container.appendChild(cartItem);
    });
    
    // Обновляем общую сумму
    totalContainer.textContent = totalPrice.toLocaleString('ru-RU') + ' ₽';
    
    // Добавляем обработчики для кнопок
    document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            decreaseQuantity(index);
        });
    });
    
    document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            increaseQuantity(index);
        });
    });
    
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeFromCart(index);
        });
    });
}

/**
 * Уменьшает количество товара в корзине
 */
function decreaseQuantity(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
        updateCart();
    }
}

/**
 * Увеличивает количество товара в корзине
 */
function increaseQuantity(index) {
    cart[index].quantity++;
    updateCart();
}

/**
 * Удаляет товар из корзины
 */
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

/**
 * Обновляет корзину
 */
function updateCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCartItems();
    
    // Если корзина пуста, закрываем модальное окно
    if (cart.length === 0) {
        closeModal();
    }
}

/**
 * Обновляет счетчик товаров в корзине
 */
function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

/**
 * Оформление заказа
 */
function checkout() {
    if (cart.length === 0) {
        alert('Ваша корзина пуста');
        return;
    }
    
    alert('Функционал оформления заказа будет реализован позже');
}

/**
 * Показывает ошибку
 */
function showError(message) {
    const container = document.getElementById('products-container');
    container.innerHTML = `
        <div class="error">${message}</div>
        <button class="retry-button" onclick="location.reload()">Попробовать снова</button>
    `;
}

/**
 * Закрывает модальные окна
 */
function closeModal() {
    document.getElementById('productModal').style.display = 'none';
    document.getElementById('cartModal').style.display = 'none';
}

/**
 * Настраивает обработчики событий
 */
function setupEventListeners() {
    // Обработчики модальных окон
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = function() {
            closeModal();
        };
    });
    
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal();
        }
    };
    
    // Обработчики корзины
    document.querySelector('.add-to-cart').addEventListener('click', addToCart);
    document.getElementById('cart-button').addEventListener('click', openCartModal);
    document.getElementById('checkout-button').addEventListener('click', checkout);
}

// Экспортируем функции для глобального использования
window.catalogFirebase = {
    loadProductsFromFirebase,
    addToCart,
    openCartModal,
    checkout,
    closeModal
};
