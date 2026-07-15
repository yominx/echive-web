export default function Header() {
  return (
    <header>
      <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 20px" }}>
        <svg height="24" viewBox="0 0 116 28" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="이카이브" style={{ display: "block" }}>
          {/* 문서 아이콘 */}
          <rect x="2" y="2" width="20" height="24" rx="4" fill="#1e2a5a" />
          {/* 대괄호 포인트 */}
          <path d="M8 8v-1.5A1.5 1.5 0 0 1 9.5 5H11" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M16 8v-1.5A1.5 1.5 0 0 0 14.5 5H13" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M8 20v1.5A1.5 1.5 0 0 0 9.5 23H11" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M16 20v1.5A1.5 1.5 0 0 1 14.5 23H13" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" />
          {/* 텍스트 라인 */}
          <path d="M7.5 11.5h9M7.5 15h9M7.5 18.5h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          {/* 워드마크 */}
          <text x="30" y="21" fontFamily="'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif" fontSize="20" fontWeight="800" fill="#1e2a5a" letterSpacing="-0.5">이카이브</text>
        </svg>
        <b style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>학원 통합 관리 시스템</b>
      </div>
    </header>
  );
}
