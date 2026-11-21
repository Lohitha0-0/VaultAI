import { useState, useEffect, useCallback, useRef } from "react";

const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Instrument+Mono:ital,wght@0,400;0,500;1,400&family=Literata:ital,wght@0,300;0,400;0,500;1,300&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --ink:#020c16;--surface:#050f1c;--card:#071525;--card2:#091a2e;
      --rim:#0d2440;--rim2:#153356;
      --teal:#00e5ff;--teal2:#00b4c8;--teal-glow:rgba(0,229,255,.13);
      --gold:#e8b84b;--jade:#0fba81;--rose:#f5365c;--amber:#f59e0b;
      --ink-white:#ddf0fc;--ink-mid:#5d8aaa;--ink-dim:#2a4d68;
      --display:'Clash Display',sans-serif;
      --mono:'Instrument Mono',monospace;
      --serif:'Literata',serif;
    }
    html,body,#root{height:100%;background:var(--ink);color:var(--ink-white);font-family:var(--display)}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:var(--ink)}
    ::-webkit-scrollbar-thumb{background:var(--rim2);border-radius:2px}
    @keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes in{from{opacity:0}to{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
    @keyframes scan{0%{transform:translateY(-10px);opacity:.7}100%{transform:translateY(calc(100vh + 10px));opacity:0}}
    @keyframes glowBreath{0%,100%{box-shadow:0 0 24px var(--teal-glow)}50%{box-shadow:0 0 48px rgba(0,229,255,.22),0 0 96px rgba(0,229,255,.08)}}
    @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
    .u0{animation:up .5s cubic-bezier(.22,1,.36,1) both}
    .u1{animation:up .5s .07s cubic-bezier(.22,1,.36,1) both}
    .u2{animation:up .5s .14s cubic-bezier(.22,1,.36,1) both}
    .u3{animation:up .5s .21s cubic-bezier(.22,1,.36,1) both}
    .u4{animation:up .5s .28s cubic-bezier(.22,1,.36,1) both}
    button,input,select{font-family:var(--display)}
    .glass{background:rgba(7,21,37,.72);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
    .card-lift{transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}
    .card-lift:hover{transform:translateY(-3px);border-color:var(--rim2)!important;box-shadow:0 12px 40px rgba(0,0,0,.5)!important}
    .nav-btn{transition:all .18s ease}.nav-btn:hover{background:rgba(0,229,255,.07)!important;color:var(--teal)!important}
    .inp:focus{border-color:var(--teal)!important;box-shadow:0 0 0 3px rgba(0,229,255,.1)!important;outline:none}
    .btn-prime{transition:all .2s ease}.btn-prime:not(:disabled):hover{filter:brightness(1.1);box-shadow:0 10px 28px rgba(0,229,255,.28)!important;transform:translateY(-1px)}
    .row-hover{transition:background .15s ease}.row-hover:hover{background:rgba(0,229,255,.03)!important}
    .sms-card{transition:all .2s ease}.sms-card:hover{border-color:var(--rim2)!important;transform:translateX(3px)}
  `}</style>
);

const API_BASE = "http://localhost:8000/api";  // ← backend must run on this port
const api = async (path, method = "GET", body = null, token = null) => {
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API_BASE}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : null });
  const d = await r.json();
  if (!r.ok) {
    // Attach status so callers can check it
    const err = typeof d === "object" ? d : { detail: String(d) };
    err._status = r.status;
    throw err;
  }
  return d;
};
const money = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);
const stamp = s => new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// fp() replaced by parseDevice() below

const useTyping = () => {
  const s = useRef({ holds: [], flights: [], rhythm: [], map: {}, last: null, t0: Date.now() });
  const onDown = useCallback(e => { s.current.map[e.key] = performance.now(); }, []);
  const onUp = useCallback(e => {
    const now = performance.now(), t = s.current.map[e.key]; if (!t) return;
    s.current.holds.push(now - t);
    if (s.current.last !== null) s.current.flights.push(now - s.current.last);
    s.current.last = now; s.current.rhythm.push(now - s.current.t0);
    delete s.current.map[e.key];
  }, []);
  const get = () => ({
    key_hold_times: [...s.current.holds], flight_times: [...s.current.flights],
    typing_rhythm: [...s.current.rhythm], total_time_ms: Date.now() - s.current.t0
  });
  const reset = () => { s.current = { holds: [], flights: [], rhythm: [], map: {}, last: null, t0: Date.now() }; };
  return { onDown, onUp, get, reset };
};

const Bg = () => (
  <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
    <div style={{
      position: "absolute", inset: 0, opacity: .03,
      backgroundImage: "linear-gradient(var(--teal) 1px,transparent 1px),linear-gradient(90deg,var(--teal) 1px,transparent 1px)",
      backgroundSize: "80px 80px"
    }} />
    <div style={{
      position: "absolute", top: "-15%", left: "10%", width: 600, height: 600, borderRadius: "50%",
      background: "radial-gradient(circle,rgba(0,229,255,.055) 0%,transparent 68%)"
    }} />
    <div style={{
      position: "absolute", bottom: "-20%", right: "5%", width: 700, height: 700, borderRadius: "50%",
      background: "radial-gradient(circle,rgba(232,184,75,.035) 0%,transparent 68%)"
    }} />
    <div style={{
      position: "absolute", left: 0, right: 0, height: 1,
      background: "linear-gradient(90deg,transparent,rgba(0,229,255,.5),transparent)",
      animation: "scan 8s linear infinite"
    }} />
  </div>
);

const Spinner = ({ size = 18 }) => (
  <span style={{
    width: size, height: size, border: "2px solid rgba(255,255,255,.15)",
    borderTopColor: "var(--teal)", borderRadius: "50%", animation: "spin .7s linear infinite",
    display: "inline-block", flexShrink: 0
  }} />
);

const RiskBadge = ({ level }) => {
  const m = {
    LOW: { c: "var(--jade)", bg: "rgba(15,186,129,.12)", b: "rgba(15,186,129,.3)" },
    MEDIUM: { c: "var(--amber)", bg: "rgba(245,158,11,.12)", b: "rgba(245,158,11,.3)" },
    HIGH: { c: "#fb923c", bg: "rgba(251,146,60,.12)", b: "rgba(251,146,60,.3)" },
    CRITICAL: { c: "var(--rose)", bg: "rgba(245,54,92,.14)", b: "rgba(245,54,92,.4)" }
  }[level]
    || { c: "var(--ink-mid)", bg: "rgba(255,255,255,.04)", b: "var(--rim)" };
  return <span style={{
    color: m.c, background: m.bg, border: `1px solid ${m.b}`,
    padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 500,
    letterSpacing: 1.8, fontFamily: "var(--mono)", whiteSpace: "nowrap"
  }}>{level || "—"}</span>;
};

const Ring = ({ score = 0, size = 60, label }) => {
  const r = size / 2 - 5, circ = 2 * Math.PI * r, pct = Math.round((score || 0) * 100);
  const col = score < .3 ? "var(--jade)" : score < .5 ? "var(--amber)" : score < .75 ? "#fb923c" : "var(--rose)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rim)" strokeWidth={3} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={3}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - (score || 0))}
            style={{ transition: "stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)" }} />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", fontFamily: "var(--mono)", fontSize: size > 55 ? 12 : 10,
          fontWeight: 500, color: col
        }}>{pct}%</div>
      </div>
      {label && <span style={{
        color: "var(--ink-dim)", fontSize: 9, letterSpacing: 2,
        fontFamily: "var(--mono)", textTransform: "uppercase"
      }}>{label}</span>}
    </div>
  );
};

const Stat = ({ label, value, icon, color = "var(--teal)", sub, cls = "u0" }) => (
  <div className={`card-lift ${cls}`} style={{
    background: "linear-gradient(145deg,var(--card),var(--card2))",
    border: "1px solid var(--rim)", borderRadius: 18, padding: "22px 24px", position: "relative", overflow: "hidden"
  }}>
    <div style={{
      position: "absolute", top: 0, right: 0, width: 80, height: 80,
      background: `radial-gradient(circle at top right,${color}18,transparent 70%)`, pointerEvents: "none"
    }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
      <span style={{
        color: "var(--ink-dim)", fontSize: 10, fontWeight: 500, letterSpacing: 2.5,
        textTransform: "uppercase", fontFamily: "var(--mono)"
      }}>{label}</span>
      <span style={{ fontSize: 18, lineHeight: 1, opacity: .7 }}>{icon}</span>
    </div>
    <div style={{ color, fontSize: 30, fontWeight: 700, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{
      color: "var(--ink-mid)", fontSize: 11, marginTop: 7,
      fontFamily: "var(--serif)", fontStyle: "italic"
    }}>{sub}</div>}
  </div>
);

const TxnRow = ({ txn, onClick }) => {
  const ICONS = { TRANSFER: "↗", PAYMENT: "◈", WITHDRAWAL: "↙", DEPOSIT: "↘", DEBIT: "◆", CASH_OUT: "↙", CASH_IN: "↘" };
  const isIn = txn.transaction_type === "DEPOSIT" || txn.transaction_type === "CASH_IN";
  return (
    <div className="row-hover" onClick={onClick}
      style={{
        display: "grid", gridTemplateColumns: "50px 1fr auto auto", gap: 14,
        padding: "14px 22px", alignItems: "center", cursor: onClick ? "pointer" : "default",
        borderBottom: "1px solid var(--rim)"
      }}>
      <div style={{
        width: 42, height: 42, borderRadius: 13, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 16, fontWeight: 700,
        background: isIn ? "rgba(15,186,129,.1)" : "rgba(0,229,255,.07)",
        color: isIn ? "var(--jade)" : "var(--teal)",
        border: `1px solid ${isIn ? "rgba(15,186,129,.22)" : "var(--rim2)"}`, flexShrink: 0
      }}>
        {ICONS[txn.transaction_type] || "◆"}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink-white)" }}>
          {txn.transaction_type}
          {txn.description && <span style={{ color: "var(--ink-mid)", fontWeight: 400 }}> · {txn.description}</span>}
        </div>
        <div style={{ color: "var(--ink-dim)", fontSize: 11, marginTop: 3, fontFamily: "var(--mono)" }}>{stamp(txn.timestamp)}</div>
      </div>
      {txn.fraud_analysis?.risk_level && <RiskBadge level={txn.fraud_analysis.risk_level} />}
      <div style={{
        fontFamily: "var(--mono)", fontWeight: 500, fontSize: 14, textAlign: "right",
        color: isIn ? "var(--jade)" : "var(--ink-mid)", whiteSpace: "nowrap"
      }}>
        {isIn ? "+" : "−"}{money(txn.amount)}
      </div>
    </div>
  );
};

// ── Real IP + Location fetcher ─────────────────────────────────────────────
const getLocation = async () => {
  try {
    const r = await fetch("https://ipapi.co/json/");
    const d = await r.json();
    return {
      ip: d.ip || "unknown",
      city: d.city || "Unknown",
      region: d.region || "",
      country: d.country_name || d.country || "Unknown",
      country_code: d.country_code || "",
      lat: d.latitude || 0,
      lon: d.longitude || 0,
      org: d.org || "",
      timezone: d.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  } catch {
    return {
      ip: "unknown", city: "Unknown", country: "Unknown",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
};

// ── Better browser + OS parser ─────────────────────────────────────────────
const parseDevice = () => {
  const ua = navigator.userAgent;
  let browser = "Unknown", os = "Unknown";
  if (ua.includes("Edg/")) browser = "Edge " + (ua.match(/Edg\/([\.\d]+)/)?.[1] || "");
  else if (ua.includes("OPR/")) browser = "Opera " + (ua.match(/OPR\/([\.\d]+)/)?.[1] || "");
  else if (ua.includes("Chrome/")) browser = "Chrome " + (ua.match(/Chrome\/([\.\d]+)/)?.[1] || "");
  else if (ua.includes("Firefox/")) browser = "Firefox " + (ua.match(/Firefox\/([\.\d]+)/)?.[1] || "");
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari " + (ua.match(/Version\/([\.\d]+)/)?.[1] || "");
  if (ua.includes("Windows NT 10")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS " + (ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "");
  else if (ua.includes("Android")) os = "Android " + (ua.match(/Android ([\d.]+)/)?.[1] || "");
  else if (ua.includes("iPhone")) os = "iOS " + (ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "");
  else if (ua.includes("Linux")) os = "Linux";
  const sw = window.screen.width, sh = window.screen.height;
  let h = 0;
  const raw = [ua, sw + "x" + sh, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language, navigator.hardwareConcurrency].join("|");
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return {
    browser, os, screen_resolution: sw + "x" + sh,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language, cpu_cores: navigator.hardwareConcurrency || 4,
    fingerprint_hash: h.toString(16)
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════
const Auth = ({ onAuth }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", full_name: "", mobile_number: "", security_phrase: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [keys, setKeys] = useState(0);
  const [backendOk, setBackendOk] = useState(null); // null=checking, true=ok, false=down
  const typing = useTyping();
  useEffect(() => { typing.reset(); setErr(""); setKeys(0); setForm(f => ({ ...f, username: "" })); }, [mode]);
  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then(r => r.json())
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);
  const submit = async () => {
    setErr(""); setLoading(true);
    const profile = typing.get();
    if (profile.key_hold_times.length < 1) { setErr("Please type your username."); setLoading(false); return; }
    if (mode === "register" && form.mobile_number && !form.mobile_number.startsWith("+")) {
      setErr("Mobile number must start with + and country code. e.g. +919876543210"); setLoading(false); return;
    }
    try {
      const [location, device] = await Promise.all([getLocation(), Promise.resolve(parseDevice())]);
      const base = { username: form.username, typing_profile: profile, device, ip_address: location.ip, location };
      const res = mode === "register"
        ? await api("/register", "POST", { ...base, email: form.email, full_name: form.full_name, mobile_number: form.mobile_number || "+910000000000" })
        : await api("/login", "POST", base);

      // Store phrase locally — never sent back to user after registration
      if (mode === "register" && form.security_phrase) {
        localStorage.setItem(`vaultai_phrase_${res.user.username}`, form.security_phrase);
      }
      onAuth(res.token, res.user, device, location);
    } catch (e) {
      console.error("Auth error:", e);
      // Detect backend unreachable
      if (e instanceof TypeError || e?.message?.includes("fetch") || e?.message?.includes("network")) {
        setErr("Cannot reach backend. Make sure python main.py is running on port 8000.");
        setLoading(false); return;
      }
      const d = e?.detail;
      // "Not Found" from 404 means wrong route or backend not started
      if (d === "Not Found" || e?._status === 404) {
        setErr("Backend not found (404). Restart python main.py and refresh this page.");
        setLoading(false); return;
      }
      const msg = typeof d === "string" ? d
        : typeof d === "object" && d !== null ? (d.message || d.detail || JSON.stringify(d))
          : e?.message || null;
      if (mode === "register") {
        setErr(msg || "Registration failed. Check your details and try again.");
      } else {
        setErr(d?.typing_sim != null
          ? `Auth failed — typing match ${((d.typing_sim || 0) * 100).toFixed(0)}%. Try typing more slowly and naturally.`
          : msg || "Authentication failed. Try again.");
      }
    } finally { setLoading(false); }
  };
  const inp = {
    width: "100%", background: "var(--card)", border: "1px solid var(--rim2)", borderRadius: 11,
    padding: "13px 15px", color: "var(--ink-white)", fontSize: 14, outline: "none", transition: "all .2s"
  };
  const lbl = {
    display: "block", color: "var(--ink-dim)", fontSize: 10, fontWeight: 500, letterSpacing: 2.5,
    marginBottom: 8, textTransform: "uppercase", fontFamily: "var(--mono)"
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", zIndex: 1 }}>
      <Bg />
      <div className="u0 glass" style={{
        width: "100%", maxWidth: 460, position: "relative", zIndex: 1,
        border: "1px solid var(--rim2)", borderRadius: 26, padding: "44px 42px",
        boxShadow: "0 40px 100px rgba(0,0,0,.65),inset 0 1px 0 rgba(0,229,255,.07)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 38 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: 20, background: "linear-gradient(145deg,#0a2540,#04111f)",
            border: "1px solid var(--rim2)", marginBottom: 18, animation: "glowBreath 4s ease infinite", fontSize: 28
          }}>◈</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1.5 }}>Vault<span style={{ color: "var(--teal)" }}>AI</span></h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 11, marginTop: 7, letterSpacing: 3, textTransform: "uppercase", fontFamily: "var(--mono)" }}>Intelligent Banking</p>
        </div>
        {backendOk === false && (
          <div style={{
            marginBottom: 18, background: "rgba(245,54,92,.1)", border: "1px solid rgba(245,54,92,.35)",
            borderRadius: 11, padding: "12px 15px", color: "#fca5a5", fontSize: 12, fontFamily: "var(--mono)", lineHeight: 1.6
          }}>
            🔴 Backend offline — run this in a terminal:<br />
            <span style={{ color: "var(--teal)" }}>cd backend &amp;&amp; python main.py</span>
          </div>
        )}
        {backendOk === true && (
          <div style={{ marginBottom: 10, color: "var(--jade)", fontSize: 10, fontFamily: "var(--mono)", textAlign: "center", letterSpacing: 1 }}>
            ● Backend connected
          </div>
        )}
        <div style={{ display: "flex", background: "var(--ink)", border: "1px solid var(--rim)", borderRadius: 13, padding: 4, marginBottom: 30 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "9px 0", border: "none", borderRadius: 10,
              fontWeight: 600, fontSize: 13, letterSpacing: .5, textTransform: "capitalize", transition: "all .22s",
              background: mode === m ? "linear-gradient(135deg,#0d3b6e,#071e3c)" : "transparent",
              color: mode === m ? "var(--teal)" : "var(--ink-mid)",
              boxShadow: mode === m ? "0 2px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(0,229,255,.1)" : "none", cursor: "pointer"
            }}>{m}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── REGISTER ONLY FIELDS ── */}
          {mode === "register" && <>
            <div>
              <label style={lbl}>Full Name</label>
              <input className="inp" placeholder="Your full name" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Email</label>
              <input className="inp" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Mobile Number <span style={{ color: "var(--teal)", marginLeft: 6, fontSize: 9, letterSpacing: 1 }}>(SMS ALERTS)</span></label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>📱</span>
                <input className="inp" placeholder="+919876543210" value={form.mobile_number}
                  onChange={e => setForm(f => ({ ...f, mobile_number: e.target.value }))}
                  style={{ ...inp, paddingLeft: 40 }} />
              </div>
              <div style={{ marginTop: 6, color: "var(--ink-dim)", fontSize: 11, fontFamily: "var(--mono)" }}>
                Include country code · e.g. +91 for India, +1 for US
              </div>
            </div>
          </>}

          {/* ── USERNAME — shown on both login and register ── */}
          <div>
            <label style={lbl}>Username</label>
            <input className="inp" placeholder="Type your username…" autoComplete="off"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              style={{ ...inp }} />
          </div>

          {/* ── REGISTER: Create security phrase ── */}
          {mode === "register" && (
            <div>
              <label style={lbl}>
                Security Phrase
                <span style={{ color: "var(--teal)", marginLeft: 6, fontSize: 9, letterSpacing: 1 }}>
                  (CREATE YOUR PRIVATE PHRASE)
                </span>
              </label>
              <input
                className="inp"
                type="text"
                placeholder="e.g. my cat drinks coffee at 7am"
                autoComplete="off"
                value={form.security_phrase}
                onKeyDown={typing.onDown}
                onKeyUp={e => { typing.onUp(e); setKeys(k => k + 1); }}
                onChange={e => setForm(f => ({ ...f, security_phrase: e.target.value }))}
                style={{
                  ...inp,
                  fontFamily: "var(--mono)",
                  borderColor: form.security_phrase?.length > 6 ? "rgba(0,229,255,.45)" : "var(--rim2)"
                }}
              />
              <div style={{
                marginTop: 8, padding: "10px 13px",
                background: "rgba(0,229,255,.04)",
                border: "1px solid rgba(0,229,255,.1)",
                borderRadius: 9
              }}>
                <div style={{ color: "var(--ink-dim)", fontSize: 11, fontFamily: "var(--mono)", lineHeight: 1.7 }}>
                  🔐 This phrase will <span style={{ color: "var(--amber)" }}>never be shown again</span><br />
                  ⌨ You'll type it to verify your identity at login and for flagged transactions<br />
                  💡 Use something memorable only you know
                </div>
              </div>
              <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 2, background: "var(--rim)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    background: "linear-gradient(90deg,var(--teal2),var(--teal))",
                    width: `${Math.min(keys * 10, 100)}%`, transition: "width .3s ease",
                    boxShadow: "0 0 10px rgba(0,229,255,.5)"
                  }} />
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: keys > 9 ? "var(--teal)" : "var(--ink-dim)", whiteSpace: "nowrap" }}>
                  {keys > 9 ? "✓ Pattern captured" : `${keys} keystrokes`}
                </span>
              </div>
            </div>
          )}

          {/* ── LOGIN: Enter security phrase (no hint shown) ── */}
          {mode === "login" && (
            <div>
              <label style={lbl}>
                Security Phrase
                <span style={{ color: "var(--teal)", marginLeft: 6, fontSize: 9, letterSpacing: 1 }}>
                  (TYPE TO VERIFY IDENTITY)
                </span>
              </label>
              <input
                className="inp"
                placeholder="Enter your security phrase…"
                autoComplete="off"
                onKeyDown={typing.onDown}
                onKeyUp={e => { typing.onUp(e); setKeys(k => k + 1); }}
                style={{
                  ...inp,
                  fontFamily: "var(--mono)",
                  borderColor: keys > 8 ? "rgba(0,229,255,.45)" : "var(--rim2)"
                }}
              />
              <div style={{ marginTop: 8, color: "var(--ink-dim)", fontSize: 11, fontFamily: "var(--mono)" }}>
                🔐 Type the phrase you created during registration
              </div>
              <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 2, background: "var(--rim)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    background: "linear-gradient(90deg,var(--teal2),var(--teal))",
                    width: `${Math.min(keys * 6, 100)}%`, transition: "width .3s ease",
                    boxShadow: "0 0 10px rgba(0,229,255,.5)"
                  }} />
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: keys > 12 ? "var(--teal)" : "var(--ink-dim)", whiteSpace: "nowrap" }}>
                  {keys > 12 ? "✓ Pattern captured" : `${keys} keystrokes`}
                </span>
              </div>
            </div>
          )}

        </div>
        {err && <div style={{
          marginTop: 16, background: "rgba(245,54,92,.07)", border: "1px solid rgba(245,54,92,.25)",
          borderRadius: 11, padding: "13px 15px", color: "#fca5a5", fontSize: 13, fontFamily: "var(--mono)", lineHeight: 1.5
        }}>⚠ {err}</div>}
        <button className="btn-prime" onClick={submit} disabled={loading || !form.username}
          style={{
            width: "100%", marginTop: 22, padding: "14px 20px", border: "none", borderRadius: 12,
            fontWeight: 700, fontSize: 15, letterSpacing: .3,
            color: loading || !form.username ? "var(--ink-mid)" : "var(--ink)",
            background: loading || !form.username ? "var(--rim)" : "linear-gradient(135deg,#00c8e8,#0090aa)",
            boxShadow: loading || !form.username ? "none" : "0 4px 22px rgba(0,229,255,.22)",
            cursor: loading || !form.username ? "not-allowed" : "pointer"
          }}>
          {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><Spinner size={15} />Verifying biometrics…</span>
            : mode === "login" ? "Authenticate →" : "Create Account →"}
        </button>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
          {["⌨ Keystroke Auth", "🤖 AI Fraud Guard", "📱 SMS Inbox", "⬡ Device ID"].map(f => (
            <span key={f} style={{
              color: "var(--ink-dim)", fontSize: 11, background: "var(--rim)",
              padding: "3px 11px", borderRadius: 20, fontFamily: "var(--mono)"
            }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════════════════
const Sidebar = ({ tab, setTab, user, unread, unreadSms, onLogout }) => {
  const nav = [
    { id: "overview", icon: "◈", label: "Overview" },
    { id: "transactions", icon: "⇄", label: "Transactions" },
    { id: "send", icon: "↗", label: "Send Money" },
    { id: "alerts", icon: "◎", label: "Alerts", badge: unread },
    { id: "sms", icon: "📱", label: "SMS Inbox", badge: unreadSms },
    { id: "profile", icon: "⬡", label: "Profile" },
  ];
  return (
    <aside style={{
      width: 234, background: "var(--surface)", borderRight: "1px solid var(--rim)",
      display: "flex", flexDirection: "column", padding: "26px 14px",
      minHeight: "100vh", position: "sticky", top: 0, flexShrink: 0, zIndex: 10
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 11, padding: "0 8px 24px",
        borderBottom: "1px solid var(--rim)", marginBottom: 22
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 11,
          background: "linear-gradient(145deg,#0d3d6e,#071a30)", border: "1px solid var(--rim2)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0
        }}>◈</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 19, letterSpacing: -.8 }}>Vault<span style={{ color: "var(--teal)" }}>AI</span></div>
          <div style={{ fontSize: 9, color: "var(--ink-dim)", letterSpacing: 2.5, fontFamily: "var(--mono)", textTransform: "uppercase", marginTop: 1 }}>Banking System</div>
        </div>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 13, padding: "12px 14px", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg,var(--teal2),#0a3d62)",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--ink)", fontSize: 15, flexShrink: 0
          }}>
            {user?.full_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-white)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.full_name || "User"}</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1 }}>
        {nav.map(item => {
          const active = tab === item.id;
          return (
            <button key={item.id} className="nav-btn" onClick={() => setTab(item.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "10px 13px", border: "none", borderRadius: 11, marginBottom: 3,
                textAlign: "left", fontSize: 14, fontWeight: active ? 700 : 500,
                background: active ? "rgba(0,229,255,.09)" : "transparent",
                color: active ? "var(--teal)" : "var(--ink-mid)",
                borderLeft: `2px solid ${active ? "var(--teal)" : "transparent"}`, cursor: "pointer"
              }}>
              <span style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ fontSize: 14, lineHeight: 1, opacity: active ? 1 : .6 }}>{item.icon}</span>
                {item.label}
              </span>
              {item.badge > 0 && (
                <span style={{
                  background: item.id === "sms" ? "var(--jade)" : "var(--rose)", color: "#fff", borderRadius: 12,
                  minWidth: 19, height: 19, fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px"
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <button onClick={onLogout}
        style={{
          width: "100%", marginTop: 16, padding: "10px", background: "transparent",
          border: "1px solid var(--rim)", borderRadius: 11, color: "var(--ink-mid)",
          fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .18s"
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "var(--rose)"; e.currentTarget.style.borderColor = "rgba(245,54,92,.3)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "var(--ink-mid)"; e.currentTarget.style.borderColor = "var(--rim)"; }}>
        Sign Out
      </button>
    </aside>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SMS INBOX PAGE
// ══════════════════════════════════════════════════════════════════════════════
const SmsInbox = ({ token, onRefresh }) => {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    api("/sms-log", "GET", null, token).then(r => setMsgs(r.messages || [])).catch(e => console.warn("sms:", e)).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    await api(`/sms-log/${id}/read`, "POST", null, token);
    setMsgs(prev => prev.map(m => m.sms_id === id ? { ...m, read: true } : m));
    if (onRefresh) onRefresh();
  };

  const markAllRead = async () => {
    await api("/sms-log/read-all", "POST", null, token);
    setMsgs(prev => prev.map(m => ({ ...m, read: true })));
    if (onRefresh) onRefresh();
  };

  const TYPE_META = {
    WELCOME: { icon: "🎉", color: "var(--teal)", label: "Welcome", bg: "rgba(0,229,255,.08)", border: "rgba(0,229,255,.25)" },
    TRANSACTION: { icon: "💸", color: "var(--jade)", label: "Transaction", bg: "rgba(15,186,129,.08)", border: "rgba(15,186,129,.25)" },
    BLOCKED: { icon: "🚫", color: "var(--rose)", label: "Blocked", bg: "rgba(245,54,92,.08)", border: "rgba(245,54,92,.3)" },
    SUSPICIOUS_LOGIN: { icon: "🔐", color: "#fb923c", label: "Suspicious Login", bg: "rgba(251,146,60,.08)", border: "rgba(251,146,60,.25)" },
    NEW_LOGIN: { icon: "✅", color: "var(--jade)", label: "New Login", bg: "rgba(15,186,129,.05)", border: "rgba(15,186,129,.2)" },
  };

  const unread = msgs.filter(m => !m.read).length;

  return (
    <div>
      <div className="u0" style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>SMS Inbox</h2>
          <p style={{ color: "var(--ink-mid)", fontSize: 13, marginTop: 4, fontFamily: "var(--serif)", fontStyle: "italic" }}>
            All SMS alerts that would be sent to your mobile · {msgs.length} total
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            style={{
              background: "rgba(0,229,255,.08)", border: "1px solid rgba(0,229,255,.25)",
              borderRadius: 10, color: "var(--teal)", padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer"
            }}>
            Mark all read ({unread})
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="u1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 22 }}>
        {[
          ["Total SMS", msgs.length, "📨", "var(--teal)"],
          ["Unread", unread, "🔵", "var(--amber)"],
          ["Transactions", msgs.filter(m => m.type === "TRANSACTION").length, "💸", "var(--jade)"],
          ["Blocked", msgs.filter(m => m.type === "BLOCKED").length, "🚫", "var(--rose)"],
        ].map(([label, val, icon, color]) => (
          <div key={label} style={{
            background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 14,
            padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6
          }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color }}>{val}</span>
            <span style={{ color: "var(--ink-dim)", fontSize: 10, letterSpacing: 2, fontFamily: "var(--mono)", textTransform: "uppercase" }}>{label}</span>
          </div>
        ))}
      </div>

      {loading
        ? <div style={{ padding: 52, display: "flex", alignItems: "center", gap: 12, color: "var(--ink-mid)", justifyContent: "center" }}><Spinner />Loading messages…</div>
        : msgs.length === 0
          ? <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 18, padding: 64, textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 14, opacity: .3 }}>📱</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Messages Yet</div>
            <div style={{ color: "var(--ink-mid)", fontSize: 14, fontFamily: "var(--serif)", fontStyle: "italic" }}>
              SMS alerts will appear here when you make transactions
            </div>
          </div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.map((msg, i) => {
              const meta = TYPE_META[msg.type] || TYPE_META.TRANSACTION;
              const isExpanded = expanded === msg.sms_id;
              const lines = msg.body.split("\n");
              return (
                <div key={msg.sms_id} className="sms-card"
                  style={{
                    background: msg.read ? "var(--surface)" : "var(--card)",
                    border: `1px solid ${msg.read ? "var(--rim)" : meta.border}`,
                    borderLeft: `3px solid ${msg.read ? "var(--rim)" : meta.color}`,
                    borderRadius: 14, overflow: "hidden",
                    animation: `up .4s ${i * .03}s cubic-bezier(.22,1,.36,1) both`,
                    boxShadow: msg.read ? "none" : `0 4px 20px ${meta.color}10`
                  }}>

                  {/* Header row */}
                  <div onClick={() => { setExpanded(isExpanded ? null : msg.sms_id); if (!msg.read) markRead(msg.sms_id); }}
                    style={{ display: "flex", gap: 14, padding: "16px 18px", cursor: "pointer", alignItems: "flex-start" }}>
                    {/* Type icon */}
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: meta.bg, border: `1px solid ${meta.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
                    }}>
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            fontWeight: 700, fontSize: 13, color: meta.color,
                            background: meta.bg, padding: "2px 10px", borderRadius: 20,
                            border: `1px solid ${meta.border}`, fontSize: 10, letterSpacing: 1.5,
                            fontFamily: "var(--mono)", textTransform: "uppercase"
                          }}>{meta.label}</span>
                          {!msg.read && <span style={{
                            width: 7, height: 7, borderRadius: "50%",
                            background: meta.color, animation: "pulse 2s infinite", flexShrink: 0,
                            display: "inline-block"
                          }} />}
                        </div>
                        <span style={{ color: "var(--ink-dim)", fontSize: 11, fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>{stamp(msg.timestamp)}</span>
                      </div>

                      {/* Preview: first non-empty line */}
                      <div style={{
                        color: "var(--ink-white)", fontSize: 13, fontWeight: 500,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4
                      }}>
                        {lines.find(l => l.trim() && !l.includes("VaultAI") && !l.startsWith("─")) || lines[0]}
                      </div>

                    </div>

                    {/* Expand arrow */}
                    <span style={{
                      color: "var(--ink-dim)", fontSize: 16, flexShrink: 0,
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s"
                    }}>⌄</span>
                  </div>

                  {/* Expanded SMS body — looks like a real phone SMS bubble */}
                  {isExpanded && (
                    <div style={{ padding: "0 18px 18px 74px", animation: "in .2s ease" }}>
                      <div style={{
                        background: "linear-gradient(135deg,#0d2a45,#071828)",
                        border: "1px solid var(--rim2)", borderRadius: 16,
                        borderTopLeftRadius: 4, padding: "16px 18px",
                        boxShadow: "0 4px 20px rgba(0,0,0,.4)", position: "relative"
                      }}>
                        {/* Phone header */}
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
                          paddingBottom: 10, borderBottom: "1px solid var(--rim)"
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, background: "var(--rim2)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
                          }}>📱</div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-white)" }}>VaultAI Security</div>
                            <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "var(--mono)" }}>••••••••••</div>
                          </div>
                          <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-dim)", fontFamily: "var(--mono)" }}>
                            {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        {/* SMS text */}
                        <pre style={{
                          fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-white)",
                          whiteSpace: "pre-wrap", lineHeight: 1.8, margin: 0
                        }}>
                          {msg.body}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════
