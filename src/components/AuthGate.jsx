import { LOGO_SRC } from "../lib/constants.js";
import { login } from "../lib/firebase.js";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#4285F4" d="M45 24c0-1.6-.1-3.1-.4-4.6H24v9h11.8c-.5 2.7-2 5-4.3 6.6v5.5h7C42.6 36.7 45 30.9 45 24z" />
    <path fill="#34A853" d="M24 46c5.9 0 10.8-2 14.4-5.4l-7-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C3 17.1 2.2 20.4 2.2 24s.8 6.9 2.3 9.9l7.3-5.7z" />
    <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.8 4.1 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9.1 12.2-9.1z" />
  </svg>
);

const Logo = () => <img src={LOGO_SRC} alt="이카이브" style={{ height: 44, marginBottom: 26 }} />;

const LoginBtn = () => (
  <button
    onClick={() => login()}
    style={{
      background: "#fff",
      color: "#0f172a",
      border: "none",
      borderRadius: 10,
      padding: "12px 20px",
      fontWeight: 700,
      fontSize: 14,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
    }}
  >
    <GoogleIcon />
    Google 계정으로 로그인
  </button>
);

export default function AuthGate({ state, email }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0f172a",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}
    >
      {state === "loading" && (
        <div style={{ textAlign: "center" }}>
          <Logo />
          <div style={{ color: "#94a3b8", fontSize: 13 }}>로그인 확인 중…</div>
        </div>
      )}
      {state === "denied" && (
        <div style={{ textAlign: "center", maxWidth: 360, padding: 24 }}>
          <Logo />
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>접근 권한이 없습니다</div>
          <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7, marginBottom: 22 }}>
            이 구글 계정은 승인되지 않았습니다.
            <br />
            <b style={{ color: "#e2e8f0" }}>{email}</b>
            <br />
            관리자에게 이 계정의 승인을 요청하세요.
          </div>
          <LoginBtn />
        </div>
      )}
      {state === "login" && (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Logo />
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>학원 통합 관리</div>
          <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 24 }}>승인된 구글 계정으로 로그인해 주세요.</div>
          <LoginBtn />
        </div>
      )}
    </div>
  );
}
