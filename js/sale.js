/**
 * Система акций и скидок - загружает товары с непустым полем price_skidka
 * Основано на catalog-firebase.js с модификациями для отображения только товаров со скидками
 */

let currentProduct = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Ждем инициализации Firebase
    waitForFirebase().then(() => {
        loadSaleProductsFromFirebase();
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
 * Загружает товары со скидками из Firebase
 */
async function loadSaleProductsFromFirebase() {
    const container = document.getElementById('products-container');
    const noSalesMessage = document.getElementById('no-sales-message');
    
    container.innerHTML = '<div class="loading">Загружаем товары со скидками...</div>';
    noSalesMessage.style.display = 'none';
    
    try {
        // Проверяем, что Firebase инициализирован
        if (!window.firebaseServices || !window.firebaseServices.db) {
            throw new Error('Firebase не инициализирован');
        }
        
        const db = window.firebaseServices.db;
        
        // Загружаем все товары и фильтруем на стороне клиента
        // так как Firestore не поддерживает запросы "не равно null" напрямую
        const snapshot = await db.collection('products').get();
        
        if (snapshot.empty) {
            showNoSalesMessage();
            return;
        }
        
        const saleProducts = [];
        snapshot.forEach(doc => {
            const productData = doc.data();
            const priceSkidka = parseFloat(productData.price_skidka);
            
            // Добавляем товар только если у него есть скидочная цена больше 0
            if (priceSkidka && priceSkidka > 0) {
                saleProducts.push({
                    id: productData.id || doc.id,
                    ...productData
                });
            }
        });
        
        if (saleProducts.length === 0) {
            showNoSalesMessage();
            return;
        }
        
        // Сортируем товары по размеру скидки (больше скидка = выше в списке)
        saleProducts.sort((a, b) => {
            const discountA = calculateDiscountPercentage(a);
            const discountB = calculateDiscountPercentage(b);
            return discountB - discountA;
        });
        
        console.log(`Загружено ${saleProducts.length} товаров со скидками`);
        renderSaleProducts(saleProducts);
        
    } catch (error) {
        console.error('Ошибка загрузки товаров со скидками из Firebase:', error);
        showError('Не удалось загрузить товары со скидками. Пожалуйста, попробуйте позже.');
    }
}

/**
 * Вычисляет процент скидки для товара
 */
function calculateDiscountPercentage(product) {
    const originalPrice = parseFloat(product.price) || 0;
    const salePrice = parseFloat(product.price_skidka) || 0;
    
    if (originalPrice <= 0 || salePrice <= 0 || salePrice >= originalPrice) {
        return 0;
    }
    
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Отображает товары со скидками на странице
 */
function renderSaleProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';
    
    if (products.length === 0) {
        showNoSalesMessage();
        return;
    }
    
    products.forEach(product => {
        const card = createSaleProductCard(product);
        container.appendChild(card);
    });
}

/**
 * Создает карточку товара со скидкой
 */
function createSaleProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card sale-product-card';
    card.setAttribute('data-product-id', product.id);
    
    // Вычисляем процент скидки
    const discountPercentage = calculateDiscountPercentage(product);
    
    // Формируем HTML для цены
    const originalPrice = parseFloat(product.price) || 0;
    const salePrice = parseFloat(product.price_skidka) || 0;
    
    let priceHtml = '';
    if (originalPrice > 0 && salePrice > 0) {
        const formattedOriginalPrice = originalPrice.toLocaleString('ru-RU') + ' ₽';
        const formattedSalePrice = salePrice.toLocaleString('ru-RU') + ' ₽';
        
        priceHtml = `
            <div class="product-price sale-price">
                <span class="product-old-price">${formattedOriginalPrice}</span>
                <span class="product-new-price">${formattedSalePrice}</span>
            </div>
        `;
    } else if (salePrice > 0) {
        const formattedSalePrice = salePrice.toLocaleString('ru-RU') + ' ₽';
        priceHtml = `<div class="product-price sale-price">${formattedSalePrice}</div>`;
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
                ${discountPercentage > 0 ? `<div class="discount-badge">-${discountPercentage}%</div>` : ''}
            </div>
        `;
    } else {
        imageHtml = `
            <div class="product-image-wrapper">
                <div class="no-image">Нет фото</div>
                ${discountPercentage > 0 ? `<div class="discount-badge">-${discountPercentage}%</div>` : ''}
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
 * Показывает сообщение об отсутствии товаров со скидками
 */
function showNoSalesMessage() {
    const container = document.getElementById('products-container');
    const noSalesMessage = document.getElementById('no-sales-message');
    
    container.innerHTML = '';
    noSalesMessage.style.display = 'block';
}

/**
 * Открывает модальное окно с детальной информацией о товаре
 */
function openProductModal(product) {
    const modal = document.getElementById('productModal');
    
    // Заполняем данные товара
    document.getElementById('modal-product-name').textContent = product.name;
    
    // Изображение товара
    const productImage = document.getElementById('modal-product-image');
    if (product.img_url) {
        productImage.src = product.img_url;
        productImage.alt = product.name;
        productImage.style.display = 'block';
    } else {
        productImage.style.display = 'none';
    }
    
    // Цена товара с акцентом на скидку
    const priceContainer = document.getElementById('modal-product-price');
    const originalPrice = parseFloat(product.price) || 0;
    const salePrice = parseFloat(product.price_skidka) || 0;
    const discountPercentage = calculateDiscountPercentage(product);
    
    if (originalPrice > 0 && salePrice > 0) {
        const formattedOriginalPrice = originalPrice.toLocaleString('ru-RU') + ' ₽';
        const formattedSalePrice = salePrice.toLocaleString('ru-RU') + ' ₽';
        
        priceContainer.innerHTML = `
            <div class="product-price sale-price-modal">
                <div class="discount-info">
                    <span class="discount-percentage">Скидка ${discountPercentage}%</span>
                    <span class="savings">Экономия: ${(originalPrice - salePrice).toLocaleString('ru-RU')} ₽</span>
                </div>
                <div class="price-comparison">
                    <span class="product-old-price">${formattedOriginalPrice}</span>
                    <span class="product-new-price">${formattedSalePrice}</span>
                </div>
            </div>
        `;
    } else if (salePrice > 0) {
        const formattedSalePrice = salePrice.toLocaleString('ru-RU') + ' ₽';
        priceContainer.innerHTML = `<div class="product-price sale-price-modal">${formattedSalePrice}</div>`;
    } else {
        priceContainer.innerHTML = '<div class="product-price">Цена по запросу</div>';
    }
    
    // Описание товара
    document.getElementById('modal-product-description').textContent = product.description || 'Описание отсутствует';
    
    // Характеристики товара
    const specsContainer = document.getElementById('modal-product-specs');
    specsContainer.innerHTML = '';
    
    if (product.characteristics && product.characteristics.trim() !== '') {
        // Парсим характеристики из текста
        const characteristics = product.characteristics.split('\n').filter(line => line.trim() !== '');
        
        characteristics.forEach(characteristic => {
            const specItem = document.createElement('div');
            specItem.className = 'spec-item';
            
            // Пытаемся разделить на название и значение по двоеточию
            const colonIndex = characteristic.indexOf(':');
            if (colonIndex > 0) {
                const specName = characteristic.substring(0, colonIndex).trim();
                const specValue = characteristic.substring(colonIndex + 1).trim();
                specItem.innerHTML = `
                    <div class="spec-name">${specName}:</div>
                    <div class="spec-value">${specValue}</div>
                `;
            } else {
                // Если нет двоеточия, выводим как есть
                specItem.innerHTML = `
                    <div class="spec-value">${characteristic}</div>
                `;
            }
            
            specsContainer.appendChild(specItem);
        });
    }
    
    // Сбрасываем количество на 1
    document.getElementById('param-quantity').value = 1;
    
    modal.style.display = 'block';
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
    
    alert(`Товар "${currentProduct.name}" добавлен в корзину по акционной цене!`);
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
                ${promoPrice > 0 ? '<div class="cart-item-sale-label">🔥 По акции</div>' : ''}
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
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }
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
    const noSalesMessage = document.getElementById('no-sales-message');
    
    container.innerHTML = `
        <div class="error">${message}</div>
        <button class="retry-button" onclick="location.reload()">Попробовать снова</button>
    `;
    noSalesMessage.style.display = 'none';
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
    const addToCartBtn = document.querySelector('.add-to-cart');
    const cartButton = document.getElementById('cart-button');
    const checkoutButton = document.getElementById('checkout-button');
    
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', addToCart);
    }
    
    if (cartButton) {
        cartButton.addEventListener('click', openCartModal);
    }
    
    if (checkoutButton) {
        checkoutButton.addEventListener('click', checkout);
    }
}

// Экспортируем функции для глобального использования
window.saleSystem = {
    loadSaleProductsFromFirebase,
    addToCart,
    openCartModal,
    checkout,
    closeModal
};


