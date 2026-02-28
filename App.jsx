
import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════════════════════════ */
const CATEGORIES = [
  { id: "road",        label: "Roads",       icon: "🛣️",  color: "#f97316", weight: 25 },
  { id: "water",       label: "Water",        icon: "💧",  color: "#0ea5e9", weight: 35 },
  { id: "electricity", label: "Electricity",  icon: "⚡",  color: "#eab308", weight: 30 },
  { id: "sanitation",  label: "Sanitation",   icon: "♻️",  color: "#22c55e", weight: 28 },
  { id: "safety",      label: "Safety",       icon: "🛡️",  color: "#ef4444", weight: 40 },
  { id: "parks",       label: "Parks",        icon: "🌳",  color: "#10b981", weight: 12 },
  { id: "noise",       label: "Noise",        icon: "🔊",  color: "#a855f7", weight: 15 },
  { id: "other",       label: "Other",        icon: "📋",  color: "#6b7280", weight: 10 },
];

const STATUSES = ["Submitted", "Under Review", "In Progress", "Resolved", "Closed"];
const STATUS_COLOR = {
  "Submitted":    { bg: "#1e293b", text: "#94a3b8", dot: "#94a3b8" },
  "Under Review": { bg: "#422006", text: "#fb923c", dot: "#f97316" },
  "In Progress":  { bg: "#172554", text: "#60a5fa", dot: "#3b82f6" },
  "Resolved":     { bg: "#052e16", text: "#4ade80", dot: "#22c55e" },
  "Closed":       { bg: "#1e293b", text: "#64748b", dot: "#475569" },
};

const DEMO_USERS = {
  "citizen@demo.com":   { id: "u1", name: "Priya Sharma",  role: "citizen",   avatar: "PS", color: "#0ea5e9" },
  "authority@demo.com": { id: "u2", name: "Rajan Kumar",   role: "authority", avatar: "RK", color: "#f97316", dept: "Municipal Corp." },
  "admin@demo.com":     { id: "u3", name: "Admin Console", role: "admin",     avatar: "AC", color: "#a855f7" },
};

function mkPriority(c) {
  const cat = CATEGORIES.find(x => x.id === c.category);
  let s = cat?.weight || 10;
  s += Math.min((c.upvotes || 0) * 0.5, 30);
  const days = Math.floor((Date.now() - new Date(c.submittedAt)) / 86400000);
  s += Math.min(days * 2, 20);
  const danger = ["danger","accident","hazard","emergency","no water","flood","collapse","dead","injury"];
  const txt = (c.title + c.description).toLowerCase();
  danger.forEach(k => { if (txt.includes(k)) s += 6; });
  return Math.min(Math.round(s), 100);
}

const SEED = [
  { id:"GRV-001", title:"Giant pothole on MG Road near bus stop",       description:"Caused 3 accidents this week. Vehicles getting damaged badly.",                   category:"road",        status:"In Progress",  submittedBy:"u1", submittedAt:"2026-02-18", location:"MG Road, Block 4",         assignedTo:"PWD Dept",      upvotes:47, escalated:true,  updates:[{date:"2026-02-19",by:"System",text:"Received & routed to PWD."},{date:"2026-02-21",by:"PWD Dept",text:"Field inspection done. Repair scheduled."}] },
  { id:"GRV-002", title:"No water supply for 3 days in Sector 12",       description:"Entire sector without water. Residents buying at 10x cost.",                     category:"water",       status:"Under Review", submittedBy:"u1", submittedAt:"2026-02-24", location:"Sector 12, Block B",      assignedTo:null,            upvotes:89, escalated:true,  updates:[{date:"2026-02-24",by:"System",text:"Auto-escalated: Priority 90+."}] },
  { id:"GRV-003", title:"Garbage not collected for 2 weeks",             description:"Waste overflowing near park. Health hazard for children.",                       category:"sanitation",  status:"Submitted",    submittedBy:"u1", submittedAt:"2026-02-26", location:"Greenview Park Gate",     assignedTo:null,            upvotes:23, escalated:false, updates:[] },
  { id:"GRV-004", title:"6 street lights out in Rose Garden Colony",     description:"Non-functional since Jan 30. Robberies have increased at night.",               category:"electricity", status:"Resolved",     submittedBy:"u1", submittedAt:"2026-02-10", location:"Rose Garden, Lane 7",     assignedTo:"Electricity Bd",upvotes:31, escalated:false, updates:[{date:"2026-02-12",by:"Electricity Bd",text:"Team dispatched."},{date:"2026-02-14",by:"Electricity Bd",text:"All 6 lights repaired ✓"}] },
  { id:"GRV-005", title:"Illegal construction blocking storm drain",     description:"Unauthorized structure will cause flooding in monsoon season.",                  category:"safety",      status:"Under Review", submittedBy:"u1", submittedAt:"2026-02-22", location:"Civil Lines, Near Court",  assignedTo:"Building Dept", upvotes:18, escalated:false, updates:[{date:"2026-02-23",by:"Building Dept",text:"Notice issued to owner."}] },
  { id:"GRV-006", title:"Loud DJ parties every night past midnight",     description:"Industrial area hosts late-night events disturbing 200+ families.",             category:"noise",       status:"Submitted",    submittedBy:"u1", submittedAt:"2026-02-27", location:"Industrial Area, Zone C",  assignedTo:null,            upvotes:61, escalated:false, updates:[] },
];
SEED.forEach(c => { c.priority = mkPriority(c); if (c.priority >= 80 && !c.escalated) c.escalated = true; });

