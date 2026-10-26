/* ===========================================================
   진 빠지는 하루 — 주문을 마친 손님에게 알림을 받을지 묻는 카드
   - 주문 완료 화면과 상품 상세(바로 주문 뒤)에서만 불러 쓴다
   - 브라우저 알림 허락 창은 「알림 받기」 단추를 누른 처리 안에서만 띄운다
   - 알림 받을 주소(토큰)는 아직 받지 않는다
   =========================================================== */
const CARD_ID = "push-card";

export function hidePushCard() {
  const old = document.getElementById(CARD_ID);
  if (old) old.remove();
}

// anchor 바로 아래에 카드(또는 안내 한 줄)를 붙인다
export function showPushCard(anchor) {
  hidePushCard();
  if (!anchor || !("Notification" in window)) return;

  const box = document.createElement("div");
  box.id = CARD_ID;
  box.style.margin = "14px 0";

  const note = (text) => {
    const p = document.createElement("p");
    p.className = "lead";
    p.textContent = text;
    box.replaceChildren(p);
  };

  if (Notification.permission === "granted") {
    note("알림을 받고 있어요");
  } else if (Notification.permission === "denied") {
    note("브라우저 주소창 왼쪽 아이콘 → 알림에서 켤 수 있어요");
  } else {
    const title = document.createElement("p");
    title.className = "lead";
    title.style.fontWeight = "700";
    title.textContent = "배송이 시작되면 바로 알려 드릴까요?";

    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "btn";
    accept.textContent = "알림 받기";
    accept.addEventListener("click", async () => {
      // 허락 창은 이 단추를 누른 처리 안에서만 띄운다
      const result = await Notification.requestPermission();
      console.log("알림 허락 결과: " + result);
      if (result === "granted") note("알림을 받고 있어요");
      else if (result === "denied") note("브라우저 주소창 왼쪽 아이콘 → 알림에서 켤 수 있어요");
    });

    const later = document.createElement("button");
    later.type = "button";
    later.className = "btn ghost";
    later.style.marginLeft = "8px";
    later.textContent = "나중에";
    later.addEventListener("click", hidePushCard);

    box.append(title, accept, later);
  }

  anchor.insertAdjacentElement("afterend", box);
}
