import { useStore } from "../store.jsx";

export default function Header() {
  const { db } = useStore();
  const Stat = ({ label, value }) => (
    <div className="stat">
      <b className="tnum">{value}</b>
      <span>{label}</span>
    </div>
  );
  return (
    <header>
      <div className="wrap head">
        <div>
          <div className="eyebrow">이카이브</div>
          <h1>학원 통합 관리 시스템</h1>
        </div>
        <div className="stats">
          <Stat label="반" value={db.classes.length} />
          <Stat label="학생" value={db.students.length} />
          <Stat label="차시" value={db.sessions.length} />
        </div>
      </div>
    </header>
  );
}