const Overview = ({ data }) => {
  if (!data) return <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--ink-mid)", padding: 40 }}><Spinner />Loading…</div>;
  const { stats, recent_transactions: txns, recent_alerts: alerts, models_status: ms } = data;
  return (
    <div>
      <div className="u0" style={{ marginBottom: 30 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>Dashboard</h2>
        <p style={{ color: "var(--ink-mid)", fontSize: 13, marginTop: 4, fontFamily: "var(--serif)", fontStyle: "italic" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
      <div className="u1" style={{
        display: "flex", alignItems: "center", gap: 12, padding: "11px 18px",
        background: ms?.paysim_ready ? "rgba(15,186,129,.06)" : "rgba(245,158,11,.06)",
        border: `1px solid ${ms?.paysim_ready ? "rgba(15,186,129,.2)" : "rgba(245,158,11,.2)"}`,
        borderRadius: 12, marginBottom: 26
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
          background: ms?.paysim_ready ? "var(--jade)" : "var(--amber)", animation: "pulse 2s infinite"
        }} />
        <span style={{ fontSize: 13, color: "var(--ink-mid)", fontFamily: "var(--serif)" }}>
          {ms?.paysim_ready
            ? <><strong style={{ color: "var(--ink-white)" }}>Dual AI Active</strong> · PaySim (60%) + IEEE-CIS (40%) · SMS Inbox: Active</>
            : <><strong style={{ color: "var(--amber)" }}>Models offline</strong> — place .pkl files in backend/ and restart</>}
        </span>
      </div>
      <div className="u2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 14, marginBottom: 28 }}>
        <Stat label="Balance" value={money(stats.balance)} icon="◈" color="var(--teal)" sub="Available" cls="u2" />
        <Stat label="Transactions" value={stats.total_transactions} icon="⇄" color="#a78bfa" sub="All time" cls="u2" />
        <Stat label="Flagged" value={stats.flagged_count} icon="◎" color="var(--amber)" sub="Under review" cls="u2" />
        <Stat label="Security" value={`${stats.security_score}/100`} icon="⬡"
          color={stats.security_score > 70 ? "var(--jade)" : "#fb923c"} sub="Account health" cls="u2" />
      </div>
      <div className="u3" style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 18, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--rim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Recent Activity</span>
          <span style={{ color: "var(--ink-dim)", fontSize: 11, fontFamily: "var(--mono)" }}>{txns?.length || 0} shown</span>
        </div>
        {!txns?.length
          ? <div style={{ padding: 44, textAlign: "center", color: "var(--ink-dim)" }}>No transactions yet</div>
          : txns.map(t => <TxnRow key={t.txn_id} txn={t} />)}
      </div>
      {alerts?.length > 0 && (
        <div className="u4" style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--rim)" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Recent Alerts</span>
          </div>
          {alerts.slice(0, 3).map(a => (
            <div key={a.alert_id} style={{ padding: "13px 22px", borderBottom: "1px solid var(--rim)", display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{a.type === "BLOCKED_TRANSACTION" ? "🚫" : a.type === "SUSPICIOUS_LOGIN" ? "🔐" : "⚠️"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{a.message}</div>
                <div style={{ color: "var(--ink-dim)", fontSize: 11, marginTop: 2, fontFamily: "var(--mono)" }}>{stamp(a.timestamp)}</div>
              </div>
              <RiskBadge level={a.risk_level} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SEND MONEY  (with behavioral re-verification + phone fallback)
// ══════════════════════════════════════════════════════════════════════════════
const VERIFY_PHRASE = "Confirm secure transaction";

const Send = ({ token, onDone, device, location, onForceLogout }) => {
  const [form, setForm] = useState({ amount: "", type: "TRANSFER", desc: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  // Behavioral re-verify state
  const [pendingTxn, setPendingTxn] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyErr, setVerifyErr] = useState("");
  const [typedPhrase, setTypedPhrase] = useState("");
  const [verifyKeys, setVerifyKeys] = useState(0);
  const verifyTyping = useTyping();



  const submit = async () => {
    setErr(""); setResult(null); setLoading(true);
    try {
      const res = await api("/transactions", "POST",
        { amount: parseFloat(form.amount), transaction_type: form.type, description: form.desc }, token);
      if (res.requires_verification) {
        verifyTyping.reset(); setTypedPhrase(""); setVerifyKeys(0); setVerifyErr("");
        setPendingTxn(res.transaction);
        setForm({ amount: "", type: "TRANSFER", desc: "" });
      } else {
        setResult(res.transaction);
        setForm({ amount: "", type: "TRANSFER", desc: "" });
        if (onDone) onDone();
      }
    } catch (e) {
      const d = e?.detail;
      // ── Auto sign out on blocked transaction ──
      if (e?._status === 403 && d?.auto_signed_out) {
        setErr(`🚫 BLOCKED — ${d.message || "High fraud risk"} (Score: ${((d.fraud_score || 0) * 100).toFixed(0)}%)\nSigning you out for security...`);
        setTimeout(() => {
          if (onForceLogout) onForceLogout();
        }, 3000); // show message for 3 seconds then sign out
      } else {
        setErr(d?.message
          ? `BLOCKED — ${d.message} (Score: ${((d.fraud_score || 0) * 100).toFixed(0)}%)`
          : d?.detail || String(d || "Transaction failed"));
      }
    } finally { setLoading(false); }
  };

  const submitBehavior = async () => {
    if (verifyKeys < 8) { setVerifyErr("Keep typing — we need more keystrokes to verify."); return; }
    setVerifyLoading(true); setVerifyErr("");
    try {
      const profile = verifyTyping.get();
      const res = await api("/verify-behavior", "POST",
        { txn_id: pendingTxn.txn_id, typing_profile: profile }, token);
      setPendingTxn(null); setResult(res.transaction);
      if (onDone) onDone();
    } catch (e) {
      const d = e?.detail;
      if (d?.require_phone_verify || e?._status === 401 || e?.status === 401) {
        // Behavioral check failed — backend has already invalidated the session
        // Show a brief message then force logout
        setPendingTxn(null);
        setVerifyErr("Behavioral verification failed. Signing you out for security...");
        setTimeout(() => { if (onForceLogout) onForceLogout(); }, 2000);
      } else {
        setVerifyErr(d?.similarity != null ? `Match too low (${((d.similarity || 0) * 100).toFixed(0)}%). Try again.` : d?.detail || "Verification failed. Try again.");
      }
    } finally { setVerifyLoading(false); }
  };



  const inp = {
    width: "100%", background: "var(--card)", border: "1px solid var(--rim2)", borderRadius: 11,
    padding: "13px 15px", color: "var(--ink-white)", fontSize: 14, outline: "none", transition: "all .2s"
  };
  const lbl = {
    display: "block", color: "var(--ink-dim)", fontSize: 10, fontWeight: 500, letterSpacing: 2.5,
    marginBottom: 8, textTransform: "uppercase", fontFamily: "var(--mono)"
  };
  const fraud = result?.fraud_analysis;

  // ── Phone verification screen ──────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 540 }}>
      <div className="u0" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>Send Money</h2>
        <p style={{ color: "var(--ink-mid)", fontSize: 13, marginTop: 4, fontFamily: "var(--serif)", fontStyle: "italic" }}>
          AI-scored in real time · SMS logged to inbox
        </p>
      </div>

      {/* ── Behavioral Re-Verification Panel ── */}
      {pendingTxn && (
        <div className="u0" style={{
          background: "rgba(245,158,11,.06)",
          border: "1px solid rgba(245,158,11,.35)", borderRadius: 18, padding: 28, marginBottom: 20
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>⌨</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--amber)", marginBottom: 5 }}>
                Behavioral Re-Verification
              </div>
              <div style={{ color: "var(--ink-mid)", fontSize: 13, lineHeight: 1.6 }}>
                This transaction was flagged as suspicious
                (<span style={{ color: "var(--amber)" }}>{Math.round((pendingTxn.fraud_analysis?.final_score || 0) * 100)}% fraud score</span>).
                Type the phrase below naturally to verify it's you.
              </div>
            </div>
          </div>

          {/* Transaction summary */}
          <div style={{
            background: "var(--card2)", borderRadius: 11, padding: "12px 15px", marginBottom: 20,
            border: "1px solid var(--rim2)", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-mid)"
          }}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <span>Type: <span style={{ color: "var(--ink-white)" }}>{pendingTxn.transaction_type}</span></span>
              <span>Amount: <span style={{ color: "var(--ink-white)" }}>${pendingTxn.amount?.toLocaleString()}</span></span>
              <span>Risk: <span style={{ color: "var(--amber)" }}>{pendingTxn.fraud_analysis?.risk_level}</span></span>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 20, flexWrap: "wrap" }}>
              <span>🖥 {device?.browser || "Unknown"} · {device?.os || "Unknown"}</span>
              <span>📍 {location?.city || "Unknown"}, {location?.country || "Unknown"}</span>
            </div>
          </div>

          {/* Phrase prompt */}
          <div style={{
            background: "var(--surface)", border: "1px solid rgba(0,229,255,.15)",
            borderRadius: 11, padding: "14px 16px", marginBottom: 16, textAlign: "center"
          }}>
            <div style={{
              color: "var(--ink-dim)", fontSize: 10, letterSpacing: 2.5,
              fontFamily: "var(--mono)", textTransform: "uppercase", marginBottom: 6
            }}>Identity Verification Required</div>
            <div style={{ color: "var(--ink-mid)", fontSize: 12, fontFamily: "var(--mono)" }}>
              🔐 Type your security phrase to approve this transaction
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <input className="inp" placeholder={VERIFY_PHRASE} value={typedPhrase}
              onKeyDown={verifyTyping.onDown}
              onKeyUp={e => { verifyTyping.onUp(e); setVerifyKeys(k => k + 1); }}
              onChange={e => setTypedPhrase(e.target.value)}
              style={{
                ...inp, border: `1px solid ${verifyKeys > 10 ? "rgba(0,229,255,.45)" : "rgba(245,158,11,.4)"}`,
                fontFamily: "var(--mono)", letterSpacing: .5
              }} />
            <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 2, background: "var(--rim)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  background: verifyKeys > 10 ? "linear-gradient(90deg,var(--teal2),var(--teal))" : "linear-gradient(90deg,var(--amber),#d97706)",
                  width: `${Math.min(verifyKeys * 8, 100)}%`, transition: "width .3s ease"
                }} />
              </div>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 10,
                color: verifyKeys > 10 ? "var(--teal)" : "var(--amber)", whiteSpace: "nowrap"
              }}>
                {verifyKeys > 10 ? "✓ Pattern captured" : `${verifyKeys} keystrokes`}
              </span>
            </div>
          </div>

          {verifyErr && <div style={{
            background: "rgba(245,54,92,.07)", border: "1px solid rgba(245,54,92,.25)",
            borderRadius: 10, padding: "11px 14px", color: "#fca5a5", fontSize: 12,
            fontFamily: "var(--mono)", marginBottom: 14
          }}>{verifyErr}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={submitBehavior} disabled={verifyLoading || verifyKeys < 8}
              style={{
                flex: 2, padding: "12px", border: "none", borderRadius: 11, fontWeight: 700, fontSize: 14,
                cursor: verifyLoading || verifyKeys < 8 ? "not-allowed" : "pointer",
                background: verifyLoading || verifyKeys < 8 ? "var(--rim)" : "linear-gradient(135deg,#00c8e8,#0090aa)",
                color: verifyLoading || verifyKeys < 8 ? "var(--ink-mid)" : "var(--ink)"
              }}>
              {verifyLoading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Spinner size={14} />Analyzing pattern…</span>
                : "⌨ Verify My Identity →"}
            </button>
            <button onClick={() => { setPendingTxn(null); setVerifyErr(""); setTypedPhrase(""); setVerifyKeys(0); }}
              style={{
                flex: 1, padding: "12px", border: "1px solid var(--rim2)", borderRadius: 11, fontWeight: 600,
                fontSize: 13, background: "transparent", color: "var(--ink-mid)", cursor: "pointer"
              }}>
              Cancel
            </button>
          </div>
          <div style={{ marginTop: 12, color: "var(--ink-dim)", fontSize: 11, fontFamily: "var(--mono)", textAlign: "center" }}>
            Failed verification will sign you out · phone re-verification required
          </div>
        </div>
      )}

      {/* ── Normal Transaction Form ── */}
      {!pendingTxn && (
        <div className="u1" style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 18, padding: 30 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={lbl}>Transaction Type</label>
              <select className="inp" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ ...inp, cursor: "pointer" }}>
                {["TRANSFER", "PAYMENT", "WITHDRAWAL", "DEPOSIT", "DEBIT"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Amount (USD)</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)",
                  color: "var(--ink-mid)", fontFamily: "var(--mono)", fontSize: 15
                }}>$</span>
                <input type="number" className="inp" placeholder="0.00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  style={{ ...inp, paddingLeft: 30 }} />
              </div>
            </div>
            <div>
              <label style={lbl}>Description <span style={{
                textTransform: "none", letterSpacing: 0,
                color: "var(--ink-dim)", fontWeight: 400
              }}>(optional)</span></label>
              <input className="inp" placeholder="Add a note…" value={form.desc}
                onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} style={inp} />
            </div>
            {err && <div style={{
              background: "rgba(245,54,92,.07)", border: "1px solid rgba(245,54,92,.25)",
              borderRadius: 11, padding: "13px 15px", color: "#fca5a5", fontSize: 13,
              fontFamily: "var(--mono)"
            }}>{err}</div>}
            {result && fraud && (
              <div style={{
                background: "rgba(15,186,129,.06)", border: "1px solid rgba(15,186,129,.25)",
                borderRadius: 14, padding: 20, animation: "in .3s ease"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "var(--jade)" }}>✓ Approved</span>
                  <RiskBadge level={fraud.risk_level || "LOW"} />
                </div>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <Ring score={fraud.final_score || 0} label="FRAUD SCORE" size={68} />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    {fraud.explanation?.map((e, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 7, marginBottom: 6,
                        color: "var(--ink-mid)", fontSize: 12, lineHeight: 1.4
                      }}>
                        <span style={{ color: "var(--teal)", flexShrink: 0 }}>›</span>{e}
                      </div>
                    ))}
                    <div style={{ marginTop: 10, color: "var(--jade)", fontSize: 11, fontFamily: "var(--mono)" }}>
                      📱 SMS logged to inbox →
                    </div>
                  </div>
                </div>
              </div>
            )}
            <button className="btn-prime" onClick={submit} disabled={loading || !form.amount}
              style={{
                padding: "14px 20px", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15,
                letterSpacing: .3, color: loading || !form.amount ? "var(--ink-mid)" : "var(--ink)",
                background: loading || !form.amount ? "var(--rim)" : "linear-gradient(135deg,#00c8e8,#0090aa)",
                boxShadow: loading || !form.amount ? "none" : "0 4px 22px rgba(0,229,255,.22)",
                cursor: loading || !form.amount ? "not-allowed" : "pointer"
              }}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <Spinner size={15} />Analyzing with AI…
                </span>
                : "Submit Transaction →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS
// ══════════════════════════════════════════════════════════════════════════════
const Transactions = ({ token }) => {
  const [txns, setTxns] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api("/transactions", "GET", null, token).then(r => setTxns(r.transactions)).finally(() => setLoading(false)); }, [token]);
  return (
    <div>
      <div className="u0" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>Transactions</h2>
        <p style={{ color: "var(--ink-mid)", fontSize: 13, marginTop: 4, fontFamily: "var(--serif)", fontStyle: "italic" }}>{txns.length} records</p>
      </div>
      <div className="u1" style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 18, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 52, display: "flex", alignItems: "center", gap: 12, color: "var(--ink-mid)", justifyContent: "center" }}><Spinner />Loading…</div>
          : txns.length === 0
            ? <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 14, opacity: .2 }}>⇄</div>
              <div style={{ color: "var(--ink-mid)", fontSize: 15, fontFamily: "var(--serif)", fontStyle: "italic" }}>No transactions yet</div>
            </div>
            : txns.map(t => (
              <div key={t.txn_id}>
                <TxnRow txn={t} onClick={() => setExpanded(expanded === t.txn_id ? null : t.txn_id)} />
                {expanded === t.txn_id && t.fraud_analysis && (
                  <div style={{
                    background: "var(--card2)", borderBottom: "1px solid var(--rim)",
                    padding: "18px 22px 18px 82px", animation: "in .2s ease"
                  }}>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ color: "var(--ink-dim)", fontSize: 9, letterSpacing: 2.5, marginBottom: 12, fontFamily: "var(--mono)", textTransform: "uppercase" }}>Fraud Scores</div>
                        <div style={{ display: "flex", gap: 14 }}>
                          <Ring score={t.fraud_analysis.final_score || 0} label="FRAUD SCORE" size={60} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "var(--ink-dim)", fontSize: 9, letterSpacing: 2.5, marginBottom: 12, fontFamily: "var(--mono)", textTransform: "uppercase" }}>Analysis</div>
                        {t.fraud_analysis.explanation?.map((e, i) => (
                          <div key={i} style={{ display: "flex", gap: 7, marginBottom: 6, color: "var(--ink-mid)", fontSize: 12 }}>
                            <span style={{ color: "var(--teal)", flexShrink: 0 }}>›</span>{e}
                          </div>
                        ))}
                        {(t.device || t.location) && (
                          <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(0,229,255,.04)", borderRadius: 8, border: "1px solid rgba(0,229,255,.1)" }}>
                            <div style={{ color: "var(--teal)", fontSize: 9, letterSpacing: 2, fontFamily: "var(--mono)", marginBottom: 6, textTransform: "uppercase" }}>Device & Location</div>
                            {t.device?.browser && <div style={{ color: "var(--ink-mid)", fontSize: 11, marginBottom: 3 }}>🖥 {t.device.browser?.slice(0, 40)} | {t.device.os}</div>}
                            {t.location && <div style={{ color: "var(--ink-mid)", fontSize: 11 }}>
                              📍 {t.location.city || "Unknown"}{t.location.region ? ", " + t.location.region : ""}, {t.location.country || "Unknown"}
                              {t.location.ip && t.location.ip !== "unknown" && <span style={{ color: "var(--ink-dim)", marginLeft: 8 }}>· IP: {t.location.ip}</span>}
                            </div>}
                          </div>
                        )}
                        <div style={{ marginTop: 8, color: "var(--ink-dim)", fontSize: 10, fontFamily: "var(--mono)" }}>
                          Balance after: {money(t.balance_after)} · {t.status}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ALERTS
// ══════════════════════════════════════════════════════════════════════════════
const Alerts = ({ token, onRefresh }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { api("/alerts", "GET", null, token).then(r => setAlerts(r.alerts)).finally(() => setLoading(false)); }, [token]);
  useEffect(() => { load(); }, [load]);
  const ack = async id => { await api("/alerts/acknowledge", "POST", { alert_id: id }, token); load(); if (onRefresh) onRefresh(); };
  const ICONS = { SUSPICIOUS_LOGIN: "🔐", BLOCKED_TRANSACTION: "🚫", SUSPICIOUS_TRANSACTION: "⚠️" };
  const COLORS = { CRITICAL: "var(--rose)", HIGH: "#fb923c", MEDIUM: "var(--amber)", LOW: "var(--jade)" };
  return (
    <div>
      <div className="u0" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>Security Alerts</h2>
        <p style={{ color: "var(--ink-mid)", fontSize: 13, marginTop: 4, fontFamily: "var(--serif)", fontStyle: "italic" }}>
          {alerts.filter(a => !a.read).length} unread · {alerts.length} total
        </p>
      </div>
      {loading ? <div style={{ padding: 52, display: "flex", alignItems: "center", gap: 12, color: "var(--ink-mid)", justifyContent: "center" }}><Spinner />Loading…</div>
        : alerts.length === 0
          ? <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 18, padding: 64, textAlign: "center" }}>
            <div style={{ fontSize: 60, marginBottom: 14 }}>◎</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>All Clear</div>
            <div style={{ color: "var(--ink-mid)", fontSize: 14, fontFamily: "var(--serif)", fontStyle: "italic" }}>No security alerts</div>
          </div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alerts.map((a, i) => (
              <div key={a.alert_id} className="u0" style={{
                animationDelay: `${i * .04}s`,
                background: a.read ? "var(--surface)" : "var(--card)",
                border: `1px solid ${a.read ? "var(--rim)" : "var(--rim2)"}`,
                borderLeft: `3px solid ${a.read ? "var(--rim)" : COLORS[a.risk_level] || "var(--teal)"}`,
                borderRadius: 14, padding: "15px 18px", display: "flex", gap: 14, alignItems: "flex-start"
              }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{ICONS[a.type] || "🔔"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>{a.message}</span>
                    <RiskBadge level={a.risk_level} />
                  </div>
                  <div style={{ color: "var(--ink-dim)", fontSize: 11, fontFamily: "var(--mono)" }}>{stamp(a.timestamp)}</div>
                </div>
                {!a.read && (
                  <button onClick={() => ack(a.alert_id)}
                    style={{
                      background: "transparent", border: "1px solid var(--rim2)", borderRadius: 9,
                      color: "var(--ink-mid)", padding: "5px 13px", fontSize: 12, fontWeight: 600, flexShrink: 0, cursor: "pointer", transition: "all .15s"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--teal)"; e.currentTarget.style.borderColor = "rgba(0,229,255,.4)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--ink-mid)"; e.currentTarget.style.borderColor = "var(--rim2)"; }}>
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════════════════════════════
const Profile = ({ user }) => {
  const features = [
    ["Behavioral Typing Auth", "Active", "var(--teal)"], ["Device Fingerprinting", "Active", "var(--teal)"],
    ["Login Location Analysis", "Active", "var(--teal)"], ["SMS Inbox (Frontend)", "Active", "var(--jade)"],
    ["Transaction SMS Logs", "Active", "var(--jade)"], ["Blocked Txn SMS Logs", "Active", "var(--jade)"],
    ["Suspicious Login SMS", "Active", "var(--jade)"], ["PaySim Fraud Model", "Loaded", "var(--jade)"],
    ["IEEE-CIS Fraud Model", "Loaded", "var(--jade)"], ["CRITICAL Auto-Block", "Armed", "var(--rose)"],
  ];
  return (
    <div style={{ maxWidth: 560 }}>
      <div className="u0" style={{ marginBottom: 28 }}><h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>Profile</h2></div>
      <div className="u1" style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 18, padding: 28, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 22, marginBottom: 22, borderBottom: "1px solid var(--rim)" }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20, background: "linear-gradient(135deg,var(--teal2),#0a3d62)",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--ink)", fontSize: 30, flexShrink: 0,
            boxShadow: "0 8px 28px rgba(0,229,255,.2)"
          }}>
            {user?.full_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -.5 }}>{user?.full_name}</div>
            <div style={{ color: "var(--ink-dim)", fontSize: 13, fontFamily: "var(--mono)", marginTop: 3 }}>@{user?.username}</div>
            <div style={{ color: "var(--teal)", fontSize: 12, marginTop: 5, fontFamily: "var(--mono)" }}>◎ Behavioral Auth · 📱 SMS Inbox Active</div>
          </div>
        </div>
        {[["✉  Email", user?.email || "—"], ["📱  Mobile", user?.mobile_number || "—"],
        ["📅  Member since", user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"],
        ["◈  Balance", money(user?.balance || 0)], ["⇄  Transactions", user?.txn_count || 0],
        ].map(([label, val]) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "13px 0", borderBottom: "1px solid var(--rim)"
          }}>
            <span style={{ color: "var(--ink-mid)", fontSize: 13 }}>{label}</span>
            <span style={{
              color: label.includes("Mobile") ? "var(--teal)" : "var(--ink-white)",
              fontSize: 13, fontFamily: "var(--mono)", fontWeight: 500
            }}>{val}</span>
          </div>
        ))}
      </div>
      <div className="u2" style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 18, padding: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Security Stack</div>
        {features.map(([feat, status, color]) => (
          <div key={feat} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "11px 0", borderBottom: "1px solid var(--rim)"
          }}>
            <span style={{ color: "var(--ink-mid)", fontSize: 13 }}>{feat}</span>
            <span style={{
              color, fontSize: 10, fontWeight: 500, fontFamily: "var(--mono)",
              background: `${color}15`, padding: "3px 11px", borderRadius: 20, border: `1px solid ${color}30`, letterSpacing: 1.5
            }}>● {status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD SHELL
// ══════════════════════════════════════════════════════════════════════════════
const Dashboard = ({ token, user: initUser, device: loginDevice, location: loginLocation, onLogout }) => {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [unreadSms, setUnreadSms] = useState(0);
  // Use the exact device+location that was sent to the backend at login — guaranteed to match
  const sessionDevice = loginDevice || parseDevice();
  const sessionLocation = loginLocation || { city: "Unknown", country: "Unknown" };

  const load = useCallback(() => {
    api("/dashboard", "GET", null, token).then(setData).catch(e => console.warn("dashboard:", e));
    api("/sms-log", "GET", null, token).then(r => setUnreadSms(r.unread || 0)).catch(e => console.warn("sms-log:", e));
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "overview" || tab === "sms") load(); }, [tab]);

  const unread = data?.stats?.unread_alerts || 0;
  const user = data?.user || initUser;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--ink)", color: "var(--ink-white)", position: "relative" }}>
      <Bg />
      <Sidebar tab={tab} setTab={setTab} user={user} unread={unread} unreadSms={unreadSms} onLogout={onLogout} />
      <main style={{ flex: 1, padding: "38px 42px", overflow: "auto", maxWidth: "calc(100vw - 234px)", position: "relative", zIndex: 1 }}>
        {tab === "overview" && <Overview data={data} />}
        {tab === "transactions" && <Transactions token={token} />}
        {tab === "send" && <Send token={token} onDone={load} device={sessionDevice} location={sessionLocation} onForceLogout={onLogout} />}
        {tab === "alerts" && <Alerts token={token} onRefresh={load} />}
        {tab === "sms" && <SmsInbox token={token} onRefresh={load} />}
        {tab === "profile" && <Profile user={user} />}
      </main>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [auth, setAuth] = useState(null);
  return (
    <><G />
      {!auth
        ? <Auth onAuth={(t, u, dev, loc) => setAuth({ token: t, user: u, device: dev, location: loc })} />
        : <Dashboard token={auth.token} user={auth.user} device={auth.device} location={auth.location} onLogout={() => setAuth(null)} />}
    </>
  );
}
