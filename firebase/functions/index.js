/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall, HttpsError} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
// 서버 시각 - 에뮬레이터가 admin.firestore 를 바꿔 끼워 admin.firestore.FieldValue 가 없어지므로 따로 불러온다
const {FieldValue} = require("firebase-admin/firestore");

// 가게의 상품 문서를 읽으려고 한 번만 연다 (에뮬레이터에서는 Firestore 에뮬레이터를 쓴다)
admin.initializeApp();
const db = admin.firestore();

// 포트원 API 시크릿 - 값은 코드에 적지 않고 .secret.local 에서 읽는다
const portoneApiSecret = defineSecret("PORTONE_API_SECRET");
// Gemini API 키 - Secret Manager 의 GEMINI_API_KEY 에서 읽는다 (코드에는 값을 적지 않는다)
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// 포트원 웹훅을 받는 함수 - 받은 type 과 data.paymentId 를 터미널에 한 줄로 찍고,
// 결제 ID 로 포트원 API 에서 결제를 다시 조회해 금액을 확인한 뒤 200 으로 답한다
// 지역은 기본값을 그대로 둔다 (region 을 정하지 않는다)
exports.portoneWebhook = onRequest({secrets: [portoneApiSecret]}, async (request, response) => {
  const body = request.body || {};
  const type = body.type;
  const paymentId = body.data ? body.data.paymentId : undefined;
  console.log(`포트원 웹훅: type=${type} paymentId=${paymentId}`);
  // 검증이 실패해도 웹훅에는 200 으로 답한다
  try {
    // 검증 통과 - 기준 금액과 결제 금액이 맞은 결제만 돌려받는다
    const order = await verifyPayment(paymentId);
    if (order) await createOrder(order);
  } catch (err) {
    console.log("검증 중 오류: " + (err && err.stack ? err.stack : String(err)));
  }
  response.status(200).send("OK");
});

// 결제 ID 로 포트원 V2 API 에서 결제를 다시 조회하고, 상품 문서 가격으로 기준 금액을 계산해 비교한다
async function verifyPayment(paymentId) {
  if (!paymentId) {
    console.log("결제 ID 가 없어 조회하지 않았습니다");
    return;
  }

  const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: {Authorization: `PortOne ${portoneApiSecret.value()}`},
  });
  const text = await res.text();
  if (!res.ok) {
    console.log(`조회 실패: 상태 ${res.status} ${text}`);
    return;
  }

  const payment = JSON.parse(text);
  const amount = payment.amount ? payment.amount.total : undefined;
  // customData 는 글자 한 줄로 올 수 있어 풀어서 읽는다
  const customRaw = typeof payment.customData === "string" ? payment.customData : JSON.stringify(payment.customData);
  console.log(`결제 상태: ${payment.status}`);
  console.log(`결제 금액: ${amount}`);
  console.log(`customData: ${customRaw}`);

  let custom = payment.customData;
  if (typeof custom === "string") {
    try { custom = JSON.parse(custom); } catch (err) { custom = null; }
  }
  if (!custom || !Array.isArray(custom.items)) {
    console.log("검증 실패: customData 에서 상품 ID 와 수량을 읽지 못했습니다");
    return;
  }

  // 기준 금액 - 상품 문서의 가격 × 수량의 합
  let base = 0;
  for (const item of custom.items) {
    const snap = await db.collection("products").doc(String(item.id)).get();
    if (!snap.exists) {
      console.log(`검증 실패: 상품 문서가 없습니다 (${item.id})`);
      return;
    }
    const qty = Number(item.qty);
    const price = Number(snap.get("price"));
    if (!Number.isFinite(qty) || !Number.isFinite(price)) {
      console.log(`검증 실패: 상품 ${item.id} 의 수량 또는 가격을 읽지 못했습니다`);
      return;
    }
    base += price * qty;
  }

  if (payment.status === "PAID" && amount === base) {
    console.log(`검증 통과: 결제 ID 기준 금액 ${base} 결제 금액 ${amount}`);
    return {
      paymentId: paymentId,
      // 손님 UID - 웹훅에는 손님 정보가 없어서 customData 에 userId 가 있을 때만 적고, 없으면 빈 글자
      userId: typeof custom.userId === "string" ? custom.userId : "",
      items: custom.items.map(i => ({id: String(i.id), qty: Number(i.qty)})),
      totalPrice: base,
      paidAmount: amount,
      // 결제 완료 시각 - 다시 조회한 결제에 적힌 paidAt, 없으면 빈 글자
      paidAt: payment.paidAt || "",
    };
  } else {
    console.log(`금액 불일치: 결제 ID 기준 금액 ${base} 결제 금액 ${amount}`);
  }
}

