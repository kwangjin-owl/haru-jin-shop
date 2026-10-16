/* ===========================================================
   진 빠지는 하루 — 규칙 확인 화면 (주소를 직접 넣어서 여는 화면)
   - 버튼을 눌러 보안 규칙이 무엇을 허용하는지 확인한다
   - 성공하면 받은 내용이나 바꾼 문서 ID 를, 실패하면 오류 글을 줄이지 않고 그대로 보여 준다
   - Firebase 앱은 auth.js 가 만든 것을 그대로 씁니다 (설정과 버전 같음)
   =========================================================== */
import { app } from "./auth.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, collection, query, where, limit, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// 오류 글을 줄이지 않고 그대로 보여 주기 위한 글
const errorText = (err) => (err && err.code ? err.code + " — " : "") + (err && err.message ? err.message : String(err));

onAuthStateChanged(auth, (user) => {
  document.querySelector("#rules-uid").textContent = user ? user.uid : "";
});

// 버튼 하나의 일을 하고, 결과를 그 버튼 아래 칸에 보여 준다 - 실패해도 화면이 멈추지 않는다
function setup(buttonId, resultId, job) {
  const btn = document.querySelector(buttonId);
  const out = document.querySelector(resultId);
  btn.addEventListener("click", async () => {
    out.replaceChildren();
    out.textContent = "처리 중입니다…";
    btn.disabled = true;
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("로그인한 사람이 없습니다");
      out.replaceChildren();
      await job(user, out);
    } catch (err) {
      out.replaceChildren();
      out.textContent = "실패: " + errorText(err);
    }
    btn.disabled = false;
  });
}

const line = (out, text) => { const p = document.createElement("p"); p.textContent = text; out.append(p); };

// 주문 전체 읽기 - orders 를 조건 없이 한 번 읽는다
setup("#btn-read-orders", "#result-read-orders", async (user, out) => {
  const snap = await getDocs(collection(db, "orders"));
  const others = snap.docs.filter(d => d.data().userId !== user.uid).length;
  line(out, "전체 " + snap.size + "건, 그중 userId 가 내 UID와 다른 것 " + others + "건");
  const table = document.createElement("table");
  table.className = "cart";
  const head = table.insertRow();
  ["문서 ID", "userId", "totalPrice"].forEach(t => { const th = document.createElement("th"); th.textContent = t; head.append(th); });
  snap.forEach(d => {
    const data = d.data();
    const row = table.insertRow();
    [d.id, data.userId, data.totalPrice].forEach(v => { row.insertCell().textContent = v === undefined ? "" : String(v); });
  });
  out.append(table);
});

// 내 주문 금액 고치기 - 내 UID 의 주문 하나를 찾아 totalPrice 만 1 로 바꾼다
setup("#btn-fix-order", "#result-fix-order", async (user, out) => {
  const snap = await getDocs(query(collection(db, "orders"), where("userId", "==", user.uid), limit(1)));
  if (snap.empty) { line(out, "내 UID의 주문이 없어 바꾸지 않았습니다"); return; }
  const id = snap.docs[0].id;
  await updateDoc(doc(db, "orders", id), { totalPrice: 1 });
  line(out, "바꿨습니다: orders/" + id + " 의 totalPrice 를 1 로");
});

// 상품 가격 0원으로 - p1 문서의 price 만 0 으로 바꾼다
setup("#btn-zero-price", "#result-zero-price", async (user, out) => {
  await updateDoc(doc(db, "products", "p1"), { price: 0 });
  line(out, "바꿨습니다: products/p1 의 price 를 0 으로");
});
