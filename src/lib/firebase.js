import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, deleteDoc, getDoc, collection, addDoc, query, orderBy, limit } from "firebase/firestore";

let cloud = null;
let _fs = null; // firestore 인스턴스
let _currentUser = null;

export function getCloud() {
  return cloud;
}
export function login() {
  if (window.__login) window.__login();
}
export function logout() {
  if (window.__logout) window.__logout();
}
export function currentUser() {
  return _currentUser;
}

// 주인(관리자) 이메일 목록 — index.html 의 window.SHARE.owner (문자열 또는 배열)
export function owners() {
  const o = window.SHARE && window.SHARE.owner;
  const arr = Array.isArray(o) ? o : o ? [o] : [];
  return arr.map((e) => String(e).toLowerCase().trim()).filter(Boolean);
}
export function isOwnerEmail(email) {
  return owners().includes(String(email || "").toLowerCase().trim());
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// 선생님(접근 허용) 목록 실시간 구독. 반환값은 구독 해제 함수.
export function subscribeTeachers(cb) {
  if (!_fs) return () => {};
  return onSnapshot(
    collection(_fs, "teachers"),
    (snap) => cb(snap.docs.map((d) => ({ email: d.id, ...d.data() }))),
    (err) => console.error("선생님 목록 오류:", err)
  );
}
export async function addTeacher(email) {
  const e = String(email || "").toLowerCase().trim();
  if (!EMAIL_RE.test(e)) throw new Error("이메일 형식이 올바르지 않습니다.");
  if (isOwnerEmail(e)) throw new Error("이미 주인 계정입니다.");
  await setDoc(doc(_fs, "teachers", e), { addedAt: Date.now(), addedBy: _currentUser?.email || "" });
}
export async function removeTeacher(email) {
  await deleteDoc(doc(_fs, "teachers", String(email || "").toLowerCase().trim()));
}

// 활동 로그 — 누가 무엇을 바꿨는지. 추가만 가능(규칙으로 강제), 열람은 주인만.
export async function writeLog(email, name, items) {
  if (!_fs || !items || !items.length) return;
  try {
    await addDoc(collection(_fs, "logs"), { email, name: name || "", at: Date.now(), items });
  } catch (e) {
    console.error("로그 기록 오류:", e);
  }
}
export function subscribeLogs(cb, max = 300) {
  if (!_fs) return () => {};
  return onSnapshot(
    query(collection(_fs, "logs"), orderBy("at", "desc"), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error("로그 조회 오류:", err)
  );
}

// onRemote(jsonStr) / onStatus(bool) / onAuth(state, info)
//   state: "loading" | "login" | "denied"(info=email) | "error"(info=code) | "ready"(info={email,owner})
export function initFirebase({ onRemote, onStatus, onAuth }) {
  try {
    const cfg = window.SHARE && window.SHARE.firebase;
    if (!(cfg && cfg.apiKey && cfg.projectId)) {
      onStatus(false);
      return;
    }
    const app = initializeApp(cfg);
    const dbf = getFirestore(app);
    _fs = dbf;
    const ref = doc(dbf, "academy", "data");

    let cloudStarted = false;
    function startCloud() {
      if (cloudStarted) return;
      cloudStarted = true;
      onSnapshot(
        ref,
        (snap) => {
          if (snap.metadata.hasPendingWrites) return;
          const d = snap.data();
          if (d && d.json) onRemote(d.json);
        },
        (err) => console.error("공유 수신 오류:", err)
      );
      let timer = null,
        latest = null;
      cloud = {
        save(jsonStr) {
          latest = jsonStr;
          clearTimeout(timer);
          timer = setTimeout(() => {
            setDoc(ref, { json: latest, t: Date.now() }).catch((e) => console.error("공유 저장 오류:", e));
          }, 600);
        },
      };
      onStatus(true);
    }

    if (window.SHARE.auth) {
      import("firebase/auth").then(async (M) => {
        const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } = M;
        const auth = getAuth(app);
        await setPersistence(auth, browserLocalPersistence).catch(() => {});
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });

        window.__login = () =>
          signInWithPopup(auth, provider).catch((e) => {
            const code = (e && e.code) || "";
            // 사용자가 팝업을 닫은 경우는 오류 화면 대신 로그인 화면 유지
            if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
              onAuth("login");
              return;
            }
            console.error("로그인 오류:", e);
            onAuth("error", code);
          });
        window.__logout = () => signOut(auth);

        onAuthStateChanged(auth, async (user) => {
          _currentUser = user || null;
          if (!user) {
            onAuth("login");
            return;
          }
          const email = (user.email || "").toLowerCase();
          const owner = isOwnerEmail(email);
          let allowed = owner;
          if (!allowed) {
            try {
              const snap = await getDoc(doc(dbf, "teachers", email));
              allowed = snap.exists();
            } catch (err) {
              console.error("권한 확인 오류:", err);
            }
          }
          if (allowed) {
            startCloud();
            onAuth("ready", { email: user.email, owner });
          } else {
            onAuth("denied", user.email || "");
          }
        });
      });
    } else {
      startCloud();
    }
  } catch (e) {
    console.error("Firebase 초기화 오류:", e);
    onStatus(false);
  }
}
