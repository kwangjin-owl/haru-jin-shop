/* ===========================================================
   진 빠지는 하루 — 상품 사진 올리기 (주소를 직접 넣어서 여는 화면)
   - 사진은 Storage 의 products/상품 문서 ID/main.jpg 로 올린다
   - 다 올라가면 그 경로 글자만 상품 문서의 imagePath 에 더한다 (다운로드 URL 은 저장하지 않는다)
   - Firebase 앱은 auth.js 가 만든 것을 그대로 씁니다 (설정과 버전 같음)
   =========================================================== */
import { app } from "./auth.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// 오류 글을 줄이지 않고 그대로 보여 주기 위한 글
const errorText = (err) => (err && err.code ? err.code + " — " : "") + (err && err.message ? err.message : String(err));

const select = document.querySelector("#photo-product");
const fileInput = document.querySelector("#photo-file");
const btn = document.querySelector("#photo-upload");
const progress = document.querySelector("#photo-progress");
const message = document.querySelector("#photo-message");

// 숨긴 상품(isVisible 이 false)도 고를 수 있도록 products 문서를 전부 읽는다
let loaded = false;
async function loadProducts() {
  if (loaded) return;
  loaded = true;
  try {
    const snap = await getDocs(collection(db, "products"));
    select.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = "상품을 고르세요";
    select.append(first);
    snap.forEach(d => {
      const o = document.createElement("option");
      o.value = d.id;
      const name = d.data().name;
      o.textContent = name ? d.id + " — " + name : d.id;
      select.append(o);
    });
    select.disabled = false;
  } catch (err) {
    loaded = false;
    message.textContent = errorText(err);
  }
}

onAuthStateChanged(auth, (user) => { if (user) loadProducts(); });

btn.addEventListener("click", async () => {
  progress.textContent = "";
  message.textContent = "";
  const id = select.value;
  const file = fileInput.files[0];
  if (!id) { message.textContent = "상품을 먼저 고르세요."; return; }
  if (!file) { message.textContent = "사진 파일을 먼저 고르세요."; return; }

  // 맨 앞에 / 를 붙이지 않는다
  const path = "products/" + id + "/main.jpg";
  btn.disabled = true;
  try {
    // 고른 파일 그대로 올린다 (줄이거나 바꾸지 않는다)
    await new Promise((resolve, reject) => {
      const task = uploadBytesResumable(ref(storage, path), file);
      progress.textContent = "올리는 중 0 %";
      task.on("state_changed",
        (s) => { progress.textContent = "올리는 중 " + Math.round(s.bytesTransferred / s.totalBytes * 100) + " %"; },
        reject,
        resolve
      );
    });
    // 다 올라간 뒤에 경로 글자만 imagePath 에 더한다 - 다른 필드는 그대로
    await updateDoc(doc(db, "products", id), { imagePath: path });
    message.textContent = "끝났습니다: " + path + " 을 올리고 " + id + " 의 imagePath 에 저장했습니다.";
  } catch (err) {
    message.textContent = errorText(err);
  }
  btn.disabled = false;
});
