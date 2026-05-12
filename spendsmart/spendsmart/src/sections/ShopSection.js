import { useState, useRef } from 'react';
import { SHOP_CATS, UNITS, IS, LBL, CHIP, fmt, today, nowLabel, uid, pctChange, SEED_RATES } from '../constants';
import { MiniBar, RateArrow } from '../components/Shared';

const QTY_BTN = { background:"#0f172a", border:"1px solid #334155", color:"#f1f5f9", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:15, fontFamily:"inherit", flexShrink:0 };

export default function ShopSection({ shopList, setShopList, rates, setRates }) {
  const [tab, setTab]           = useState("list");
  const [catFilter, setCatFilter] = useState("all");
  const [showChecked, setShowChecked] = useState(true);
  const [newItem, setNewItem]   = useState({ name:"", cat:"groceries", qty:1, unit:"kg", note:"" });
  const [newRate, setNewRate]   = useState({ name:"", cat:"groceries", unit:"kg", lastRate:"", currentRate:"" });
  const [lastMonthLabel, setLastMonthLabel] = useState("Apr 2026");
  const [currentMonthLabel]     = useState(nowLabel());
  const [scanMode, setScanMode] = useState("last");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const invoiceRef = useRef();

  const visibleItems = shopList.filter(i => {
    if (catFilter!=="all" && i.cat!==catFilter) return false;
    if (!showChecked && i.checked) return false;
    return true;
  });
  const grouped = {};
  visibleItems.forEach(i => { if(!grouped[i.cat])grouped[i.cat]=[]; grouped[i.cat].push(i); });

  const totalChecked = shopList.filter(i=>i.checked).length;
  const totalItems   = shopList.length;

  const estTotal = shopList.reduce((sum,item)=>{
    const r=rates.find(r=>r.name.toLowerCase()===item.name.toLowerCase());
    if(!r)return sum;
    return sum+(( r.currentRate>0?r.currentRate:r.lastRate)*item.qty);
  },0);

  function toggleCheck(id){setShopList(p=>p.map(i=>i.id===id?{...i,checked:!i.checked}:i));}
  function deleteItem(id){setShopList(p=>p.filter(i=>i.id!==id));}
  function updateQty(id,val){setShopList(p=>p.map(i=>i.id===id?{...i,qty:Number(val)}:i));}
  function addItem(){if(!newItem.name.trim())return;setShopList(p=>[...p,{...newItem,id:uid(),checked:false}]);setNewItem({name:"",cat:"groceries",qty:1,unit:"kg",note:""});}
  function clearChecked(){setShopList(p=>p.filter(i=>!i.checked));}

  function updateRate(id,field,val){setRates(p=>p.map(r=>r.id===id?{...r,[field]:Number(val)}:r));}
  function deleteRate(id){setRates(p=>p.filter(r=>r.id!==id));}
  function addRate(){if(!newRate.name.trim())return;setRates(p=>[...p,{...newRate,id:uid(),lastRate:Number(newRate.lastRate)||0,currentRate:Number(newRate.currentRate)||0}]);setNewRate({name:"",cat:"groceries",unit:"kg",lastRate:"",currentRate:""});}

  const rateFiltered = catFilter==="all" ? rates : rates.filter(r=>r.cat===catFilter);
  const itemsWithChange = rates.filter(r=>r.currentRate>0&&r.lastRate>0);
  const inflation = itemsWithChange.length>0 ? (itemsWithChange.reduce((s,r)=>s+((r.currentRate-r.lastRate)/r.lastRate)*100,0)/itemsWithChange.length).toFixed(1) : null;
  const pricedUp   = itemsWithChange.filter(r=>r.currentRate>r.lastRate).length;
  const pricedDown = itemsWithChange.filter(r=>r.currentRate<r.lastRate).length;

  async function scanInvoice(file){
    setScanning(true);setScanError("");
    const prompt=`This is a grocery/shopping invoice. Extract every line item with name, quantity, unit, and unit rate. Return ONLY valid JSON: {"month":"Mon YYYY","items":[{"name":"...","qty":1,"unit":"kg","unitRate":58,"total":58,"category":"groceries"}]}. Categories: vegetables,groceries,meat_fish,dairy,spices,personal,household,other. Return only JSON.`;
    try{
      const ext=file.name.split(".").pop().toLowerCase();
      const toB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
      let content=[];
      if(["jpg","jpeg","png","webp"].includes(ext)){const b64=await toB64(file),mt=ext==="png"?"image/png":ext==="webp"?"image/webp":"image/jpeg";content=[{type:"image",source:{type:"base64",media_type:mt,data:b64}},{type:"text",text:prompt}];}
      else if(ext==="pdf"){const b64=await toB64(file);content=[{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},{type:"text",text:prompt}];}
      else{const text=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsText(file);});content=[{type:"text",text:`Invoice:\n${text.slice(0,6000)}\n\n${prompt}`}];}
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content}]})});
      const data=await res.json();
      const raw=data.content?.map(b=>b.text||"").join("")||"";
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      if(parsed.month)setLastMonthLabel(parsed.month);
      setRates(prev=>{
        const updated=[...prev];
        parsed.items?.forEach(item=>{
          const idx=updated.findIndex(r=>r.name.toLowerCase()===item.name.toLowerCase());
          if(idx>=0){if(scanMode==="last")updated[idx]={...updated[idx],lastRate:item.unitRate,unit:item.unit};else updated[idx]={...updated[idx],currentRate:item.unitRate};}
          else{updated.push({id:uid(),name:item.name,unit:item.unit||"kg",cat:item.category||"other",lastRate:scanMode==="last"?item.unitRate:0,currentRate:scanMode==="current"?item.unitRate:0});}
        });
        return updated;
      });
      if(scanMode==="last"){
        const newSuggs=parsed.items?.filter(item=>!shopList.find(s=>s.name.toLowerCase()===item.name.toLowerCase())).map(item=>({id:uid(),name:item.name,cat:item.category||"other",qty:item.qty||1,unit:item.unit||"pcs",checked:false,note:"From invoice"}));
        if(newSuggs?.length&&window.confirm(`Add ${newSuggs.length} new items from invoice to shopping list?`)){setShopList(p=>[...p,...newSuggs]);}
      }
    }catch{setScanError("Could not read invoice. Try a clearer photo or text-based PDF.");}
    setScanning(false);
  }

  const TABS=[{id:"list",label:"Shopping List",icon:"🛒"},{id:"rates",label:"Rate Tracker",icon:"📊"},{id:"invoice",label:"Scan Invoice",icon:"📷"}];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{display:"flex",gap:2,overflowX:"auto",padding:"0 12px",background:"#0f172a",borderBottom:"1px solid #1e293b"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:"transparent",border:"none",color:tab===t.id?"#4ade80":"#94a3b8",padding:"8px 12px",cursor:"pointer",fontSize:11,fontWeight:500,whiteSpace:"nowrap",fontFamily:"inherit",borderBottom:tab===t.id?"2px solid #16a34a":"2px solid transparent"}}>
            {t.icon} {t.label}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",padding:"0 8px"}}>
          <div style={{fontSize:11,color:"#4ade80",fontWeight:700}}>Est: {fmt(estTotal)}</div>
        </div>
      </div>

      <div style={{padding:"14px 12px"}}>

        {/* SHOPPING LIST */}
        {tab==="list"&&(
          <div>
            <div style={{background:"#1e293b",borderRadius:10,padding:14,marginBottom:12,border:"1px solid #334155"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:600}}>Progress</span>
                <span style={{fontSize:12,color:"#64748b"}}>{totalChecked} / {totalItems}</span>
              </div>
              <div style={{background:"#0f172a",borderRadius:6,height:10,overflow:"hidden"}}><div style={{width:`${totalItems>0?(totalChecked/totalItems)*100:0}%`,height:"100%",background:"#16a34a",borderRadius:6,transition:"width 0.5s"}}/></div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11,color:"#64748b"}}>
                <span>Estimated: <strong style={{color:"#4ade80"}}>{fmt(estTotal)}</strong></span>
                {totalChecked>0&&<button onClick={clearChecked} style={{background:"transparent",border:"1px solid #334155",color:"#f87171",borderRadius:6,padding:"2px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>🗑 Remove ticked</button>}
              </div>
            </div>

            <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
              <button onClick={()=>setCatFilter("all")} style={{...CHIP,background:catFilter==="all"?"#16a34a":"#1e293b",color:catFilter==="all"?"#fff":"#94a3b8"}}>All</button>
              {SHOP_CATS.map(c=><button key={c.id} onClick={()=>setCatFilter(c.id)} style={{...CHIP,background:catFilter===c.id?c.color+"33":"#1e293b",color:catFilter===c.id?c.color:"#94a3b8",borderColor:catFilter===c.id?c.color:"#334155"}}>{c.icon}</button>)}
              <button onClick={()=>setShowChecked(p=>!p)} style={{...CHIP,background:"#1e293b",color:showChecked?"#94a3b8":"#4ade80",marginLeft:"auto"}}>{showChecked?"Hide":"Show"} ticked</button>
            </div>

            {Object.entries(grouped).map(([catId,items])=>{
              const cat=SHOP_CATS.find(c=>c.id===catId)||{label:catId,icon:"📦",color:"#94a3b8"};
              return(
                <div key={catId} style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:cat.color,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                    {cat.icon} {cat.label.toUpperCase()} <span style={{color:"#475569",fontWeight:400}}>({items.length})</span>
                  </div>
                  <div style={{background:"#1e293b",borderRadius:10,border:"1px solid #334155",overflow:"hidden"}}>
                    {items.map((item,idx)=>{
                      const rateEntry=rates.find(r=>r.name.toLowerCase()===item.name.toLowerCase());
                      const rate=rateEntry?(rateEntry.currentRate>0?rateEntry.currentRate:rateEntry.lastRate):null;
                      const lineTotal=rate?rate*item.qty:null;
                      return(
                        <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderBottom:idx<items.length-1?"1px solid #0f172a":"none",opacity:item.checked?0.5:1,transition:"opacity 0.2s"}}>
                          <div onClick={()=>toggleCheck(item.id)} style={{width:20,height:20,borderRadius:6,border:`2px solid ${item.checked?"#16a34a":"#334155"}`,background:item.checked?"#16a34a":"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                            {item.checked&&<span style={{fontSize:11,color:"#fff"}}>✓</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:500,textDecoration:item.checked?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                            {item.note&&<div style={{fontSize:10,color:"#64748b"}}>{item.note}</div>}
                            {rate&&<div style={{fontSize:10,color:"#475569"}}>{fmt(rate)}/{item.unit}{lineTotal?` = ${fmt(lineTotal)}`:""}</div>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <button onClick={()=>updateQty(item.id,Math.max(0.25,item.qty-0.25))} style={QTY_BTN}>−</button>
                            <span style={{fontSize:12,fontWeight:600,minWidth:36,textAlign:"center"}}>{item.qty} {item.unit}</span>
                            <button onClick={()=>updateQty(item.id,item.qty+0.25)} style={QTY_BTN}>+</button>
                          </div>
                          <button onClick={()=>deleteItem(item.id)} style={{background:"transparent",border:"none",color:"#475569",cursor:"pointer",fontSize:16,padding:2}}>×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{background:"#1e293b",borderRadius:10,padding:14,border:"1px solid #334155",marginTop:4}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:10,color:"#94a3b8"}}>+ Add Item</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div style={{gridColumn:"1/-1"}}><label style={LBL}>Item Name</label><input value={newItem.name} onChange={e=>setNewItem(p=>({...p,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addItem()} placeholder="e.g. Brinjal, Atta…" style={IS}/></div>
                <div><label style={LBL}>Category</label><select value={newItem.cat} onChange={e=>setNewItem(p=>({...p,cat:e.target.value}))} style={IS}>{SHOP_CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
                <div><label style={LBL}>Unit</label><select value={newItem.unit} onChange={e=>setNewItem(p=>({...p,unit:e.target.value}))} style={IS}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                <div><label style={LBL}>Quantity</label><input type="number" step="0.25" value={newItem.qty} onChange={e=>setNewItem(p=>({...p,qty:Number(e.target.value)}))} style={IS}/></div>
                <div><label style={LBL}>Note (optional)</label><input value={newItem.note} onChange={e=>setNewItem(p=>({...p,note:e.target.value}))} placeholder="Brand, variety…" style={IS}/></div>
              </div>
              <button onClick={addItem} style={{width:"100%",background:"#16a34a",border:"none",color:"#fff",padding:"11px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",marginTop:10,fontFamily:"'DM Sans',sans-serif"}}>➕ Add to List</button>
            </div>
          </div>
        )}

        {/* RATE TRACKER */}
        {tab==="rates"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:14}}>
              {[
                {l:"Avg Inflation",v:inflation!==null?`${inflation>0?"+":""}${inflation}%`:"—",c:inflation>0?"#f87171":"#4ade80",s:`${lastMonthLabel} → ${currentMonthLabel}`},
                {l:"Prices Up",v:`▲ ${pricedUp}`,c:"#f87171",s:"items costlier"},
                {l:"Prices Down",v:`▼ ${pricedDown}`,c:"#4ade80",s:"items cheaper"},
                {l:"Tracked",v:rates.length,c:"#60a5fa",s:"items in table"},
              ].map((c,i)=>(
                <div key={i} style={{background:"#1e293b",borderRadius:10,padding:12,border:"1px solid #334155"}}><div style={{fontSize:10,color:"#64748b"}}>{c.l}</div><div style={{fontSize:16,fontWeight:700,color:c.c}}>{c.v}</div><div style={{fontSize:9,color:"#475569"}}>{c.s}</div></div>
              ))}
            </div>

            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
              <div style={{background:"#1e293b",borderRadius:8,padding:"5px 12px",fontSize:11,border:"1px solid #334155"}}>📅 Last: <strong style={{color:"#94a3b8"}}>{lastMonthLabel}</strong></div>
              <div style={{background:"#1e293b",borderRadius:8,padding:"5px 12px",fontSize:11,border:"1px solid #334155"}}>📅 This: <strong style={{color:"#60a5fa"}}>{currentMonthLabel}</strong></div>
              <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...IS,width:"auto",flex:1,maxWidth:160,fontSize:11}}><option value="all">All Categories</option>{SHOP_CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
            </div>

            <div style={{background:"#1e293b",borderRadius:10,border:"1px solid #334155",marginBottom:14,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 85px 85px 68px",gap:4,padding:"9px 14px",background:"#0f172a",fontSize:10,color:"#475569",fontWeight:600,borderBottom:"1px solid #334155"}}>
                <span>Item</span><span style={{textAlign:"right"}}>{lastMonthLabel}</span><span style={{textAlign:"right"}}>{currentMonthLabel}</span><span style={{textAlign:"right"}}>Change</span>
              </div>
              {rateFiltered.map(r=>{
                const change=pctChange(r.currentRate,r.lastRate);
                const cat=SHOP_CATS.find(c=>c.id===r.cat)||{color:"#94a3b8",icon:"📦"};
                return(
                  <div key={r.id} style={{display:"grid",gridTemplateColumns:"1fr 85px 85px 68px",gap:4,padding:"8px 14px",borderBottom:"1px solid #0f172a",alignItems:"center"}}>
                    <div><div style={{fontSize:12,fontWeight:500}}>{r.name}</div><div style={{fontSize:9,color:cat.color}}>{cat.icon} per {r.unit}</div></div>
                    <div style={{textAlign:"right"}}><input type="number" value={r.lastRate||""} onChange={e=>updateRate(r.id,"lastRate",e.target.value)} placeholder="0" style={{...IS,textAlign:"right",padding:"4px 6px",fontSize:11,width:76}}/></div>
                    <div style={{textAlign:"right"}}><input type="number" value={r.currentRate||""} onChange={e=>updateRate(r.id,"currentRate",e.target.value)} placeholder="0" style={{...IS,textAlign:"right",padding:"4px 6px",fontSize:11,width:76,borderColor:r.currentRate>0&&r.currentRate>r.lastRate?"#f87171":r.currentRate>0&&r.currentRate<r.lastRate?"#4ade80":"#334155"}}/></div>
                    <div style={{textAlign:"right",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
                      <RateArrow change={r.currentRate>0?change:null}/>
                      <button onClick={()=>deleteRate(r.id)} style={{background:"transparent",border:"none",color:"#475569",cursor:"pointer",fontSize:13}}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {itemsWithChange.length>0&&(
              <div style={{background:"#1e293b",borderRadius:10,padding:14,border:"1px solid #334155",marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:10,color:"#94a3b8"}}>Biggest Price Movers</div>
                {[...itemsWithChange].sort((a,b)=>Math.abs((b.currentRate-b.lastRate)/b.lastRate)-Math.abs((a.currentRate-a.lastRate)/a.lastRate)).slice(0,5).map(r=>{
                  const change=pctChange(r.currentRate,r.lastRate),up=parseFloat(change)>0;
                  return(
                    <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #0f172a"}}>
                      <div style={{width:36,height:36,borderRadius:8,background:up?"#450a0a":"#052e16",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:up?"#f87171":"#4ade80"}}>{up?"▲":"▼"}{Math.abs(change)}%</div>
                      <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{r.name}</div><div style={{fontSize:10,color:"#64748b"}}>{fmt(r.lastRate)} → {fmt(r.currentRate)} / {r.unit}</div></div>
                      <div style={{fontSize:12,fontWeight:600,color:up?"#f87171":"#4ade80"}}>{up?"+":""}{fmt(r.currentRate-r.lastRate)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{background:"#1e293b",borderRadius:10,padding:14,border:"1px solid #334155"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:10,color:"#94a3b8"}}>+ Add to Rate Table</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div style={{gridColumn:"1/-1"}}><label style={LBL}>Item Name</label><input value={newRate.name} onChange={e=>setNewRate(p=>({...p,name:e.target.value}))} placeholder="e.g. Brinjal" style={IS}/></div>
                <div><label style={LBL}>Category</label><select value={newRate.cat} onChange={e=>setNewRate(p=>({...p,cat:e.target.value}))} style={IS}>{SHOP_CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
                <div><label style={LBL}>Unit</label><select value={newRate.unit} onChange={e=>setNewRate(p=>({...p,unit:e.target.value}))} style={IS}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                <div><label style={LBL}>Last Month (₹)</label><input type="number" value={newRate.lastRate} onChange={e=>setNewRate(p=>({...p,lastRate:e.target.value}))} placeholder="0" style={IS}/></div>
                <div><label style={LBL}>This Month (₹)</label><input type="number" value={newRate.currentRate} onChange={e=>setNewRate(p=>({...p,currentRate:e.target.value}))} placeholder="0 (optional)" style={IS}/></div>
              </div>
              <button onClick={addRate} style={{width:"100%",background:"#16a34a",border:"none",color:"#fff",padding:"11px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",marginTop:10,fontFamily:"'DM Sans',sans-serif"}}>➕ Add Item</button>
            </div>
          </div>
        )}

        {/* INVOICE SCANNER */}
        {tab==="invoice"&&(
          <div>
            <div style={{background:"#1e293b",borderRadius:10,padding:16,marginBottom:14,border:"1px solid #334155"}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>📷 Scan Invoice / Bill</div>
              <div style={{fontSize:11,color:"#64748b",marginBottom:14}}>AI extracts item-wise rates from your grocery bill automatically</div>
              <div style={{marginBottom:14}}>
                <label style={LBL}>This invoice is from:</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div onClick={()=>setScanMode("last")} style={{background:scanMode==="last"?"#14532d":"#0f172a",border:`1px solid ${scanMode==="last"?"#16a34a":"#334155"}`,borderRadius:8,padding:12,textAlign:"center",cursor:"pointer",transition:"all 0.2s"}}>
                    <div style={{fontSize:18}}>📅</div>
                    <div style={{fontSize:12,fontWeight:600,margin:"3px 0",color:scanMode==="last"?"#4ade80":"#f1f5f9"}}>Last Month</div>
                    <div style={{fontSize:10,color:"#64748b"}}>Sets baseline rates</div>
                  </div>
                  <div onClick={()=>setScanMode("current")} style={{background:scanMode==="current"?"#1e3a5f":"#0f172a",border:`1px solid ${scanMode==="current"?"#3b82f6":"#334155"}`,borderRadius:8,padding:12,textAlign:"center",cursor:"pointer",transition:"all 0.2s"}}>
                    <div style={{fontSize:18}}>🗓️</div>
                    <div style={{fontSize:12,fontWeight:600,margin:"3px 0",color:scanMode==="current"?"#60a5fa":"#f1f5f9"}}>This Month</div>
                    <div style={{fontSize:10,color:"#64748b"}}>Updates current rates</div>
                  </div>
                </div>
              </div>
              <div onClick={()=>invoiceRef.current.click()} style={{border:"2px dashed #334155",borderRadius:10,padding:32,textAlign:"center",cursor:"pointer",background:"#0f172a"}}>
                <div style={{fontSize:30,marginBottom:6}}>📁</div>
                <div style={{fontWeight:600,fontSize:12,marginBottom:2}}>Upload {scanMode==="last"?"last":"this"} month's bill</div>
                <div style={{fontSize:10,color:"#64748b"}}>Photo · PDF · CSV · XLSX</div>
              </div>
              <input ref={invoiceRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xlsx" style={{display:"none"}} onChange={e=>{if(e.target.files[0])scanInvoice(e.target.files[0]);}}/>
              {scanning&&<div style={{marginTop:14,padding:14,background:"#0f172a",borderRadius:10,textAlign:"center"}}><div style={{fontSize:22,marginBottom:5}}>🔍</div><div style={{fontWeight:600,fontSize:12}}>Reading your invoice…</div><div style={{fontSize:10,color:"#64748b",marginTop:2}}>Extracting item names & rates</div></div>}
              {scanError&&<div style={{marginTop:12,padding:10,background:"#450a0a",borderRadius:8,color:"#fca5a5",fontSize:11}}>⚠️ {scanError}</div>}
            </div>

            <div style={{background:"#1e293b",borderRadius:10,padding:14,border:"1px solid #334155",marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:10,color:"#94a3b8"}}>How It Works</div>
              {[
                {icon:"📸",title:"Upload Last Month's Bill",desc:"Scan your previous grocery bill. AI reads every item, quantity and price per unit."},
                {icon:"📊",title:"Baseline Rates Are Set",desc:"All items and rates are added to the Rate Tracker as your reference."},
                {icon:"🗓️",title:"Upload This Month's Bill",desc:"After next shopping, upload the new bill to update current rates."},
                {icon:"📈",title:"Compare & Spot Inflation",desc:"Instantly see which items got costlier, cheaper, and your average monthly inflation."},
              ].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:12,marginBottom:12}}>
                  <div style={{width:32,height:32,borderRadius:8,background:"#0f172a",border:"1px solid #334155",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{s.icon}</div>
                  <div><div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{s.title}</div><div style={{fontSize:11,color:"#64748b",lineHeight:1.5}}>{s.desc}</div></div>
                </div>
              ))}
            </div>

            <div style={{background:"#1e293b",borderRadius:10,padding:14,border:"1px solid #334155"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:"#94a3b8"}}>Rate Table Preview ({rates.length} items)</div>
              {rates.slice(0,6).map(r=>(
                <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #0f172a",fontSize:11}}>
                  <span>{r.name} <span style={{color:"#475569"}}>/{r.unit}</span></span>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{color:"#94a3b8"}}>{r.lastRate>0?fmt(r.lastRate):"—"}</span>
                    <span style={{fontWeight:600}}>{r.currentRate>0?fmt(r.currentRate):"—"}</span>
                    <RateArrow change={r.currentRate>0&&r.lastRate>0?pctChange(r.currentRate,r.lastRate):null}/>
                  </div>
                </div>
              ))}
              {rates.length>6&&<div style={{fontSize:10,color:"#475569",paddingTop:6}}>+{rates.length-6} more — see Rate Tracker tab</div>}
              <button onClick={()=>setTab("rates")} style={{width:"100%",background:"#0f172a",border:"1px solid #334155",color:"#94a3b8",borderRadius:8,padding:"9px",fontSize:12,cursor:"pointer",fontFamily:"inherit",marginTop:10}}>Open Rate Tracker →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
