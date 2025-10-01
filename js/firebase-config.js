// Функция инициализации Firebase
function initializeFirebase() {
    // Проверяем, что Firebase загружен
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK не загружен');
        return false;
    }

    // Конфигурация
    const firebaseConfig = {
        apiKey: "",
        authDomain: "codent-7814d.firebaseapp.com",
        projectId: "codent-7814d",
        storageBucket: "codent-7814d.firebasestorage.app",
        messagingSenderId: "855160903983",
        appId: "1:855160903983:web:44401cc9d2ab5d79e0e9da"
    };

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
