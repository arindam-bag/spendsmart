import { useState } from 'react';
import { SEED_EXPENSES, SEED_SHOP_LIST, SEED_RATES, fmt, today, monthKey } from './constants';
import ExpenseSection from './sections/ExpenseSection';
import ShopSection from './sections/ShopSection';

const NAV = [
  { id:"expenses", label:"Expenses",      icon:"💰" },
  { id:"shop",     label:"Shopping",      icon:"🛒" },
];

export default function App() {
  const [screen, setScreen] = useState("expenses");

  // Shared state — both sections can read expenses to calculate cart estimate
  const [expenses, setExpenses] = useState(SEED_EXPENSES);
  const [shopList, setShopList] = useState(SEED_SHOP_LIST);
  const [rates,    setRates]    = useState(SEED_RATES);

  // Header quick stats
  const curMonth = monthKey(today());
  const totalMonth = expenses.filter(e=>monthKey(e.date)===curMonth).reduce((s,e)=>s+Number(e.amount),0);
  const pendingItems = shopList.filter(i=>!i.checked).length;

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#0f172a", minHeight:"100vh", color:"#f1f5f9", display:"flex", flexDirection:"column" }}>

      {/* ── GLOBAL HEADER ── */}
      <div style={{ background:"linear-gradient(135deg,#1e293b,#0f172a)", borderBottom:"1px solid #1e293b", padding:"12px 16px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:820, margin:"0 auto", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:22 }}>{screen==="expenses"?"💰":"🛒"}</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:"-0.5px" }}>
              {screen==="expenses" ? "SpendSmart" : "ShopSmart"}
            </div>
            <div style={{ fontSize:10, color:"#64748b" }}>
              {screen==="expenses" ? "Expense & Budget Tracker" : "Shopping List & Rate Tracker"}
            </div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:12 }}>
            {screen==="expenses" ? (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:9, color:"#64748b" }}>This Month</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#f87171" }}>{fmt(totalMonth)}</div>
              </div>
            ) : (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:9, color:"#64748b" }}>Pending Items</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#4ade80" }}>{pendingItems} items</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, overflowY:"auto", paddingBottom:70, maxWidth:820, width:"100%", margin:"0 auto" }}>
        {screen==="expenses" && (
          <ExpenseSection expenses={expenses} setExpenses={setExpenses} />
        )}
        {screen==="shop" && (
          <ShopSection shopList={shopList} setShopList={setShopList} rates={rates} setRates={setRates} />
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#1e293b", borderTop:"1px solid #334155", zIndex:100 }}>
        <div style={{ maxWidth:820, margin:"0 auto", display:"flex" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={()=>setScreen(n.id)} style={{
              flex:1, background:"transparent", border:"none",
              color: screen===n.id ? (n.id==="expenses"?"#60a5fa":"#4ade80") : "#64748b",
              padding:"10px 0 12px", cursor:"pointer", fontFamily:"inherit",
              borderTop: screen===n.id ? `2px solid ${n.id==="expenses"?"#3b82f6":"#16a34a"}` : "2px solid transparent",
              transition:"all 0.2s",
            }}>
              <div style={{ fontSize:20 }}>{n.icon}</div>
              <div style={{ fontSize:10, fontWeight:screen===n.id?600:400, marginTop:1 }}>{n.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
