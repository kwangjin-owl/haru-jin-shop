/* ===========================================================
   진 빠지는 하루 — 웹 푸시 알림을 받는 서비스 워커
   - 가게 화면(assets/auth.js)과 같은 Firebase 버전 · 같은 설정으로 연결한다
   - 지금은 알림을 받을 준비까지만 해 둔다
   =========================================================== */
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDgF1bZEceFceNmKJiQL1jmG31HIm-bOwA",
  authDomain: "haru-jin-shop.firebaseapp.com",
  projectId: "haru-jin-shop",
  storageBucket: "haru-jin-shop.firebasestorage.app",
  messagingSenderId: "405082377069",
  appId: "1:405082377069:web:50b28f8cf84308faa02864"
});

// 알림 받을 준비
const messaging = firebase.messaging();
