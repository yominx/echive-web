import { LOGO_HEADER } from "../lib/constants.js";

export default function Header() {
  return (
    <header>
      <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 20px" }}>
        <img src={LOGO_HEADER} alt="이카이브" style={{ height: 26, width: "auto", display: "block" }} />
        <b style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>학원 통합 관리 시스템</b>
      </div>
    </header>
  );
}
