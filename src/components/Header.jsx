import { LOGO_SRC } from "../lib/constants.js";

export default function Header() {
  return (
    <header>
      <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 20px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#0f172a", borderRadius: 8, padding: "5px 9px" }}>
          <img src={LOGO_SRC} alt="이카이브" style={{ height: 18, width: "auto", display: "block" }} />
        </span>
        <b style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>학원 통합 관리 시스템</b>
      </div>
    </header>
  );
}
