/* ===========================================================
   진 빠지는 하루 — 주문 완료 화면 (결제 결과는 이 화면 한 곳에서만 받는다)
   - 주소에 code 가 있으면 실패나 닫기: 받은 message 를 그대로 보여 주고 아무것도 만들지 않는다
   - code 가 없고 paymentId 가 있으면 성공: 로그인한 사람이면 orders 에 주문 문서 한 장(문서 ID = paymentId)을 만든다
   - 주문 문서를 다 쓴 뒤에 장바구니를 비우고 purchase 를 한 번 보낸다
   - 주소에 paymentId 도 code 도 없으면 아무것도 만들지 않는다
   - Firebase 앱은 auth.js 가 만든 것을 그대로 쓴다 (설정과 버전 같음)
   =========================================================== */
import { app } from "./auth.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const db = getFirestore(app);
const auth = getAuth(app);

// 오류 글을 줄이지 않고 그대로 보여 주기 위한 글
const errorText = (err) => (err && err.code ? err.code + " — " : "") + (err && err.message ? err.message : String(err));

const title = document.querySelector("#done-title");
const message = document.querySelector("#done-message");
const prose = document.querySelector("#done-prose");

function line(text) {
  const p = document.createElement("p");
  p.className = "lead";
  p.textContent = text;
  message.append(p);
}

async function run() {
  const params = new URLSearchParams(location.search);
  const paymentId = params.get("paymentId");
  const code = params.get("code");

  // 실패나 닫기 - 받은 message 를 그대로 보여 준다. 주문은 만들지 않고 장바구니도 그대로 둔다
  if (code) {
    line(params.get("message") || "");
    line("장바구니는 그대로입니다");
    return;
  }
  // paymentId 도 code 도 없으면 아무것도 만들지 않는다
  if (!paymentId) return;

  // 성공 - 로그인 확인이 끝난 뒤 지금 로그인한 사람을 본다
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) { line("로그인해야 주문을 접수할 수 있습니다. 로그인해 주세요."); return; }

  // 장바구니 - 상품 목록에서 사라진 상품은 뺀다
  const cartItems = Cart.read().filter(i => findProduct(i.id));
  if (cartItems.length === 0) { line("장바구니가 비어 있어 주문 문서를 만들지 않았습니다."); return; }
  // purchase 에 쓸 값은 장바구니를 비우기 전에 만들어 둔다
  const items = cartItems.map(i => {
    const p = findProduct(i.id);
    return { productId: p.id, name: p.name, price: p.price, quantity: i.qty };
  });
  const totalPrice = Cart.total();
  const purchaseItems = items.map(i => ({ item_id: i.productId, item_name: i.name, price: i.price, quantity: i.quantity }));

  try {
    // 주문 문서 한 장 - 문서 ID 는 paymentId, 필드는 여섯 개만
    await setDoc(doc(db, "orders", paymentId), {
      userId: user.uid,
      items: items,
      totalPrice: totalPrice,
      status: "paid",
      createdAt: serverTimestamp(),
      paymentId: paymentId
    });
  } catch (err) {
    line(errorText(err));
    return;
  }

  // 주문 문서를 다 썼으니 장바구니를 비우고 결제 ID 와 안내를 보여 준다
  Cart.clear();
  const badge = document.querySelector(".cart-count");
  if (badge) badge.textContent = Cart.count();
  title.hidden = false;
  prose.hidden = false;
  line("결제 ID: " + paymentId);

  // ▼ purchase — 결제가 끝나 주문이 접수된 직후, 이 화면에서 한 번만 보낸다
  window.dataLayer = window.dataLayer || [];
  // 앞에서 넣은 상품 값이 섞이지 않게 먼저 비운다
  dataLayer.push({ ecommerce: null });
  dataLayer.push({
    event: "purchase",
    ecommerce: {
      // 주문마다 겹치지 않는 주문 번호 - 결제 ID
      transaction_id: paymentId,
      currency: "KRW",
      // 금액 - 주문한 상품 합계(배송비 뺀 값)
      value: totalPrice,
      items: purchaseItems
    }
  });
}

run().catch((err) => { line(errorText(err)); });
