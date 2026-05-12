export const CATEGORIES = {
  groceries:    { label:"Groceries",    icon:"🛒", color:"#4ade80" },
  vegetables:   { label:"Vegetables",   icon:"🥬", color:"#86efac" },
  meat_fish:    { label:"Meat & Fish",  icon:"🐟", color:"#f87171" },
  outside_food: { label:"Outside Food", icon:"🍽️", color:"#fb923c" },
  drinks:       { label:"Drinks",       icon:"☕", color:"#fbbf24" },
  travel:       { label:"Travel",       icon:"🚌", color:"#60a5fa" },
  fuel:         { label:"Fuel",         icon:"⛽", color:"#a78bfa" },
  utilities:    { label:"Utilities",    icon:"💡", color:"#f472b6" },
  healthcare:   { label:"Healthcare",   icon:"💊", color:"#34d399" },
  entertainment:{ label:"Entertainment",icon:"🎬", color:"#818cf8" },
  shopping:     { label:"Shopping",     icon:"🛍️", color:"#e879f9" },
  other:        { label:"Other",        icon:"📦", color:"#94a3b8" },
};

export const ACCOUNTS = [
  { id:"cash",  label:"Cash",        icon:"💵", color:"#4ade80" },
  { id:"sbi",   label:"SBI Bank",    icon:"🏦", color:"#60a5fa" },
  { id:"hdfc",  label:"HDFC Credit", icon:"💳", color:"#f87171" },
  { id:"upi",   label:"UPI / GPay",  icon:"📱", color:"#fbbf24" },
  { id:"other", label:"Other",       icon:"🔄", color:"#94a3b8" },
];

export const SHOP_CATS = [
  { id:"vegetables", label:"Vegetables & Fruits", icon:"🥬", color:"#4ade80" },
  { id:"groceries",  label:"Grocery Staples",     icon:"🛒", color:"#60a5fa" },
  { id:"meat_fish",  label:"Meat & Fish",          icon:"🐟", color:"#f87171" },
  { id:"dairy",      label:"Dairy & Eggs",         icon:"🥚", color:"#fbbf24" },
  { id:"spices",     label:"Spices & Masala",      icon:"🌶️", color:"#fb923c" },
  { id:"personal",   label:"Personal Care",        icon:"🧴", color:"#a78bfa" },
  { id:"household",  label:"Household",            icon:"🏠", color:"#34d399" },
  { id:"other",      label:"Other",                icon:"📦", color:"#94a3b8" },
];