/* ═══════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [user,       setUser]       = useState(null);
  const [complaints, setComplaints] = useState(SEED);
  const [view,       setView]       = useState("login");   // login | app
  const [modal,      setModal]      = useState(null);      // null | "submit" | complaint-object
  const [tab,        setTab]        = useState("feed");    // feed | analytics | escalated
  const [toast,      setToast]      = useState(null);
  const [filters,    setFilters]    = useState({ status:"All", category:"All", sort:"priority" });

  const showToast = (msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const login = ({ email, pass }) => {
    const u = DEMO_USERS[email];
    if (u && pass === "demo123") { setUser(u); setView("app"); showToast(`Welcome, ${u.name}!`); }
    else showToast("Wrong credentials. Try demo below.", "err");
  };

  const submitComplaint = (data) => {
    const id = `GRV-${String(complaints.length + 1).padStart(3,"0")}`;
    const nc = { id, ...data, status:"Submitted", submittedBy:user.id, submittedAt:new Date().toISOString().split("T")[0], assignedTo:null, upvotes:0, escalated:false, updates:[{date:new Date().toISOString().split("T")[0],by:"System",text:"Complaint registered successfully."}] };
    nc.priority = mkPriority(nc);
    if (nc.priority >= 80) nc.escalated = true;
    setComplaints(p => [nc, ...p]);
    setModal(null);
    showToast(`${id} filed! Priority Score: ${nc.priority}`, "ok");
  };

  const updateStatus = (id, status, note) => {
    const entry = { date:new Date().toISOString().split("T")[0], by:user.name, text: note || `Status changed to "${status}"` };
    setComplaints(p => p.map(c => c.id===id ? {...c, status, updates:[...c.updates, entry]} : c));
    setModal(prev => prev && prev.id===id ? {...prev, status, updates:[...prev.updates, entry]} : prev);
    showToast(`Status → "${status}"`);
  };

  const upvote = (id) => {
    setComplaints(p => p.map(c => {
      if (c.id!==id) return c;
      const upvotes = c.upvotes+1;
      const priority = Math.min(c.priority+1,100);
      const escalated = priority>=80 || c.escalated;
      return {...c, upvotes, priority, escalated};
    }));
    showToast("Upvoted! Helps raise priority.", "info");
  };

  const filtered = complaints
    .filter(c => filters.status==="All"   || c.status===filters.status)
    .filter(c => filters.category==="All" || c.category===filters.category)
    .sort((a,b) => filters.sort==="priority" ? b.priority-a.priority : filters.sort==="upvotes" ? b.upvotes-a.upvotes : new Date(b.submittedAt)-new Date(a.submittedAt));

  const stats = {
    total:     complaints.length,
    resolved:  complaints.filter(c=>c.status==="Resolved"||c.status==="Closed").length,
    active:    complaints.filter(c=>c.status==="In Progress").length,
    escalated: complaints.filter(c=>c.escalated).length,
    avgP:      Math.round(complaints.reduce((s,c)=>s+c.priority,0)/Math.max(complaints.length,1)),
  };

  /* ── CSS ── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#060a12;color:#e2e8f0;font-family:'DM Sans',sans-serif}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#f97316;border-radius:2px}
    input,select,textarea{font-family:'DM Sans',sans-serif}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fadeUp{animation:fadeUp .35s ease both}
    .fadeIn{animation:fadeIn .3s ease}
    .inp{background:#0d1420;border:1px solid #1e2d40;border-radius:8px;color:#e2e8f0;padding:10px 14px;font-size:14px;width:100%;outline:none;transition:border .2s}
    .inp:focus{border-color:#f97316}
    .lbl{font-size:11px;font-weight:600;color:#64748b;letter-spacing:.8px;text-transform:uppercase;display:block;margin-bottom:5px}
    .btn{border:none;border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;transition:all .18s}
    .btn-orange{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:10px 20px;font-size:14px}
    .btn-orange:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(249,115,22,.4)}
    .btn-ghost{background:transparent;color:#64748b;border:1px solid #1e2d40;padding:8px 16px;font-size:13px}
    .btn-ghost:hover{border-color:#f97316;color:#f97316}
    .card{background:#0d1420;border:1px solid #1e2d40;border-radius:12px}
    .card-hover{transition:all .22s}
    .card-hover:hover{border-color:#f97316;box-shadow:0 0 24px rgba(249,115,22,.08);transform:translateY(-2px)}
    .tag{display:inline-flex;align-items:center;gap:3px;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:.3px}
    .mono{font-family:'JetBrains Mono',monospace}
    .bar-wrap{height:4px;background:#1e2d40;border-radius:2px;overflow:hidden}
    .bar-fill{height:100%;border-radius:2px;transition:width .6s ease}
    .nav-btn{display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;border:none;background:transparent;font-family:'DM Sans',sans-serif;width:100%;transition:all .18s;color:#64748b}
    .nav-btn:hover{background:#111827;color:#e2e8f0}
    .nav-btn.on{background:rgba(249,115,22,.12);color:#f97316}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
    .modal-box{background:#0d1420;border:1px solid #1e2d40;border-radius:16px;width:100%;max-width:660px;max-height:88vh;overflow-y:auto}
    .toast{position:fixed;top:18px;right:18px;z-index:999;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;animation:toastIn .3s ease;max-width:300px;display:flex;align-items:center;gap:8px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
    select.inp{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
  `;

  if (view==="login") return (<>
    <style>{css}</style>
    <LoginPage onLogin={login}/>
  </>);

  return (<>
    <style>{css}</style>
    {toast && <Toast {...toast}/>}
    <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>
      <Sidebar user={user} tab={tab} setTab={setTab} stats={stats} onLogout={()=>{setUser(null);setView("login");}}/>
      <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
        <TopBar user={user} tab={tab} onNew={()=>setModal("submit")}/>
        <div style={{flex:1,padding:"24px",overflow:"auto"}}>
          {tab==="feed" && <FeedTab complaints={filtered} stats={stats} filters={filters} setFilters={setFilters} onOpen={setModal} onUpvote={upvote}/>}
          {tab==="analytics" && <AnalyticsTab complaints={complaints} stats={stats}/>}
          {tab==="escalated" && <EscalatedTab complaints={complaints.filter(c=>c.escalated)} onOpen={setModal} onStatus={updateStatus} user={user}/>}
        </div>
      </div>
    </div>
    {modal==="submit" && <SubmitModal onClose={()=>setModal(null)} onSubmit={submitComplaint}/>}
    {modal && modal!=="submit" && <DetailModal c={modal} user={user} onClose={()=>setModal(null)} onStatus={updateStatus} onUpvote={upvote}/>}
  </>);
}

/* ═══════════════════════════════════════════════════════════ TOAST */
function Toast({msg,type}) {
  const cfg = { ok:{bg:"#052e16",bd:"#22c55e",ic:"✓",col:"#86efac"}, err:{bg:"#1f0a0a",bd:"#ef4444",ic:"⚠",col:"#fca5a5"}, info:{bg:"#0c1a2e",bd:"#3b82f6",ic:"i",col:"#93c5fd"} }[type]||{bg:"#052e16",bd:"#22c55e",ic:"✓",col:"#86efac"};
  return <div className="toast" style={{background:cfg.bg,border:`1px solid ${cfg.bd}`,color:cfg.col}}><span>{cfg.ic}</span>{msg}</div>;
}

