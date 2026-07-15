import { useStore } from "../store.jsx";

const ITEMS = [
  ["roster", "① 명단"],
  ["grade", "② 출결·채점"],
  ["card", "③ 안내카드"],
  ["msg", "④ 안내·숙제"],
];

export default function Nav() {
  const { ui, setUi, me } = useStore();
  const items = ITEMS.filter(([k]) => k !== "roster" || me?.owner);
  return (
    <nav>
      <div className="wrap">
        {items.map(([k, l]) => (
          <button key={k} className={"tab" + (ui.tab === k ? " on" : "")} onClick={() => setUi({ tab: k })}>
            {l}
          </button>
        ))}
      </div>
    </nav>
  );
}