export const UNITS = ["kg","g","L","ml","pcs","dozen","pack","bag","bottle","box","bunch"];

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Shared style tokens
export const IS = { width:"100%", boxSizing:"border-box", background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"8px 10px", color:"#f1f5f9", fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none" };
export const LBL = { fontSize:11, color:"#64748b", display:"block", marginBottom:4 };
export const CHIP = { border:"1px solid #334155", borderRadius:20, padding:"5px 11px", cursor:"pointer", fontSize:11, fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" };

// Helpers
export const fmt = n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits:0 });
export const fmtDec = n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits:2 });
export const today = () => new Date().toISOString().split("T")[0];
export const monthKey = d => { const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`; };
export const prevMonthKey = () => { const d=new Date(); d.setMonth(d.getMonth()-1); return monthKey(d.toISOString().split("T")[0]); };
export const weekKey = d => { const x=new Date(d),s=new Date(x.getFullYear(),0,1); return `${x.getFullYear()}-W${String(Math.ceil(((x-s)/86400000+s.getDay()+1)/7)).padStart(2,"0")}`; };
export const nowLabel = () => { const d=new Date(); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const uid = () => Date.now() + Math.random();
export const pctChange = (a,b) => b>0 ? (((a-b)/b)*100).toFixed(1) : null;

// Seed data
export const SEED_EXPENSES = [
  { id:1,  date:today(),      category:"groceries",    item:"Rice & Dal",     amount:450,  note:"", account:"cash" },
  { id:2,  date:today(),      category:"vegetables",   item:"Tomato, Onion",  amount:120,  note:"", account:"cash" },
  { id:3,  date:today(),      category:"meat_fish",    item:"Rohu Fish",      amount:380,  note:"", account:"cash" },
  { id:4,  date:today(),      category:"fuel",         item:"Petrol",         amount:500,  note:"", account:"upi" },
  { id:5,  date:"2026-05-09", category:"outside_food", item:"Lunch at Dhaba", amount:280,  note:"", account:"upi" },
  { id:6,  date:"2026-05-08", category:"travel",       item:"Metro",          amount:60,   note:"", account:"upi" },
  { id:7,  date:"2026-05-07", category:"drinks",       item:"Coffee & Tea",   amount:150,  note:"", account:"hdfc" },
  { id:8,  date:"2026-05-06", category:"utilities",    item:"Electricity",    amount:1200, note:"", account:"sbi" },
  { id:9,  date:"2026-04-28", category:"groceries",    item:"Monthly Stock",  amount:3200, note:"", account:"hdfc" },
  { id:10, date:"2026-04-20", category:"healthcare",   item:"Medicines",      amount:640,  note:"", account:"sbi" },
  { id:11, date:"2026-04-15", category:"outside_food", item:"Pizza Night",    amount:750,  note:"", account:"hdfc" },
  { id:12, date:"2026-04-10", category:"travel",       item:"Auto rickshaw",  amount:120,  note:"", account:"cash" },
  { id:13, date:"2026-04-05", category:"shopping",     item:"Clothes",        amount:2200, note:"", account:"hdfc" },
  { id:14, date:"2026-04-02", category:"vegetables",   item:"Weekly veggies", amount:380,  note:"", account:"cash" },
];

export const SEED_SHOP_LIST = [
  { id:1,  name:"Rice (Miniket)",  cat:"groceries",  qty:5,   unit:"kg",    checked:false, note:"" },
  { id:2,  name:"Dal (Masoor)",    cat:"groceries",  qty:1,   unit:"kg",    checked:false, note:"" },
  { id:3,  name:"Mustard Oil",     cat:"groceries",  qty:2,   unit:"L",     checked:false, note:"" },
  { id:4,  name:"Tomato",          cat:"vegetables", qty:1,   unit:"kg",    checked:false, note:"" },
  { id:5,  name:"Potato",          cat:"vegetables", qty:2,   unit:"kg",    checked:false, note:"" },
  { id:6,  name:"Onion",           cat:"vegetables", qty:2,   unit:"kg",    checked:false, note:"" },
  { id:7,  name:"Rohu Fish",       cat:"meat_fish",  qty:1,   unit:"kg",    checked:false, note:"Fresh" },
  { id:8,  name:"Egg",             cat:"dairy",      qty:1,   unit:"dozen", checked:false, note:"" },
  { id:9,  name:"Milk",            cat:"dairy",      qty:2,   unit:"L",     checked:false, note:"" },
  { id:10, name:"Turmeric Powder", cat:"spices",     qty:100, unit:"g",     checked:false, note:"" },
];

export const SEED_RATES = [
  { id:1,  name:"Rice (Miniket)",  unit:"kg",    cat:"groceries",  lastRate:58,  currentRate:0 },
  { id:2,  name:"Dal (Masoor)",    unit:"kg",    cat:"groceries",  lastRate:110, currentRate:0 },
  { id:3,  name:"Mustard Oil",     unit:"L",     cat:"groceries",  lastRate:165, currentRate:0 },
  { id:4,  name:"Tomato",          unit:"kg",    cat:"vegetables", lastRate:35,  currentRate:0 },
  { id:5,  name:"Potato",          unit:"kg",    cat:"vegetables", lastRate:22,  currentRate:0 },
  { id:6,  name:"Onion",           unit:"kg",    cat:"vegetables", lastRate:40,  currentRate:0 },
  { id:7,  name:"Rohu Fish",       unit:"kg",    cat:"meat_fish",  lastRate:280, currentRate:0 },
  { id:8,  name:"Chicken",         unit:"kg",    cat:"meat_fish",  lastRate:220, currentRate:0 },
  { id:9,  name:"Egg",             unit:"dozen", cat:"dairy",      lastRate:85,  currentRate:0 },
  { id:10, name:"Milk",            unit:"L",     cat:"dairy",      lastRate:54,  currentRate:0 },
];
