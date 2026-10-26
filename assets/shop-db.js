/* ===========================================================
   진 빠지는 하루 — 상품 목록·상세를 Firestore 의 products 컬렉션에서 읽어 옵니다
   - 이름 · 가격 · 한 줄 소개 · 재고만 Firestore 에서 옵니다
   - 긴 설명(detail)과 그림(emoji)은 지금처럼 shop.js 에서 읽습니다
   - Firebase 앱은 auth.js 가 만든 것을 그대로 씁니다 (설정과 버전 같음)
   =========================================================== */
import { app } from "./auth.js";
import { showPushCard, hidePushCard } from "./push-card.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, collection, query, where, orderBy, limit, startAfter, getDocs, getDoc, doc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// 오류 글을 줄이지 않고 그대로 보여 주기 위한 글
const errorText = (err) => (err && err.code ? err.code + " — " : "") + (err && err.message ? err.message : String(err));

// Firestore 문서(id, 필드)에 shop.js 의 그림·긴 설명을 붙여 한 상품으로 만든다
function merge(id, data) {
  const base = findProduct(id);
  if (!base) return null;
  return { ...base, name: data.name, price: data.price, summary: data.summary, stock: data.stock, imagePath: data.imagePath };
}

/* --- 상품 목록 --- */
// 지금까지 화면에 올린 상품, 마지막으로 받은 문서(다음 쪽의 시작점), 지금까지 읽은 문서 수
let shown = [];
let seen = new Set();
let lastDoc = null;
let readTotal = 0;

// 한 번에 가져오는 개수 - 처음 목록도 「더 보기」도 이만큼씩
const PAGE_SIZE = 3;

// 한 쪽(셋)을 가져온다 - after 가 있으면 그 문서 다음부터
// 거르기 · 줄 세우기 · 개수를 Firestore 쿼리가 한다: 보이기(isVisible)가 true 인 것만, 가격이 비싼 것부터, 셋만
async function fetchPage(after) {
  // 처음 쪽
  if (!after) {
    return getDocs(query(
      collection(db, "products"),
      where("isVisible", "==", true),
      orderBy("price", "desc"),
      limit(PAGE_SIZE)
    ));
  }
  // 「더 보기」 - 마지막으로 받은 문서(after)를 startAfter 에 넘겨 그다음 문서부터 가져온다
  return getDocs(query(
    collection(db, "products"),
    where("isVisible", "==", true),
    orderBy("price", "desc"),
    startAfter(after),
    limit(PAGE_SIZE)
  ));
}

// 받아 온 쪽을 화면에 이어 붙이고, 더 가져올 것이 없으면 「더 보기」를 숨긴다
function takePage(snap) {
  snap.forEach(d => {
    // 이미 받은 상품은 다시 붙이지 않는다
    if (seen.has(d.id)) return;
    seen.add(d.id);
    const p = merge(d.id, d.data());
    if (p) shown.push(p);
  });
  if (snap.size > 0) lastDoc = snap.docs[snap.docs.length - 1];
  // 읽은 문서 수는 지금까지 실제로 받아 온 장수를 더한 값이다
  readTotal += snap.size;
  paintList(shown, readTotal);
  paintPhotos();
  // 셋보다 적게 왔으면 더 가져올 것이 없다
  const more = document.querySelector("#load-more");
  if (more) more.hidden = snap.size < PAGE_SIZE;
}

// imagePath 가 있는 상품은 그 경로로 다운로드 URL 을 받아 그림 글자 자리에 사진을 보여 준다
// 사진 주소를 받는 것은 문서를 읽는 것이 아니라서 읽은 문서 수에 더하지 않는다
// 받은 주소는 기억해 두어 「더 보기」로 목록을 다시 그려도 다시 받지 않는다
const photoUrls = new Map();
async function paintPhotos() {
  await Promise.all(shown.filter(p => p.imagePath).map(async (p) => {
    try {
      if (!photoUrls.has(p.imagePath)) photoUrls.set(p.imagePath, await getDownloadURL(ref(storage, p.imagePath)));
    } catch (err) {
      // 사진을 받지 못하면 그림 글자를 그대로 둔다
      console.error(err);
      return;
    }
    const thumb = document.querySelector('#product-list a.card[href="product.html?id=' + p.id + '"] .thumb');
    if (!thumb) return;
    const img = document.createElement("img");
    img.src = photoUrls.get(p.imagePath);
    img.alt = p.name;
    // 사진을 그리지 못하면 그림 글자를 그대로 둔다
    img.addEventListener("load", () => thumb.replaceChildren(img), { once: true });
  }));
}

async function loadList() {
  shown = []; seen = new Set(); lastDoc = null; readTotal = 0;
  try {
    takePage(await fetchPage(null));
  } catch (err) {
    // 오류 글은 줄이지 않고 콘솔에 그대로 찍고, 화면에는 한 줄만 보여 준다
    console.error(err);
    document.querySelector("#product-list").textContent = "목록을 불러오지 못했습니다";
  }
}

// 「더 보기」 - 지금 보이는 마지막 상품 다음부터 셋을 더 가져와 아래에 이어 붙인다
function setupMore() {
  const more = document.querySelector("#load-more");
  const msg = document.querySelector("#more-message");
  if (!more) return;
  more.addEventListener("click", async () => {
    msg.textContent = "";
    more.disabled = true;
    try {
      takePage(await fetchPage(lastDoc));
    } catch (err) {
      console.error(err);
      msg.textContent = "목록을 불러오지 못했습니다";
    }
    more.disabled = false;
  });
}

