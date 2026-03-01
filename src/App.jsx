import { useState, useRef, useEffect } from "react";

const DIFFICULTY = {
  novice: {
    label: "Novice", color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0",
    description: "Simple args, forgiving",
    botInstructions: "DIFFICULTY: NOVICE. Make simple, straightforward arguments with one clear warrant per contention. Do NOT call out drops aggressively. Use basic impacts. Rebuttals should be short and simple. Be a beginner-level opponent.",
  },
  jv: {
    label: "JV", color: "#d97706", bg: "#fef3c7", border: "#fde68a",
    description: "Moderate pressure",
    botInstructions: "DIFFICULTY: JV. Make decent arguments with clear warrants and moderate impacts. Occasionally call out drops. Run 2 contentions max. Rebuttals cover main args. Be a solid but beatable opponent.",
  },
  varsity: {
    label: "Varsity", color: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe",
    description: "Strong & technical",
    botInstructions: "DIFFICULTY: VARSITY. Make strong well-developed arguments with layered warrants and real impacts. Aggressively call out drops by name. Run 2-3 contentions with sub-arguments. Rebuttals go contention by contention. Whip speech weighs multiple voters. Be a genuinely tough opponent.",
  },
  toc: {
    label: "TOC", color: "#dc2626", bg: "#fee2e2", border: "#fecaca",
    description: "Elite level, brutal",
    botInstructions: "DIFFICULTY: TOC. Run the most technically sophisticated arguments possible. Call out EVERY drop by label. Multi-layer every contention: Claim, Warrant, Internal Link, Impact, Magnitude, Timeframe, Probability. Rebuttals are exhaustive. Whip does full comparative weighing on every voter. Be an elite nearly unbeatable opponent.",
  },
};

const getFlowPrompt = function(difficulty) {
  const d = DIFFICULTY[difficulty];
  return "You are an expert high school parliamentary debate opponent. " + d.botInstructions + " Output a DEBATE FLOW. Short punchy bullets, 5-12 words max per bullet. Label contentions C1 C2 C3 with Claim Warrant Impact under each. For rebuttals use arrow notation. No full sentences. No prose.";
};

const getVerbatimPrompt = function(difficulty) {
  const d = DIFFICULTY[difficulty];
  return "You are a high school parliamentary debater delivering a speech out loud. " + d.botInstructions + " You will be given a flow sheet. Expand every point into natural spoken sentences in the SAME ORDER. You must follow these rules without exception: Do not write any asterisks. Do not write any dashes. Do not write any bullet points. Do not write labels like C1 C2 Claim Warrant Impact. Do not use any symbols whatsoever. Write ONLY plain spoken English words that a real debater would actually say out loud. Sound like a confident debater at a tournament: fast, direct, persuasive. Use spoken transitions like My first contention is, Moving to my next point, Look at what they dropped, The reason this matters. Build to your impacts. Natural speech only.";
};

const JUDGE_SYSTEM = "You are an impartial parliamentary debate judge. Judge purely on argument quality, dropped arguments, weighing, and clash. Do not favor either side. If the user lost say so clearly. If the AI lost say so clearly. A dropped argument is a conceded argument. Be specific, honest, and direct. Write in full prose.";

const SYSTEM_PROMPT = "You are an expert high school parliamentary debate coach. Help the user build debate cases, arguments, and speeches. Use clear structure with contentions, claims, warrants, and impacts.";

const ROUND_PROMPTS = {
  gov_opens: function(res) {
    return "Resolution: " + res + ". You are Government. Output your opening constructive case in FLOW FORMAT. Label it GOVERNMENT CONSTRUCTIVE. Include brief definitions, C1, C2, and C3 if strong. Each contention: Claim, Warrant, Impact. Keep bullets short.";
  },
  opp_rebuts_and_constructs: function(res, userSpeech) {
    return "Resolution: " + res + ". You are Opposition. The Government just said: " + userSpeech + ". Output in FLOW FORMAT. First label OPPOSITION REBUTTAL and go through each of their contentions. Then label OPPOSITION CONSTRUCTIVE with C1, C2, C3 if strong. Each: Claim, Warrant, Impact. Keep all bullets short.";
  },
  gov_rebuts_and_extends: function(res, userSpeech) {
    return "Resolution: " + res + ". You are Government. The Opposition just said: " + userSpeech + ". Output in FLOW FORMAT. First label GOVERNMENT REBUTTAL and respond to each OPP contention, call out drops. Then label GOVERNMENT EXTENSION and re-extend your own contentions. Keep all bullets short.";
  },
  opp_rebuts_gov_extended: function(res, userSpeech) {
    return "Resolution: " + res + ". You are Opposition. Government just extended: " + userSpeech + ". Output in FLOW FORMAT. Label OPPOSITION REBUTTAL and respond to their extensions, reinforce your own contentions. Keep all bullets short.";
  },
  bot_whip: function(res, botSide, userSpeech) {
    return "Resolution: " + res + ". You are " + botSide + ". User just said: " + userSpeech + ". Output in FLOW FORMAT. Label " + botSide.toUpperCase() + " WHIP. List 2-3 voters. Under each voter: why YOU win it. Final bullet: your world vs their world. NO new arguments. Keep bullets short.";
  },
  judge_critique: function(res, userSide, botSide, userWhip, difficulty) {
    const diffLabel = DIFFICULTY[difficulty] ? DIFFICULTY[difficulty].label : "Varsity";
    return "Resolution: " + res + ". Difficulty: " + diffLabel + ". Human debated as " + userSide + ". AI opponent debated as " + botSide + ". Human's final whip: " + userWhip + ". You are an impartial judge. Label JUDGES DECISION. 1. DECISION: Who won and the core reason in 1-2 sentences. 2. DECISIVE ARGUMENTS: The 2-3 arguments that decided the round. 3. WHAT THE HUMAN DID WELL: Genuine praise only. 4. WHAT THE HUMAN DROPPED OR LOST: Be direct, name specific arguments. 5. WHAT TO IMPROVE: Specific actionable coaching.";
  },
};

