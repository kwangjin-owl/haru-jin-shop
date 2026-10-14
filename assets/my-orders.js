/* ===========================================================
   진 빠지는 하루 — 마이페이지의 「내 주문」
   - orders 컬렉션에서 userId 가 로그인한 사람의 UID 와 같은 주문만 onSnapshot 으로 듣는다
   - 쿼리에는 where 만 있고 정렬(orderBy)은 없다 - 최신순은 받은 뒤 화면에서 정렬한다
   - Firebase 앱은 auth.js 가 만든 것을 그대로 쓴다 (설정과 버전 같음)
   =========================================================== */
import { app } from "./auth.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, collection, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const db = getFirestore(app);
const auth = getAuth(app);

const box = document.querySelector("#my-orders");
// 리스너는 한 번만 건다
let listening = false;

// 주문한 날 - 서버 시각이 아직 안 채워진 순간(방금 쓴 주문)은 지금 시각으로 본다
function orderedAt(data) {
  return data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : new Date();
}

function paint(snap) {
  // 최신순 정렬은 쿼리가 아니라 여기서 한다
  const rows = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => orderedAt(b) - orderedAt(a));

  if (rows.length === 0) {
    box.innerHTML = '<p class="empty">주문한 내역이 없습니다.</p>';
    return;
  }

  const table = document.createElement("table");
  table.className = "cart";
  const head = table.insertRow();
  ["주문한 날", "상품", "합계", "상태"].forEach(t => {
    const th = document.createElement("th");
    th.textContent = t;
    head.append(th);
  });
  rows.forEach(r => {
    const tr = table.insertRow();
    const names = Array.isArray(r.items) ? r.items.map(i => i.name).join(", ") : "";
    [
      orderedAt(r).toLocaleDateString("ko-KR"),
      names,
      Number(r.totalPrice).toLocaleString("ko-KR") + "원",
      // status 는 저장된 값 그대로
      String(r.status)
    ].forEach(t => { tr.insertCell().textContent = t; });
  });
  box.replaceChildren(table);
}

async function start() {
  if (!box || listening) return;
  // 로그인한 사람이 누구인지 확인된 뒤에 듣기 시작한다
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return;
  listening = true;

  onSnapshot(
    query(collection(db, "orders"), where("userId", "==", user.uid)),
    (snap) => {
      console.log("[주문 알림] 주문 " + snap.size + "건, 바뀐 문서 " + snap.docChanges().length + "건");
      paint(snap);
    },
    (err) => {
      console.error(err);
      box.textContent = (err.code ? err.code + " — " : "") + err.message;
    }
  );
}

start();