/* --- 상품 상세 --- */
// 상세 화면의 그림 글자 자리에 사진을 보여 준다 - 사진을 받지 못하면 그림 글자를 그대로 둔다
async function paintDetailPhoto(p) {
  try {
    if (!photoUrls.has(p.imagePath)) photoUrls.set(p.imagePath, await getDownloadURL(ref(storage, p.imagePath)));
  } catch (err) {
    console.error(err);
    return;
  }
  const thumb = document.querySelector("#product-detail .thumb");
  if (!thumb) return;
  const img = document.createElement("img");
  img.src = photoUrls.get(p.imagePath);
  img.alt = p.name;
  img.addEventListener("load", () => thumb.replaceChildren(img), { once: true });
}

async function loadDetail() {
  try {
    const snap = await getDoc(doc(db, "products", qs("id") || "-"));
    const data = snap.exists() ? snap.data() : null;
    // 숨긴 상품(isVisible 이 true 가 아님)은 없는 것처럼 보여 준다
    const p = data && data.isVisible === true ? merge(snap.id, data) : null;
    paintDetail(p, snap.exists() ? 1 : 0);
    // imagePath 가 있으면 그림 글자 자리에 사진을 보여 준다 (읽은 문서 수는 그대로 1장)
    if (p && p.imagePath) paintDetailPhoto(p);
    // 보여 줄 상품이 있을 때만 「바로 주문」 단추를 보인다
    // 단추는 상품을 그린 뒤에야 생기므로, 클릭 처리도 여기서 한 번 붙인다
    if (p) { orderProductId = p.id; document.querySelector("#order-now").hidden = false; setupOrder(); }
  } catch (err) {
    document.querySelector("#product-detail").textContent = errorText(err);
  }
}

/* --- 바로 주문 (상품 상세) --- */
let orderProductId = null;

// 재고가 모자랄 때 던지는 오류 - 화면에는 「재고가 없습니다」만 보여 준다
class OutOfStock extends Error {}

function setupOrder() {
  const btn = document.querySelector("#order-now");
  const msg = document.querySelector("#order-message");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    msg.textContent = "";
    hidePushCard();
    // 로그인 확인이 끝날 때까지 기다린 뒤 지금 로그인한 사람을 본다
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) { msg.textContent = "로그인이 필요합니다"; return; }

    btn.disabled = true;
    msg.textContent = "주문하는 중입니다…";
    try {
      const productRef = doc(db, "products", orderProductId);
      let ordered = "";
      // 재고 확인 · 주문 문서 쓰기 · 재고 차감을 한 트랜잭션으로 - 둘 다 되거나 둘 다 안 된다
      await runTransaction(db, async (t) => {
        const snap = await t.get(productRef);
        if (!snap.exists()) throw new Error("상품 문서가 없습니다: " + orderProductId);
        const d = snap.data();
        // 재고가 1 이상일 때만 주문한다
        if (!(typeof d.stock === "number" && d.stock >= 1)) throw new OutOfStock();
        ordered = d.name;
        // 주문 문서 한 장 - 자동 ID, 필드는 다섯 개만
        t.set(doc(collection(db, "orders")), {
          userId: user.uid,
          items: [{ productId: snap.id, name: d.name, price: d.price, quantity: 1 }],
          totalPrice: d.price * 1,
          status: "paid",
          createdAt: serverTimestamp()
        });
        // 재고를 1 줄인다
        t.update(productRef, { stock: d.stock - 1 });
      });
      msg.textContent = "주문했습니다: " + ordered + " 1개";
      // 「주문했습니다」 바로 아래에 알림 카드
      showPushCard(msg);
    } catch (err) {
      msg.textContent = err instanceof OutOfStock ? "재고가 없습니다" : errorText(err);
    }
    btn.disabled = false;
  });
}

/* --- 상품 올리기 (로그인한 사람에게만 단추가 보인다 - 보이고 숨기는 일은 auth.js 가 한다) --- */
// p2~p6 의 재고와 보이기 값 - p1 은 이미 있어 건드리지 않는다
const SEED = {
  p2: { stock: 30, isVisible: true },
  p3: { stock: 8,  isVisible: true },
  p4: { stock: 0,  isVisible: true },
  p5: { stock: 5,  isVisible: false },
  p6: { stock: 40, isVisible: true }
};

function setupUpload() {
  const btn = document.querySelector("#upload-products");
  const msg = document.querySelector("#upload-message");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    msg.textContent = "올리는 중입니다…";
    btn.disabled = true;
    try {
      const ids = Object.keys(SEED);
      // 한 거래(transaction) 안에서 한 번에 - 다섯 장이 다 올라가거나 하나도 안 올라간다
      await runTransaction(db, async (t) => {
        const refs = ids.map(id => doc(db, "products", id));
        const snaps = await Promise.all(refs.map(r => t.get(r)));
        // 이미 있는 문서를 덮어쓰지 않는다
        const exist = snaps.filter(s => s.exists()).map(s => s.id);
        if (exist.length) throw new Error("이미 올라가 있는 상품이 있어 하나도 올리지 않았습니다: " + exist.join(", "));
        ids.forEach((id, i) => {
          const p = findProduct(id);
          t.set(refs[i], {
            name: p.name, price: p.price, summary: p.summary,
            stock: SEED[id].stock, isVisible: SEED[id].isVisible,
            createdAt: serverTimestamp()
          });
        });
      });
      msg.textContent = "상품 " + ids.length + "장을 올렸습니다: " + ids.join(", ");
      loadList();
    } catch (err) {
      msg.textContent = errorText(err);
    }
    btn.disabled = false;
  });
}

function run() {
  if (document.querySelector("#product-list")) { loadList(); setupMore(); setupUpload(); }
  if (document.querySelector("#product-detail")) loadDetail();
}
// app.js 의 「불러오는 중」 그리기가 먼저 끝난 뒤에 읽는다
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
else run();
