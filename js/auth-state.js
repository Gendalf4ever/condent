// Глобальное управление состоянием авторизации
// Проверяем, не загружен ли уже класс
if (typeof window.AuthStateManager !== 'undefined') {
    console.log('AuthStateManager уже загружен, пропускаем повторную инициализацию');
} else {

class AuthStateManager {
    constructor() {
        this.currentUser = null;
        this.auth = null;
        this.db = null;
        this.init();
    }

    async init() {
        // Ждем инициализации Firebase
        await this.waitForFirebase();
        
        // Слушаем изменения состояния авторизации
        this.checkAuthState();
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
        this.auth.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            
            if (user) {
                // Сохраняем базовую информацию о пользователе в localStorage
                const userInfo = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    timestamp: Date.now()
                };
                localStorage.setItem('codent_user_info', JSON.stringify(userInfo));
            } else {
                // Удаляем информацию при выходе
                localStorage.removeItem('codent_user_info');
                localStorage.removeItem('codent_user_profile');
            }
            
            await this.updateProfileButton();
        });
    }

    async updateProfileButton() {
        const profileBtn = document.getElementById('profile-btn');
        const profileText = document.querySelector('.profile-text');
        
        if (!profileBtn || !profileText) {
            // Если кнопки еще нет, попробуем позже
            setTimeout(() => this.updateProfileButton(), 500);
            return;
        }

        if (this.currentUser) {
            try {
                let displayName = this.currentUser.displayName;
                
                // Проверяем кеш профиля
                const cachedProfile = localStorage.getItem('codent_user_profile');
                if (cachedProfile) {
                    const profileData = JSON.parse(cachedProfile);
                    // Используем кеш если он не старше 5 минут
                    if (Date.now() - profileData.timestamp < 5 * 60 * 1000) {
                        displayName = profileData.name || displayName;
                    }
                }
                
                // Если нет кеша или он устарел, загружаем из Firestore
                if (!cachedProfile || Date.now() - JSON.parse(cachedProfile).timestamp >= 5 * 60 * 1000) {
                    try {
                        const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            displayName = userData.name || displayName;
                            
                            // Сохраняем в кеш
                            localStorage.setItem('codent_user_profile', JSON.stringify({
                                name: userData.name,
                                timestamp: Date.now()
                            }));
                        }
                    } catch (firestoreError) {
                        console.log('Не удалось загрузить данные из Firestore, используем кеш или базовые данные');
                    }
                }
                
                // Обрезаем длинные имена
                if (displayName && displayName.length > 15) {
                    displayName = displayName.substring(0, 15) + '...';
                }
                
                profileText.textContent = displayName || 'Профиль';
                profileBtn.title = 'Личный кабинет';
                
                // Добавляем класс для авторизованного пользователя
                profileBtn.classList.add('authenticated');
                
            } catch (error) {
                console.log('Ошибка обновления кнопки профиля:', error);
                profileText.textContent = this.currentUser.email?.split('@')[0] || 'Профиль';
                profileBtn.title = 'Личный кабинет';
                profileBtn.classList.add('authenticated');
            }
        } else {
            profileText.textContent = 'Войти';
            profileBtn.title = 'Войти в личный кабинет';
            profileBtn.classList.remove('authenticated');
        }
    }

    // Метод для принудительного обновления кнопки (для использования в profile.js)
    async forceUpdateProfileButton() {
        await this.updateProfileButton();
    }

    // Получить текущего пользователя
    getCurrentUser() {
        return this.currentUser;
    }

    // Проверить, авторизован ли пользователь
    isAuthenticated() {
        return !!this.currentUser;
    }
}

// Создаем глобальный экземпляр
let authStateManager;

document.addEventListener('DOMContentLoaded', () => {
    authStateManager = new AuthStateManager();
});

// Функция для быстрого обновления кнопки без Firebase (использует только localStorage)
function quickUpdateProfileButton() {
    const profileBtn = document.getElementById('profile-btn');
    const profileText = document.querySelector('.profile-text');
    
    if (!profileBtn || !profileText) {
        return false;
    }
    
    // Проверяем localStorage на наличие информации о пользователе
    const userInfo = localStorage.getItem('codent_user_info');
    const userProfile = localStorage.getItem('codent_user_profile');
    
    if (userInfo) {
        try {
            const user = JSON.parse(userInfo);
            let displayName = user.displayName;
            
            // Используем данные профиля если есть
            if (userProfile) {
                const profile = JSON.parse(userProfile);
                displayName = profile.name || displayName;
            }
            
            // Fallback на email если нет имени
            if (!displayName && user.email) {
                displayName = user.email.split('@')[0];
            }
            
            // Обрезаем длинные имена
            if (displayName && displayName.length > 15) {
                displayName = displayName.substring(0, 15) + '...';
            }
            
            profileText.textContent = displayName || 'Профиль';
            profileBtn.title = 'Личный кабинет';
            profileBtn.classList.add('authenticated');
            
            return true;
        } catch (error) {
            console.log('Ошибка парсинга данных пользователя из localStorage');
        }
    }
    
    // Если нет данных пользователя
    profileText.textContent = 'Войти';
    profileBtn.title = 'Войти в личный кабинет';
    profileBtn.classList.remove('authenticated');
    
    return false;
}

// Экспортируем для использования в других скриптах
window.AuthStateManager = AuthStateManager;
window.getAuthStateManager = () => authStateManager;
window.quickUpdateProfileButton = quickUpdateProfileButton;

} // Закрываем проверку на повторную загрузку
