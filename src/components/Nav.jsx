import { useState } from "react";
import { useStore } from "../store.jsx";
import { classSessions, resolveSessionId } from "../lib/session.js";
import { dateMismatch } from "../lib/calc.js";
import SessionGenerator from "./SessionGenerator.jsx";

const ITEMS = [
  ["roster", "① 명단"],
  ["attend", "② 출결"],
  ["score", "③ 채점"],
  ["card", "④ 안내카드"],
  ["msg", "⑤ 안내·숙제"],
  ["data", "⑥ 종합"],
];
const OWNER_ONLY = new Set(["roster", "data"]);

export default function Nav() {
  const { db, ui, setUi, isOwner } = useStore();
  const [showGen, setShowGen] = useState(false);
  const items = ITEMS.filter(([k]) => !OWNER_ONLY.has(k) || isOwner);

  const sessions = ui.classId ? classSessions(db, ui.classId) : [];
  const curId = resolveSessionId(db, sessions, ui.sess) ?? "";
  const curSession = sessions.find((s) => s.id === curId);
  const dateWarn = curSession && dateMismatch(curSession.date);

  return (
    <nav>
      <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {items.map(([k, l]) => (
            <button key={k} className={"tab" + (ui.tab === k ? " on" : "")} onClick={() => setUi({ tab: k })}>
              {l}
            </button>
          ))}
        </div>
        {ui.classId && (
          <div className="row noprint" style={{ gap: 6, flexShrink: 0 }}>
            {dateWarn && (
              <span style={{ color: "var(--rose)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }} title={`이 차시 날짜(${curSession.date})가 오늘과 다릅니다`}>
                ⚠ 오늘 날짜와 다릅니다
              </span>
            )}
            {sessions.length > 0 && (
              <select value={curId} onChange={(e) => setUi({ sess: e.target.value })} style={{ padding: "6px 9px", fontSize: 13, minWidth: 150 }}>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.chasi}차시 {s.date ? "· " + s.date : ""}
                  </option>
                ))}
              </select>
            )}
            <button className="btn line sm" onClick={() => setShowGen(true)}>📅 차시 생성기</button>
          </div>
        )}
      </div>
      {showGen && <SessionGenerator onClose={() => setShowGen(false)} />}
    </nav>
  );
}