const s = {
  app: { display:"flex", flexDirection:"column", height:"100vh", fontFamily:"Georgia, serif", background:"#f8fafc", color:"#1e293b", margin:0 },
  header: { background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", flexShrink:0 },
  headerLeft: { display:"flex", alignItems:"center", gap:12 },
  logo: { width:32, height:32, background:"#4f46e5", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:16 },
  headerTitle: { margin:0, fontSize:15, fontWeight:700, letterSpacing:"-0.02em" },
  headerSub: { margin:0, fontSize:11, color:"#94a3b8", fontFamily:"monospace" },
  headerBadges: { display:"flex", gap:8, alignItems:"center" },
  badgeGov: { padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#dbeafe", color:"#1d4ed8", border:"1px solid #bfdbfe" },
  badgeOpp: { padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#ffe4e6", color:"#be123c", border:"1px solid #fecdd3" },
  badgePractice: { padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#fef3c7", color:"#92400e", border:"1px solid #fde68a" },
  badgeSpeaking: { padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#ede9fe", color:"#7c3aed", border:"1px solid #ddd6fe" },
  badgeRecording: { padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#fee2e2", color:"#dc2626", border:"1px solid #fecaca" },
  body: { display:"flex", flex:1, overflow:"hidden" },
  sidebar: { width:220, background:"#fff", borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column", gap:20, padding:16, overflowY:"auto", flexShrink:0 },
  sideLabel: { margin:"0 0 6px 0", fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"monospace" },
  textarea: { width:"100%", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px", fontSize:13, color:"#1e293b", resize:"none", fontFamily:"Georgia, serif", boxSizing:"border-box" },
  btnPrimary: { width:"100%", background:"#4f46e5", color:"#fff", border:"none", borderRadius:8, padding:"8px 0", fontSize:13, fontWeight:700, cursor:"pointer", marginTop:8 },
  btnSecondary: { width:"100%", background:"#fff", color:"#64748b", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 0", fontSize:13, cursor:"pointer", marginTop:8 },
  sideGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 },
  btnGovActive: { padding:"10px 0", borderRadius:8, fontSize:13, fontWeight:700, border:"none", background:"#2563eb", color:"#fff", cursor:"pointer" },
  btnGovInactive: { padding:"10px 0", borderRadius:8, fontSize:13, fontWeight:700, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer" },
  btnOppActive: { padding:"10px 0", borderRadius:8, fontSize:13, fontWeight:700, border:"none", background:"#e11d48", color:"#fff", cursor:"pointer" },
  btnOppInactive: { padding:"10px 0", borderRadius:8, fontSize:13, fontWeight:700, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer" },
  select: { width:"100%", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:13, color:"#1e293b" },
  actionBtn: { textAlign:"left", padding:"8px 12px", borderRadius:8, fontSize:13, border:"1px solid #e2e8f0", background:"#fff", color:"#475569", cursor:"pointer", width:"100%", marginBottom:6 },
  exportBtn: { width:"100%", background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 0", fontSize:13, color:"#475569", cursor:"pointer" },
  chat: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  messages: { flex:1, overflowY:"auto", padding:"24px", display:"flex", flexDirection:"column", gap:16 },
  msgWrapUser: { display:"flex", justifyContent:"flex-end" },
  msgWrapAsst: { display:"flex", justifyContent:"flex-start" },
  msgUser: { maxWidth:560, background:"#4f46e5", color:"#fff", borderRadius:14, padding:"12px 16px", fontSize:13, lineHeight:1.6, marginLeft:80 },
  msgAsst: { maxWidth:640, background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 18px", fontSize:13, lineHeight:1.6, marginRight:48, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" },
  msgAsstOpponent: { maxWidth:640, background:"#fff5f5", border:"1px solid #fecdd3", borderRadius:14, padding:"14px 18px", fontSize:13, lineHeight:1.6, marginRight:48, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" },
  msgAsstJudge: { maxWidth:640, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:14, padding:"14px 18px", fontSize:13, lineHeight:1.6, marginRight:48, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" },
  msgTag: { fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"monospace", marginBottom:8 },
  msgActions: { marginTop:12, paddingTop:10, borderTop:"1px solid #f1f5f9", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" },
  smallBtn: { fontSize:11, padding:"5px 10px", borderRadius:6, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer" },
  replayBtn: { fontSize:11, padding:"5px 10px", borderRadius:6, border:"1px solid #ddd6fe", background:"#ede9fe", color:"#7c3aed", cursor:"pointer", marginTop:8, display:"inline-block" },
  loadingDot: { width:6, height:6, borderRadius:"50%", background:"#4f46e5", display:"inline-block", margin:"0 2px" },
  revBar: { padding:"12px 24px", background:"#fff", borderTop:"1px solid #e2e8f0" },
  revLabel: { fontSize:10, fontWeight:700, color:"#4f46e5", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"monospace", marginBottom:6 },
  revRow: { display:"flex", gap:8 },
  revBtnSend: { background:"#4f46e5", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer" },
  revBtnCancel: { background:"#fff", color:"#94a3b8", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer" },
  inputBar: { padding:"14px 24px", background:"#fff", borderTop:"1px solid #e2e8f0", flexShrink:0 },
  speechLabel: { fontSize:11, color:"#e11d48", fontWeight:700, fontFamily:"monospace", marginBottom:6 },
  inputRow: { display:"flex", gap:10, alignItems:"flex-end" },
  inputTextarea: { flex:1, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"10px 14px", fontSize:13, color:"#1e293b", resize:"none", fontFamily:"Georgia, serif" },
  sendBtn: { background:"#4f46e5", color:"#fff", border:"none", borderRadius:12, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer" },
  sendBtnRed: { background:"#e11d48", color:"#fff", border:"none", borderRadius:12, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer" },
  sendBtnDisabled: { background:"#f1f5f9", color:"#94a3b8", border:"none", borderRadius:12, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"not-allowed" },
  inputHint: { fontSize:11, color:"#cbd5e1", marginTop:6, fontFamily:"monospace" },
  micBtn: function(rec) { return { width:44, height:44, borderRadius:"50%", border:"none", cursor:"pointer", fontSize:18, flexShrink:0, color:"#fff", background: rec ? "#dc2626" : "#4f46e5", transition:"all 0.2s" }; },
  transcriptBox: { flex:1, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#1e293b", minHeight:44, lineHeight:1.6, fontFamily:"Georgia, serif" },
  landing: { flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc" },
  landingCard: { background:"#fff", borderRadius:20, padding:"48px 40px", boxShadow:"0 4px 24px rgba(0,0,0,0.08)", maxWidth:480, width:"100%", textAlign:"center" },
  landingTitle: { fontSize:26, fontWeight:700, margin:"0 0 8px 0", letterSpacing:"-0.02em" },
  landingSubtitle: { fontSize:14, color:"#94a3b8", margin:"0 0 36px 0", lineHeight:1.6 },
  landingGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
  landingBtnCase: { background:"#4f46e5", color:"#fff", border:"none", borderRadius:12, padding:"20px 16px", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  landingBtnPractice: { background:"#fff", color:"#1e293b", border:"2px solid #e2e8f0", borderRadius:12, padding:"20px 16px", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  landingBtnSub: { fontSize:11, fontWeight:400, opacity:0.75 },
  setupCard: { background:"#fff", borderRadius:20, padding:"40px 36px", boxShadow:"0 4px 24px rgba(0,0,0,0.08)", maxWidth:460, width:"100%" },
  setupTitle: { fontSize:20, fontWeight:700, margin:"0 0 6px 0" },
  setupSubtitle: { fontSize:13, color:"#94a3b8", margin:"0 0 28px 0" },
  setupSection: { marginBottom:22 },
  setupSectionLabel: { fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"monospace", marginBottom:10, display:"block" },
  optionGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  optionBtn: { padding:"12px 10px", borderRadius:10, fontSize:13, fontWeight:600, border:"2px solid #e2e8f0", background:"#fff", color:"#475569", cursor:"pointer", textAlign:"center" },
  optionBtnActive: { padding:"12px 10px", borderRadius:10, fontSize:13, fontWeight:700, border:"2px solid #4f46e5", background:"#eef2ff", color:"#4f46e5", cursor:"pointer", textAlign:"center" },
  resInput: { width:"100%", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 12px", fontSize:13, color:"#1e293b", fontFamily:"Georgia, serif", boxSizing:"border-box" },
  startBtn: { width:"100%", background:"#4f46e5", color:"#fff", border:"none", borderRadius:10, padding:"12px 0", fontSize:14, fontWeight:700, cursor:"pointer", marginTop:4 },
  startBtnDisabled: { width:"100%", background:"#f1f5f9", color:"#cbd5e1", border:"none", borderRadius:10, padding:"12px 0", fontSize:14, fontWeight:700, cursor:"not-allowed", marginTop:4 },
  backBtn: { background:"none", border:"none", color:"#94a3b8", fontSize:12, cursor:"pointer", marginTop:14, fontFamily:"Georgia, serif", display:"block", textAlign:"center", width:"100%" },
  diffGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 },
  diffBtn: function(active, color, bg) { return { padding:"10px 8px", borderRadius:10, fontSize:12, fontWeight: active ? 700 : 600, border: active ? "2px solid " + color : "2px solid #e2e8f0", background: active ? bg : "#fff", color: active ? color : "#64748b", cursor:"pointer", textAlign:"center" }; },
};

function cleanForSpeech(text) {
  const kills = ["Claim:", "claim:", "Warrant:", "warrant:", "Impact:", "impact:", "Sub:", "sub:", "C1:", "C2:", "C3:", "C4:", "C5:"];
  let t = text;
  for (let k = 0; k < kills.length; k++) {
    const w = kills[k];
    let idx = t.indexOf(w);
    while (idx !== -1) {
      t = t.slice(0, idx) + t.slice(idx + w.length);
      idx = t.indexOf(w);
    }
  }
  const out = [];
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    const code = t.charCodeAt(i);
    if (c === "*" || c === "_" || c === "#" || c === "`" || c === "[" || c === "]" || c === "~") {
      out.push(" ");
    } else if (code === 8226 || code === 8212 || code === 8211) {
      out.push(" ");
    } else if (c === "-" && i > 0 && (t[i-1] === "\n" || t[i-1] === " " || t[i-1] === "\r")) {
      out.push(" ");
    } else if (c === "\n" || c === "\r") {
      out.push(" ");
    } else {
      out.push(c);
    }
  }
  let result = out.join("");
  while (result.indexOf("  ") !== -1) {
    result = result.split("  ").join(" ");
  }
  return result.trim();
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  for (let i = 0; i < voices.length; i++) {
    if (voices[i].name === "Google US English") return voices[i];
  }
  for (let i = 0; i < voices.length; i++) {
    if (voices[i].name.indexOf("Google") !== -1 && voices[i].lang.indexOf("en") === 0) return voices[i];
  }
  for (let i = 0; i < voices.length; i++) {
    if (voices[i].name === "Alex" || voices[i].name === "Samantha") return voices[i];
  }
  for (let i = 0; i < voices.length; i++) {
    if (voices[i].lang === "en-US") return voices[i];
  }
  return voices.length > 0 ? voices[0] : null;
}

function doSpeakText(text, onDone) {
  window.speechSynthesis.cancel();
  const clean = cleanForSpeech(text);
  const attempt = function() {
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 1.2;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    const v = pickVoice();
    if (v) utter.voice = v;
    utter.onend = function() { if (onDone) onDone(); };
    utter.onerror = function() { if (onDone) onDone(); };
    window.speechSynthesis.speak(utter);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = attempt;
  } else {
    attempt();
  }
}

function doStopSpeaking() {
  window.speechSynthesis.cancel();
}

const callAPI = async function(prompt, system) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: system, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(function() { return {}; });
    throw new Error(err.error || "API error");
  }
  const data = await res.json();
  if (!data.text) throw new Error("No text in response");
  return data.text;
};

export default function App() {
  const [appMode, setAppMode] = useState("landing");
  const [setupSide, setSetupSide] = useState(null);
  const [setupResMode, setSetupResMode] = useState(null);
  const [setupResText, setSetupResText] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupDifficulty, setSetupDifficulty] = useState("varsity");
  const [difficulty, setDifficulty] = useState("varsity");
  const [resolution, setResolution] = useState("");
  const [userSide, setUserSide] = useState(null);
  const [botSide, setBotSide] = useState(null);
  const [stage, setStage] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [roundOver, setRoundOver] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef(null);
  const [caseRes, setCaseRes] = useState("");
  const [caseSide, setCaseSide] = useState(null);
  const [caseResSet, setCaseResSet] = useState(false);
  const [caseSpeechType, setCaseSpeechType] = useState("constructive");
  const [caseMsgs, setCaseMsgs] = useState([]);
  const [caseInput, setCaseInput] = useState("");
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseFeedbackMode, setCaseFeedbackMode] = useState(null);
  const [caseFeedbackText, setCaseFeedbackText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(function() {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, caseMsgs]);

  useEffect(function() {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = function() { window.speechSynthesis.getVoices(); };
  }, []);

  const startRecording = function() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition requires Chrome."); return; }
    doStopSpeaking();
    setSpeaking(false);
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    let finalText = transcript;
    r.onresult = function(e) {
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { finalText = finalText + e.results[i][0].transcript + " "; }
        else { inter = e.results[i][0].transcript; }
      }
      setTranscript(finalText);
      setInterim(inter);
    };
    r.onend = function() { setRecording(false); setInterim(""); };
    r.onerror = function() { setRecording(false); setInterim(""); };
    recognitionRef.current = r;
    r.start();
    setRecording(true);
  };

  const stopRecording = function() {
    if (recognitionRef.current) recognitionRef.current.stop();
    setRecording(false);
    setInterim("");
  };

  const botSpeak = async function(prompt, msgType, isJudge) {
    const type = msgType || "opponent";
    const judge = isJudge || false;
    setLoading(true);
    try {
      if (judge) {
        const text = await callAPI(prompt, JUDGE_SYSTEM);
        setMessages(function(prev) { return prev.concat([{ role: "assistant", content: text, verbatim: text, type: type }]); });
        setSpeaking(true);
        doSpeakText(text, function() { setSpeaking(false); });
      } else {
        const flow = await callAPI(prompt, getFlowPrompt(difficulty));
        const vp = "Here is a debate flow sheet. Expand every point into natural spoken sentences in the same order. Write only plain spoken English words, no symbols no labels no asterisks no dashes no bullets: " + flow;
        const verbatim = await callAPI(vp, getVerbatimPrompt(difficulty));
        setMessages(function(prev) { return prev.concat([{ role: "assistant", content: flow, verbatim: verbatim, type: type }]); });
        setSpeaking(true);
        doSpeakText(verbatim, function() { setSpeaking(false); });
      }
    } catch (e) {
      setMessages(function(prev) { return prev.concat([{ role: "assistant", content: "Error: " + e.message, verbatim: "", type: type }]); });
    }
    setLoading(false);
  };

  const generateResolution = async function() {
    setSetupLoading(true);
    setSetupResMode("generating");
    const topics = ["technology","education","environment","healthcare","criminal justice","economics","social media","artificial intelligence","democracy","free speech"];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const seed = Math.floor(Math.random() * 99999);
    try {
      const text = await callAPI(
        "Generate one unique specific high school parliamentary debate resolution about " + topic + ". Seed: " + seed + ". Return ONLY the resolution text starting with This house. No quotes no explanation.",
        "You generate debate resolutions. Return only the resolution text, nothing else."
      );
      setSetupResText(text.trim().replace(/^["']/, "").replace(/["']$/, "").replace(/\.$/, ""));
      setSetupResMode("done");
    } catch (e) {
      const fb = ["This house would ban social media for minors","This house believes universal basic income should be implemented","This house would make voting mandatory","This house believes AI development should be internationally regulated"];
      setSetupResText(fb[Math.floor(Math.random() * fb.length)]);
      setSetupResMode("done");
    }
    setSetupLoading(false);
  };

  const startRound = async function() {
    const res = setupResText.trim();
    const uSide = setupSide === "gov" ? "Government" : "Opposition";
    const bSide = setupSide === "gov" ? "Opposition" : "Government";
    setDifficulty(setupDifficulty);
    setResolution(res);
    setUserSide(uSide);
    setBotSide(bSide);
    setMessages([]);
    setRoundOver(false);
    setInput("");
    setTranscript("");
    setInterim("");
    if (setupSide === "opp") {
      setStage(1);
      setLoading(true);
      setAppMode("practice");
      try {
        const flow = await callAPI(ROUND_PROMPTS.gov_opens(res), getFlowPrompt(setupDifficulty));
        const vp = "Here is a debate flow sheet. Expand every point into natural spoken sentences in the same order. Write only plain spoken English, no symbols no labels no asterisks no dashes no bullets: " + flow;
        const verbatim = await callAPI(vp, getVerbatimPrompt(setupDifficulty));
        setMessages([{ role: "assistant", content: flow, verbatim: verbatim, type: "opponent" }]);
        setSpeaking(true);
        doSpeakText(verbatim, function() { setSpeaking(false); });
        setStage(2);
      } catch (e) {
        setMessages([{ role: "assistant", content: "Error: " + e.message, verbatim: "", type: "opponent" }]);
      }
      setLoading(false);
    } else {
      setStage(0);
      setAppMode("practice");
    }
  };

  const handleUserSpeech = async function() {
    const userText = transcript.trim() || input.trim();
    if (!userText || loading || speaking) return;
    setInput("");
    setTranscript("");
    setInterim("");
    setMessages(function(prev) { return prev.concat([{ role: "user", content: userText, type: "user" }]); });
    if (userSide === "Government") {
      if (stage === 0) {
        setStage(1);
        await botSpeak(ROUND_PROMPTS.opp_rebuts_and_constructs(resolution, userText));
        setStage(2);
      } else if (stage === 2) {
        setStage(3);
        await botSpeak(ROUND_PROMPTS.opp_rebuts_gov_extended(resolution, userText));
        setStage(4);
      } else if (stage === 4) {
        setStage(5);
        await botSpeak(ROUND_PROMPTS.bot_whip(resolution, "Opposition", userText));
        setStage(6);
      } else if (stage === 6) {
        setStage(7);
        await botSpeak(ROUND_PROMPTS.judge_critique(resolution, "Government", "Opposition", userText, difficulty), "judge", true);
        setRoundOver(true);
      }
    } else {
      if (stage === 2) {
        setStage(3);
        await botSpeak(ROUND_PROMPTS.gov_rebuts_and_extends(resolution, userText));
        setStage(4);
      } else if (stage === 4) {
        setStage(6);
      } else if (stage === 6) {
        setStage(5);
        await botSpeak(ROUND_PROMPTS.bot_whip(resolution, "Government", userText));
        setStage(7);
        await botSpeak(ROUND_PROMPTS.judge_critique(resolution, "Opposition", "Government", userText, difficulty), "judge", true);
        setRoundOver(true);
      }
    }
  };

  const getInputLabel = function() {
    if (roundOver || loading) return null;
    if (userSide === "Government") {
      if (stage === 0) return "YOUR SPEECH: Government Opening Constructive";
      if (stage === 2) return "YOUR SPEECH: Government Rebuttal + Rebuild";
      if (stage === 4) return "YOUR SPEECH: Government Rebuttal (Pre-Whip)";
      if (stage === 6) return "YOUR SPEECH: Government Whip (Final)";
    } else {
      if (stage === 2) return "YOUR SPEECH: Opposition Constructive + Rebuttal";
      if (stage === 4) return "YOUR SPEECH: Opposition Rebuttal + Rebuild";
      if (stage === 6) return "YOUR SPEECH: Opposition Whip";
    }
    return null;
  };

  const isUserTurn = function() {
    if (roundOver || loading || speaking) return false;
    if (userSide === "Government") return stage === 0 || stage === 2 || stage === 4 || stage === 6;
    return stage === 2 || stage === 4 || stage === 6;
  };

  const getProgressSteps = function() {
    if (userSide === "Government") {
      return [
        { label: "Gov Constructive", active: stage === 0, done: stage > 0 },
        { label: "Opp Constructive+Rebuttal", active: stage === 1, done: stage > 1 },
        { label: "Gov Rebuttal+Rebuild", active: stage === 2, done: stage > 2 },
        { label: "Opp Rebuttal+Rebuild", active: stage === 3, done: stage > 3 },
        { label: "Opp Whip", active: stage === 5, done: stage > 5 },
        { label: "Gov Whip", active: stage === 6, done: stage > 6 },
        { label: "Judge", active: stage === 7, done: roundOver },
      ];
    }
    return [
      { label: "Gov Constructive", active: stage === 1, done: stage > 1 },
      { label: "Opp Constructive+Rebuttal", active: stage === 2, done: stage > 2 },
      { label: "Gov Rebuttal+Rebuild", active: stage === 3, done: stage > 3 },
      { label: "Opp Rebuttal+Rebuild", active: stage === 4, done: stage > 4 },
      { label: "Opp Whip", active: stage === 6, done: stage > 6 },
      { label: "Gov Whip", active: stage === 7, done: roundOver },
      { label: "Judge", active: stage === 7, done: roundOver },
    ];
  };

  const resetToLanding = function() {
    doStopSpeaking();
    if (recognitionRef.current) recognitionRef.current.stop();
    setSpeaking(false);
    setRecording(false);
    setTranscript("");
    setInterim("");
    setAppMode("landing");
    setSetupSide(null);
    setSetupResMode(null);
    setSetupResText("");
    setSetupLoading(false);
    setSetupDifficulty("varsity");
    setResolution("");
    setUserSide(null);
    setBotSide(null);
    setStage(0);
    setMessages([]);
    setInput("");
    setRoundOver(false);
    setLoading(false);
  };

  const sendCaseMessage = async function(text, isFeedback) {
    if (!text.trim()) return;
    const newMsgs = caseMsgs.concat([{ role: "user", content: text, isFeedback: isFeedback || false }]);
    setCaseMsgs(newMsgs);
    setCaseInput("");
    setCaseFeedbackMode(null);
    setCaseFeedbackText("");
    setCaseLoading(true);
    try {
      const context = "RESOLUTION: " + caseRes + "\nSIDE: " + (caseSide === "gov" ? "Government" : "Opposition") + "\nSPEECH TYPE: " + caseSpeechType + "\n\n";
      const apiMsgs = newMsgs.map(function(m, i) { return { role: m.role, content: i === 0 ? context + m.content : m.content }; });
      const res = await fetch("/api/gemini", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: SYSTEM_PROMPT, messages: apiMsgs }),
      });
      const data = await res.json();
      setCaseMsgs(newMsgs.concat([{ role: "assistant", content: data.text || "No response." }]));
    } catch (e) {
      setCaseMsgs(newMsgs.concat([{ role: "assistant", content: "Error, please try again." }]));
    }
    setCaseLoading(false);
  };

  const handleCaseQuickAction = function(action) {
    if (!caseResSet || !caseSide) return;
    const side = caseSide === "gov" ? "Government" : "Opposition";
    const prompts = {
      case: "Generate a full " + (side === "Government" ? "Prime Minister Government" : "Leader of Opposition") + " constructive case. Complete 8-minute case with definitions, intro, and all contentions fully fleshed out. Include a creative third contention if possible.",
      whip: "Generate a " + side + " Whip speech 5 minutes. Focus on weighing, voters, comparing the two worlds. No new arguments.",
      plan: "Write a policy plan for the " + side + " side. Include: Plantext, Actor, Timeframe, and Cost/Mechanism.",
      counterplan: "Write a counterplan for the " + side + " side. Include: Plantext, Net Benefit, Actor, Timeframe, and Cost/Mechanism.",
    };
    sendCaseMessage(prompts[action]);
  };

  const formatMessage = function(text) {
    return text.split("\n").map(function(line, i) {
      if (/^#{1,3} /.test(line)) return <div key={i} style={{ fontWeight:700, fontSize:14, marginTop:12, marginBottom:4 }}>{line.replace(/^#{1,3} /,"")}</div>;
      if (/^\*\*(.+)\*\*$/.test(line)) return <div key={i} style={{ fontWeight:700, marginTop:8, marginBottom:2 }}>{line.replace(/\*\*/g,"")}</div>;
      if (/^\*\*(.+)\*\*/.test(line)) {
        const parts = line.split(/\*\*/g);
        return <div key={i} style={{ marginBottom:2 }}>{parts.map(function(p,j) { return j%2===1 ? <strong key={j}>{p}</strong> : <span key={j}>{p}</span>; })}</div>;
      }
      if (/^- /.test(line)) return <div key={i} style={{ paddingLeft:16, marginBottom:2, color:"#475569" }}>{"• "}{line.slice(2)}</div>;
      if (/^(CLAIM|WARRANT|IMPACT|Claim:|Warrant:|Impact:)/i.test(line)) return <div key={i} style={{ fontWeight:700, color:"#0f766e", marginTop:8, marginBottom:2, fontSize:12, fontFamily:"monospace" }}>{line}</div>;
      if (line.trim() === "") return <div key={i} style={{ height:8 }} />;
      return <div key={i} style={{ marginBottom:2, lineHeight:1.7 }}>{line}</div>;
    });
  };

  const canStart = setupSide && setupResText.trim();
  const userTurn = isUserTurn();
  const label = getInputLabel();
  const diff = DIFFICULTY[difficulty];

  if (appMode === "landing") {
    return (
      <div style={s.app}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>{"⚖"}</div>
            <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
          </div>
        </header>
        <div style={s.landing}>
          <div style={s.landingCard}>
            <div style={{ fontSize:52, marginBottom:16 }}>{"⚖️"}</div>
            <p style={s.landingTitle}>Ready to debate.</p>
            <p style={s.landingSubtitle}>Generate a full case or simulate a complete debate round against the AI.</p>
            <div style={s.landingGrid}>
              <button style={s.landingBtnCase} onClick={function() { setAppMode("case"); }}>
                <span style={{ fontSize:28 }}>{"📋"}</span>
                Case Generator
                <span style={s.landingBtnSub}>Build a full 8-min case</span>
              </button>
              <button style={s.landingBtnPractice} onClick={function() { setAppMode("setup"); }}>
                <span style={{ fontSize:28 }}>{"⚔️"}</span>
                Full Round Practice
                <span style={s.landingBtnSub}>Simulate a real round</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appMode === "setup") {
    return (
      <div style={s.app}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>{"⚖"}</div>
            <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
          </div>
          <span style={s.badgePractice}>{"⚔ SETUP"}</span>
        </header>
        <div style={s.landing}>
          <div style={s.setupCard}>
            <p style={s.setupTitle}>{"⚔️ Full Round Practice"}</p>
            <p style={s.setupSubtitle}>Pick your side and resolution. Gov always opens, Opp always responds first.</p>
            <div style={s.setupSection}>
              <span style={s.setupSectionLabel}>Your Side</span>
              <div style={s.sideGrid}>
                <button style={setupSide === "gov" ? s.btnGovActive : s.btnGovInactive} onClick={function() { setSetupSide("gov"); }}>GOV</button>
                <button style={setupSide === "opp" ? s.btnOppActive : s.btnOppInactive} onClick={function() { setSetupSide("opp"); }}>OPP</button>
              </div>
              {setupSide && <div style={{ fontSize:11, color:"#94a3b8", marginTop:8, fontFamily:"monospace" }}>{setupSide === "gov" ? "You open. Bot plays Opposition." : "Bot opens as Government. You respond first."}</div>}
            </div>
            <div style={s.setupSection}>
              <span style={s.setupSectionLabel}>Difficulty</span>
              <div style={s.diffGrid}>
                {Object.entries(DIFFICULTY).map(function(entry) {
                  const key = entry[0];
                  const d = entry[1];
                  return (
                    <button key={key} style={s.diffBtn(setupDifficulty === key, d.color, d.bg)} onClick={function() { setSetupDifficulty(key); }}>
                      {d.label}
                      <div style={{ fontSize:10, fontWeight:400, marginTop:3, opacity:0.8 }}>{d.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={s.setupSection}>
              <span style={s.setupSectionLabel}>Resolution</span>
              <div style={s.optionGrid}>
                <button style={setupResMode === "generating" ? Object.assign({}, s.optionBtn, { opacity:0.5 }) : s.optionBtn} onClick={generateResolution} disabled={setupLoading}>
                  {setupLoading ? "Generating..." : "🎲 Generate one"}
                </button>
                <button style={setupResMode === "custom" ? s.optionBtnActive : s.optionBtn} onClick={function() { setSetupResMode("custom"); setSetupResText(""); }}>
                  {"✏️ Enter my own"}
                </button>
              </div>
              {(setupResMode === "custom" || setupResMode === "done") && (
                <input autoFocus={setupResMode === "custom"} style={Object.assign({}, s.resInput, { marginTop:10 })} placeholder="Type your resolution..." value={setupResText} onChange={function(e) { setSetupResText(e.target.value); }} />
              )}
            </div>
            <button style={canStart && !setupLoading ? s.startBtn : s.startBtnDisabled} disabled={!canStart || setupLoading} onClick={startRound}>Start Round</button>
            <button style={s.backBtn} onClick={resetToLanding}>{"← Back"}</button>
          </div>
        </div>
      </div>
    );
  }

  if (appMode === "practice") {
    const steps = getProgressSteps();
    return (
      <div style={s.app}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>{"⚖"}</div>
            <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
          </div>
          <div style={s.headerBadges}>
            <span style={userSide === "Government" ? s.badgeGov : s.badgeOpp}>{userSide === "Government" ? "▲ GOV" : "▼ OPP"}</span>
            {diff && <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background: diff.bg, color: diff.color, border: "1px solid " + diff.border }}>{diff.label}</span>}
            <span style={s.badgePractice}>{"⚔ FULL ROUND"}</span>
            {speaking && <span style={s.badgeSpeaking}>{"🔊 Speaking"}</span>}
            {recording && <span style={s.badgeRecording}>{"🔴 Recording"}</span>}
            <button onClick={resetToLanding} style={{ background:"none", border:"1px solid #e2e8f0", borderRadius:8, padding:"4px 10px", fontSize:11, color:"#94a3b8", cursor:"pointer" }}>{"← Home"}</button>
          </div>
        </header>
        <div style={s.body}>
          <aside style={s.sidebar}>
            <div>
              <p style={s.sideLabel}>Resolution</p>
              <div style={{ fontSize:12, color:"#475569", lineHeight:1.5, padding:"8px 10px", background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0" }}>{resolution}</div>
            </div>
            <div>
              <p style={s.sideLabel}>Round Progress</p>
              {steps.map(function(step, i) {
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background: step.done ? "#4f46e5" : step.active ? "#fbbf24" : "#e2e8f0" }} />
                    <span style={{ fontSize:12, fontWeight: step.active ? 700 : 400, color: step.done ? "#4f46e5" : step.active ? "#92400e" : "#cbd5e1" }}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            {speaking && <button style={s.actionBtn} onClick={function() { doStopSpeaking(); setSpeaking(false); }}>{"⏹ Stop Speaking"}</button>}
            {roundOver && <button style={Object.assign({}, s.actionBtn, { background:"#4f46e5", color:"#fff", border:"none", fontWeight:700 })} onClick={function() { setAppMode("setup"); }}>{"🔄 New Round"}</button>}
            <button style={s.actionBtn} onClick={resetToLanding}>{"← Home"}</button>
          </aside>
          <main style={s.chat}>
            <div style={s.messages}>
              {messages.length === 0 && !loading && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8, textAlign:"center" }}>
                  <div style={{ fontSize:36 }}>{"⚔️"}</div>
                  <p style={{ fontSize:16, fontWeight:700, margin:0 }}>Round starting...</p>
                  {userSide === "Government" && <p style={{ fontSize:13, color:"#94a3b8", margin:0 }}>You open. Deliver your Government constructive below.</p>}
                </div>
              )}
              {messages.map(function(msg, i) {
                return (
                  <div key={i} style={msg.role === "user" ? s.msgWrapUser : s.msgWrapAsst}>
                    <div style={msg.role === "user" ? s.msgUser : msg.type === "judge" ? s.msgAsstJudge : s.msgAsstOpponent}>
                      {msg.role === "assistant" && msg.type === "opponent" && <div style={Object.assign({}, s.msgTag, { color:"#be123c" })}>{"⚔ " + botSide}</div>}
                      {msg.role === "assistant" && msg.type === "judge" && <div style={Object.assign({}, s.msgTag, { color:"#15803d" })}>{"🏛 Judges Decision"}</div>}
                      {msg.role === "user" && <div style={Object.assign({}, s.msgTag, { color:"rgba(255,255,255,0.6)" })}>{"🎤 " + userSide}</div>}
                      {msg.role === "assistant" ? <div>{formatMessage(msg.content)}</div> : <p style={{ margin:0, lineHeight:1.6 }}>{msg.content}</p>}
                      {msg.role === "assistant" && msg.verbatim && (
                        <button style={s.replayBtn} onClick={function() { doStopSpeaking(); setSpeaking(true); doSpeakText(msg.verbatim, function() { setSpeaking(false); }); }}>{"🔊 Replay speech"}</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div style={s.msgWrapAsst}>
                  <div style={s.msgAsstOpponent}>
                    <div style={Object.assign({}, s.msgTag, { color:"#be123c" })}>{"⚔ " + botSide}</div>
                    <span style={{ color:"#94a3b8", fontSize:13, marginRight:8 }}>Preparing speech</span>
                    <span style={s.loadingDot}/><span style={s.loadingDot}/><span style={s.loadingDot}/>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div style={s.inputBar}>
              {label && <div style={s.speechLabel}>{"🎤 " + label}</div>}
              {speaking && <div style={{ fontSize:11, color:"#7c3aed", fontWeight:700, marginBottom:6, fontFamily:"monospace" }}>{"🔊 Opponent speaking"}</div>}
              {!userTurn && !loading && !speaking && !roundOver && <div style={{ fontSize:11, color:"#94a3b8", marginBottom:6, fontFamily:"monospace" }}>Opponent is preparing...</div>}
              {roundOver && <div style={{ fontSize:11, color:"#15803d", fontWeight:700, marginBottom:6, fontFamily:"monospace" }}>{"✓ Round complete"}</div>}
              <div style={s.inputRow}>
                <button style={s.micBtn(recording)} onClick={recording ? stopRecording : startRecording} disabled={!userTurn && !recording} title={recording ? "Stop" : "Record"}>{recording ? "⏹" : "🎤"}</button>
                <div style={s.transcriptBox}>
                  {(transcript || interim)
                    ? <span>{transcript}<span style={{ color:"#94a3b8" }}>{interim}</span></span>
                    : <span style={{ color:"#cbd5e1" }}>{roundOver ? "Round over." : !userTurn ? "Waiting..." : "Mic to speak, or type below"}</span>
                  }
                </div>
                <button style={!(transcript.trim() || input.trim()) || !userTurn || speaking ? s.sendBtnDisabled : s.sendBtnRed} onClick={handleUserSpeech} disabled={!(transcript.trim() || input.trim()) || !userTurn || speaking}>Deliver</button>
              </div>
              <textarea style={Object.assign({}, s.inputTextarea, { marginTop:8, fontSize:12 })} rows={2} placeholder="Or type your speech here..." value={input} onChange={function(e) { setInput(e.target.value); }} disabled={!userTurn || speaking}
                onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if ((input.trim() || transcript.trim()) && userTurn && !speaking) handleUserSpeech(); } }}
              />
              <div style={s.inputHint}>{"🎤 Mic (Chrome only) · Or type · Deliver when ready"}</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>{"⚖"}</div>
          <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
        </div>
        <div style={s.headerBadges}>
          {caseResSet && caseSide && <span style={caseSide === "gov" ? s.badgeGov : s.badgeOpp}>{caseSide === "gov" ? "▲ GOV" : "▼ OPP"}</span>}
          <button onClick={resetToLanding} style={{ background:"none", border:"1px solid #e2e8f0", borderRadius:8, padding:"4px 10px", fontSize:11, color:"#94a3b8", cursor:"pointer" }}>{"← Home"}</button>
        </div>
      </header>
      <div style={s.body}>
        <aside style={s.sidebar}>
          <div>
            <p style={s.sideLabel}>Resolution</p>
            <textarea style={s.textarea} rows={3} placeholder="Enter the resolution..." value={caseRes} onChange={function(e) { setCaseRes(e.target.value); }} disabled={caseResSet} />
            {!caseResSet
              ? <button style={s.btnPrimary} onClick={function() { if (caseRes.trim()) { setCaseResSet(true); setCaseMsgs([]); } }} disabled={!caseRes.trim()}>Set Resolution</button>
              : <button style={s.btnSecondary} onClick={function() { setCaseResSet(false); setCaseSide(null); setCaseMsgs([]); }}>Change</button>
            }
          </div>
          {caseResSet && (
            <div>
              <p style={s.sideLabel}>Side</p>
              <div style={s.sideGrid}>
                <button style={caseSide === "gov" ? s.btnGovActive : s.btnGovInactive} onClick={function() { setCaseSide("gov"); }}>GOV</button>
                <button style={caseSide === "opp" ? s.btnOppActive : s.btnOppInactive} onClick={function() { setCaseSide("opp"); }}>OPP</button>
              </div>
            </div>
          )}
          {caseResSet && caseSide && (
            <div>
              <div>
                <p style={s.sideLabel}>Speech</p>
                <select style={s.select} value={caseSpeechType} onChange={function(e) { setCaseSpeechType(e.target.value); }}>
                  <option value="constructive">{caseSide === "gov" ? "PM Constructive" : "LO Constructive"}</option>
                  <option value="extension">{caseSide === "gov" ? "MG Extension" : "MO Extension"}</option>
                  <option value="whip">{caseSide === "gov" ? "Gov Whip" : "Opp Whip"}</option>
                </select>
              </div>
              <div style={{ marginTop:16 }}>
                <p style={s.sideLabel}>Generate</p>
                {[{ key:"case", label:"📋 Full Case" },{ key:"whip", label:"🏁 Whip Speech" },{ key:"plan", label:"📄 Write a Plan" },{ key:"counterplan", label:"↩️ Counterplan" }].map(function(item) {
                  return <button key={item.key} style={s.actionBtn} onClick={function() { handleCaseQuickAction(item.key); }} disabled={caseLoading}>{item.label}</button>;
                })}
              </div>
            </div>
          )}
          {caseMsgs.length > 0 && (
            <div>
              <p style={s.sideLabel}>Export</p>
              <button style={s.exportBtn} onClick={function() {
                const content = caseMsgs.map(function(m) { return "[" + m.role.toUpperCase() + "]\n" + m.content; }).join("\n\n---\n\n");
                const blob = new Blob(["RESOLUTION: " + caseRes + "\n\n" + content], { type:"text/plain" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "parli-case-" + Date.now() + ".txt";
                a.click();
              }}>{"⬇ Export .txt"}</button>
            </div>
          )}
        </aside>
        <main style={s.chat}>
          <div style={s.messages}>
            {caseMsgs.length === 0 && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", textAlign:"center", gap:8 }}>
                <div style={{ fontSize:48 }}>{"⚖️"}</div>
                <p style={{ fontSize:22, fontWeight:700, margin:0 }}>Ready to debate.</p>
                <p style={{ fontSize:13, color:"#94a3b8", maxWidth:280, lineHeight:1.6, margin:0 }}>Set a resolution, pick your side, then generate a case.</p>
              </div>
            )}
            {caseMsgs.map(function(msg, i) {
              return (
                <div key={i} style={msg.role === "user" ? s.msgWrapUser : s.msgWrapAsst}>
                  <div style={msg.role === "user" ? s.msgUser : s.msgAsst}>
                    {msg.role === "assistant" ? <div>{formatMessage(msg.content)}</div> : <p style={{ margin:0, lineHeight:1.6 }}>{msg.content}</p>}
                    {msg.role === "assistant" && i === caseMsgs.length - 1 && !caseLoading && (
                      <div style={s.msgActions}>
                        <button style={s.smallBtn} onClick={function() { setCaseFeedbackMode(i); }}>{"✏ Request Revision"}</button>
                        <button style={s.smallBtn} onClick={function() { navigator.clipboard.writeText(msg.content); }}>{"📋 Copy"}</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {caseLoading && (
              <div style={s.msgWrapAsst}>
                <div style={s.msgAsst}>
                  <span style={{ color:"#94a3b8", fontSize:13, marginRight:8 }}>Generating</span>
                  <span style={s.loadingDot}/><span style={s.loadingDot}/><span style={s.loadingDot}/>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {caseFeedbackMode !== null && (
            <div style={s.revBar}>
              <div style={s.revLabel}>{"✏ Revision Request"}</div>
              <div style={s.revRow}>
                <textarea autoFocus style={Object.assign({}, s.textarea, { flex:1, marginBottom:0 })} rows={2} placeholder="What should change?" value={caseFeedbackText} onChange={function(e) { setCaseFeedbackText(e.target.value); }}
                  onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (caseFeedbackText.trim()) sendCaseMessage("REVISION REQUEST: " + caseFeedbackText, true); } }}
                />
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <button style={s.revBtnSend} onClick={function() { if (caseFeedbackText.trim()) sendCaseMessage("REVISION REQUEST: " + caseFeedbackText, true); }} disabled={!caseFeedbackText.trim()}>Send</button>
                  <button style={s.revBtnCancel} onClick={function() { setCaseFeedbackMode(null); setCaseFeedbackText(""); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
          <div style={s.inputBar}>
            <div style={s.inputRow}>
              <textarea style={s.inputTextarea} rows={2}
                placeholder={!caseResSet ? "Set a resolution to begin..." : !caseSide ? "Pick a side first..." : "Ask anything..."}
                value={caseInput} onChange={function(e) { setCaseInput(e.target.value); }}
                disabled={!caseResSet || !caseSide || caseLoading}
                onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (caseInput.trim()) sendCaseMessage(caseInput); } }}
              />
              <button style={!caseInput.trim() || !caseResSet || !caseSide || caseLoading ? s.sendBtnDisabled : s.sendBtn}
                onClick={function() { if (caseInput.trim()) sendCaseMessage(caseInput); }}
                disabled={!caseInput.trim() || !caseResSet || !caseSide || caseLoading}>Send</button>
            </div>
            <div style={s.inputHint}>Enter to send · Shift+Enter for new line</div>
          </div>
        </main>
      </div>
    </div>
  );
}
