<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Проверяем метод запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Метод не разрешен']);
    exit;
}

// Получаем данные из формы
$name = isset($_POST['name']) ? trim($_POST['name']) : '';
$phone = isset($_POST['phone']) ? trim($_POST['phone']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$warranty = isset($_POST['warranty']) ? trim($_POST['warranty']) : '';
$issue = isset($_POST['issue']) ? trim($_POST['issue']) : '';

// Проверяем обязательные поля
if (empty($name) || empty($phone) || empty($email) || empty($issue)) {
    echo json_encode(['success' => false, 'message' => 'Заполните все обязательные поля']);
    exit;
}

// Валидация email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Некорректный email адрес']);
    exit;
}

// Настройки для отправки email
$to = 'chelovek438@gmail.com';
$subject = 'Запрос технической поддержки - CODENT';

// Формируем содержимое письма
$message = "
<html>
<head>
    <meta charset='UTF-8'>
    <title>Запрос технической поддержки</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f8f9fa; padding: 20px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #2c3e50; }
        .value { margin-top: 5px; padding: 10px; background-color: white; border-left: 4px solid #3498db; }
        .footer { background-color: #34495e; color: white; padding: 15px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2>🔧 Запрос технической поддержки</h2>
            <p>CODENT.PRO</p>
        </div>
        
        <div class='content'>
            <div class='field'>
                <div class='label'>👤 Имя и фамилия:</div>
                <div class='value'>" . htmlspecialchars($name) . "</div>
            </div>
            
            <div class='field'>
                <div class='label'>📞 Телефон:</div>
                <div class='value'>" . htmlspecialchars($phone) . "</div>
            </div>
            
            <div class='field'>
                <div class='label'>📧 Email:</div>
                <div class='value'>" . htmlspecialchars($email) . "</div>
            </div>
            
            <div class='field'>
                <div class='label'>🔍 Гарантийный код:</div>
                <div class='value'>" . ($warranty ? htmlspecialchars($warranty) : 'Не указан') . "</div>
            </div>
            
            <div class='field'>
                <div class='label'>📝 Описание проблемы:</div>
                <div class='value'>" . nl2br(htmlspecialchars($issue)) . "</div>
            </div>
            
            <div class='field'>
                <div class='label'>📎 Прикрепленные файлы:</div>
                <div class='value'>";

// Обработка прикрепленных файлов
if (isset($_FILES['attachments']) && !empty($_FILES['attachments']['name'][0])) {
    $fileCount = count($_FILES['attachments']['name']);
    $message .= "Прикреплено файлов: " . $fileCount . "<br>";
    
    for ($i = 0; $i < $fileCount; $i++) {
        if ($_FILES['attachments']['error'][$i] === UPLOAD_ERR_OK) {
            $fileName = $_FILES['attachments']['name'][$i];
            $fileSize = $_FILES['attachments']['size'][$i];
            $fileType = $_FILES['attachments']['type'][$i];
            
            $message .= "• " . htmlspecialchars($fileName) . " (" . formatFileSize($fileSize) . ", " . $fileType . ")<br>";
        }
    }
} else {
    $message .= "Файлы не прикреплены";
}

$message .= "
                </div>
            </div>
            
            <div class='field'>
                <div class='label'>🕒 Время отправки:</div>
                <div class='value'>" . date('d.m.Y H:i:s') . "</div>
            </div>
        </div>
        
        <div class='footer'>
            <p>Это сообщение отправлено автоматически с сайта CODENT.PRO</p>
            <p>Не отвечайте на это письмо напрямую</p>
        </div>
    </div>
</body>
</html>
";

// Настройки для отправки HTML письма
$headers = [
    'MIME-Version: 1.0',
    'Content-type: text/html; charset=UTF-8',
    'From: CODENT Support <noreply@codent.pro>',
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . phpversion(),
    'X-Priority: 3'
];

// Отправляем письмо
$mailSent = mail($to, $subject, $message, implode("\r\n", $headers));

if ($mailSent) {
    // Логируем успешную отправку
    $logMessage = date('Y-m-d H:i:s') . " - Запрос поддержки отправлен: " . $name . " (" . $email . ")\n";
    file_put_contents('support_requests.log', $logMessage, FILE_APPEND | LOCK_EX);
    
    echo json_encode([
        'success' => true, 
        'message' => 'Ваш запрос успешно отправлен! Мы свяжемся с вами в ближайшее время.'
    ]);
} else {
    echo json_encode([
        'success' => false, 
        'message' => 'Ошибка при отправке письма. Попробуйте позже или свяжитесь с нами по телефону.'
    ]);
}

// Функция для форматирования размера файла
function formatFileSize($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' bytes';
    }
}
?>