/* ═══════════════════════════════════════════════════════════ LOGIN */
function LoginPage({onLogin}) {
  const [email,setEmail] = useState("");
  const [pass,setPass]   = useState("");
  const fill = (e) => { setEmail(e); setPass("demo123"); };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20,position:"relative",overflow:"hidden"}}>
      {/* bg grid */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(249,115,22,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(249,115,22,.04) 1px,transparent 1px)",backgroundSize:"48px 48px"}}/>
      <div style={{position:"absolute",top:"15%",right:"8%",width:320,height:320,background:"radial-gradient(circle,rgba(249,115,22,.07) 0%,transparent 70%)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",bottom:"10%",left:"5%",width:200,height:200,background:"radial-gradient(circle,rgba(14,165,233,.06) 0%,transparent 70%)",borderRadius:"50%"}}/>

      <div className="fadeUp" style={{width:"100%",maxWidth:420,position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:56,height:56,background:"linear-gradient(135deg,#f97316,#ea580c)",borderRadius:14,marginBottom:14,fontSize:26}}>🏛️</div>
          <h1 style={{fontSize:26,fontWeight:700,letterSpacing:-0.5}}>GrievancePortal</h1>
          <p style={{color:"#64748b",fontSize:13,marginTop:4}}>Public Issue Management System</p>
        </div>

        <div className="card" style={{padding:28}}>
          <div style={{marginBottom:14}}>
            <label className="lbl">Email</label>
            <input className="inp" type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onLogin({email,pass})}/>
          </div>
          <div style={{marginBottom:22}}>
            <label className="lbl">Password</label>
            <input className="inp" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onLogin({email,pass})}/>
          </div>
          <button className="btn btn-orange" style={{width:"100%",padding:12}} onClick={()=>onLogin({email,pass})}>Sign In →</button>

          <div style={{marginTop:20,background:"#060a12",border:"1px solid #1e2d40",borderRadius:8,padding:14}}>
            <p style={{fontSize:10,color:"#475569",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Quick Demo — password: demo123</p>
            {Object.entries(DEMO_USERS).map(([e,u])=>(
              <div key={e} onClick={()=>fill(e)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 8px",borderRadius:6,cursor:"pointer"}}
                onMouseEnter={ev=>ev.currentTarget.style.background="#111827"}
                onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                <span style={{fontSize:13,fontWeight:600,color:u.color}}>
                  {{citizen:"👤 Citizen",authority:"🏢 Authority",admin:"⚙️ Admin"}[u.role]} — {u.name}
                </span>
                <span className="mono" style={{fontSize:10,color:"#475569"}}>{e}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ SIDEBAR */
function Sidebar({user,tab,setTab,stats,onLogout}) {
  const navs = [
    {id:"feed",      icon:"📋", label:"All Complaints"},
    {id:"analytics", icon:"📊", label:"Analytics"},
    ...(user?.role!=="citizen" ? [{id:"escalated",icon:"🚨",label:"Escalated",badge:stats.escalated}] : []),
  ];
  return (
    <aside style={{width:216,background:"#070b14",borderRight:"1px solid #111827",display:"flex",flexDirection:"column",flexShrink:0,padding:"18px 10px"}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:28,padding:"0 6px"}}>
        <div style={{width:30,height:30,background:"linear-gradient(135deg,#f97316,#ea580c)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🏛️</div>
        <div>
          <div style={{fontSize:13,fontWeight:700}}>GrievancePortal</div>
          <div className="mono" style={{fontSize:9,color:"#475569"}}>CIVIC MGMT v2</div>
        </div>
      </div>

      <p style={{fontSize:9,color:"#374151",letterSpacing:1,fontWeight:700,textTransform:"uppercase",padding:"0 10px",marginBottom:6}}>Navigation</p>
      <nav style={{flex:1}}>
        {navs.map(n=>(
          <button key={n.id} className={`nav-btn${tab===n.id?" on":""}`} onClick={()=>setTab(n.id)}>
            <span>{n.icon}</span>
            <span style={{flex:1,textAlign:"left"}}>{n.label}</span>
            {n.badge>0 && <span className="tag" style={{background:"rgba(239,68,68,.15)",color:"#fca5a5",padding:"1px 6px"}}>{n.badge}</span>}
          </button>
        ))}
      </nav>

      <div style={{borderTop:"1px solid #111827",paddingTop:14}}>
        <div style={{display:"flex",alignItems:"center",gap:9,padding:"6px 10px",marginBottom:6}}>
          <div style={{width:30,height:30,background:user?.color+"33",border:`1px solid ${user?.color}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:user?.color}}>{user?.avatar}</div>
          <div>
            <div style={{fontSize:12,fontWeight:600}}>{user?.name}</div>
            <div style={{fontSize:10,color:user?.color,fontWeight:700,textTransform:"uppercase"}}>{user?.role}</div>
          </div>
        </div>
        <button className="nav-btn" onClick={onLogout}>← Sign Out</button>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════ TOPBAR */
function TopBar({user,tab,onNew}) {
  const titles={feed:"Complaint Feed",analytics:"System Analytics",escalated:"Escalated Issues"};
  return (
    <div style={{background:"#070b14",borderBottom:"1px solid #111827",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
      <div>
        <h1 style={{fontSize:18,fontWeight:700}}>{titles[tab]}</h1>
        <p style={{fontSize:11,color:"#475569",marginTop:2}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      </div>
      {user?.role==="citizen" && tab==="feed" && <button className="btn btn-orange" onClick={onNew}>+ File Complaint</button>}
      {user?.role!=="citizen" && tab==="feed" && <button className="btn btn-orange" onClick={onNew}>+ New Complaint</button>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ FEED */
function FeedTab({complaints,stats,filters,setFilters,onOpen,onUpvote}) {
  const pColor = (p) => p>=80?"#ef4444":p>=60?"#f97316":p>=40?"#eab308":"#22c55e";
  return (
    <div className="fadeUp">
      {/* stat row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
        {[
          {l:"Total",v:stats.total,     c:"#64748b",i:"📋"},
          {l:"In Progress",v:stats.active,   c:"#3b82f6",i:"⚙️"},
          {l:"Resolved",   v:stats.resolved, c:"#22c55e",i:"✓"},
          {l:"Escalated",  v:stats.escalated,c:"#ef4444",i:"🚨"},
        ].map(s=>(
          <div key={s.l} className="card" style={{padding:"16px 18px",borderTop:`2px solid ${s.c}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div className="mono" style={{fontSize:28,fontWeight:700,color:s.c}}>{s.v}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{s.l}</div>
              </div>
              <span style={{fontSize:18}}>{s.i}</span>
            </div>
          </div>
        ))}
      </div>

      {/* filters */}
      <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
        <select className="inp" style={{width:150}} value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
          <option value="All">All Status</option>
          {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="inp" style={{width:170}} value={filters.category} onChange={e=>setFilters(p=>({...p,category:e.target.value}))}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        <select className="inp" style={{width:150}} value={filters.sort} onChange={e=>setFilters(p=>({...p,sort:e.target.value}))}>
          <option value="priority">Sort: Priority</option>
          <option value="upvotes">Sort: Upvotes</option>
          <option value="date">Sort: Newest</option>
        </select>
        <span style={{fontSize:12,color:"#475569",marginLeft:"auto"}}>{complaints.length} complaints</span>
      </div>

      {/* list */}
      {complaints.length===0 && (
        <div style={{textAlign:"center",padding:60,color:"#374151"}}>
          <div style={{fontSize:40,marginBottom:10}}>📭</div>
          <p style={{fontWeight:600}}>No complaints match your filters</p>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {complaints.map(c=>{
          const cat=CATEGORIES.find(x=>x.id===c.category);
          const sc=STATUS_COLOR[c.status];
          const pc=pColor(c.priority);
          return (
            <div key={c.id} className="card card-hover" style={{padding:"16px 18px",cursor:"pointer"}} onClick={()=>onOpen(c)}>
              <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                {/* priority col */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:46}}>
                  <div className="mono" style={{fontSize:13,fontWeight:700,color:pc}}>{c.priority}</div>
                  <div className="bar-wrap" style={{width:38}}>
                    <div className="bar-fill" style={{width:`${c.priority}%`,background:pc}}/>
                  </div>
                  <div style={{fontSize:9,color:"#475569",fontWeight:700}}>SCORE</div>
                </div>

                {/* main */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,flexWrap:"wrap"}}>
                    <span className="mono" style={{fontSize:10,color:"#475569"}}>{c.id}</span>
                    {c.escalated && <span className="tag" style={{background:"rgba(239,68,68,.15)",color:"#fca5a5",border:"1px solid rgba(239,68,68,.3)"}}>🚨 ESCALATED</span>}
                    <span className="tag" style={{background:sc.bg,color:sc.text}}>
                      <span className="dot" style={{background:sc.dot}}/>
                      {c.status}
                    </span>
                  </div>
                  <h3 style={{fontSize:14,fontWeight:600,marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.title}</h3>
                  <p style={{fontSize:12,color:"#64748b",marginBottom:8,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.description}</p>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:cat?.color}}>{cat?.icon} {cat?.label}</span>
                    <span style={{fontSize:11,color:"#475569"}}>📍 {c.location}</span>
                    <span style={{fontSize:11,color:"#475569"}}>🗓 {c.submittedAt}</span>
                    {c.assignedTo && <span style={{fontSize:11,color:"#475569"}}>👷 {c.assignedTo}</span>}
                  </div>
                </div>

                {/* upvote */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
                  <button className="btn" onClick={e=>{e.stopPropagation();onUpvote(c.id);}}
                    style={{background:"#111827",border:"1px solid #1e2d40",color:"#f97316",borderRadius:7,padding:"5px 9px",fontSize:14}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(249,115,22,.15)"}
                    onMouseLeave={e=>e.currentTarget.style.background="#111827"}>▲</button>
                  <span className="mono" style={{fontSize:11,fontWeight:700}}>{c.upvotes}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ ANALYTICS */
function AnalyticsTab({complaints,stats}) {
  const resRate = stats.total ? Math.round((stats.resolved/stats.total)*100) : 0;
  const catData = CATEGORIES.map(c=>({...c,cnt:complaints.filter(x=>x.category===c.id).length})).filter(c=>c.cnt>0).sort((a,b)=>b.cnt-a.cnt);
  const statusData = STATUSES.map(s=>({s,cnt:complaints.filter(c=>c.status===s).length,col:STATUS_COLOR[s].dot}));
  const top5 = [...complaints].sort((a,b)=>b.priority-a.priority).slice(0,5);

  return (
    <div className="fadeUp" style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* kpi row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {[
          {l:"Resolution Rate",v:`${resRate}%`,sub:`${stats.resolved}/${stats.total} closed`,c:"#22c55e"},
          {l:"Avg Priority Score",v:stats.avgP,sub:`${stats.escalated} auto-escalated`,c:"#f97316"},
          {l:"In Progress",v:stats.active,sub:"Being actively resolved",c:"#3b82f6"},
        ].map(s=>(
          <div key={s.l} className="card" style={{padding:"18px 20px",borderTop:`2px solid ${s.c}`}}>
            <div style={{fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{s.l}</div>
            <div className="mono" style={{fontSize:34,fontWeight:700,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11,color:"#475569",marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Status */}
        <div className="card" style={{padding:20}}>
          <h3 style={{fontSize:14,fontWeight:700,marginBottom:16}}>Status Breakdown</h3>
          {statusData.map(s=>(
            <div key={s.s} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div className="dot" style={{background:s.col}}/>
                  <span style={{fontSize:12}}>{s.s}</span>
                </div>
                <span className="mono" style={{fontSize:12,fontWeight:700}}>{s.cnt}</span>
              </div>
              <div className="bar-wrap">
                <div className="bar-fill" style={{width:`${stats.total?(s.cnt/stats.total)*100:0}%`,background:s.col}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Category */}
        <div className="card" style={{padding:20}}>
          <h3 style={{fontSize:14,fontWeight:700,marginBottom:16}}>Category Distribution</h3>
          {catData.map(c=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:16}}>{c.icon}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:12}}>{c.label}</span>
                  <span className="mono" style={{fontSize:12}}>{c.cnt}</span>
                </div>
                <div className="bar-wrap">
                  <div className="bar-fill" style={{width:`${(c.cnt/complaints.length)*100}%`,background:c.color}}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Priority */}
      <div className="card" style={{padding:20}}>
        <h3 style={{fontSize:14,fontWeight:700,marginBottom:16}}>🔥 Top 5 Priority Issues</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
          {top5.map((c,i)=>{
            const cat=CATEGORIES.find(x=>x.id===c.category);
            const pc=c.priority>=80?"#ef4444":c.priority>=60?"#f97316":"#eab308";
            return (
              <div key={c.id} style={{background:"#060a12",borderRadius:8,padding:"12px 14px",display:"flex",gap:10,alignItems:"center",border:`1px solid ${pc}30`}}>
                <div className="mono" style={{fontSize:20,fontWeight:700,color:pc,minWidth:28}}>#{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.title}</div>
                  <div style={{fontSize:10,color:"#64748b",marginTop:2}}>{cat?.icon} {cat?.label} · Score: <span className="mono" style={{color:pc}}>{c.priority}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ ESCALATED */
function EscalatedTab({complaints,onOpen,onStatus,user}) {
  return (
    <div className="fadeUp">
      <div style={{background:"linear-gradient(90deg,#1a0505,#060a12)",border:"1px solid rgba(239,68,68,.3)",borderRadius:10,padding:"14px 18px",marginBottom:20,display:"flex",gap:12,alignItems:"center"}}>
        <span style={{fontSize:22}}>🚨</span>
        <div>
          <div style={{fontWeight:700,color:"#fca5a5",fontSize:14}}>Immediate Attention Required</div>
          <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>These complaints scored 80+ or have high community impact. Please resolve or reassign.</div>
        </div>
        <div className="mono" style={{marginLeft:"auto",fontSize:24,fontWeight:700,color:"#ef4444"}}>{complaints.length}</div>
      </div>

      {complaints.length===0 && (
        <div style={{textAlign:"center",padding:60,color:"#374151"}}>
          <div style={{fontSize:36,marginBottom:10}}>✅</div>
          <p style={{fontWeight:600}}>No escalated issues!</p>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {complaints.map(c=>{
          const cat=CATEGORIES.find(x=>x.id===c.category);
          const pc=c.priority>=80?"#ef4444":c.priority>=60?"#f97316":"#eab308";
          const nextStatuses=STATUSES.filter(s=>STATUSES.indexOf(s)>STATUSES.indexOf(c.status)).slice(0,2);
          return (
            <div key={c.id} className="card" style={{padding:"16px 18px",borderLeft:`3px solid ${pc}`,cursor:"pointer"}} onClick={()=>onOpen(c)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                    <span className="mono" style={{fontSize:10,color:"#475569"}}>{c.id}</span>
                    <span className="tag" style={{background:"rgba(239,68,68,.15)",color:"#fca5a5",border:"1px solid rgba(239,68,68,.25)"}}>🚨 ESCALATED</span>
                    <span className="tag" style={{background:STATUS_COLOR[c.status].bg,color:STATUS_COLOR[c.status].text}}>{c.status}</span>
                  </div>
                  <h3 style={{fontSize:14,fontWeight:600,marginBottom:3}}>{c.title}</h3>
                  <p style={{fontSize:11,color:"#64748b"}}>{cat?.icon} {cat?.label} · 📍 {c.location} · 🗓 {c.submittedAt} · 👥 {c.upvotes} upvotes</p>
                  {nextStatuses.length>0 && (
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      {nextStatuses.map(s=>(
                        <button key={s} className="btn btn-ghost" style={{fontSize:11,padding:"5px 12px"}} onClick={e=>{e.stopPropagation();onStatus(c.id,s,"");}}>
                          Move to {s} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{textAlign:"center",flexShrink:0}}>
                  <div className="mono" style={{fontSize:30,fontWeight:700,color:pc}}>{c.priority}</div>
                  <div style={{fontSize:9,color:"#475569",fontWeight:700}}>PRIORITY</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ SUBMIT MODAL */
function SubmitModal({onClose,onSubmit}) {
  const [f,setF] = useState({title:"",description:"",category:"road",location:""});
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const submit = () => {
    if(!f.title.trim()||!f.description.trim()||!f.location.trim()) return alert("Please fill all fields.");
    onSubmit(f);
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-box fadeUp" onClick={e=>e.stopPropagation()}>
        <div style={{padding:"22px 24px",borderBottom:"1px solid #1e2d40",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700}}>File a Complaint</h2>
            <p style={{fontSize:12,color:"#64748b",marginTop:2}}>Auto-prioritized by our scoring algorithm</p>
          </div>
          <button className="btn" style={{background:"#111827",border:"none",color:"#94a3b8",borderRadius:7,padding:"5px 11px",fontSize:18}} onClick={onClose}>×</button>
        </div>
        <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label className="lbl">Issue Title *</label>
            <input className="inp" placeholder="Brief title of the problem" value={f.title} onChange={e=>set("title",e.target.value)}/>
          </div>
          <div className="grid2">
            <div>
              <label className="lbl">Category *</label>
              <select className="inp" value={f.category} onChange={e=>set("category",e.target.value)}>
                {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Location *</label>
              <input className="inp" placeholder="Street, area, landmark…" value={f.location} onChange={e=>set("location",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className="lbl">Description *</label>
            <textarea className="inp" rows={4} style={{resize:"none"}} placeholder="Describe in detail — severity, duration, affected residents…" value={f.description} onChange={e=>set("description",e.target.value)}/>
          </div>
          <div style={{background:"#060a12",border:"1px solid #1e2d40",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#64748b"}}>
            💡 Priority is scored automatically — safety, water, and electricity issues are weighted highest. Dangerous keywords boost the score.
          </div>
          <div style={{display:"flex",gap:10}}>
            <button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>Cancel</button>
            <button className="btn btn-orange" style={{flex:2,padding:11}} onClick={submit}>Submit Complaint →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ DETAIL MODAL */
function DetailModal({c,user,onClose,onStatus,onUpvote}) {
  const [note,setNote]       = useState("");
  const [newSt,setNewSt]     = useState(c.status);
  const cat   = CATEGORIES.find(x=>x.id===c.category);
  const sc    = STATUS_COLOR[c.status];
  const pc    = c.priority>=80?"#ef4444":c.priority>=60?"#f97316":c.priority>=40?"#eab308":"#22c55e";
  const canMng = user?.role!=="citizen";
  const nextSt = STATUSES.filter(s=>STATUSES.indexOf(s)>=STATUSES.indexOf(c.status));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-box fadeUp" style={{maxWidth:700}} onClick={e=>e.stopPropagation()}>
        {/* header */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid #1e2d40",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
              <span className="mono" style={{fontSize:11,color:"#475569"}}>{c.id}</span>
              {c.escalated && <span className="tag" style={{background:"rgba(239,68,68,.15)",color:"#fca5a5",border:"1px solid rgba(239,68,68,.3)"}}>🚨 ESCALATED</span>}
              <span className="tag" style={{background:sc.bg,color:sc.text}}><span className="dot" style={{background:sc.dot}}/>{c.status}</span>
            </div>
            <h2 style={{fontSize:19,fontWeight:700}}>{c.title}</h2>
          </div>
          <button className="btn" style={{background:"#111827",border:"none",color:"#94a3b8",borderRadius:7,padding:"5px 11px",fontSize:18,flexShrink:0}} onClick={onClose}>×</button>
        </div>

        <div style={{padding:24,display:"grid",gridTemplateColumns:"1fr 230px",gap:22}}>
          {/* Left */}
          <div>
            <p style={{fontSize:13,color:"#cbd5e1",lineHeight:1.65,marginBottom:18}}>{c.description}</p>

            <div className="grid2" style={{marginBottom:18}}>
              {[
                {l:"Category",v:`${cat?.icon} ${cat?.label}`},
                {l:"Location",v:`📍 ${c.location}`},
                {l:"Filed On",v:`🗓 ${c.submittedAt}`},
                {l:"Assigned To",v:c.assignedTo||"Unassigned"},
              ].map(d=>(
                <div key={d.l} style={{background:"#060a12",padding:"10px 12px",borderRadius:8}}>
                  <div style={{fontSize:9,color:"#475569",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>{d.l}</div>
                  <div style={{fontSize:12,fontWeight:600}}>{d.v}</div>
                </div>
              ))}
            </div>

            {/* timeline */}
            <div style={{fontSize:11,color:"#475569",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Activity Timeline</div>
            {c.updates.length===0 && <p style={{fontSize:12,color:"#374151"}}>No updates yet.</p>}
            {c.updates.map((u,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:10}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#f97316",flexShrink:0,marginTop:3}}/>
                  {i<c.updates.length-1 && <div style={{width:1,flex:1,background:"#1e2d40",margin:"3px 0"}}/>}
                </div>
                <div style={{flex:1,paddingBottom:6}}>
                  <div style={{fontSize:12,color:"#cbd5e1"}}>{u.text}</div>
                  <div style={{fontSize:10,color:"#475569",marginTop:1}}>{u.by} · {u.date}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Right */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* priority box */}
            <div style={{background:"#060a12",border:`1px solid ${pc}30`,borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748b",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Priority Score</div>
              <div className="mono" style={{fontSize:40,fontWeight:700,color:pc}}>{c.priority}</div>
              <div className="bar-wrap" style={{margin:"8px 0"}}>
                <div className="bar-fill" style={{width:`${c.priority}%`,background:pc}}/>
              </div>
              <div style={{fontSize:10,color:"#64748b"}}>{c.priority>=80?"🔴 Critical":c.priority>=60?"🟠 High":c.priority>=40?"🟡 Medium":"🟢 Normal"}</div>
            </div>

            {/* upvotes */}
            <div style={{background:"#060a12",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:"#64748b"}}>Community Votes</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span className="mono" style={{fontSize:20,fontWeight:700}}>{c.upvotes}</span>
                <button className="btn" onClick={()=>onUpvote(c.id)}
                  style={{background:"rgba(249,115,22,.12)",border:"1px solid #f97316",color:"#f97316",borderRadius:6,padding:"3px 8px",fontSize:13}}>▲</button>
              </div>
            </div>

            {/* status update */}
            {canMng && (
              <div style={{background:"#060a12",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Update Status</div>
                <select className="inp" style={{marginBottom:8}} value={newSt} onChange={e=>setNewSt(e.target.value)}>
                  {nextSt.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <textarea className="inp" rows={3} style={{resize:"none",marginBottom:8,fontSize:12}} placeholder="Add a note (optional)…" value={note} onChange={e=>setNote(e.target.value)}/>
                <button className="btn btn-orange" style={{width:"100%",padding:9,fontSize:13}} onClick={()=>{onStatus(c.id,newSt,note);setNote("");}}>
                  Update Status →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
