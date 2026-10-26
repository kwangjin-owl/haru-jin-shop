/* ===========================================================
   진 빠지는 하루 — 알림 받는 주소(FCM 토큰)를 받아 Firestore 에 적는다
   - 알림 권한이 granted 이고 로그인한 사람일 때만 받는다
   - pushTokens/{UID} 한 장에 token 과 updatedAt(서버 시각) 두 필드만 적는다
   - 토큰 값은 화면에도 Console 에도 찍지 않는다
   =========================================================== */
import { app } from "./auth.js";
import { getMessaging, getToken, isSupported } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const VAPID_KEY = "BLi_7I5ssVNH2rD73Fj7cMltKRHtfzr0X7M2thmVaWW0wcOqdwSWFsQw141qivxB6BqT2stQZswDci1gg8feLpk";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// force 가 true 이면 적어 둔 값과 상관없이 다시 쓴다 (「알림 받기」를 누른 바로 그 자리)
export async function syncPushToken(user, force) {
  try {
    if (!user || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission !== "granted") return;
    if (!(await isSupported())) return;

    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return;

    // auth.js 와 서로 불러 쓰므로 app 은 함수가 불릴 때 처음 쓴다
    const ref = doc(getFirestore(app),"pushTokens", user.uid);
    if (!force) {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        const at = d.updatedAt && d.updatedAt.toMillis ? d.updatedAt.toMillis() : 0;
        // 같은 토큰이고 30일 안이면 다시 쓰지 않는다
        if (d.token === token && Date.now() - at < THIRTY_DAYS) return;
      }
    }
    // 문서가 있으면 이 두 필드만 고치고, 없으면 새로 만든다
    await setDoc(ref, { token: token, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.error("알림 주소 저장 실패: " + ((err && (err.code || err.name)) || "unknown"));
  }
}
