import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ShieldCheck, ScanLine, House, ClipboardList, MessageCircle, CloudSun, HardHat, Upload, ArrowRight, LoaderCircle, Building2, CheckCircle2, AlertTriangle } from "lucide-react";
import "./styles.css";

const API = "http://127.0.0.1:8000";
const features = [
  { id:"safety", title:"Site Safety Review", desc:"Review a site photo for visible PPE and hazards.", icon:ShieldCheck, tag:"IMAGE AI" },
  { id:"cracks", title:"Crack Analysis", desc:"Review visible crack-like patterns in a surface photo.", icon:ScanLine, tag:"IMAGE AI" },
  { id:"valuation", title:"Property Valuation", desc:"Estimate value using area and your local rate.", icon:House, tag:"CALCULATOR" },
  { id:"plan", title:"Project Planner", desc:"Create a simple phase, timeline and budget outline.", icon:ClipboardList, tag:"PLANNING" },
  { id:"assistant", title:"Site Assistant", desc:"Ask a construction knowledge question.", icon:MessageCircle, tag:"AI ASSISTANT" },
  { id:"weather", title:"Weather Advisory", desc:"Check current conditions and general site guidance.", icon:CloudSun, tag:"LIVE WEATHER" },
];

function App() {
  const [active, setActive] = useState("safety");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [image, setImage] = useState(null);
  const [form, setForm] = useState({ location:"Indore", area_sqft:"1200", property_type:"Residential", rate_per_sqft:"3500", project_type:"Residential building", budget_inr:"3500000", duration_weeks:"24", notes:"", question:"What are the key checks before pouring concrete?", city:"Indore" });

  const update = (key, value) => setForm(prev => ({...prev, [key]:value}));
  const reset = (id) => { setActive(id); setResult(null); setError(""); setImage(null); };

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      let response;
      if (active === "safety" || active === "cracks") {
        if (!image) throw new Error("Please choose a site image first.");
        const fd = new FormData(); fd.append("image", image);
        response = await fetch(`${API}/api/${active}`, { method:"POST", body:fd });
      } else {
        const payload = active === "valuation"
          ? { location:form.location, area_sqft:Number(form.area_sqft), property_type:form.property_type, rate_per_sqft:Number(form.rate_per_sqft) }
          : active === "plan"
          ? { project_type:form.project_type, area_sqft:Number(form.area_sqft), budget_inr:Number(form.budget_inr), duration_weeks:Number(form.duration_weeks), notes:form.notes }
          : active === "assistant" ? { question:form.question } : { city:form.city };
        response = await fetch(`${API}/api/${active}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Request failed.");
      setResult(data);
    } catch (err) { setError(err.message || "Could not connect. Is the FastAPI server running?"); }
    finally { setBusy(false); }
  }

  const selected = features.find(f => f.id === active);
  const money = n => Number(n || 0).toLocaleString("en-IN", {style:"currency", currency:"INR", maximumFractionDigits:0});

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><HardHat size={23}/></div><div><b>BuildSense<span> AI</span></b><small>CONSTRUCTION INTELLIGENCE</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      {features.map(f => <button key={f.id} className={`nav-item ${active===f.id?"active":""}`} onClick={()=>reset(f.id)}><f.icon size={18}/><span>{f.title}</span>{active===f.id&&<ArrowRight size={15} className="nav-arrow"/>}</button>)}
      <div className="sidebar-bottom"><div className="status-dot"/><div><b>Decision support</b><small>Verify critical findings with a qualified professional.</small></div></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> Intelligence tools <span>/</span> <b>{selected.title}</b></div><div className="profile"><div className="avatar">BS</div><span>Project workspace</span></div></header>
      <section className="hero">
        <div><div className="eyebrow"><span className="pulse"/> MULTIMODAL CONSTRUCTION PLATFORM</div><h1>Build smarter.<br/><em>Build safer.</em></h1><p>Turn site information into practical insights for planning, monitoring and decision support.</p></div>
        <div className="hero-art"><div className="art-circle"/><Building2 size={96} strokeWidth={1.1}/><div className="art-chip chip-one"><ShieldCheck size={16}/> Safety first</div><div className="art-chip chip-two"><CheckCircle2 size={16}/> Project insights</div></div>
      </section>

      <section className="feature-grid">{features.map((f,i)=><button key={f.id} className={`feature-card ${active===f.id?"chosen":""}`} onClick={()=>reset(f.id)}><div className="feature-top"><div className="feature-icon"><f.icon size={20}/></div><span>{f.tag}</span></div><h3>{f.title}</h3><p>{f.desc}</p><div className="card-link">Open tool <ArrowRight size={15}/></div></button>)}</section>

      <section className="work-area">
        <div className="section-heading"><div><div className="eyebrow dark">TOOL WORKSPACE</div><h2>{selected.title}</h2><p>{selected.desc}</p></div><span className="pill"><span className="pulse"/> Ready to use</span></div>
        <div className="workspace-grid">
          <form className="input-panel" onSubmit={submit}>
            {(active==="safety"||active==="cracks")&&<><label>Upload construction image</label><label className="upload-zone"><input type="file" accept="image/*" onChange={e=>setImage(e.target.files?.[0]||null)}/><div className="upload-icon"><Upload size={22}/></div><b>{image ? image.name : "Choose an image"}</b><span>{image ? `${(image.size/1024/1024).toFixed(2)} MB · selected` : "PNG, JPG or WEBP · Max 10 MB"}</span></label><div className="hint"><AlertTriangle size={15}/> Results are advisory and may be inaccurate.</div></>}
            {active==="valuation"&&<><Field label="Location" value={form.location} onChange={v=>update("location",v)}/><Field label="Property type" value={form.property_type} onChange={v=>update("property_type",v)}/><div className="two-col"><Field label="Area (sq ft)" type="number" value={form.area_sqft} onChange={v=>update("area_sqft",v)}/><Field label="Rate per sq ft (₹)" type="number" value={form.rate_per_sqft} onChange={v=>update("rate_per_sqft",v)}/></div></>}
            {active==="plan"&&<><Field label="Project type" value={form.project_type} onChange={v=>update("project_type",v)}/><div className="two-col"><Field label="Area (sq ft)" type="number" value={form.area_sqft} onChange={v=>update("area_sqft",v)}/><Field label="Duration (weeks)" type="number" value={form.duration_weeks} onChange={v=>update("duration_weeks",v)}/></div><Field label="Total budget (₹)" type="number" value={form.budget_inr} onChange={v=>update("budget_inr",v)}/><label>Additional notes</label><textarea value={form.notes} onChange={e=>update("notes",e.target.value)} placeholder="Scope, constraints or materials..." rows="3"/></>}
            {active==="assistant"&&<><label>Your question</label><textarea value={form.question} onChange={e=>update("question",e.target.value)} rows="5" placeholder="Ask a construction question..."/></>}
            {active==="weather"&&<><Field label="City" value={form.city} onChange={v=>update("city",v)}/><p className="small-note">Uses Open-Meteo. Internet connection required.</p></>}
            <button className="submit-btn" disabled={busy} type="submit">{busy?<><LoaderCircle className="spin" size={17}/> Working...</>:<>Generate insights <ArrowRight size={17}/></>}</button>
            {error&&<div className="error-box">{error}</div>}
          </form>
          <div className="result-panel"><div className="result-head"><div><span className="result-kicker">OUTPUT</span><h3>Analysis results</h3></div><div className="result-symbol"><selected.icon size={19}/></div></div>
            {!result&&!busy&&<div className="empty-state"><div className="empty-illustration"><ClipboardList size={35}/></div><h4>Your insights will appear here</h4><p>Enter details or upload an image, then select <b>Generate insights</b> to see the output.</p><div className="empty-steps"><span>01 <b>Provide input</b></span><span>02 <b>Run analysis</b></span><span>03 <b>Review output</b></span></div></div>}
            {busy&&<div className="loading-state"><LoaderCircle className="spin" size={30}/><b>Working on your request...</b><span>This may take a few seconds.</span></div>}
            {result&&<Result data={result} money={money}/>}
          </div>
        </div>
      </section>
      <footer>BuildSense AI · Prototype for educational and decision-support use <span>Human verification required for safety-critical decisions</span></footer>
    </main>
  </div>;
}

function Field({label,value,onChange,type="text"}) { return <label className="field-label">{label}<input type={type} min={type==="number"?"0":undefined} value={value} onChange={e=>onChange(e.target.value)} required/></label>; }

function Result({data,money}) {
  const format = k => k.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
  const skip = new Set(["mode","title","phases","current","daily","advisory","findings","recommendations","limitations"]);
  return <div className="result-content">
    {data.title&&<div className="result-banner"><CheckCircle2 size={17}/><b>{data.title}</b><span className="mode-tag">{data.mode==="ai"?"AI":"DEMO"}</span></div>}
    {data.answer&&<p className="answer-text">{data.answer}</p>}
    {data.estimated_value_inr!==undefined&&<div className="value-card"><span>Estimated property value</span><strong>{money(data.estimated_value_inr)}</strong><small>{data.calculation}</small></div>}
    {data.phases&&<div className="phase-list">{data.phases.map((p,i)=><div className="phase" key={p.phase}><div className="phase-num">{String(i+1).padStart(2,"0")}</div><div className="phase-info"><b>{p.phase}</b><span>Week {p.approx_start_week}–{p.approx_end_week}</span></div><strong>{money(p.budget_estimate_inr)}</strong></div>)}</div>}
    {data.current&&<div className="weather-card"><div className="weather-temp">{data.current.temperature_2m}°<span>{data.current_units?.temperature_2m||"C"}</span></div><div><b>{data.city}, {data.country}</b><p>Humidity: {data.current.relative_humidity_2m}% · Wind: {data.current.wind_speed_10m} km/h · Precipitation: {data.current.precipitation} mm</p></div></div>}
    {data.findings&&<ListBlock title="Findings" items={data.findings}/>}
    {data.recommendations&&<ListBlock title="Recommendations" items={data.recommendations}/>}
    {data.advisory&&<ListBlock title="Weather advisory" items={data.advisory}/>}
    {data.limitations&&<ListBlock title="Limitations" items={data.limitations}/>}
    {data.daily&&<p className="small-note">Maximum precipitation probability today: {data.daily.precipitation_probability_max?.[0] ?? "N/A"}%</p>}
    {Object.entries(data).filter(([k,v])=>!skip.has(k)&&typeof v!=="object"&&v!==null).map(([k,v])=><div className="data-row" key={k}><span>{format(k)}</span><b>{String(v)}</b></div>)}
    {(data.note||data.disclaimer)&&<div className="disclaimer"><AlertTriangle size={16}/><span>{data.note||data.disclaimer}</span></div>}
    {data.source&&<small className="source-line">Source: {data.source}</small>}
  </div>;
}
function ListBlock({title,items}) { if(!items?.length)return null; return <div className="list-block"><h4>{title}</h4>{items.map((x,i)=><div className="finding" key={i}><span className="bullet"/><p>{x}</p></div>)}</div>; }

createRoot(document.getElementById("root")).render(<App/>);
