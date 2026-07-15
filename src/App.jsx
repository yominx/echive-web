import { useEffect, useRef, useState } from "react";
import { useStore } from "./store.jsx";
import { initFirebase } from "./lib/firebase.js";
import Header from "./components/Header.jsx";
import ClassBar from "./components/ClassBar.jsx";
import Nav from "./components/Nav.jsx";
import Footer from "./components/Footer.jsx";
import AuthGate from "./components/AuthGate.jsx";
import RosterTab from "./components/RosterTab.jsx";
import GradeTab from "./components/GradeTab.jsx";
import CardsTab from "./components/CardsTab.jsx";
import MsgTab from "./components/MsgTab.jsx";
import DataTab from "./components/DataTab.jsx";

// 접속 코드 게이트(auth 미사용 시)
function gate() {
  const code = window.SHARE && window.SHARE.code;
  if (!code) return true;
  if (sessionStorage.getItem("acc_ok") === "1") return true;
  const c = prompt("접속 코드를 입력하세요");
  if (c === code) {
    sessionStorage.setItem("acc_ok", "1");
    return true;
  }
  return false;
}

export default function App() {
  const { ui, applyRemote, setMe, isOwner } = useStore();
  const useAuth = !!(window.SHARE && window.SHARE.auth);
  const [phase, setPhase] = useState(useAuth ? "loading" : "boot");
  const [deniedEmail, setDeniedEmail] = useState("");
  const [errCode, setErrCode] = useState("");
  const [cloudOn, setCloudOn] = useState(false);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    initFirebase({
      onRemote: (json) => applyRemote(json),
      onStatus: setCloudOn,
      onAuth: (state, info) => {
        if (state === "ready") {
          setMe({ email: info?.email || "", owner: !!info?.owner });
          setPhase("ready");
        } else if (state === "denied") {
          setDeniedEmail(info || "");
          setPhase("denied");
        } else if (state === "error") {
          setErrCode(info || "");
          setPhase("error");
        } else setPhase("login");
      },
    });

    if (!useAuth) {
      // 로컬 전용(비인증) 모드에서는 단일 사용자를 주인으로 취급
      setMe({ email: "", owner: true });
      setPhase(gate() ? "ready" : "blocked");
    } else {
      // 로그인 모듈 로딩이 느릴 때 6초 후 로그인 화면 노출
      const t = setTimeout(() => setPhase((p) => (p === "loading" ? "login" : p)), 6000);
      return () => clearTimeout(t);
    }
  }, [useAuth]);

  if (phase === "blocked") {
    return (
      <div style={{ padding: 64, textAlign: "center", color: "#94a3b8", fontFamily: "system-ui" }}>
        접속 코드가 필요합니다.
        <br />
        새로고침 후 다시 입력해 주세요.
      </div>
    );
  }

  if (phase !== "ready") {
    return <AuthGate state={phase === "loading" ? "loading" : phase} email={deniedEmail} code={errCode} />;
  }

  return (
    <>
      <Header />
      <ClassBar />
      <Nav />
      <main>
        <div className="wrap">
          {!ui.classId ? (
            <div className="empty">위에서 반을 먼저 만들어 주세요. (예: 고A)</div>
          ) : ui.tab === "roster" ? (
            isOwner ? <RosterTab /> : <div className="empty">명단 관리는 주인(관리자)만 사용할 수 있습니다.</div>
          ) : ui.tab === "grade" ? (
            <GradeTab />
          ) : ui.tab === "card" ? (
            <CardsTab />
          ) : ui.tab === "data" ? (
            isOwner ? <DataTab /> : <div className="empty">종합 DATA는 주인(관리자)만 볼 수 있습니다.</div>
          ) : (
            <MsgTab />
          )}
        </div>
      </main>
      <Footer cloudOn={cloudOn} />
    </>
  );
}
