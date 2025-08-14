const firebaseConfig = {
    apiKey: "someLazyKey",
    authDomain: "codent-7814d.firebaseapp.com",
    projectId: "codent-7814d",
    storageBucket: "codent-7814d.firebasestorage.app",
    messagingSenderId: "855160903983",
    appId: "1:855160903983:web:44401cc9d2ab5d79e0e9da"
  };
  
// Инициализация Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Инициализация сервисов
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Экспорт для использования
window.firebaseServices = { auth, db, storage };