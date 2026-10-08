/* ===========================================================
   진 빠지는 하루 — 로그인 상태를 묻는 코드 (모든 화면이 이 파일 하나를 불러 씁니다)
   - 헤더에 로그인 / 내 이메일 · 마이페이지 · 로그아웃 을 그린다
   - data-auth-required 가 붙은 화면은 확인이 끝나기 전까지 숨기고,
     로그인하지 않았으면 login.html 로 돌려보낸다
   =========================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgF1bZEceFceNmKJiQL1jmG31HIm-bOwA",
  authDomain: "haru-jin-shop.firebaseapp.com",
  projectId: "haru-jin-shop",
  storageBucket: "haru-jin-shop.firebasestorage.app",
  messagingSenderId: "405082377069",
  appId: "1:405082377069:web:50b28f8cf84308faa02864"
};

const auth = getAuth(initializeApp(firebaseConfig));
// 인증 메일을 한국어로 보낸다
auth.languageCode = "ko";

// 로그아웃 - 끝나면 첫 화면으로 간다
async function logout() {
  try { await signOut(auth); } catch (e) { /* 실패해도 첫 화면으로 */ }
  location.href = "index.html";
}

// 헤더 오른쪽 메뉴에 로그인 상태를 그린다
function renderNav(user) {
  const nav = document.querySelector("nav.site");
  if (!nav) return;
  const old = nav.querySelector(".auth-nav");
  if (old) old.remove();

  const box = document.createElement("span");
  box.className = "auth-nav";
  if (user) {
    const who = document.createElement("span");
    who.className = "auth-email";
    who.textContent = user.email;
    const my = document.createElement("a");
    my.href = "mypage.html";
    my.textContent = "마이페이지";
    const out = document.createElement("button");
    out.type = "button";
    out.className = "auth-logout";
    out.textContent = "로그아웃";
    out.addEventListener("click", logout);
    box.append(who, my, out);
  } else {
    const a = document.createElement("a");
    a.href = "login.html";
    a.textContent = "로그인";
    box.append(a);
  }
  nav.append(box);
}

// 로그인해야 볼 수 있는 화면 - 확인이 끝난 뒤에야 보여 준다
async function guard(user) {
  const page = document.querySelector("[data-auth-required]");
  if (!page) return;
  if (!user) {
    const here = location.pathname.split("/").pop() || "index.html";
    location.replace("login.html?next=" + encodeURIComponent(here));
    return;
  }
  // 열 때마다 인증 여부를 서버에서 새로 읽는다 (읽지 못하면 가진 값 그대로)
  try { await user.reload(); } catch (e) { /* 네트워크 문제 - 가진 값으로 보여 준다 */ }
  const mail = document.querySelector("[data-auth-email]");
  if (mail) mail.textContent = user.email;
  const verify = document.querySelector("[data-verify]");
  if (verify) verify.hidden = user.emailVerified;
  page.hidden = false;
}

// 「인증 메일 다시 보내기」 - 너무 자주 누르면 잠시 기다리라고 알려 준다
const resend = document.querySelector("[data-resend]");
if (resend) resend.addEventListener("click", async () => {
  const msg = document.querySelector("[data-resend-message]");
  try {
    await sendEmailVerification(auth.currentUser);
    msg.textContent = "인증 메일을 보냈습니다. 메일함과 스팸함을 확인해 주세요.";
  } catch (err) {
    msg.textContent = err.code === "auth/too-many-requests"
      ? "잠시 뒤에 다시 눌러 주세요."
      : "문제가 생겼어요. 조금 뒤에 다시 시도해 주세요.";
  }
});

// 로그인 상태를 묻는 곳은 여기 한 군데입니다
onAuthStateChanged(auth, (user) => {
  renderNav(user);
  // data-only-logged-in 이 붙은 것은 로그인했을 때만 보인다
  document.querySelectorAll("[data-only-logged-in]").forEach(el => { el.hidden = !user; });
  // data-only-logged-out 이 붙은 것은 로그인하지 않았을 때만 보인다
  document.querySelectorAll("[data-only-logged-out]").forEach(el => { el.hidden = !!user; });
  // 이름이 있는 계정(구글 등)이면 이름도 보여 준다
  document.querySelectorAll("[data-auth-name]").forEach(el => { el.textContent = user && user.displayName ? user.displayName : ""; });
  document.querySelectorAll("[data-auth-name-line]").forEach(el => { el.hidden = !(user && user.displayName); });
  // 로그인한 이메일을 적어 두는 자리
  document.querySelectorAll("[data-auth-email]").forEach(el => { el.textContent = user ? user.email : ""; });
  guard(user);
});

// 화면 안의 로그아웃 단추(data-logout)도 같은 로그아웃을 쓴다
document.querySelectorAll("[data-logout]").forEach(b => b.addEventListener("click", logout));
