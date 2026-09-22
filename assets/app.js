/* ===========================================================
   진 빠지는 하루 — 화면을 그리고 장바구니를 다루는 코드
   이 파일은 고치지 않아도 됩니다. (상품은 shop.js 에 있습니다)
   =========================================================== */

const won = n => n.toLocaleString("ko-KR") + "원";
const findProduct = id => PRODUCTS.find(p => p.id === id);
const qs = key => new URLSearchParams(location.search).get(key);

/* --- 장바구니는 브라우저에 저장합니다 --- */
const Cart = {
  read() {
    try { return JSON.parse(localStorage.getItem("haru_cart") || "[]"); }
    catch (e) { return []; }
  },
  write(items) {
    localStorage.setItem("haru_cart", JSON.stringify(items));
  },
  add(id) {
    const items = Cart.read();
    const hit = items.find(i => i.id === id);
    if (hit) hit.qty += 1;
    else items.push({ id, qty: 1 });
    Cart.write(items);

    // ▼ add_to_cart — 상품이 장바구니에 담긴 직후입니다.
    // 담은 상품의 이름과 가격을 상품 목록에서 찾아 온다
const p = findProduct(id);
// 통로가 이미 있으면 그대로 쓰고, 없을 때만 새로 만든다
window.dataLayer = window.dataLayer || [];
// 앞에서 넣은 상품 값이 섞이지 않게 먼저 비운다
dataLayer.push({ ecommerce: null });
// 통로 끝에 한 덩어리를 넣는다 - 넣는 순간이 태그 관리자가 듣는 순간
dataLayer.push({
  // 무슨 일이 일어났나 - 계획서 이름 글자 그대로
  event: "add_to_cart",
  // 같이 보내는 상품 값 묶음
  ecommerce: {
    // 어느 나라 돈인가
    currency: "KRW",
    // 금액 - 한 번 누르면 한 개라 그 상품 가격 하나
    value: p.price,
    // 담은 상품 상자 하나를 목록에 넣는다
    items: [{ item_id: p.id, item_name: p.name, price: p.price, quantity: 1 }]
  }
});

  },
  remove(id) {
    Cart.write(Cart.read().filter(i => i.id !== id));
  },
  clear() {
    localStorage.removeItem("haru_cart");
  },
  count() {
    return Cart.read().reduce((sum, i) => sum + i.qty, 0);
  },
  total() {
    return Cart.read().reduce((sum, i) => {
      const p = findProduct(i.id);
      return sum + (p ? p.price * i.qty : 0);
    }, 0);
  }
};

/* --- 머리글과 꼬리글 --- */
function paintChrome() {
  // 화면마다 제목이 달라야 검색에서 구분됩니다.
  // 그래서 제목을 통째로 바꾸지 않고 가게 이름만 갈아 끼웁니다.
  // 앞의 이름은 HTML 제목에 적혀 있는 이름이라 그 글자와 같아야 찾아냅니다.
  document.title = document.title.replaceAll("진 빠지는 하루", SHOP.name);

  const brand = document.querySelector(".brand");
  if (brand) brand.textContent = SHOP.name;

  const badge = document.querySelector(".cart-count");
  if (badge) badge.textContent = Cart.count();

  const foot = document.querySelector("footer.site .wrap");
  if (foot) foot.textContent = SHOP.name + " · " + SHOP.tagline;
}

/* --- 상품 목록 --- */
function paintList() {
  const box = document.querySelector("#product-list");
  if (!box) return;

  document.querySelector("#hero-title").textContent = SHOP.name;
  document.querySelector("#hero-tagline").textContent = SHOP.tagline;

  box.innerHTML = PRODUCTS.map(p => `
    <a class="card" href="product.html?id=${p.id}">
      <div class="thumb">${p.emoji}</div>
      <h3>${p.name}</h3>
      <p class="sum">${p.summary}</p>
      <div class="price">${won(p.price)}</div>
    </a>`).join("");
}

