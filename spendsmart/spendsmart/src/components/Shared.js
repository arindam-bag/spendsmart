import { fmt, pctChange } from '../constants';

export function MiniBar({ value, max, color, alert: alertMode }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = alertMode && pct >= 90 ? "#f87171" : alertMode && pct >= 75 ? "#fbbf24" : color;
  return (
    <div style={{ background:"#0f172a", borderRadius:4, height:8, flex:1, overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, height:"100%", background:barColor, borderRadius:4, transition:"width 0.5s ease" }} />
    </div>
  );
}

export function DonutChart({ data }) {
  const cx=80,cy=80,r=60,stroke=22,circ=2*Math.PI*r;
  const total = data.reduce((s,d)=>s+d.value,0);
  let off=0;
  const slices = data.filter(d=>d.value>0).map(d=>{
    const dash=(d.value/total)*circ,gap=circ-dash,sl={...d,dash,gap,offset:off}; off+=dash; return sl;
  });
  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke}/>
      {slices.map((s,i)=>(
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={-s.offset+circ*0.25}/>
      ))}
      <text x={cx} y={cy-6} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="DM Sans,sans-serif">This Month</text>
      <text x={cx} y={cy+12} textAnchor="middle" fill="#f1f5f9" fontSize={12} fontWeight="bold" fontFamily="DM Sans,sans-serif">{fmt(total)}</text>
    </svg>
  );
}

export function BarComparePair({ thisVal, lastVal, label, color }) {
  const maxV = Math.max(thisVal, lastVal, 1), h=50;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1 }}>
      <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:h }}>
        <div style={{ width:10, height:Math.max((lastVal/maxV)*h,2), background:"#475569", borderRadius:"2px 2px 0 0" }}/>
        <div style={{ width:10, height:Math.max((thisVal/maxV)*h,2), background:color, borderRadius:"2px 2px 0 0" }}/>
      </div>
      <div style={{ fontSize:9, color:"#64748b" }}>{label}</div>
    </div>
  );
}

export function AlertBadge({ msg }) {
  return (
    <div style={{ background:"#451a03", border:"1px solid #92400e", borderRadius:8, padding:"7px 12px", fontSize:11, color:"#fbbf24", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
      <span>⚠️</span><span>{msg}</span>
    </div>
  );
}

export function RateArrow({ change }) {
  if (change === null || change === undefined) return <span style={{color:"#64748b",fontSize:11}}>—</span>;
  const up = parseFloat(change) > 0, same = parseFloat(change) === 0;
  if (same) return <span style={{color:"#64748b",fontSize:11}}>→ 0%</span>;
  return <span style={{ color:up?"#f87171":"#4ade80", fontWeight:700, fontSize:11 }}>{up?"▲":"▼"} {Math.abs(change)}%</span>;
}

export function KpiCard({ icon, label, value, color, sub }) {
  return (
    <div style={{ background:"#1e293b", borderRadius:10, padding:"12px 10px", border:"1px solid #334155" }}>
      <div style={{ fontSize:16 }}>{icon}</div>
      <div style={{ fontSize:16, fontWeight:700, color, marginTop:3 }}>{value}</div>
      <div style={{ fontSize:10, color:"#64748b" }}>{label}</div>
      {sub && <div style={{ fontSize:9, color:"#475569" }}>{sub}</div>}
    </div>
  );
}
