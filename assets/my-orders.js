/* ===========================================================
   진 빠지는 하루 — 마이페이지의 「내 주문」
   - orders 컬렉션에서 userId 가 로그인한 사람의 UID 와 같은 주문만 onSnapshot 으로 듣는다
   - 쿼리에는 where 만 있고 정렬(orderBy)은 없다 - 최신순은 받은 뒤 화면에서 정렬한다
   - Firebase 앱은 auth.js 가 만든 것을 그대로 쓴다 (설정과 버전 같음)
   =========================================================== */
import { app } from "./auth.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, collection, query, where, onSnapshot, getDocs
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

// status 값 -> 손님이 읽는 말과 단계 번호(0 이면 단계 줄에 넣지 않는다)
// 저장된 값은 바꾸지 않고, 화면에 보여 주는 말만 바꾼다
const STATUS = {
  paid:      { label: "결제 완료",   step: 1 },
  preparing: { label: "상품 준비 중", step: 2 },
  shipped:   { label: "배송 중",     step: 3 },
  delivered: { label: "배송 완료",   step: 4 },
  canceled:  { label: "주문 취소",   step: 0 }
};
// 단계 줄에 적는 말 - 위 표의 1~4단계 순서와 같다
const STEP_LABELS = ["결제 완료", "상품 준비 중", "배송 중", "배송 완료"];
// 다섯 값이 아닌 값은 이렇게 보여 준다
const UNKNOWN_LABEL = "확인 중";

// 네 단계 줄 - 지금 단계까지는 채우고, 지금 단계는 눈에 띄게 표시한다
function stepsLine(step) {
  const ol = document.createElement("ol");
  ol.className = "steps";
  STEP_LABELS.forEach((text, i) => {
    const li = document.createElement("li");
    li.textContent = text;
    if (i + 1 < step) li.className = "done";
    if (i + 1 === step) { li.className = "now"; li.setAttribute("aria-current", "step"); }
    ol.append(li);
  });
  return ol;
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
    // 표에 없는 값(영어 값 포함)은 「확인 중」으로 보여 준다
    const known = Object.hasOwn(STATUS, r.status) ? STATUS[r.status] : null;
    [
      orderedAt(r).toLocaleDateString("ko-KR"),
      names,
      Number(r.totalPrice).toLocaleString("ko-KR") + "원",
      known ? known.label : UNKNOWN_LABEL
    ].forEach(t => { tr.insertCell().textContent = t; });
    // 단계 줄은 1~4단계 주문에만 - 주문 취소와 확인 중에는 말만 보여 준다
    if (known && known.step > 0) {
      const cell = table.insertRow().insertCell();
      cell.colSpan = 4;
      cell.className = "steps-cell";
      cell.append(stepsLine(known.step));
    }
  });
  box.replaceChildren(table);
}

// 내 주문만 고르는 쿼리 - 듣기와 「다시 확인」이 같은 것을 쓴다
const myOrdersQuery = (uid) => query(collection(db, "orders"), where("userId", "==", uid));

// 주문이 있고 전부 delivered 또는 canceled 이면 더 바뀔 일이 없다
// (하나라도 paid · preparing · shipped 등 다른 값이면 계속 듣는다)
const isAllDone = (snap) => snap.size > 0 &&
  snap.docs.every(d => d.data().status === "delivered" || d.data().status === "canceled");

// 듣기를 멈춘 뒤 목록 아래에 붙는 줄 - 멈춤 안내(모두 끝났을 때)와 「다시 확인」 버튼
// 이 줄은 리스너가 해제된 뒤에만 만들어지므로, 듣는 동안에는 버튼이 보이지 않는다
function appendStoppedRow(user, withNote) {
  const row = document.createElement("div");
  row.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:14px 0 0";
  if (withNote) {
    const note = document.createElement("p");
    note.className = "lead";
    note.style.margin = "0";
    note.textContent = "모든 주문이 끝나 실시간 확인을 멈췄습니다. 새로 고치면 다시 확인합니다.";
    row.append(note);
  }
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn ghost";
  btn.textContent = "다시 확인";
  const msg = document.createElement("span");
  msg.className = "lead";
  msg.style.margin = "0";
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    msg.textContent = "";
    try {
      // getDocs 로 한 번만 읽어 와 다시 그린다 - 리스너는 다시 걸지 않는다
      const snap = await getDocs(myOrdersQuery(user.uid));
      paint(snap);
      appendStoppedRow(user, isAllDone(snap));
    } catch (err) {
      console.error(err);
      msg.textContent = (err.code ? err.code + " — " : "") + err.message;
      btn.disabled = false;
    }
  });
  row.append(btn, msg);
  box.append(row);
}

async function start() {
  if (!box || listening) return;
  // 로그인한 사람이 누구인지 확인된 뒤에 듣기 시작한다
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return;
  listening = true;

  // onSnapshot 이 돌려주는 함수를 받아 두었다가, 더 바뀔 일이 없으면 불러서 듣기를 그만둔다
  const unsubscribe = onSnapshot(
    myOrdersQuery(user.uid),
    (snap) => {
      console.log("[주문 알림] 주문 " + snap.size + "건, 바뀐 문서 " + snap.docChanges().length + "건");
      paint(snap);

      if (isAllDone(snap)) {
        unsubscribe();
        console.log("[그만 듣기] 모든 주문이 delivered 또는 canceled 라서 내 주문 듣기를 멈췄습니다 (주문 " + snap.size + "건)");
        // 멈춤 안내 옆에 「다시 확인」 버튼을 보여 준다
        appendStoppedRow(user, true);
      }
    },
    (err) => {
      console.error(err);
      box.textContent = (err.code ? err.code + " — " : "") + err.message;
    }
  );
}

start();