// 검증이 통과한 결제로 주문 문서 한 장을 만든다 - 문서 이름은 결제 ID
// create 는 같은 이름의 문서가 있으면 실패하므로 덮어쓰지 않는다
async function createOrder(order) {
  const ref = db.collection("orders").doc(order.paymentId);
  try {
    await ref.create({
      paymentId: order.paymentId,
      userId: order.userId,
      items: order.items,
      totalPrice: order.totalPrice,
      paidAmount: order.paidAmount,
      paidAt: order.paidAt,
      status: "paid",
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`주문 생성: ${order.paymentId}`);
  } catch (err) {
    // 6 = ALREADY_EXISTS - 같은 결제 ID 의 주문이 이미 있다
    if (err.code === 6) {
      console.log(`이미 있는 주문 - 건너뜀: ${order.paymentId}`);
      return;
    }
    throw err;
  }
}

// 실습 188 도전 - shopPing : 깨어 있는지 + 상품 개수
exports.shopPing = onRequest({ region: "us-central1" }, async (req, res) => {
  const now = new Date().toISOString();
  const snap = await require("firebase-admin").firestore().collection("products").get();
  res.send("하루상점 함수가 깨어 있습니다 · " + now + " · 상품 " + snap.size + "개");
});

// calcOrderTotal : 상품 ID 와 수량으로 주문 금액을 서버가 계산해 돌려준다
// 가격은 손님이 보낸 값이 아니라 Firestore products/{productId} 의 price 에서만 읽는다
exports.calcOrderTotal = onCall({region: "us-central1"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인 안 함");
  }

  const data = request.data || {};
  const productId = data.productId;
  const quantity = data.quantity;
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
    throw new HttpsError("invalid-argument", "수량이 1 이상의 정수가 아님");
  }
  if (typeof productId !== "string" || productId === "") {
    throw new HttpsError("invalid-argument", "상품 ID 가 올바르지 않음");
  }

  const snap = await db.collection("products").doc(productId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "상품 문서가 없음");
  }
  const price = snap.get("price");
  if (typeof price !== "number" || !Number.isFinite(price)) {
    throw new HttpsError("failed-precondition", "상품 가격을 읽지 못함");
  }

  return {totalPrice: price * quantity};
});


// askShopBot : 손님 질문 하나를 받아 Gemini 답 하나를 돌려준다 (앞 대화는 기억하지 않는다)
// 근거는 Firestore products 의 상품 이름 · 가격뿐이고, 거기 없는 내용은 모른다고 답하게 한다
const SHOP_BOT_UNKNOWN = "[그건 제가 아직 모르는 내용이에요]";
exports.askShopBot = onCall({region: "us-central1", secrets: [geminiApiKey]}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인 안 함");
  }

  const question = request.data ? request.data.question : undefined;
  if (typeof question !== "string" || question.trim() === "" || question.length > 300) {
    throw new HttpsError("invalid-argument", "질문이 비어 있거나 300자를 넘음");
  }

  const snap = await db.collection("products").limit(100).get();
  const lines = snap.docs
      .map(d => ({name: d.get("name"), price: d.get("price")}))
      .filter(p => typeof p.name === "string" && typeof p.price === "number")
      .map(p => `- ${p.name} : ${p.price}원`);

  const instruction =
    "너는 하루상점의 안내 도우미야. 아래 상품 목록의 이름과 가격만 근거로 한국어로 짧게 답해. " +
    "목록에 없는 내용(재고, 배송, 후기, 할인 등)은 추측하거나 지어내지 말고, 정확히 " +
    `"${SHOP_BOT_UNKNOWN}" 라고만 답해.\n\n상품 목록:\n` + (lines.length ? lines.join("\n") : "(상품 없음)");

  let res;
  try {
    res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent", {
      method: "POST",
      headers: {"Content-Type": "application/json", "x-goog-api-key": geminiApiKey.value()},
      body: JSON.stringify({
        systemInstruction: {parts: [{text: instruction}]},
        contents: [{role: "user", parts: [{text: question}]}],
      }),
    });
  } catch (err) {
    logger.error("Gemini 호출 실패", err);
    throw new HttpsError("internal", "답을 가져오지 못함");
  }
  if (!res.ok) {
    logger.error(`Gemini 응답 오류: 상태 ${res.status} ${await res.text()}`);
    throw new HttpsError("internal", "답을 가져오지 못함");
  }

  const json = await res.json();
  const parts = json.candidates && json.candidates[0] && json.candidates[0].content ? json.candidates[0].content.parts : [];
  const answer = (parts || []).map(p => p.text || "").join("").trim();
  return {answer: answer || SHOP_BOT_UNKNOWN};
});

Object.assign(exports, require("./automation"));
Object.assign(exports, require("./admin"));