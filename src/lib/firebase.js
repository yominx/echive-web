import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

let cloud = null;
export function getCloud() {
  return cloud;
}
export function login() {
  if (window.__login) window.__login();
}
export function logout() {
  if (window.__logout) window.__logout();
}

// onRemote(jsonStr): 클라우드에서 갱신 수신
// onStatus(bool): 공유 연결 상태
// onAuth(state, info): "login" | "denied" | "ready"  (auth 사용 시에만 호출)
export function initFirebase({ onRemote, onStatus, onAuth }) {
  let started = false;
  try {
    const cfg = window.SHARE && window.SHARE.firebase;
    if (!(cfg && cfg.apiKey && cfg.projectId)) {
      onStatus(false);
      return;
    }
    const app = initializeApp(cfg);
    const dbf = getFirestore(app);
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
      import("firebase/auth").then(
        ({ getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence }) => {
          const auth = getAuth(app);
          setPersistence(auth, browserLocalPersistence).catch(() => {});
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
          window.__login = () =>
            signInWithPopup(auth, provider).catch((e) => {
              console.error("로그인 오류:", e);
              onAuth("login");
              if (e && e.code) alert("로그인에 실패했습니다: " + e.code);
            });
          window.__logout = () => signOut(auth);
          onAuthStateChanged(auth, (user) => {
            if (!user) {
              onAuth("login");
              return;
            }
            const allow = (window.SHARE.allow || []).map((e) => String(e).toLowerCase().trim()).filter(Boolean);
            const email = (user.email || "").toLowerCase();
            if (allow.length && allow.includes(email)) {
              startCloud();
              onAuth("ready");
            } else {
              onAuth("denied", user.email || "");
            }
          });
        }
      );
    } else {
      startCloud();
    }
  } catch (e) {
    console.error("Firebase 초기화 오류:", e);
    onStatus(false);
  }
  return started;
}
