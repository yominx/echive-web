import { useRef, useState } from "react";
import { useStore } from "../store.jsx";
import { uid } from "../lib/db.js";
import { parseRows, formatPhone } from "../lib/calc.js";
import { classStudents } from "../lib/session.js";

const BLANK = { name: "", school: "", grade: "", sp: "", pp: "" };

export default function RosterTab() {
  const { db, ui, mutate } = useStore();
  const list = classStudents(db, ui.classId); // 이름 가나다순 자동 정렬(추가·삭제 후에도 유지)
  const [form, setForm] = useState(BLANK);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(BLANK);
  const xlsxRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPhone = (k) => (e) => setForm((f) => ({ ...f, [k]: formatPhone(e.target.value) }));

  const add = () => {
    const name = form.name.trim();
    if (!name) return;
    mutate((d) => {
      d.students.push({
        id: uid(),
        classId: ui.classId,
        name,
        school: form.school.trim(),
        grade: form.grade.trim(),
        studentPhone: form.sp.trim(),
        parentPhone: form.pp.trim(),
      });
    });
    setForm(BLANK);
  };

  const onKey = (e) => {
    if (e.key === "Enter") add();
  };

  const importBulk = () => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    const add = lines
      .map((l) => {
        const [name, school, grade, sp, pp] = l.split(/[\t,]/).map((x) => (x || "").trim());
        return { id: uid(), classId: ui.classId, name, school: school || "", grade: grade || "", studentPhone: sp || "", parentPhone: pp || "" };
      })
      .filter((s) => s.name);
    if (add.length) {
      mutate((d) => d.students.push(...add));
      setBulkText("");
    }
  };

  const onXlsx = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const XLSX = await import("xlsx");
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
      const add = parseRows(rows, ui.classId, uid);
      if (add.length) {
        mutate((d) => d.students.push(...add));
        alert(f.name + "\n" + add.length + "명을 명단에 추가했습니다.");
      } else alert("불러올 이름을 찾지 못했습니다. 파일에 이름 열이 있는지 확인해 주세요.");
    } catch (err) {
      console.error(err);
      alert("엑셀 파일을 읽지 못했습니다. .xlsx 형식인지 확인해 주세요.");
    }
    e.target.value = "";
  };

  const downloadTemplate = async () => {
    try {
      const XLSX = await import("xlsx");
      const rows = [
        ["이름", "학교", "학년", "학생연락처", "학부모연락처"],
        ["홍길동", "대치고", "고2", "010-1111-2222", "010-3333-4444"],
        ["", "", "", "", ""],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 18 }, { wch: 18 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "명단");
      XLSX.writeFile(wb, "학생명단_양식.xlsx");
    } catch (e) {
      console.error(e);
      alert("양식을 만들지 못했습니다. 인터넷 연결 확인 후 다시 시도해 주세요.");
    }
  };

  const startEdit = (s) => {
    setEditId(s.id);
    setDraft({ name: s.name || "", school: s.school || "", grade: s.grade || "", studentPhone: s.studentPhone || "", parentPhone: s.parentPhone || "" });
  };
  const cancelEdit = () => setEditId(null);
  const saveEdit = (s) => {
    if (!draft.name.trim()) return; // 이름은 필수
    mutate(() => {
      s.name = draft.name.trim();
      s.school = draft.school.trim();
      s.grade = draft.grade.trim();
      s.studentPhone = draft.studentPhone.trim();
      s.parentPhone = draft.parentPhone.trim();
    });
    setEditId(null);
  };
  const setD = (k) => (e) => setDraft((d) => ({ ...d, [k]: k === "studentPhone" || k === "parentPhone" ? formatPhone(e.target.value) : e.target.value }));

  const delStudent = (s) => {
    if (confirm("이 학생을 삭제할까요?")) mutate((d) => (d.students = d.students.filter((x) => x.id !== s.id)));
  };
  const toggleOpening = (s) => mutate(() => (s.openingSent = !s.openingSent));

  return (
    <>
      <h2>학생 명단</h2>
      <p className="desc">학생을 한 번만 등록하면 채점·안내카드·문자에 자동 반영됩니다.</p>
      <div className="panel pad" style={{ marginBottom: 16 }}>
        <div className="row">
          <input placeholder="이름" style={{ width: 96 }} value={form.name} onChange={set("name")} onKeyDown={onKey} />
          <input placeholder="학교" style={{ width: 112 }} value={form.school} onChange={set("school")} onKeyDown={onKey} />
          <input placeholder="학년" style={{ width: 64 }} value={form.grade} onChange={set("grade")} onKeyDown={onKey} />
          <input placeholder="학생 연락처" style={{ width: 150 }} value={form.sp} onChange={setPhone("sp")} onKeyDown={onKey} />
          <input placeholder="학부모 연락처" style={{ width: 150 }} value={form.pp} onChange={setPhone("pp")} onKeyDown={onKey} />
          <button className="btn" onClick={add}>추가</button>
          <button className="btn line" style={{ marginLeft: "auto" }} onClick={() => { setShowBulk(true); xlsxRef.current?.click(); }}>
            엑셀 파일 업로드
          </button>
          <button className="btn line" onClick={downloadTemplate}>양식 다운로드</button>
          <button className="link" onClick={() => setShowBulk((v) => !v)}>붙여넣기</button>
        </div>
        {showBulk && (
          <div style={{ marginTop: 12, borderTop: "1px solid var(--line2)", paddingTop: 12 }}>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px" }}>
              <b>엑셀 파일 업로드</b>: .xlsx 파일을 올리면 자동으로 읽습니다. 첫 줄에 <b>이름·학교·학년·학생연락처·학부모연락처</b> 같은 제목이 있으면 알아서 맞춥니다(순서 달라도 OK). 제목이 없으면 왼쪽부터 이름/학교/학년/학생연락처/학부모연락처 순으로 읽습니다.
              <br />
              또는 아래 칸에 엑셀에서 <b>복사해 붙여넣기</b>도 됩니다. (탭·쉼표 구분, 한 줄에 한 명)
            </p>
            <textarea
              rows={5}
              style={{ width: "100%", fontFamily: "ui-monospace,monospace" }}
              placeholder={"홍길동\t대치고\t고2\t010-1111-2222\t010-3333-4444"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <button className="btn dark" style={{ marginTop: 8 }} onClick={importBulk}>붙여넣기 가져오기</button>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="empty">이 반에 등록된 학생이 없습니다. 위에서 추가하거나 명단을 붙여넣어 주세요.</div>
      ) : (
        <div className="panel">
          <div style={{ padding: "9px 16px", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--line2)" }}>{list.length}명</div>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  {["#", "이름", "학교", "학년", "학생 연락처", "학부모 연락처", "개강안내", ""].map((h, i) => (
                    <th key={i} style={h === "개강안내" ? { textAlign: "center" } : undefined}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => {
                  const editing = editId === s.id;
                  if (editing) {
                    const cell = (k, w, ph, tnum) => (
                      <td style={{ padding: "4px 8px" }}>
                        <input
                          className={tnum ? "tnum" : ""}
                          style={{ width: w, padding: "5px 8px" }}
                          value={draft[k]}
                          placeholder={ph}
                          onChange={setD(k)}
                          autoFocus={k === "name"}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(s); if (e.key === "Escape") cancelEdit(); }}
                        />
                      </td>
                    );
                    return (
                      <tr key={s.id} style={{ background: "#f8fafc" }}>
                        <td className="tnum" style={{ color: "var(--muted)" }}>{i + 1}</td>
                        {cell("name", 90, "이름")}
                        {cell("school", 110, "학교")}
                        {cell("grade", 60, "학년")}
                        {cell("studentPhone", 140, "학생 연락처", true)}
                        {cell("parentPhone", 140, "학부모 연락처", true)}
                        <td style={{ textAlign: "center" }}>
                          <input type="checkbox" checked={!!s.openingSent} onChange={() => toggleOpening(s)} title="개강안내 문자 전송 완료" />
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <button className="btn sm" onClick={() => saveEdit(s)}>저장</button>
                          <button className="link" style={{ marginLeft: 10 }} onClick={cancelEdit}>취소</button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={s.id}>
                      <td className="tnum" style={{ color: "var(--muted)" }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.school || "–"}</td>
                      <td>{s.grade || "–"}</td>
                      <td className="tnum">{s.studentPhone || "–"}</td>
                      <td className="tnum">{s.parentPhone || "–"}</td>
                      <td style={{ textAlign: "center" }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", color: s.openingSent ? "var(--emerald)" : "var(--muted)", fontSize: 12, fontWeight: 600 }} title="개강안내 문자 전송 여부">
                          <input type="checkbox" checked={!!s.openingSent} onChange={() => toggleOpening(s)} />
                          {s.openingSent ? "전송됨" : "미전송"}
                        </label>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button className="link" onClick={() => startEdit(s)}>수정</button>
                        <button className="del" style={{ marginLeft: 12 }} onClick={() => delStudent(s)}>삭제</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <input ref={xlsxRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onXlsx} />
    </>
  );
}
