import { useState, useRef, useEffect } from 'react';
import { CATEGORIES, ACCOUNTS, IS, LBL, CHIP, fmt, today, monthKey, prevMonthKey, weekKey } from '../constants';
import { MiniBar, DonutChart, BarComparePair, AlertBadge, KpiCard } from '../components/Shared';

export default function ExpenseSection({ expenses, setExpenses }) {
  const [tab, setTab]               = useState("dashboard");
  const [accountFilter, setAccountFilter] = useState("all");
  const [budgets, setBudgets]       = useState({ groceries:5000, vegetables:1500, meat_fish:2000, outside_food:2000, drinks:800, travel:1000, fuel:2000, utilities:2500, healthcare:1000, entertainment:1000, shopping:3000, other:1000 });
  const [budgetEdit, setBudgetEdit] = useState({ groceries:5000, vegetables:1500, meat_fish:2000, outside_food:2000, drinks:800, travel:1000, fuel:2000, utilities:2500, healthcare:1000, entertainment:1000, shopping:3000, other:1000 });
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [alerts, setAlerts]         = useState([]);
  const [newExp, setNewExp]         = useState({ date:today(), category:"groceries", item:"", amount:"", note:"", account:"cash" });
  const [filterPeriod, setFilterPeriod] = useState("month");
  const [filterCat, setFilterCat]   = useState("all");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing]   = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const fileRef = useRef();

  const curMonth = monthKey(today()), prevMonth = prevMonthKey();
  const scoped   = accountFilter==="all" ? expenses : expenses.filter(e=>e.account===accountFilter);
  const monthExp = scoped.filter(e=>monthKey(e.date)===curMonth);
  const prevExp  = scoped.filter(e=>monthKey(e.date)===prevMonth);
  const totalMonth = monthExp.reduce((s,e)=>s+Number(e.amount),0);
  const totalPrev  = prevExp.reduce((s,e)=>s+Number(e.amount),0);
  const totalBudget = Object.values(budgets).reduce((s,v)=>s+v,0);

  const catSpend={}, catPrev={};
  Object.keys(CATEGORIES).forEach(c=>{catSpend[c]=0;catPrev[c]=0;});
  monthExp.forEach(e=>{catSpend[e.category]=(catSpend[e.category]||0)+Number(e.amount);});
  prevExp.forEach(e=>{catPrev[e.category]=(catPrev[e.category]||0)+Number(e.amount);});
  const acctTotals={};
  ACCOUNTS.forEach(a=>{acctTotals[a.id]=monthExp.filter(e=>e.account===a.id).reduce((s,e)=>s+Number(e.amount),0);});

  useEffect(()=>{
    const triggered=Object.entries(CATEGORIES).filter(([k])=>budgets[k]>0&&(catSpend[k]/budgets[k])*100>=alertThreshold)
      .map(([k,cat])=>`${cat.icon} ${cat.label}: ${Math.round((catSpend[k]/budgets[k])*100)}% used (${fmt(catSpend[k])} / ${fmt(budgets[k])})`);
    setAlerts(triggered);
  // eslint-disable-next-line
  },[JSON.stringify(catSpend),JSON.stringify(budgets),alertThreshold]);

  const last7 = Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(6-i));
    const key=d.toISOString().split("T")[0];
    const days=["Su","Mo","Tu","We","Th","Fr","Sa"];
    return { label:days[d.getDay()], val:scoped.filter(e=>e.date===key).reduce((s,e)=>s+Number(e.amount),0), isToday:i===6 };
  });
  const maxDay=Math.max(...last7.map(d=>d.val),1);

  const now2=new Date();
  const filtered=scoped.filter(e=>{
    if(filterCat!=="all"&&e.category!==filterCat)return false;
    const d=new Date(e.date);
    if(filterPeriod==="day") return e.date===today();
    if(filterPeriod==="week") return weekKey(e.date)===weekKey(today());
    if(filterPeriod==="month") return monthKey(e.date)===curMonth;
    if(filterPeriod==="year") return d.getFullYear()===now2.getFullYear();
    return true;
  });
  const grouped={};
  filtered.forEach(e=>{
    const key=filterPeriod==="day"?e.date:filterPeriod==="week"?weekKey(e.date):filterPeriod==="month"?monthKey(e.date):new Date(e.date).getFullYear().toString();
    if(!grouped[key])grouped[key]=[];
    grouped[key].push(e);
  });

  function addExpense(){if(!newExp.item||!newExp.amount)return;setExpenses(p=>[...p,{...newExp,id:Date.now(),amount:Number(newExp.amount)}]);setNewExp({date:today(),category:"groceries",item:"",amount:"",note:"",account:"cash"});}
  function deleteExpense(id){setExpenses(p=>p.filter(e=>e.id!==id));}
  function saveBudgets(){setBudgets({...budgetEdit});}
  function exportCSV(){
    const rows=[["Date","Category","Item","Amount","Account","Note"]];
    filtered.forEach(e=>rows.push([e.date,CATEGORIES[e.category]?.label,e.item,e.amount,ACCOUNTS.find(a=>a.id===e.account)?.label||e.account,e.note||""]));
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`expenses_${filterPeriod}_${today()}.csv`;a.click();
  }
  async function analyzeStatement(file){
    setAnalyzing(true);setAnalyzeError("");setAnalysisResult(null);
    const catList=Object.entries(CATEGORIES).map(([k,v])=>`${k}(${v.label})`).join(",");
    const prompt=`Analyze this bank/credit card statement. Extract all debit/expense transactions and categorize each into one of: ${catList}. Return ONLY valid JSON: {"transactions":[{"date":"YYYY-MM-DD","description":"...","amount":123,"category":"groceries","type":"debit"}],"summary":{"total_spend":0,"by_category":{},"period":""}}`;
    try{
      let content=[];
      const ext=file.name.split(".").pop().toLowerCase();
      const toB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
      if(["jpg","jpeg","png","webp"].includes(ext)){const b64=await toB64(file),mt=ext==="png"?"image/png":ext==="webp"?"image/webp":"image/jpeg";content=[{type:"image",source:{type:"base64",media_type:mt,data:b64}},{type:"text",text:prompt}];}
      else if(ext==="pdf"){const b64=await toB64(file);content=[{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},{type:"text",text:prompt}];}
      else{const text=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsText(file);});content=[{type:"text",text:`Statement:\n${text.slice(0,8000)}\n\n${prompt}`}];}
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content}]})});
      const data=await res.json();
      const raw=data.content?.map(b=>b.text||"").join("")||"";
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setAnalysisResult(parsed);
      if(parsed.transactions?.length){const imp=parsed.transactions.filter(t=>t.type==="debit"||t.amount>0).map(t=>({id:Date.now()+Math.random(),date:t.date||today(),category:t.category||"other",item:t.description,amount:Math.abs(t.amount),note:"Imported",account:"other"}));setExpenses(p=>[...p,...imp]);}
    }catch{setAnalyzeError("Could not parse statement. Try a clearer image or text-based PDF/CSV.");}
    setAnalyzing(false);
  }

  const donutData=Object.entries(catSpend).filter(([,v])=>v>0).map(([k,v])=>({label:CATEGORIES[k].label,value:v,color:CATEGORIES[k].color}));

  const TABS=[{id:"dashboard",label:"Dashboard",icon:"📊"},{id:"add",label:"Add",icon:"➕"},{id:"budget",label:"Budget",icon:"🎯"},{id:"compare",label:"Compare",icon:"📅"},{id:"analysis",label:"Analysis",icon:"📈"},{id:"import",label:"Import",icon:"📤"}];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{display:"flex",gap:2,overflowX:"auto",padding:"0 12px",background:"#0f172a",borderBottom:"1px solid #1e293b"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"#3b82f6":"transparent",border:"none",color:tab===t.id?"#fff":"#94a3b8",padding:"8px 12px",borderRadius:"0 0 0 0",cursor:"pointer",fontSize:11,fontWeight:500,whiteSpace:"nowrap",fontFamily:"inherit",borderBottom:tab===t.id?"2px solid #3b82f6":"2px solid transparent"}}>
            {t.icon} {t.label}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",padding:"0 8px",gap:8}}>
          <select value={accountFilter} onChange={e=>setAccountFilter(e.target.value)} style={{...IS,fontSize:10,padding:"3px 6px",width:"auto"}}>
            <option value="all">🏦 All</option>
            {ACCOUNTS.map(a=><option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
          </select>
        </div>
      </div>

      {alerts.length>0&&(
        <div style={{background:"#451a03",borderBottom:"1px solid #92400e",padding:"5px 12px",fontSize:10,color:"#fbbf24",display:"flex",gap:10,overflowX:"auto",whiteSpace:"nowrap"}}>
          <span style={{fontWeight:700}}>⚠️</span>{alerts.map((a,i)=><span key={i}>{a}</span>)}
        </div>
      )}

      <div style={{padding:"14px 12px"}}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:14}}>
              <KpiCard icon="💚" label="Budget Left" value={fmt(Math.max(totalBudget-totalMonth,0))} color="#4ade80" sub={`of ${fmt(totalBudget)}`}/>
              <KpiCard icon="📅" label="Spent Today" value={fmt(scoped.filter(e=>e.date===today()).reduce((s,e)=>s+Number(e.amount),0))} color="#fb923c" sub="today"/>
              <KpiCard icon="📊" label="vs Last Month" value={(totalMonth>totalPrev?"+":"")+fmt(totalMonth-totalPrev)} color={totalMonth>totalPrev?"#f87171":"#4ade80"} sub={`last: ${fmt(totalPrev)}`}/>
              <KpiCard icon="📝" label="Entries" value={monthExp.length} color="#a78bfa" sub="this month"/>
            </div>
            <div style={{background:"#1e293b",borderRadius:10,padding:14,marginBottom:12,border:"1px solid #334155"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:10,color:"#94a3b8"}}>Last 7 Days</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:4,height:60}}>
                {last7.map((d,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    {d.val>0&&<div style={{fontSize:8,color:"#64748b",textAlign:"center"}}>{fmt(d.val)}</div>}
                    <div style={{width:"100%",flex:1,display:"flex",alignItems:"flex-end"}}>
                      <div style={{width:"100%",height:Math.max((d.val/maxDay)*44,d.val>0?3:0),background:d.isToday?"#3b82f6":"#334155",borderRadius:"3px 3px 0 0",transition:"height 0.4s"}}/>
                    </div>
                    <div style={{fontSize:9,color:d.isToday?"#60a5fa":"#475569"}}>{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"#1e293b",borderRadius:10,padding:14,marginBottom:12,border:"1px solid #334155"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:10,color:"#94a3b8"}}>Accounts — This Month</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(80px,1fr))",gap:6}}>
                {ACCOUNTS.map(a=>(
                  <div key={a.id} onClick={()=>setAccountFilter(a.id)} style={{background:"#0f172a",borderRadius:8,padding:"10px 6px",textAlign:"center",border:`1px solid ${acctTotals[a.id]>0?"#334155":"#1e293b"}`,cursor:"pointer",opacity:acctTotals[a.id]>0?1:0.35}}>
                    <div style={{fontSize:16}}>{a.icon}</div>
                    <div style={{fontSize:9,fontWeight:600,margin:"2px 0"}}>{a.label}</div>
                    <div style={{fontSize:11,color:a.color,fontWeight:700}}>{fmt(acctTotals[a.id])}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:12,background:"#1e293b",borderRadius:10,padding:14,marginBottom:12,border:"1px solid #334155"}}>
              <DonutChart data={donutData}/>
              <div>
                <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:"#94a3b8"}}>By Category</div>
                {Object.entries(CATEGORIES).filter(([k])=>catSpend[k]>0).map(([k,cat])=>(
                  <div key={k} style={{marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}>
                      <span>{cat.icon} {cat.label}</span><span style={{color:catSpend[k]>(budgets[k]||0)?"#f87171":"#94a3b8"}}>{fmt(catSpend[k])}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <MiniBar value={catSpend[k]} max={budgets[k]||catSpend[k]} color={cat.color} alert/>
                      <span style={{fontSize:9,color:"#475569",minWidth:32}}>/{fmt(budgets[k]||0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"#1e293b",borderRadius:10,padding:14,border:"1px solid #334155"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:10,color:"#94a3b8"}}>Recent Transactions</div>
              {scoped.slice(-6).reverse().map(e=>(
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #0f172a"}}>
                  <span style={{fontSize:16}}>{CATEGORIES[e.category]?.icon}</span>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.item}</div><div style={{fontSize:10,color:"#64748b"}}>{e.date} · {ACCOUNTS.find(a=>a.id===e.account)?.icon}</div></div>
                  <div style={{fontWeight:600,color:"#f87171",fontSize:12,whiteSpace:"nowrap"}}>{fmt(e.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADD */}
        {tab==="add"&&(
          <div>
            <div style={{background:"#1e293b",borderRadius:10,padding:16,marginBottom:14,border:"1px solid #334155"}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Add New Expense</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={LBL}>Date</label><input type="date" value={newExp.date} onChange={e=>setNewExp(p=>({...p,date:e.target.value}))} style={IS}/></div>
                <div><label style={LBL}>Amount (₹)</label><input type="number" value={newExp.amount} onChange={e=>setNewExp(p=>({...p,amount:e.target.value}))} placeholder="0" style={IS}/></div>
                <div><label style={LBL}>Category</label><select value={newExp.category} onChange={e=>setNewExp(p=>({...p,category:e.target.value}))} style={IS}>{Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
                <div><label style={LBL}>Account</label><select value={newExp.account} onChange={e=>setNewExp(p=>({...p,account:e.target.value}))} style={IS}>{ACCOUNTS.map(a=><option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}</select></div>
                <div style={{gridColumn:"1/-1"}}><label style={LBL}>Item / Description</label><input type="text" value={newExp.item} onChange={e=>setNewExp(p=>({...p,item:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addExpense()} placeholder="e.g. Rohu Fish, Metro fare…" style={IS}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={LBL}>Note (optional)</label><input type="text" value={newExp.note} onChange={e=>setNewExp(p=>({...p,note:e.target.value}))} placeholder="Optional note" style={IS}/></div>
              </div>
              <button onClick={addExpense} style={BTN("blue")}>➕ Add Expense</button>
            </div>
            <div style={{background:"#1e293b",borderRadius:10,padding:14,border:"1px solid #334155"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:10,color:"#94a3b8"}}>All Expenses ({expenses.length})</div>
              {expenses.slice().reverse().map(e=>(
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid #0f172a"}}>
                  <span style={{fontSize:16}}>{CATEGORIES[e.category]?.icon}</span>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.item}</div><div style={{fontSize:10,color:"#64748b"}}>{e.date} · {CATEGORIES[e.category]?.label} · {ACCOUNTS.find(a=>a.id===e.account)?.icon}</div></div>
                  <span style={{fontWeight:600,color:"#f87171",fontSize:12,whiteSpace:"nowrap",marginRight:6}}>{fmt(e.amount)}</span>
                  <button onClick={()=>deleteExpense(e.id)} style={{background:"transparent",border:"none",color:"#475569",cursor:"pointer",fontSize:13}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BUDGET */}
        {tab==="budget"&&(
          <div>
            <div style={{background:"#1e293b",borderRadius:10,padding:16,border:"1px solid #334155"}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Monthly Budget</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                <span style={{fontSize:11,color:"#64748b"}}>Alert at</span>
                <select value={alertThreshold} onChange={e=>setAlertThreshold(Number(e.target.value))} style={{...IS,width:"auto",padding:"3px 8px",fontSize:11}}>
                  {[60,70,75,80,85,90,100].map(v=><option key={v} value={v}>{v}%</option>)}
                </select>
                <span style={{fontSize:11,color:"#64748b"}}>of budget</span>
              </div>
              {alerts.length>0&&<div style={{marginBottom:12}}>{alerts.map((a,i)=><AlertBadge key={i} msg={a}/>)}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {Object.entries(CATEGORIES).map(([k,cat])=>(
                  <div key={k} style={{background:"#0f172a",borderRadius:8,padding:10,border:"1px solid #334155"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:11}}>{cat.icon} {cat.label}</span><span style={{fontSize:9,color:catSpend[k]>budgetEdit[k]?"#f87171":"#4ade80"}}>{fmt(catSpend[k])} used</span></div>
                    <input type="number" value={budgetEdit[k]} onChange={e=>setBudgetEdit(p=>({...p,[k]:Number(e.target.value)}))} style={{...IS,marginBottom:5}}/>
                    <MiniBar value={catSpend[k]} max={budgetEdit[k]} color={cat.color} alert/>
                    <div style={{fontSize:9,color:"#475569",marginTop:3}}>{budgetEdit[k]>0?Math.round((catSpend[k]/budgetEdit[k])*100):0}% used</div>
                  </div>
                ))}
              </div>
              <button onClick={saveBudgets} style={BTN("blue")}>💾 Save Budgets</button>
              <div style={{marginTop:12,padding:12,background:"#0f172a",borderRadius:8,display:"flex",justifyContent:"space-between"}}>
                <div><div style={{fontSize:10,color:"#64748b"}}>Total Budget</div><div style={{fontSize:18,fontWeight:700,color:"#60a5fa"}}>{fmt(Object.values(budgetEdit).reduce((s,v)=>s+v,0))}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#64748b"}}>Remaining</div><div style={{fontSize:18,fontWeight:700,color:"#4ade80"}}>{fmt(Math.max(Object.values(budgetEdit).reduce((s,v)=>s+v,0)-totalMonth,0))}</div></div>
              </div>
            </div>
          </div>
        )}

        {/* COMPARE */}
        {tab==="compare"&&(
          <div>
            <div style={{background:"#1e293b",borderRadius:10,padding:16,marginBottom:12,border:"1px solid #334155"}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>📅 Month vs Month</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:12}}>
                <div style={{background:"#0f172a",borderRadius:10,padding:14,textAlign:"center",border:"1px solid #334155"}}><div style={{fontSize:10,color:"#64748b",marginBottom:2}}>Last Month</div><div style={{fontSize:18,fontWeight:700,color:"#94a3b8"}}>{fmt(totalPrev)}</div><div style={{fontSize:9,color:"#475569"}}>{prevExp.length} entries</div></div>
                <div style={{textAlign:"center",fontSize:22,color:"#334155"}}>→</div>
                <div style={{background:"#0f172a",borderRadius:10,padding:14,textAlign:"center",border:"1px solid #334155"}}><div style={{fontSize:10,color:"#64748b",marginBottom:2}}>This Month</div><div style={{fontSize:18,fontWeight:700,color:totalMonth>totalPrev?"#f87171":"#4ade80"}}>{fmt(totalMonth)}</div><div style={{fontSize:9,color:"#475569"}}>{monthExp.length} entries</div></div>
              </div>
              <div style={{background:"#0f172a",borderRadius:8,padding:10,textAlign:"center",marginBottom:14}}><span style={{fontSize:11,color:"#64748b"}}>Change: </span><span style={{fontSize:15,fontWeight:700,color:totalMonth>totalPrev?"#f87171":"#4ade80"}}>{totalMonth>totalPrev?"▲":"▼"} {fmt(Math.abs(totalMonth-totalPrev))} ({totalPrev>0?Math.round(Math.abs((totalMonth-totalPrev)/totalPrev)*100):0}%)</span></div>
              <div style={{fontSize:11,fontWeight:600,marginBottom:8,color:"#94a3b8"}}>By Category</div>
              <div style={{display:"flex",gap:4,padding:"8px 0",overflowX:"auto"}}>
                {Object.entries(CATEGORIES).map(([k,cat])=><BarComparePair key={k} thisVal={catSpend[k]} lastVal={catPrev[k]} label={cat.icon} color={cat.color}/>)}
              </div>
              <div style={{display:"flex",gap:12,fontSize:9,color:"#64748b",marginTop:4}}><span>◼ <span style={{color:"#475569"}}>Last</span></span><span>◼ <span style={{color:"#60a5fa"}}>This</span></span></div>
            </div>
            <div style={{background:"#1e293b",borderRadius:10,padding:14,border:"1px solid #334155"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 72px 72px 60px",gap:3,fontSize:10,color:"#475569",padding:"0 4px 6px",borderBottom:"1px solid #1e293b"}}><span>Category</span><span style={{textAlign:"right"}}>Last</span><span style={{textAlign:"right"}}>This</span><span style={{textAlign:"right"}}>Δ</span></div>
              {Object.entries(CATEGORIES).map(([k,cat])=>{const prev=catPrev[k]||0,curr=catSpend[k]||0,diff=curr-prev;if(prev===0&&curr===0)return null;return(<div key={k} style={{display:"grid",gridTemplateColumns:"1fr 72px 72px 60px",gap:3,padding:"7px 4px",borderBottom:"1px solid #0f172a",alignItems:"center"}}><span style={{fontSize:12}}>{cat.icon} {cat.label}</span><span style={{fontSize:11,textAlign:"right",color:"#94a3b8"}}>{fmt(prev)}</span><span style={{fontSize:11,textAlign:"right"}}>{fmt(curr)}</span><span style={{fontSize:11,textAlign:"right",color:diff>0?"#f87171":diff<0?"#4ade80":"#64748b",fontWeight:600}}>{diff!==0?(diff>0?"+":"")+fmt(diff):"—"}</span></div>);})}
            </div>
          </div>
        )}

        {/* ANALYSIS */}
        {tab==="analysis"&&(
          <div>
            <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
              {["day","week","month","year","all"].map(p=>(<button key={p} onClick={()=>setFilterPeriod(p)} style={{...CHIP,background:filterPeriod===p?"#3b82f6":"#1e293b",color:filterPeriod===p?"#fff":"#94a3b8"}}>{p[0].toUpperCase()+p.slice(1)}</button>))}
              <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...IS,flex:1,maxWidth:160}}><option value="all">All Categories</option>{Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select>
              <button onClick={exportCSV} style={{background:"#065f46",border:"1px solid #064e3b",borderRadius:20,padding:"5px 12px",color:"#6ee7b7",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>⬇ CSV</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
              {[{l:"Total",v:fmt(filtered.reduce((s,e)=>s+Number(e.amount),0)),c:"#f87171"},{l:"Count",v:filtered.length,c:"#60a5fa"},{l:"Avg/Day",v:fmt(filtered.reduce((s,e)=>s+Number(e.amount),0)/Math.max(new Set(filtered.map(e=>e.date)).size,1)),c:"#4ade80"}].map((c,i)=>(
                <div key={i} style={{background:"#1e293b",borderRadius:8,padding:10,border:"1px solid #334155"}}><div style={{fontSize:9,color:"#64748b"}}>{c.l}</div><div style={{fontSize:15,fontWeight:700,color:c.c}}>{c.v}</div></div>
              ))}
            </div>
            <div style={{background:"#1e293b",borderRadius:10,padding:14,marginBottom:10,border:"1px solid #334155"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:"#94a3b8"}}>By Category</div>
              {Object.entries(CATEGORIES).map(([k,cat])=>{const spend=filtered.filter(e=>e.category===k).reduce((s,e)=>s+Number(e.amount),0),total=filtered.reduce((s,e)=>s+Number(e.amount),0);if(!spend)return null;return(<div key={k} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}><span>{cat.icon} {cat.label}</span><span>{fmt(spend)} <span style={{color:"#475569",fontSize:9}}>({Math.round((spend/total)*100)}%)</span></span></div><MiniBar value={spend} max={total} color={cat.color}/></div>);})}
            </div>
            <div style={{background:"#1e293b",borderRadius:10,padding:14,border:"1px solid #334155"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:12,fontWeight:600,color:"#94a3b8"}}>Transactions ({filtered.length})</div><button onClick={exportCSV} style={{background:"#065f46",border:"none",color:"#6ee7b7",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>⬇ Export</button></div>
              {Object.entries(grouped).sort((a,b)=>b[0].localeCompare(a[0])).map(([period,items])=>(<div key={period}><div style={{fontSize:10,color:"#475569",padding:"6px 0 3px",fontWeight:600}}>{period} — {fmt(items.reduce((s,e)=>s+Number(e.amount),0))}</div>{items.map(e=>(<div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #0f172a"}}><span style={{fontSize:14}}>{CATEGORIES[e.category]?.icon}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.item}</div><div style={{fontSize:9,color:"#64748b"}}>{e.date}</div></div><span style={{color:"#f87171",fontWeight:600,fontSize:11,whiteSpace:"nowrap"}}>{fmt(e.amount)}</span></div>))}</div>))}
              {filtered.length===0&&<div style={{color:"#475569",fontSize:12}}>No transactions found.</div>}
            </div>
          </div>
        )}

        {/* IMPORT */}
        {tab==="import"&&(
          <div>
            <div style={{background:"#1e293b",borderRadius:10,padding:16,marginBottom:14,border:"1px solid #334155"}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>📤 Import Bank / Credit Card Statement</div>
              <div style={{fontSize:11,color:"#64748b",marginBottom:14}}>AI reads & auto-categorizes all your expenses</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
                {[{icon:"🖼️",label:"Image",desc:"JPG/PNG"},{icon:"📄",label:"PDF",desc:"Bank PDF"},{icon:"📊",label:"CSV/Excel",desc:".xlsx/.csv"}].map((f,i)=>(
                  <div key={i} style={{background:"#0f172a",borderRadius:8,padding:10,textAlign:"center",border:"1px dashed #334155"}}><div style={{fontSize:22}}>{f.icon}</div><div style={{fontSize:11,fontWeight:600}}>{f.label}</div><div style={{fontSize:9,color:"#64748b"}}>{f.desc}</div></div>
                ))}
              </div>
              <div onClick={()=>fileRef.current.click()} style={{border:"2px dashed #334155",borderRadius:10,padding:28,textAlign:"center",cursor:"pointer",background:"#0f172a"}}><div style={{fontSize:28,marginBottom:5}}>📁</div><div style={{fontWeight:600,fontSize:12,marginBottom:2}}>Click to upload statement</div><div style={{fontSize:10,color:"#64748b"}}>PDF · JPG · PNG · CSV · XLSX</div></div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xlsx,.xls" style={{display:"none"}} onChange={e=>{if(e.target.files[0])analyzeStatement(e.target.files[0]);}}/>
              {analyzing&&<div style={{marginTop:14,padding:14,background:"#0f172a",borderRadius:10,textAlign:"center"}}><div style={{fontSize:22,marginBottom:5}}>🔍</div><div style={{fontWeight:600,fontSize:12}}>Analyzing statement…</div></div>}
              {analyzeError&&<div style={{marginTop:12,padding:10,background:"#450a0a",borderRadius:8,color:"#fca5a5",fontSize:11}}>⚠️ {analyzeError}</div>}
            </div>
            {analysisResult&&(
              <div style={{background:"#1e293b",borderRadius:10,padding:16,border:"1px solid #334155"}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2,color:"#4ade80"}}>✅ Analysis Complete!</div>
                <div style={{fontSize:10,color:"#64748b",marginBottom:12}}>{analysisResult.transactions?.length} transactions imported</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                  <div style={{background:"#0f172a",borderRadius:8,padding:10}}><div style={{fontSize:9,color:"#64748b"}}>Total Spend</div><div style={{fontSize:17,fontWeight:700,color:"#f87171"}}>{fmt(analysisResult.summary?.total_spend||0)}</div></div>
                  <div style={{background:"#0f172a",borderRadius:8,padding:10}}><div style={{fontSize:9,color:"#64748b"}}>Period</div><div style={{fontSize:13,fontWeight:600}}>{analysisResult.summary?.period||"—"}</div></div>
                </div>
                {Object.entries(analysisResult.summary?.by_category||{}).filter(([,v])=>v>0).map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #0f172a",fontSize:11}}><span>{CATEGORIES[k]?.icon||"📦"} {CATEGORIES[k]?.label||k}</span><span style={{color:"#f87171"}}>{fmt(v)}</span></div>))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const BTN = color => ({ width:"100%", background:color==="blue"?"#3b82f6":"#16a34a", border:"none", color:"#fff", padding:"11px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", marginTop:10, fontFamily:"'DM Sans',sans-serif" });