/* --- 상품 상세 --- */
function paintDetail() {
  const box = document.querySelector("#product-detail");
  if (!box) return;

  const p = findProduct(qs("id"));
  if (!p) { box.innerHTML = '<p class="empty">그런 상품이 없습니다.</p>'; return; }

  document.title = p.name + " — " + SHOP.name;
  box.innerHTML = `
    <div class="thumb">${p.emoji}</div>
    <div>
      <h1>${p.name}</h1>
      <div class="price">${won(p.price)}</div>
      <div class="body prose">${p.detail.map(t => `<p>${t}</p>`).join("")}</div>
      <button class="btn" id="add-to-cart">장바구니에 담기</button>
    </div>`;

  // ▼ view_item — 상품 상세 화면이 열린 직후입니다.
  // 통로가 이미 있으면 그대로 쓰고, 없을 때만 새로 만든다
  window.dataLayer = window.dataLayer || [];
  // 앞에서 넣은 상품 값이 섞이지 않게 먼저 비운다
  dataLayer.push({ ecommerce: null });
  // 통로 끝에 한 덩어리를 넣는다 - 넣는 순간이 태그 관리자가 듣는 순간
  dataLayer.push({
    // 무슨 일이 일어났나 - 계획서 이름 글자 그대로
    event: "view_item",
    // 같이 보내는 상품 값 묶음
    ecommerce: {
      // 어느 나라 돈인가
      currency: "KRW",
      // 금액 - 지금 보고 있는 그 상품 가격 하나
      value: p.price,
      // 보고 있는 상품 상자 하나를 목록에 넣는다
      items: [{ item_id: p.id, item_name: p.name, price: p.price, quantity: 1 }]
    }
  });

  document.querySelector("#add-to-cart").addEventListener("click", () => {
    Cart.add(p.id);
    location.href = "cart.html";
  });
}

/* --- 장바구니 --- */
function paintCart() {
  const box = document.querySelector("#cart-box");
  if (!box) return;

  const items = Cart.read();
  if (items.length === 0) {
    box.innerHTML = '<p class="empty">장바구니가 비어 있습니다.</p>';
    return;
  }

  box.innerHTML = `
    <table class="cart">
      <tr><th>상품</th><th>수량</th><th>금액</th><th></th></tr>
      ${items.map(i => {
        const p = findProduct(i.id);
        if (!p) return "";
        return `<tr>
          <td>${p.emoji} ${p.name}</td>
          <td>${i.qty}</td>
          <td>${won(p.price * i.qty)}</td>
          <td><button class="btn ghost drop" data-id="${p.id}">빼기</button></td>
        </tr>`;
      }).join("")}
    </table>
    <div class="total">합계 ${won(Cart.total())}</div>
    <a class="btn" href="checkout.html">결제하기</a>`;

  box.querySelectorAll(".drop").forEach(b => {
    b.addEventListener("click", () => { Cart.remove(b.dataset.id); location.reload(); });
  });
}

