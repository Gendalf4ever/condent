// Функция инициализации Firebase
function initializeFirebase() {
    // Проверяем, что Firebase загружен
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK не загружен');
        return false;
    }

    // Проверяем, что API ключи загружены
    if (typeof window.getFirebaseConfig === 'undefined') {
        console.error('API ключи не загружены. Убедитесь, что api-keys.js подключен.');
        return false;
    }

    // Получаем конфигурацию из api-keys.js
    const firebaseConfig = window.getFirebaseConfig();

    try {
        // Инициализация Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        // Получаем сервисы
        const auth = firebase.auth();
        const db = firebase.firestore();
        const storage = firebase.storage(); 
        
        // Экспорт для использования
        window.firebaseServices = { 
            auth: auth,
            db: db,
            storage: storage
        };
        
        console.log('Firebase успешно инициализирован');
        return true;
        
    } catch (error) {
        console.error('Ошибка инициализации Firebase:', error);
        return false;
    }
}

// Инициализируем Firebase при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Ждем немного, чтобы все скрипты загрузились
    setTimeout(() => {
        initializeFirebase();
    }, 100);
});
