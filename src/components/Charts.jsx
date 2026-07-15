// 손으로 그린 SVG 차트 (원본 앱에서 이관)

const GRID = [0, 0.25, 0.5, 0.75, 1];

export function LineChart({ data }) {
  const W = 440, H = 200, pl = 34, pr = 10, pt = 12, ih = H - pt - 26, iw = W - pl - pr;
  const vals = data.flatMap((d) => [d.score, d.avg]).filter((v) => v != null);
  const max = Math.max(100, ...vals), min = Math.min(0, ...vals);
  const x = (i) => pl + (data.length <= 1 ? iw / 2 : (iw * i) / (data.length - 1));
  const y = (v) => pt + ih - ((v - min) / (max - min || 1)) * ih;
  const pathD = (key) => {
    let d = "", st = false;
    data.forEach((p, i) => {
      const v = p[key];
      if (v == null) return;
      d += (st ? "L" : "M") + x(i) + " " + y(v) + " ";
      st = true;
    });
    return d;
  };
  const avgD = pathD("avg"), scoreD = pathD("score");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200">
      {GRID.map((t, idx) => {
        const yy = pt + ih * t;
        return (
          <g key={idx}>
            <line x1={pl} y1={yy} x2={W - pr} y2={yy} stroke="#eef1f5" />
            <text x={pl - 6} y={yy + 3} fontSize="10" fill="#94a3b8" textAnchor="end">
              {Math.round(max - (max - min) * t)}
            </text>
          </g>
        );
      })}
      {avgD && <path d={avgD} fill="none" stroke="#cbd5e1" strokeWidth="2.4" strokeDasharray="4 3" strokeLinejoin="round" />}
      {scoreD && <path d={scoreD} fill="none" stroke="var(--indigo)" strokeWidth="2.4" strokeLinejoin="round" />}
      {data.map((p, i) => (p.score != null ? <circle key={"c" + i} cx={x(i)} cy={y(p.score)} r="3" fill="var(--indigo)" /> : null))}
      {data.map((d, i) =>
        data.length <= 8 || i % 2 === 0 ? (
          <text key={"l" + i} x={x(i)} y={H - 8} fontSize="9" fill="#94a3b8" textAnchor="middle">
            {String(d.chasi).replace("차시", "")}
          </text>
        ) : null
      )}
    </svg>
  );
}

export function BarChart({ data }) {
  const W = 440, H = 200, pl = 30, pr = 10, pt = 12, ih = H - pt - 26, iw = W - pl - pr, n = data.length, bw = (iw / n) * 0.6;
  const x = (i) => pl + (iw * (i + 0.5)) / n;
  const y = (v) => pt + ih - (v / 100) * ih;
  let ap = "", stt = false;
  data.forEach((d, i) => {
    if (d.wbAvg == null) return;
    ap += (stt ? "L" : "M") + x(i) + " " + y(d.wbAvg) + " ";
    stt = true;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200">
      {GRID.map((t, idx) => {
        const yy = pt + ih * t;
        return (
          <g key={idx}>
            <line x1={pl} y1={yy} x2={W - pr} y2={yy} stroke="#eef1f5" />
            <text x={pl - 6} y={yy + 3} fontSize="10" fill="#94a3b8" textAnchor="end">
              {Math.round(100 - 100 * t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) =>
        d.wbRate != null ? <rect key={"b" + i} x={x(i) - bw / 2} y={y(d.wbRate)} width={bw} height={pt + ih - y(d.wbRate)} rx="2" fill="var(--indigo)" /> : null
      )}
      {ap && <path d={ap} fill="none" stroke="var(--amber)" strokeWidth="2.2" strokeLinejoin="round" />}
      {data.map((d, i) =>
        n <= 8 || i % 2 === 0 ? (
          <text key={"l" + i} x={x(i)} y={H - 8} fontSize="9" fill="#94a3b8" textAnchor="middle">
            {String(d.chasi).replace("차시", "")}
          </text>
        ) : null
      )}
    </svg>
  );
}
