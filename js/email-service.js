// Получаем EmailJS конфигурацию из api-keys.js
function getEmailConfig() {
    if (typeof window.getEmailJSConfig === 'undefined') {
        console.error('API ключи не загружены. Убедитесь, что api-keys.js подключен.');
        return null;
    }
    return window.getEmailJSConfig();
}

// Инициализация EmailJS
function initializeEmailJS() {
    const emailConfig = getEmailConfig();
    if (!emailConfig) {
        return false;
    }
    
    if (typeof emailjs !== 'undefined') {
        emailjs.init(emailConfig.publicKey);
        console.log('EmailJS инициализирован');
        return true;
    } else {
        console.error('EmailJS не загружен');
        return false;
    }
}

// Отправка письма через EmailJS
async function sendSupportEmail(formData) {
    try {
        if (!initializeEmailJS()) {
            throw new Error('EmailJS не инициализирован');
        }

        const emailConfig = getEmailConfig();
        if (!emailConfig) {
            throw new Error('Конфигурация EmailJS недоступна');
        }

        // Подготавливаем данные для отправки
        const templateParams = {
            to_email: emailConfig.recipientEmail,
            from_name: formData.name,
            from_email: formData.email,
            phone: formData.phone,
            warranty: formData.warranty || 'Не указан',
            issue: formData.issue,
            timestamp: new Date().toLocaleString('ru-RU')
        };

        // Отправляем письмо
        const response = await emailjs.send(
            emailConfig.serviceId,
            emailConfig.templateId,
            templateParams
        );

        console.log('Письмо отправлено:', response);
        return {
            success: true,
            message: 'Ваш запрос успешно отправлен! Мы свяжемся с вами в ближайшее время.'
        };

    } catch (error) {
        console.error('Ошибка отправки письма:', error);
        return {
            success: false,
            message: 'Ошибка при отправке письма. Попробуйте позже или свяжитесь с нами по телефону.'
        };
    }
}

// Альтернативный метод через fetch к mail.php
async function sendSupportEmailPHP(formData) {
    try {
        const response = await fetch('mail.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Ошибка сети');
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Ошибка отправки через PHP:', error);
        return {
            success: false,
            message: 'Ошибка при отправке письма. Попробуйте позже или свяжитесь с нами по телефону.'
        };
    }
}

// Основная функция отправки (автоматически выбирает лучший метод)
async function sendSupportRequest(formData) {
    // Сначала пробуем EmailJS
    if (typeof emailjs !== 'undefined') {
        return await sendSupportEmail(formData);
    }
    
    // Если EmailJS недоступен, используем PHP
    return await sendSupportEmailPHP(formData);
}

// Экспортируем функции для использования
window.EmailService = {
    sendSupportRequest,
    sendSupportEmail,
    sendSupportEmailPHP,
    initializeEmailJS
};