/* --- 결제 --- */
function paintCheckout() {
  const form = document.querySelector("#pay-form");
  if (!form) return;

  // 상품 금액 - 가격 × 수량의 합. 배송비는 들어 있지 않다
  const itemsTotal = Cart.total();
  // 배송비 - 5만 원 이상이면 없고, 그 아래는 3,000원 (배송·교환 안내와 같은 기준)
  // 담긴 것이 없으면 배송비도 없다
  const shippingFee = (itemsTotal === 0 || itemsTotal >= 50000) ? 0 : 3000;
  // 손님이 실제로 낼 금액 - 상품 금액에 배송비를 더한 값
  const payTotal = itemsTotal + shippingFee;

  // 상품 금액과 배송비를 각각 적어, 합계에 무엇이 들어 있는지 보이게 한다
  const itemsBox = document.querySelector("#pay-items");
  if (itemsBox) itemsBox.textContent = won(itemsTotal);
  const shipBox = document.querySelector("#pay-ship");
  if (shipBox) shipBox.textContent = shippingFee === 0 ? "무료" : won(shippingFee);

  const sum = document.querySelector("#pay-total");
  if (sum) sum.textContent = won(payTotal);

  // 결제 화면 맨 위 한 줄 - 지금 결제 중인 상품과 수량을 이어 붙여 보여 준다
  // 배송비는 아래 합계 칸에서 따로 적으므로 여기서는 빼고 상품만 적는다
  const summaryBox = document.querySelector("#pay-summary");
  if (summaryBox) {
    // 담긴 줄마다 상품 이름과 수량을 "이름 2개" 꼴로 적는다 (없어진 상품은 뺀다)
    const parts = Cart.read()
      .map(i => {
        const p = findProduct(i.id);
        return p ? p.name + " " + i.qty + "개" : null;
      })
      .filter(t => t !== null);
    summaryBox.textContent = parts.length === 0
      ? "장바구니가 비어 있습니다."
      : parts.join(", ");
  }

  // ▼ begin_checkout — 결제 화면이 열린 직후입니다. 아직 제출 전이며, 화면당 한 번만 지나갑니다.
  //    여기에 「결제를 시작했다」를 알리는 코드가 들어갑니다 (뒤 수업에서)
  // 장바구니에 담긴 줄을 읽어 온다 - 한 줄에 상품 하나와 수량이 들어 있다
  const cartItems = Cart.read();
  // 담긴 줄마다 상품 목록에서 이름과 가격을 찾아 상품 상자로 만든다
  // 상품 목록에서 사라진 상품은 값을 읽을 수 없으니 뺀다
  const checkoutItems = cartItems
    .map(i => {
      const p = findProduct(i.id);
      if (!p) return null;
      return { item_id: p.id, item_name: p.name, price: p.price, quantity: i.qty };
    })
    .filter(it => it !== null);
  // 합계 - 가게가 이미 같은 셈을 하고 있어 그 값을 그대로 쓴다 (가격 × 수량의 합, 배송비는 없다)
  const checkoutValue = Cart.total();
  // 통로가 이미 있으면 그대로 쓰고, 없을 때만 새로 만든다
  window.dataLayer = window.dataLayer || [];
  // 앞에서 넣은 상품 값이 섞이지 않게 먼저 비운다
  dataLayer.push({ ecommerce: null });
  // 통로 끝에 한 덩어리를 넣는다 - 넣는 순간이 태그 관리자가 듣는 순간
  dataLayer.push({
    // 무슨 일이 일어났나 - 계획서 이름 글자 그대로
    event: "begin_checkout",
    // 무료 배송인가 - 계획서대로 ecommerce 밖에 둔다
    free_shipping: checkoutValue >= 50000 ? "yes" : "no",
    // 같이 보내는 상품 값 묶음
    ecommerce: {
      // 어느 나라 돈인가
      currency: "KRW",
      // 금액 - 장바구니 상품 합계(배송비 뺀 값)
      // 화면 합계와 다르다: 화면은 배송비를 더해 보여 주지만 value 에는 일부러 넣지 않는다
      value: checkoutValue,
      // 담긴 상품 상자 전체를 목록에 넣는다
      items: checkoutItems
    }
  });

  form.addEventListener("submit", e => {
    e.preventDefault();

    // ▼ purchase — 결제 제출이 끝난 직후입니다. 아래 Cart.clear() 로 장바구니를 비우기 전이라
    //    여기서는 아직 담긴 상품을 읽을 수 있습니다.
    //    여기에 「결제를 마쳤다」를 알리는 코드가 들어갑니다 (뒤 수업에서)
    // 주문 번호 - 시각(밀리초)과 무작위 글자를 붙여 만든다
    const orderId = "HARU-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    // 장바구니에 담긴 줄을 읽어 온다 - 비우기 전이라 아직 읽을 수 있다
    const purchaseCartItems = Cart.read();
    // 담긴 줄마다 상품 목록에서 이름과 가격을 찾아 상품 상자로 만든다
    // 상품 목록에서 사라진 상품은 값을 읽을 수 없으니 뺀다
    const purchaseItems = purchaseCartItems
      .map(i => {
        const p = findProduct(i.id);
        if (!p) return null;
        return { item_id: p.id, item_name: p.name, price: p.price, quantity: i.qty };
      })
      .filter(it => it !== null);
    // 합계 - 가게가 이미 같은 셈을 하고 있어 그 값을 그대로 쓴다 (가격 × 수량의 합, 배송비는 없다)
    const purchaseValue = Cart.total();
    // 통로가 이미 있으면 그대로 쓰고, 없을 때만 새로 만든다
    window.dataLayer = window.dataLayer || [];
    // 앞에서 넣은 상품 값이 섞이지 않게 먼저 비운다
    dataLayer.push({ ecommerce: null });
    // 통로 끝에 한 덩어리를 넣는다 - 넣는 순간이 태그 관리자가 듣는 순간
    dataLayer.push({
      // 무슨 일이 일어났나 - 계획서 이름 글자 그대로
      event: "purchase",
      // 같이 보내는 상품 값 묶음
      ecommerce: {
        // 주문마다 겹치지 않는 주문 번호
        transaction_id: orderId,
        // 어느 나라 돈인가
        currency: "KRW",
        // 금액 - 주문한 상품 합계(배송비 뺀 값)
        // 화면 합계와 다르다: 화면은 배송비를 더해 보여 주지만 value 에는 일부러 넣지 않는다
        value: purchaseValue,
        // 주문한 상품 상자 전체를 목록에 넣는다
        items: purchaseItems
      }
    });

    Cart.clear();
    location.href = "done.html";
  });
}

/* --- 가게 소개·배송 안내 글 --- */
function paintProse() {
  const about = document.querySelector("#about-body");
  if (about) about.innerHTML = SHOP.about.map(t => `<p>${t}</p>`).join("");

  const ship = document.querySelector("#shipping-body");
  if (ship) ship.innerHTML = SHOP.shipping.map(t => `<p>${t}</p>`).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  paintChrome();
  paintList();
  paintDetail();
  paintCart();
  paintCheckout();
  paintProse();
});
