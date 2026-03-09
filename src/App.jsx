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
  return "You are an expert high school parliamentary debate opponent. " + d.botInstructions + " Output a DEBATE FLOW. Short punchy bullets, 5-12 words max per bullet. For constructive speeches always include: Intro: (1 line hook), Definitions: (key terms), Roadmap: (list contentions), then C1 C2 C3 with Claim Warrant Impact under each. For rebuttals use arrow notation. No full sentences. No prose.";
};

const getVerbatimPrompt = function(difficulty) {
  const d = DIFFICULTY[difficulty];
  return "You are a high school parliamentary debater delivering a speech out loud. " + d.botInstructions + " You will be given a flow sheet. Expand every point into natural spoken sentences in the SAME ORDER. STRUCTURE RULES: If this is a constructive speech, you MUST start with a brief 1-2 sentence introduction, then state your definitions clearly before moving to contentions. Always give a roadmap before contentions like 'I will be running three contentions today.' FORMATTING RULES you must follow without exception: Do not write any asterisks. Do not write any dashes. Do not write any bullet points. Do not write labels like C1 C2 Claim Warrant Impact. Do not use any symbols whatsoever. Write ONLY plain spoken English words that a real debater would actually say out loud. Sound like a confident debater at a tournament: direct, persuasive, natural. Use spoken transitions like My first contention is, Moving to my second point, Look at what they dropped, The reason this matters, Weighing this against their world. Build to your impacts. Natural speech only.";
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

// ─── RefractWeb-inspired dark design system ───────────────────────────────────
// Near-black bg, off-white text, hairline borders, aggressive uppercase type
// Fonts: DM Sans (headings) + DM Mono (labels/monospace)

const RF = {
  bg:       "#0c0d0f",
  bgSurf:   "#141518",
  bgSurf2:  "#1a1b1f",
  bgInput:  "#111214",
  fg:       "#f0f0ee",
  fgMuted:  "rgba(240,240,238,0.55)",
  fgDim:    "rgba(240,240,238,0.25)",
  hairline: "rgba(240,240,238,0.08)",
  hairlineHov: "rgba(240,240,238,0.18)",
  accent:   "#e8e0d0",
  affLine:  "rgba(96,165,250,0.7)",
  negLine:  "rgba(251,113,133,0.7)",
  judgeGlow:"rgba(74,222,128,0.12)",
  font:     "'DM Sans', sans-serif",
  mono:     "'DM Mono', monospace",
};

const GFONTS = "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');";

const GLOBAL_CSS = GFONTS + `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:${RF.bg};color:${RF.fg};font-family:${RF.font};-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:${RF.hairlineHov};border-radius:2px}
textarea,input,select{font-family:${RF.font};outline:none}
textarea:focus,input:focus,select:focus{border-color:rgba(240,240,238,0.3)!important}
button{font-family:${RF.font};cursor:pointer}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}
`;

const s = {
  // ── App shell
  app: { display:"flex", flexDirection:"column", height:"100vh", fontFamily:RF.font, background:RF.bg, color:RF.fg, margin:0 },

  // ── Header
  header: {
    background:RF.bg, borderBottom:"1px solid "+RF.hairline,
    padding:"0 28px", height:52, display:"flex", alignItems:"center",
    justifyContent:"space-between", flexShrink:0,
  },
  headerLeft: { display:"flex", alignItems:"center", gap:10 },
  logo: {
    width:28, height:28, borderRadius:6,
    border:"1px solid "+RF.hairlineHov,
    display:"flex", alignItems:"center", justifyContent:"center",
    color:RF.fg, fontSize:14,
  },
  headerTitle: { margin:0, fontSize:13, fontWeight:600, letterSpacing:"0.01em", color:RF.fg },
  headerSub: { margin:0, fontSize:10, color:RF.fgMuted, fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase" },
  headerBadges: { display:"flex", gap:8, alignItems:"center" },

  // ── Badges — thin pill, mono uppercase, all same shape
  badgeBase: { padding:"2px 9px", borderRadius:4, fontSize:9, fontWeight:500, fontFamily:RF.mono, letterSpacing:"0.1em", textTransform:"uppercase", border:"1px solid" },
  badgeGov:       { padding:"2px 9px", borderRadius:4, fontSize:9, fontWeight:500, fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em", textTransform:"uppercase", background:"rgba(96,165,250,0.08)", color:"rgba(147,197,253,1)", border:"1px solid rgba(96,165,250,0.25)" },
  badgeOpp:       { padding:"2px 9px", borderRadius:4, fontSize:9, fontWeight:500, fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em", textTransform:"uppercase", background:"rgba(251,113,133,0.08)", color:"rgba(253,164,175,1)", border:"1px solid rgba(251,113,133,0.25)" },
  badgePractice:  { padding:"2px 9px", borderRadius:4, fontSize:9, fontWeight:500, fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em", textTransform:"uppercase", background:"rgba(240,240,238,0.05)", color:RF.fgMuted, border:"1px solid "+RF.hairlineHov },
  badgeSpeaking:  { padding:"2px 9px", borderRadius:4, fontSize:9, fontWeight:500, fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em", textTransform:"uppercase", background:"rgba(167,139,250,0.1)", color:"rgba(196,181,253,1)", border:"1px solid rgba(167,139,250,0.25)" },
  badgeRecording: { padding:"2px 9px", borderRadius:4, fontSize:9, fontWeight:500, fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em", textTransform:"uppercase", background:"rgba(239,68,68,0.08)", color:"rgba(252,165,165,1)", border:"1px solid rgba(239,68,68,0.2)" },

  // ── Layout
  body: { display:"flex", flex:1, overflow:"hidden" },
  sidebar: {
    width:224, background:RF.bg, borderRight:"1px solid "+RF.hairline,
    display:"flex", flexDirection:"column", gap:0,
    padding:0, overflowY:"auto", flexShrink:0,
  },
  sideSection: { padding:"16px 16px", borderBottom:"1px solid "+RF.hairline },
  sideLabel: {
    margin:"0 0 10px 0", fontSize:9, fontWeight:500, color:RF.fgDim,
    textTransform:"uppercase", letterSpacing:"0.14em", fontFamily:RF.mono,
  },

  // ── Form elements
  textarea: {
    width:"100%", background:RF.bgInput,
    border:"1px solid "+RF.hairline, borderRadius:8,
    padding:"10px 12px", fontSize:12, color:RF.fg,
    resize:"none", fontFamily:RF.font, boxSizing:"border-box", lineHeight:1.6,
    transition:"border-color 0.15s",
  },
  select: {
    width:"100%", background:RF.bgInput,
    border:"1px solid "+RF.hairline, borderRadius:7,
    padding:"9px 10px", fontSize:12, color:RF.fg,
    fontFamily:RF.font, appearance:"none",
  },
  resInput: {
    width:"100%", background:RF.bgInput,
    border:"1px solid "+RF.hairline, borderRadius:8,
    padding:"10px 12px", fontSize:12, color:RF.fg,
    fontFamily:RF.font, boxSizing:"border-box",
    transition:"border-color 0.15s",
  },

  // ── Buttons
  btnPrimary: {
    width:"100%", background:RF.fg, color:RF.bg,
    border:"none", borderRadius:7, padding:"9px 0",
    fontSize:12, fontWeight:600, cursor:"pointer", marginTop:10,
    transition:"opacity 0.15s",
  },
  btnSecondary: {
    width:"100%", background:"transparent", color:RF.fgMuted,
    border:"1px solid "+RF.hairlineHov, borderRadius:7, padding:"9px 0",
    fontSize:12, fontWeight:400, cursor:"pointer", marginTop:8,
    transition:"border-color 0.15s",
  },
  sideGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 },
  btnGovActive:   { padding:"10px 0", borderRadius:7, fontSize:12, fontWeight:600, border:"1px solid rgba(96,165,250,0.5)", background:"rgba(96,165,250,0.1)", color:"rgba(147,197,253,1)", cursor:"pointer" },
  btnGovInactive: { padding:"10px 0", borderRadius:7, fontSize:12, fontWeight:400, border:"1px solid "+RF.hairline, background:"transparent", color:RF.fgMuted, cursor:"pointer" },
  btnOppActive:   { padding:"10px 0", borderRadius:7, fontSize:12, fontWeight:600, border:"1px solid rgba(251,113,133,0.5)", background:"rgba(251,113,133,0.1)", color:"rgba(253,164,175,1)", cursor:"pointer" },
  btnOppInactive: { padding:"10px 0", borderRadius:7, fontSize:12, fontWeight:400, border:"1px solid "+RF.hairline, background:"transparent", color:RF.fgMuted, cursor:"pointer" },
  actionBtn: {
    textAlign:"left", padding:"8px 10px", borderRadius:7, fontSize:12, fontWeight:400,
    border:"1px solid "+RF.hairline, background:"transparent",
    color:RF.fgMuted, cursor:"pointer", width:"100%", marginBottom:4,
    transition:"border-color 0.15s, color 0.15s",
  },
  exportBtn: {
    width:"100%", background:"transparent",
    border:"1px solid "+RF.hairline, borderRadius:7,
    padding:"8px 0", fontSize:12, fontWeight:400,
    color:RF.fgMuted, cursor:"pointer",
  },
  startBtn: {
    width:"100%", background:RF.fg, color:RF.bg,
    border:"none", borderRadius:8, padding:"13px 0",
    fontSize:13, fontWeight:600, cursor:"pointer", marginTop:6,
    letterSpacing:"-0.01em", transition:"opacity 0.15s",
  },
  startBtnDisabled: {
    width:"100%", background:RF.hairline, color:RF.fgDim,
    border:"1px solid "+RF.hairline, borderRadius:8, padding:"13px 0",
    fontSize:13, fontWeight:600, cursor:"not-allowed", marginTop:6,
  },
  backBtn: {
    background:"none", border:"none", color:RF.fgDim,
    fontSize:11, cursor:"pointer", marginTop:16,
    fontFamily:RF.mono, display:"block", textAlign:"center", width:"100%",
    letterSpacing:"0.06em", textTransform:"uppercase",
  },
  sendBtn: {
    background:RF.fg, color:RF.bg, border:"none",
    borderRadius:8, padding:"10px 20px",
    fontSize:12, fontWeight:600, cursor:"pointer", flexShrink:0,
    transition:"opacity 0.15s",
  },
  sendBtnRed: {
    background:"rgba(251,113,133,0.9)", color:"#fff", border:"none",
    borderRadius:8, padding:"10px 20px",
    fontSize:12, fontWeight:600, cursor:"pointer", flexShrink:0,
  },
  sendBtnDisabled: {
    background:RF.hairline, color:RF.fgDim,
    border:"1px solid "+RF.hairline,
    borderRadius:8, padding:"10px 20px",
    fontSize:12, fontWeight:600, cursor:"not-allowed", flexShrink:0,
  },
  smallBtn: {
    fontSize:10, fontWeight:500, padding:"4px 10px", borderRadius:5,
    border:"1px solid "+RF.hairlineHov, background:"transparent",
    color:RF.fgMuted, cursor:"pointer", fontFamily:RF.mono,
    letterSpacing:"0.06em", textTransform:"uppercase",
    transition:"border-color 0.15s",
  },
  revBtnSend:   { background:RF.fg, color:RF.bg, border:"none", borderRadius:7, padding:"9px 14px", fontSize:12, fontWeight:600, cursor:"pointer" },
  revBtnCancel: { background:"transparent", color:RF.fgMuted, border:"1px solid "+RF.hairlineHov, borderRadius:7, padding:"9px 14px", fontSize:12, cursor:"pointer" },
  micBtn: function(rec) {
    return {
      width:40, height:40, borderRadius:8,
      border: rec ? "1px solid rgba(239,68,68,0.5)" : "1px solid "+RF.hairlineHov,
      cursor:"pointer", fontSize:16, flexShrink:0, color:RF.fg,
      background: rec ? "rgba(239,68,68,0.15)" : RF.bgSurf2,
      transition:"all 0.2s",
    };
  },

  // ── Chat
  chat: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  messages: { flex:1, overflowY:"auto", padding:"28px 32px 16px", display:"flex", flexDirection:"column", gap:12 },
  msgWrapUser: { display:"flex", justifyContent:"flex-end" },
  msgWrapAsst: { display:"flex", justifyContent:"flex-start" },
  msgUser: {
    maxWidth:560, background:RF.bgSurf2,
    border:"1px solid "+RF.hairlineHov,
    borderRadius:12, borderBottomRightRadius:3,
    padding:"12px 16px", fontSize:13, lineHeight:1.65, marginLeft:80, color:RF.fg,
  },
  msgAsst: {
    maxWidth:660, background:RF.bgSurf,
    border:"1px solid "+RF.hairline,
    borderRadius:12, borderBottomLeftRadius:3,
    padding:"14px 18px", fontSize:13, lineHeight:1.65, marginRight:40, color:RF.fg,
  },
  msgAsstOpponent: {
    maxWidth:660, background:RF.bgSurf,
    border:"1px solid rgba(251,113,133,0.2)",
    borderLeft:"2px solid rgba(251,113,133,0.6)",
    borderRadius:12, borderBottomLeftRadius:3,
    padding:"14px 18px", fontSize:13, lineHeight:1.65, marginRight:40, color:RF.fg,
  },
  msgAsstJudge: {
    maxWidth:660, background:RF.bgSurf,
    border:"1px solid rgba(74,222,128,0.15)",
    borderLeft:"2px solid rgba(74,222,128,0.5)",
    borderRadius:12, borderBottomLeftRadius:3,
    padding:"14px 18px", fontSize:13, lineHeight:1.65, marginRight:40, color:RF.fg,
  },
  msgTag: { fontSize:9, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.12em", fontFamily:RF.mono, marginBottom:10, opacity:0.5 },
  msgActions: { marginTop:12, paddingTop:10, borderTop:"1px solid "+RF.hairline, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" },
  loadingDot: { width:4, height:4, borderRadius:"50%", background:RF.fgMuted, display:"inline-block", margin:"0 3px", animation:"pulse 1.2s ease-in-out infinite" },

  // ── Revision bar
  revBar: { padding:"12px 24px", background:RF.bg, borderTop:"1px solid "+RF.hairline },
  revLabel: { fontSize:9, fontWeight:500, color:RF.fgDim, textTransform:"uppercase", letterSpacing:"0.12em", fontFamily:RF.mono, marginBottom:8 },
  revRow: { display:"flex", gap:8 },

  // ── Input bar
  inputBar: { padding:"14px 24px", background:RF.bg, borderTop:"1px solid "+RF.hairline, flexShrink:0 },
  speechLabel: { fontSize:9, color:"rgba(253,164,175,0.9)", fontWeight:500, fontFamily:RF.mono, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 },
  inputRow: { display:"flex", gap:8, alignItems:"flex-end" },
  inputTextarea: {
    flex:1, background:RF.bgInput,
    border:"1px solid "+RF.hairline, borderRadius:8,
    padding:"10px 14px", fontSize:12, color:RF.fg,
    resize:"none", fontFamily:RF.font, lineHeight:1.6,
    transition:"border-color 0.15s",
  },
  transcriptBox: {
    flex:1, background:RF.bgInput,
    border:"1px solid "+RF.hairline, borderRadius:8,
    padding:"10px 14px", fontSize:12, color:RF.fg,
    minHeight:40, lineHeight:1.6,
  },
  inputHint: { fontSize:9, color:RF.fgDim, marginTop:6, fontFamily:RF.mono, letterSpacing:"0.06em", textTransform:"uppercase" },

  // ── Landing
  landing: { flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:RF.bg },
  landingCard: {
    background:"transparent",
    maxWidth:520, width:"100%", textAlign:"center",
    padding:"0 24px",
    animation:"fadeUp 0.5s ease both",
  },
  landingTitle: {
    fontSize:48, fontWeight:700, margin:"0 0 12px 0",
    letterSpacing:"-0.04em", color:RF.fg, lineHeight:1.05,
  },
  landingSubtitle: { fontSize:14, color:RF.fgMuted, margin:"0 0 44px 0", lineHeight:1.65, fontWeight:300 },
  landingGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  landingBtnCase: {
    background:RF.fg, color:RF.bg,
    border:"none", borderRadius:12, padding:"22px 16px",
    fontSize:13, fontWeight:600, cursor:"pointer",
    display:"flex", flexDirection:"column", alignItems:"center", gap:8,
    transition:"opacity 0.15s",
  },
  landingBtnPractice: {
    background:"transparent", color:RF.fg,
    border:"1px solid "+RF.hairlineHov,
    borderRadius:12, padding:"22px 16px",
    fontSize:13, fontWeight:500, cursor:"pointer",
    display:"flex", flexDirection:"column", alignItems:"center", gap:8,
    transition:"border-color 0.15s",
  },
  landingBtnSub: { fontSize:11, fontWeight:300, opacity:0.55, letterSpacing:"0.01em" },

  // ── Setup card
  setupCard: {
    background:RF.bgSurf,
    border:"1px solid "+RF.hairline,
    borderRadius:16, padding:"40px 36px",
    maxWidth:460, width:"100%",
    animation:"fadeUp 0.4s ease both",
  },
  setupTitle: { fontSize:22, fontWeight:700, margin:"0 0 6px 0", letterSpacing:"-0.03em", color:RF.fg },
  setupSubtitle: { fontSize:12, color:RF.fgMuted, margin:"0 0 32px 0", lineHeight:1.6, fontWeight:300 },
  setupSection: { marginBottom:28 },
  setupSectionLabel: { fontSize:9, fontWeight:500, color:RF.fgDim, textTransform:"uppercase", letterSpacing:"0.14em", fontFamily:RF.mono, marginBottom:12, display:"block" },
  optionGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 },
  optionBtn: { padding:"12px 10px", borderRadius:8, fontSize:12, fontWeight:400, border:"1px solid "+RF.hairline, background:"transparent", color:RF.fgMuted, cursor:"pointer", textAlign:"center", transition:"border-color 0.15s" },
  optionBtnActive: { padding:"12px 10px", borderRadius:8, fontSize:12, fontWeight:600, border:"1px solid "+RF.hairlineHov, background:RF.bgSurf2, color:RF.fg, cursor:"pointer", textAlign:"center" },
  diffGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 },
  diffBtn: function(active, color, bg) {
    return {
      padding:"11px 8px", borderRadius:8, fontSize:11, textAlign:"center", cursor:"pointer",
      fontWeight: active ? 600 : 400,
      border: active ? "1px solid " + color : "1px solid " + RF.hairline,
      background: active ? "rgba(255,255,255,0.04)" : "transparent",
      color: active ? color : RF.fgMuted,
      transition:"border-color 0.15s",
    };
  },
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

// ── TTS ──────────────────────────────────────────────────────────────────────
// Uses a hidden <audio> element fed by the Web Speech API's synthesis.
// Approach: chunk text if needed, always pick best available English voice,
// use a module-level currentUtterance ref so cancel works reliably.

var _ttsVoice = null;
var _ttsSpeaking = false;

function _loadVoice() {
  var voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  // Prefer Google US English, then any Google en, then any en-US, then first
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].name === "Google US English") { _ttsVoice = voices[i]; return; }
  }
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].name.indexOf("Google") !== -1 && voices[i].lang.indexOf("en") === 0) { _ttsVoice = voices[i]; return; }
  }
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].lang === "en-US") { _ttsVoice = voices[i]; return; }
  }
  _ttsVoice = voices[0];
}

if (typeof window !== "undefined") {
  window.speechSynthesis.onvoiceschanged = _loadVoice;
  _loadVoice();
}

function doSpeakText(text, onDone) {
  var synth = window.speechSynthesis;
  var clean = cleanForSpeech(text);

  // Always cancel + small pause before speaking — the only reliable way
  // to reset Chrome's synthesis engine between calls
  synth.cancel();

  var doSpeak = function() {
    // Re-check voice in case it loaded after page init
    if (!_ttsVoice) _loadVoice();

    var utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 1.1;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    if (_ttsVoice) utter.voice = _ttsVoice;

    _ttsSpeaking = true;

    // Keepalive: Chrome pauses long utterances after ~15s
    var keepalive = setInterval(function() {
      if (synth.speaking) { synth.resume(); }
      else { clearInterval(keepalive); }
    }, 10000);

    utter.onend = function() {
      clearInterval(keepalive);
      _ttsSpeaking = false;
      if (onDone) onDone();
    };
    utter.onerror = function() {
      clearInterval(keepalive);
      _ttsSpeaking = false;
      if (onDone) onDone();
    };

    synth.speak(utter);
  };

  // 150ms gives cancel() time to fully flush the queue before next speak
  setTimeout(doSpeak, 150);
}

function doStopSpeaking() {
  window.speechSynthesis.cancel();
  _ttsSpeaking = false;
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
  const flowEndRef = useRef(null);

  useEffect(function() {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, caseMsgs]);

  // ── FlowState state ─────────────────────────────────────────────────────────
  const FLOW_SPEECHES = ["PM","MG","MO","LO","PMR","LOR"];
  const [flowRounds, setFlowRounds] = useState(function() {
    try { return JSON.parse(localStorage.getItem("flowRounds") || "[]"); } catch(e) { return []; }
  });
  const [activeFlowId, setActiveFlowId] = useState(null);
  const [flowView, setFlowView] = useState("list");
  const [flowAnalysis, setFlowAnalysis] = useState(null);
  const [flowAnalysisLoading, setFlowAnalysisLoading] = useState(false);
  const [flowActiveCol, setFlowActiveCol] = useState(0);
  const [flowNewArgText, setFlowNewArgText] = useState("");
  const [flowSetupRes, setFlowSetupRes] = useState("");
  const [flowSetupTournament, setFlowSetupTournament] = useState("");
  const [flowSetupRound, setFlowSetupRound] = useState("");

  const saveFlowRounds = function(rounds) {
    setFlowRounds(rounds);
    try { localStorage.setItem("flowRounds", JSON.stringify(rounds)); } catch(e) {}
  };

  const getActiveFlow = function() {
    return flowRounds.find(function(r) { return r.id === activeFlowId; }) || null;
  };

  const createNewFlow = function() {
    if (!flowSetupRes.trim()) return;
    const newRound = {
      id: Date.now(),
      resolution: flowSetupRes.trim(),
      tournament: flowSetupTournament.trim(),
      roundNum: flowSetupRound.trim(),
      date: new Date().toLocaleDateString(),
      columns: ["PM","MG","MO","LO","PMR","LOR"].map(function(sp) { return { speech: sp, args: [] }; }),
      analysis: null,
    };
    const updated = [newRound].concat(flowRounds);
    saveFlowRounds(updated);
    setActiveFlowId(newRound.id);
    setFlowView("flow");
    setFlowActiveCol(0);
    setFlowSetupRes(""); setFlowSetupTournament(""); setFlowSetupRound("");
  };

  const addFlowArg = function(colIdx, text) {
    if (!text.trim()) return;
    const updated = flowRounds.map(function(r) {
      if (r.id !== activeFlowId) return r;
      const cols = r.columns.map(function(col, i) {
        if (i !== colIdx) return col;
        return Object.assign({}, col, { args: col.args.concat([{ id: Date.now(), text: text.trim(), dropped: false, tag: "" }]) });
      });
      return Object.assign({}, r, { columns: cols });
    });
    saveFlowRounds(updated);
    setFlowNewArgText("");
  };

  const toggleFlowDrop = function(colIdx, argIdx) {
    const updated = flowRounds.map(function(r) {
      if (r.id !== activeFlowId) return r;
      const cols = r.columns.map(function(col, i) {
        if (i !== colIdx) return col;
        const args = col.args.map(function(arg, j) {
          if (j !== argIdx) return arg;
          return Object.assign({}, arg, { dropped: !arg.dropped });
        });
        return Object.assign({}, col, { args: args });
      });
      return Object.assign({}, r, { columns: cols });
    });
    saveFlowRounds(updated);
  };

  const deleteFlowArg = function(colIdx, argIdx) {
    const updated = flowRounds.map(function(r) {
      if (r.id !== activeFlowId) return r;
      const cols = r.columns.map(function(col, i) {
        if (i !== colIdx) return col;
        return Object.assign({}, col, { args: col.args.filter(function(_, j) { return j !== argIdx; }) });
      });
      return Object.assign({}, r, { columns: cols });
    });
    saveFlowRounds(updated);
  };

  const deleteFlow = function(id) {
    const updated = flowRounds.filter(function(r) { return r.id !== id; });
    saveFlowRounds(updated);
    if (activeFlowId === id) { setActiveFlowId(null); setFlowView("list"); }
  };

  const runFlowAnalysis = async function() {
    const flow = getActiveFlow();
    if (!flow) return;
    setFlowAnalysisLoading(true);
    setFlowView("analysis");
    setFlowAnalysis(null);
    const flowText = flow.columns.map(function(col) {
      const args = col.args.map(function(a, i) {
        return (i+1) + ". " + a.text + (a.dropped ? " [DROPPED]" : "");
      }).join("\n");
      return col.speech + ":\n" + (args || "(no arguments logged)");
    }).join("\n\n");
    const allRoundsText = flowRounds.filter(function(r) { return r.id !== activeFlowId && r.analysis; }).slice(0,5).map(function(r) {
      return "PAST ROUND (" + r.date + ", " + r.resolution + "):\n" + r.analysis;
    }).join("\n\n---\n\n");
    const prompt = "You are an expert parliamentary debate judge analyzing a full round flow.\n\nRESOLUTION: " + flow.resolution + "\nTOURNAMENT: " + (flow.tournament||"Unknown") + " Round " + (flow.roundNum||"?") + "\n\nFLOW:\n" + flowText + (allRoundsText ? "\n\n---\nPAST ROUND DATA FOR PATTERN ANALYSIS:\n" + allRoundsText : "") + "\n\nProvide a comprehensive judge analysis with these labeled sections:\n\n1. ROUND SUMMARY: 2-3 sentences on how the round played out.\n\n2. DROPPED ARGUMENTS: List every argument that was dropped and which side benefits. Name the speech it was dropped in.\n\n3. KEY CLASH POINTS: The 2-3 central arguments where both sides engaged. Who won each and why.\n\n4. VOTERS: The 3 arguments you would vote on as judge. Rank them and explain why.\n\n5. DECISION: Who won and the single clearest reason. Be direct.\n\n6. PATTERN ANALYSIS (if past round data available): Identify recurring weaknesses or strengths across rounds. Be specific.";
    try {
      const result = await callAPI(prompt, "You are an expert parliamentary debate judge. Be direct, specific, and analytical. Use clear numbered section headers.");
      setFlowAnalysis(result);
      const updated2 = flowRounds.map(function(r) {
        if (r.id !== activeFlowId) return r;
        return Object.assign({}, r, { analysis: result });
      });
      saveFlowRounds(updated2);
    } catch(e) {
      setFlowAnalysis("Error: " + e.message);
    }
    setFlowAnalysisLoading(false);
  };

  const voiceRef = useRef(null);

  useEffect(function() {
    function loadVoice() {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      for (let i = 0; i < voices.length; i++) {
        if (voices[i].name === "Google US English") { voiceRef.current = voices[i]; return; }
      }
      for (let i = 0; i < voices.length; i++) {
        if (voices[i].name.indexOf("Google") !== -1 && voices[i].lang.indexOf("en") === 0) { voiceRef.current = voices[i]; return; }
      }
      for (let i = 0; i < voices.length; i++) {
        if (voices[i].name === "Alex" || voices[i].name === "Samantha") { voiceRef.current = voices[i]; return; }
      }
      for (let i = 0; i < voices.length; i++) {
        if (voices[i].lang === "en-US") { voiceRef.current = voices[i]; return; }
      }
      if (voices.length > 0) voiceRef.current = voices[0];
    }
    window.speechSynthesis.onvoiceschanged = loadVoice;
    loadVoice();
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
      } else {
        const flow = await callAPI(prompt, getFlowPrompt(difficulty));
        const vp = "Here is a debate flow sheet. Expand every point into natural spoken sentences in the same order. Write only plain spoken English words, no symbols no labels no asterisks no dashes no bullets: " + flow;
        const verbatim = await callAPI(vp, getVerbatimPrompt(difficulty));
        setMessages(function(prev) { return prev.concat([{ role: "assistant", content: flow, verbatim: verbatim, type: type }]); });
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
    const uSide = setupSide === "gov" ? "Affirmative" : "Negative";
    const bSide = setupSide === "gov" ? "Negative" : "Affirmative";
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
    if (userSide === "Affirmative") {
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
        await botSpeak(ROUND_PROMPTS.bot_whip(resolution, "Negative", userText));
        setStage(6);
      } else if (stage === 6) {
        setStage(7);
        await botSpeak(ROUND_PROMPTS.judge_critique(resolution, "Affirmative", "Negative", userText, difficulty), "judge", true);
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
        await botSpeak(ROUND_PROMPTS.bot_whip(resolution, "Affirmative", userText));
        setStage(7);
        await botSpeak(ROUND_PROMPTS.judge_critique(resolution, "Negative", "Affirmative", userText, difficulty), "judge", true);
        setRoundOver(true);
      }
    }
  };

  const getInputLabel = function() {
    if (roundOver || loading) return null;
    if (userSide === "Affirmative") {
      if (stage === 0) return "YOUR SPEECH: Aff 1 — Affirmative Constructive";
      if (stage === 2) return "YOUR SPEECH: Aff 2 — Rebuttal + Rebuild";
      if (stage === 4) return "YOUR SPEECH: Aff 2 — Rebuttal + Rebuild";
      if (stage === 6) return "YOUR SPEECH: Aff 3 — Affirmative Whip";
    } else {
      if (stage === 2) return "YOUR SPEECH: Neg 1 — Neg Constructive + Rebuttal";
      if (stage === 4) return "YOUR SPEECH: Neg 2 — Rebuttal + Rebuild";
      if (stage === 6) return "YOUR SPEECH: Neg 3 — Neg Whip";
    }
    return null;
  };

  const isUserTurn = function() {
    if (roundOver || loading || speaking) return false;
    if (userSide === "Affirmative") return stage === 0 || stage === 2 || stage === 4 || stage === 6;
    return stage === 2 || stage === 4 || stage === 6;
  };

  const getProgressSteps = function() {
    if (userSide === "Affirmative") {
      return [
        { label: "Aff 1", active: stage === 0, done: stage > 0 },
        { label: "Neg 1", active: stage === 1, done: stage > 1 },
        { label: "Aff 2", active: stage === 2, done: stage > 2 },
        { label: "Neg 2", active: stage === 3, done: stage > 3 },
        { label: "Neg 3", active: stage === 5, done: stage > 5 },
        { label: "Aff 3", active: stage === 6, done: stage > 6 },
        { label: "Judge", active: stage === 7, done: roundOver },
      ];
    }
    return [
      { label: "Aff 1", active: stage === 1, done: stage > 1 },
      { label: "Neg 1", active: stage === 2, done: stage > 2 },
      { label: "Aff 2", active: stage === 3, done: stage > 3 },
      { label: "Neg 2", active: stage === 4, done: stage > 4 },
      { label: "Neg 3", active: stage === 6, done: stage > 6 },
      { label: "Aff 3", active: stage === 7, done: roundOver },
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
      const context = "RESOLUTION: " + caseRes + "\nSIDE: " + (caseSide === "gov" ? "Affirmative" : "Negative") + "\nSPEECH TYPE: " + caseSpeechType + "\n\n";
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
    const side = caseSide === "gov" ? "Affirmative" : "Negative";
    const prompts = {
      case: "Generate a full " + side + " constructive case. Complete 8-minute case with definitions, intro, and all contentions fully fleshed out. Include a creative third contention if possible.",
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
      if (/^- /.test(line)) return <div key={i} style={{ paddingLeft:16, marginBottom:2, color:RF.fgMuted }}>{"• "}{line.slice(2)}</div>;
      if (/^(CLAIM|WARRANT|IMPACT|Claim:|Warrant:|Impact:)/i.test(line)) return <div key={i} style={{ fontWeight:700, color:"rgba(74,222,128,0.8)", marginTop:8, marginBottom:2, fontSize:12, fontFamily:"monospace" }}>{line}</div>;
      if (line.trim() === "") return <div key={i} style={{ height:8 }} />;
      return <div key={i} style={{ marginBottom:2, lineHeight:1.7 }}>{line}</div>;
    });
  };

  const canStart = setupSide && setupResText.trim();
  const userTurn = isUserTurn();
  const label = getInputLabel();
  const diff = DIFFICULTY[difficulty];

  // ── FlowState UI ──────────────────────────────────────────────────────────────
  if (appMode === "flow") {
    const activeFlow = getActiveFlow();
    const GC = "rgba(74,222,128,0.8)";
    const GCDim = "rgba(74,222,128,0.25)";
    const GCHair = "rgba(74,222,128,0.12)";
    const GOV_SPEECHES = ["PM","MG","PMR"];
    const OPP_SPEECHES = ["MO","LO","LOR"];
    const colColor = function(sp) {
      return GOV_SPEECHES.indexOf(sp) !== -1 ? "rgba(96,165,250,0.8)" : "rgba(251,113,133,0.8)";
    };
    const colBg = function(sp) {
      return GOV_SPEECHES.indexOf(sp) !== -1 ? "rgba(96,165,250,0.06)" : "rgba(251,113,133,0.06)";
    };
    const colBorder = function(sp) {
      return GOV_SPEECHES.indexOf(sp) !== -1 ? "rgba(96,165,250,0.15)" : "rgba(251,113,133,0.15)";
    };

    const homeBtn = { background:"transparent", border:"1px solid "+RF.hairlineHov, borderRadius:6, padding:"4px 10px", fontSize:9, color:RF.fgDim, cursor:"pointer", fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase" };

    return (
      <div style={s.app}>
        <style>{GLOBAL_CSS}</style>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>{"⚖"}</div>
            <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
          </div>
          <div style={s.headerBadges}>
            <span style={{ padding:"2px 9px", borderRadius:4, fontSize:9, fontWeight:500, fontFamily:RF.mono, letterSpacing:"0.1em", textTransform:"uppercase", background:GCHair, color:GC, border:"1px solid "+GCDim }}>{"🗂 FLOWSTATE"}</span>
            {activeFlow && flowView === "flow" && <span style={{ padding:"2px 9px", borderRadius:4, fontSize:9, fontFamily:RF.mono, letterSpacing:"0.1em", textTransform:"uppercase", color:RF.fgMuted, border:"1px solid "+RF.hairline }}>{"COL " + (flowActiveCol+1) + "/6 · " + ["PM","MG","MO","LO","PMR","LOR"][flowActiveCol]}</span>}
            {activeFlow && <button style={{ padding:"4px 10px", borderRadius:6, fontSize:9, fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase", background:GCHair, color:GC, border:"1px solid "+GCDim, cursor:"pointer" }} onClick={runFlowAnalysis}>{"⚡ AI Analysis"}</button>}
            {activeFlow && <button style={homeBtn} onClick={function() { setFlowView("list"); setActiveFlowId(null); }}>{"← Rounds"}</button>}
            <button style={homeBtn} onClick={function() { resetToLanding(); }}>{"← Home"}</button>
          </div>
        </header>

        {/* LIST VIEW — round library */}
        {flowView === "list" && (
          <div style={{ flex:1, overflowY:"auto", padding:"32px 40px" }}>
            <div style={{ maxWidth:900, margin:"0 auto" }}>
              {/* New round form */}
              <div style={{ marginBottom:40 }}>
                <p style={{ fontSize:9, fontFamily:RF.mono, letterSpacing:"0.14em", textTransform:"uppercase", color:RF.fgDim, marginBottom:16 }}>New Round</p>
                <div style={{ background:RF.bgSurf, border:"1px solid "+RF.hairline, borderRadius:12, padding:24 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10, marginBottom:12 }}>
                    <input style={{ background:RF.bgInput, border:"1px solid "+RF.hairline, borderRadius:7, padding:"9px 12px", fontSize:12, color:RF.fg, fontFamily:RF.font }} placeholder="Resolution (e.g. This house would ban social media for minors)" value={flowSetupRes} onChange={function(e){setFlowSetupRes(e.target.value);}}
                      onKeyDown={function(e){if(e.key==="Enter")createNewFlow();}} />
                    <input style={{ background:RF.bgInput, border:"1px solid "+RF.hairline, borderRadius:7, padding:"9px 12px", fontSize:12, color:RF.fg, fontFamily:RF.font }} placeholder="Tournament (optional)" value={flowSetupTournament} onChange={function(e){setFlowSetupTournament(e.target.value);}} />
                    <input style={{ background:RF.bgInput, border:"1px solid "+RF.hairline, borderRadius:7, padding:"9px 12px", fontSize:12, color:RF.fg, fontFamily:RF.font }} placeholder="Round # (optional)" value={flowSetupRound} onChange={function(e){setFlowSetupRound(e.target.value);}} />
                  </div>
                  <button style={{ background:RF.fg, color:RF.bg, border:"none", borderRadius:7, padding:"9px 20px", fontSize:12, fontWeight:600, cursor:"pointer", opacity: flowSetupRes.trim() ? 1 : 0.4 }} onClick={createNewFlow} disabled={!flowSetupRes.trim()}>{"+ Start Flow"}</button>
                </div>
              </div>

              {/* Round library */}
              {flowRounds.length > 0 && (
                <div>
                  <p style={{ fontSize:9, fontFamily:RF.mono, letterSpacing:"0.14em", textTransform:"uppercase", color:RF.fgDim, marginBottom:16 }}>Round Library · {flowRounds.length} round{flowRounds.length!==1?"s":""}</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {flowRounds.map(function(round) {
                      const totalArgs = round.columns.reduce(function(sum,col){return sum+col.args.length;},0);
                      const drops = round.columns.reduce(function(sum,col){return sum+col.args.filter(function(a){return a.dropped;}).length;},0);
                      return (
                        <div key={round.id} style={{ background:RF.bgSurf, border:"1px solid "+RF.hairline, borderRadius:10, padding:"16px 20px", display:"flex", alignItems:"center", gap:16, cursor:"pointer", transition:"border-color 0.15s" }}
                          onMouseEnter={function(e){e.currentTarget.style.borderColor=RF.hairlineHov;}}
                          onMouseLeave={function(e){e.currentTarget.style.borderColor=RF.hairline;}}>
                          <div style={{ flex:1 }} onClick={function(){setActiveFlowId(round.id);setFlowView("flow");setFlowActiveCol(0);}}>
                            <p style={{ fontSize:13, fontWeight:500, margin:"0 0 4px 0", color:RF.fg, lineHeight:1.4 }}>{round.resolution}</p>
                            <div style={{ display:"flex", gap:12, fontSize:10, color:RF.fgDim, fontFamily:RF.mono }}>
                              <span>{round.date}</span>
                              {round.tournament && <span>{round.tournament}{round.roundNum ? " · Round "+round.roundNum : ""}</span>}
                              <span>{totalArgs} args · {drops} drops</span>
                              {round.analysis && <span style={{ color:GC }}>{"✓ Analyzed"}</span>}
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:6 }}>
                            {round.analysis && (
                              <button style={{ fontSize:9, fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase", padding:"4px 10px", borderRadius:5, border:"1px solid "+GCDim, background:GCHair, color:GC, cursor:"pointer" }}
                                onClick={function(){setActiveFlowId(round.id);setFlowAnalysis(round.analysis);setFlowView("analysis");}}>{"Analysis"}</button>
                            )}
                            <button style={{ fontSize:9, fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase", padding:"4px 10px", borderRadius:5, border:"1px solid "+RF.hairlineHov, background:"transparent", color:RF.fgMuted, cursor:"pointer" }}
                              onClick={function(){setActiveFlowId(round.id);setFlowView("flow");setFlowActiveCol(0);}}>{"Open"}</button>
                            <button style={{ fontSize:9, fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase", padding:"4px 10px", borderRadius:5, border:"1px solid rgba(239,68,68,0.2)", background:"transparent", color:"rgba(252,165,165,0.6)", cursor:"pointer" }}
                              onClick={function(){deleteFlow(round.id);}}>{"Delete"}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {flowRounds.length === 0 && (
                <div style={{ textAlign:"center", paddingTop:60, color:RF.fgDim }}>
                  <div style={{ fontSize:40, marginBottom:16 }}>{"🗂️"}</div>
                  <p style={{ fontSize:16, fontWeight:600, margin:"0 0 8px 0", color:RF.fg }}>No rounds yet</p>
                  <p style={{ fontSize:13, color:RF.fgMuted }}>Start a new flow above to begin tracking your rounds.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FLOW VIEW — the actual flow sheet */}
        {flowView === "flow" && activeFlow && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            {/* Resolution bar */}
            <div style={{ padding:"8px 24px", borderBottom:"1px solid "+RF.hairline, display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:11, color:RF.fgMuted, flex:1, lineHeight:1.4 }}>{activeFlow.resolution}</span>
              {activeFlow.tournament && <span style={{ fontSize:9, fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase", color:RF.fgDim }}>{activeFlow.tournament}{activeFlow.roundNum?" · R"+activeFlow.roundNum:""}</span>}
              <span style={{ fontSize:9, fontFamily:RF.mono, color:RF.fgDim }}>{activeFlow.date}</span>
            </div>

            {/* Speech column tabs */}
            <div style={{ display:"flex", borderBottom:"1px solid "+RF.hairline, flexShrink:0 }}>
              {activeFlow.columns.map(function(col, i) {
                const active = flowActiveCol === i;
                return (
                  <button key={i} style={{ flex:1, padding:"10px 4px", fontSize:11, fontWeight: active ? 600 : 400, fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase", border:"none", borderBottom: active ? "2px solid "+colColor(col.speech) : "2px solid transparent", background: active ? colBg(col.speech) : "transparent", color: active ? colColor(col.speech) : RF.fgDim, cursor:"pointer", transition:"all 0.15s" }}
                    onClick={function(){setFlowActiveCol(i);setFlowNewArgText("");}}>
                    {col.speech}
                    <span style={{ fontSize:8, marginLeft:5, opacity:0.6 }}>{col.args.length}</span>
                  </button>
                );
              })}
            </div>

            {/* Main flow grid — all columns visible, active highlighted */}
            <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
              {activeFlow.columns.map(function(col, colIdx) {
                const isActive = flowActiveCol === colIdx;
                return (
                  <div key={colIdx} style={{ flex:1, display:"flex", flexDirection:"column", borderRight:"1px solid "+RF.hairline, background: isActive ? colBg(col.speech) : "transparent", transition:"background 0.15s", minWidth:0 }}
                    onClick={function(){setFlowActiveCol(colIdx);}}>
                    {/* Args list */}
                    <div style={{ flex:1, overflowY:"auto", padding:"12px 10px" }}>
                      {col.args.length === 0 && (
                        <div style={{ fontSize:9, fontFamily:RF.mono, color:RF.fgDim, letterSpacing:"0.06em", textAlign:"center", paddingTop:20, opacity:0.5 }}>{"empty"}</div>
                      )}
                      {col.args.map(function(arg, argIdx) {
                        return (
                          <div key={arg.id} style={{ marginBottom:6, padding:"6px 8px", borderRadius:6, border:"1px solid "+(arg.dropped ? "rgba(239,68,68,0.25)" : RF.hairline), background: arg.dropped ? "rgba(239,68,68,0.06)" : RF.bgSurf, position:"relative", group:"arg" }}>
                            <p style={{ fontSize:11, lineHeight:1.5, margin:0, color: arg.dropped ? "rgba(252,165,165,0.5)" : RF.fg, textDecoration: arg.dropped ? "line-through" : "none" }}>{arg.text}</p>
                            {arg.dropped && <span style={{ fontSize:8, fontFamily:RF.mono, color:"rgba(252,165,165,0.6)", letterSpacing:"0.08em", textTransform:"uppercase" }}>dropped</span>}
                            <div style={{ display:"flex", gap:4, marginTop:5 }}>
                              <button style={{ fontSize:8, fontFamily:RF.mono, letterSpacing:"0.06em", textTransform:"uppercase", padding:"2px 6px", borderRadius:3, border:"1px solid "+(arg.dropped?"rgba(74,222,128,0.3)":"rgba(239,68,68,0.3)"), background:"transparent", color: arg.dropped ? "rgba(74,222,128,0.7)" : "rgba(252,165,165,0.6)", cursor:"pointer" }}
                                onClick={function(e){e.stopPropagation();toggleFlowDrop(colIdx,argIdx);}}>
                                {arg.dropped ? "restore" : "drop"}
                              </button>
                              <button style={{ fontSize:8, fontFamily:RF.mono, letterSpacing:"0.06em", textTransform:"uppercase", padding:"2px 6px", borderRadius:3, border:"1px solid "+RF.hairline, background:"transparent", color:RF.fgDim, cursor:"pointer" }}
                                onClick={function(e){e.stopPropagation();deleteFlowArg(colIdx,argIdx);}}>{"×"}</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Input for active column */}
                    {isActive && (
                      <div style={{ padding:"10px", borderTop:"1px solid "+RF.hairline, flexShrink:0 }} onClick={function(e){e.stopPropagation();}}>
                        <textarea
                          autoFocus
                          style={{ width:"100%", background:RF.bgInput, border:"1px solid "+colBorder(col.speech), borderRadius:6, padding:"8px 10px", fontSize:11, color:RF.fg, resize:"none", fontFamily:RF.font, lineHeight:1.5, boxSizing:"border-box" }}
                          rows={2} placeholder={"Add arg to "+col.speech+"..."}
                          value={flowNewArgText}
                          onChange={function(e){setFlowNewArgText(e.target.value);}}
                          onKeyDown={function(e){
                            if (e.key==="Enter"&&!e.shiftKey){e.preventDefault();addFlowArg(colIdx,flowNewArgText);}
                            if (e.key==="Tab"){e.preventDefault();setFlowActiveCol(Math.min(5,colIdx+1));setFlowNewArgText("");}
                          }}
                        />
                        <div style={{ fontSize:8, fontFamily:RF.mono, color:RF.fgDim, letterSpacing:"0.06em", marginTop:4, textTransform:"uppercase" }}>{"Enter to add · Tab to next col"}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom action bar */}
            <div style={{ padding:"10px 20px", borderTop:"1px solid "+RF.hairline, display:"flex", alignItems:"center", gap:10, background:RF.bg }}>
              <span style={{ fontSize:10, color:RF.fgDim, fontFamily:RF.mono, flex:1 }}>
                {activeFlow.columns.reduce(function(s,c){return s+c.args.length;},0)} args · {activeFlow.columns.reduce(function(s,c){return s+c.args.filter(function(a){return a.dropped;}).length;},0)} drops
              </span>
              <button style={{ fontSize:10, fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase", padding:"6px 14px", borderRadius:6, border:"1px solid "+GCDim, background:GCHair, color:GC, cursor:"pointer", fontWeight:500 }} onClick={runFlowAnalysis}>{"⚡ AI Judge Analysis"}</button>
              <button style={{ fontSize:10, fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase", padding:"6px 14px", borderRadius:6, border:"1px solid "+RF.hairlineHov, background:"transparent", color:RF.fgMuted, cursor:"pointer" }} onClick={function(){setFlowView("list");setActiveFlowId(null);}}>{"← Library"}</button>
            </div>
          </div>
        )}

        {/* ANALYSIS VIEW */}
        {flowView === "analysis" && (
          <div style={{ flex:1, overflowY:"auto", padding:"32px 40px" }}>
            <div style={{ maxWidth:720, margin:"0 auto" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
                <button style={{ fontSize:9, fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase", padding:"5px 12px", borderRadius:5, border:"1px solid "+RF.hairlineHov, background:"transparent", color:RF.fgMuted, cursor:"pointer" }} onClick={function(){setFlowView("flow");}}>{"← Back to Flow"}</button>
                <span style={{ fontSize:9, fontFamily:RF.mono, letterSpacing:"0.1em", textTransform:"uppercase", color:GC, background:GCHair, border:"1px solid "+GCDim, padding:"3px 10px", borderRadius:4 }}>{"⚡ AI Judge Analysis"}</span>
              </div>
              {activeFlow && <p style={{ fontSize:11, color:RF.fgMuted, marginBottom:20, fontFamily:RF.mono, letterSpacing:"0.04em" }}>{activeFlow.resolution}</p>}
              {flowAnalysisLoading && (
                <div style={{ textAlign:"center", paddingTop:60 }}>
                  <div style={{ fontSize:9, fontFamily:RF.mono, letterSpacing:"0.12em", textTransform:"uppercase", color:RF.fgDim, marginBottom:12 }}>Analyzing round...</div>
                  <span style={s.loadingDot}/><span style={s.loadingDot}/><span style={s.loadingDot}/>
                </div>
              )}
              {flowAnalysis && !flowAnalysisLoading && (
                <div style={{ background:RF.bgSurf, border:"1px solid "+RF.hairline, borderRadius:12, padding:28 }}>
                  {flowAnalysis.split("\n").map(function(line,i) {
                    if (/^\d+\./.test(line.trim())) return <p key={i} style={{ fontSize:11, fontWeight:700, color:GC, fontFamily:RF.mono, letterSpacing:"0.08em", textTransform:"uppercase", margin:"20px 0 8px 0", borderTop:"1px solid "+RF.hairline, paddingTop:16 }}>{line}</p>;
                    if (line.trim()==="") return <div key={i} style={{height:6}}/>;
                    return <p key={i} style={{ fontSize:13, lineHeight:1.7, color:RF.fg, margin:"0 0 4px 0" }}>{line}</p>;
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (appMode === "landing") {
    return (
      <div style={s.app}>
        <style>{GLOBAL_CSS}</style>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>{"⚖"}</div>
            <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
          </div>
        </header>
        <div style={{ overflow:"hidden", borderBottom:"1px solid rgba(240,240,238,0.06)", background:"transparent", height:28, display:"flex", alignItems:"center" }}>
          <div style={{ display:"flex", whiteSpace:"nowrap", animation:"marquee 18s linear infinite", fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(240,240,238,0.2)" }}>
            {"PARLI COACH · HS PARLIAMENTARY DEBATE · AFF vs NEG · VARSITY · NOVICE · JV · TOC · CASE GENERATOR · FULL ROUND PRACTICE · ".repeat(6)}
          </div>
        </div>
        <div style={s.landing}>
          <div style={s.landingCard}>
            <div style={{ fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(240,240,238,0.3)", marginBottom:24 }}>Parliamentary Debate · AI Coach</div>
            <p style={s.landingTitle}>{"Win the round."}</p>
            <p style={s.landingSubtitle}>Build airtight cases or go head-to-head against an AI opponent that hits as hard as your next competitor.</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <button style={s.landingBtnCase} onClick={function() { setAppMode("case"); }}>
                <span style={{ fontSize:22, marginBottom:2 }}>{"📋"}</span>
                <span style={{ fontWeight:700, letterSpacing:"-0.02em" }}>Case Generator</span>
                <span style={s.landingBtnSub}>Full 8-min case, any side</span>
              </button>
              <button style={s.landingBtnPractice} onClick={function() { setAppMode("setup"); }}>
                <span style={{ fontSize:22, marginBottom:2 }}>{"⚔️"}</span>
                <span style={{ fontWeight:600, letterSpacing:"-0.02em" }}>Full Round</span>
                <span style={s.landingBtnSub}>Simulate a real round</span>
              </button>
              <button style={{ background:"transparent", color:RF.fg, border:"1px solid rgba(74,222,128,0.25)", borderRadius:12, padding:"22px 16px", fontSize:13, fontWeight:500, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8, transition:"border-color 0.15s" }} onClick={function() { setAppMode("flow"); }}>
                <span style={{ fontSize:22, marginBottom:2 }}>{"🗂️"}</span>
                <span style={{ fontWeight:600, letterSpacing:"-0.02em", color:"rgba(74,222,128,0.9)" }}>FlowState</span>
                <span style={s.landingBtnSub}>Live flow + AI judge analysis</span>
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
        <style>{GLOBAL_CSS}</style>
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
            <p style={s.setupSubtitle}>Pick your side and resolution. Aff always opens, Neg always responds first.</p>
            <div style={s.setupSection}>
              <span style={s.setupSectionLabel}>Your Side</span>
              <div style={s.sideGrid}>
                <button style={setupSide === "gov" ? s.btnGovActive : s.btnGovInactive} onClick={function() { setSetupSide("gov"); }}>AFF</button>
                <button style={setupSide === "opp" ? s.btnOppActive : s.btnOppInactive} onClick={function() { setSetupSide("opp"); }}>NEG</button>
              </div>
              {setupSide && <div style={{ fontSize:10, color:RF.fgMuted, marginTop:8, fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em" }}>{setupSide === "gov" ? "You open. Bot plays Neg." : "Bot opens as Aff. You respond first."}</div>}
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
        <style>{GLOBAL_CSS}</style>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>{"⚖"}</div>
            <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
          </div>
          <div style={s.headerBadges}>
            <span style={userSide === "Affirmative" ? s.badgeGov : s.badgeOpp}>{userSide === "Affirmative" ? "▲ AFF" : "▼ NEG"}</span>
            {diff && <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background: diff.bg, color: diff.color, border: "1px solid " + diff.border }}>{diff.label}</span>}
            <span style={s.badgePractice}>{"⚔ FULL ROUND"}</span>
            {speaking && <span style={s.badgeSpeaking}>{"🔊 Speaking"}</span>}
            {recording && <span style={s.badgeRecording}>{"🔴 Recording"}</span>}
            <button onClick={resetToLanding} style={{ background:"transparent", border:"1px solid rgba(240,240,238,0.12)", borderRadius:6, padding:"4px 10px", fontSize:9, color:"rgba(240,240,238,0.4)", cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.08em", textTransform:"uppercase" }}>{"← Home"}</button>
          </div>
        </header>
        <div style={s.body}>
          <aside style={s.sidebar}>
            <div>
              <p style={s.sideLabel}>Resolution</p>
              <div style={{ fontSize:12, color:RF.fgMuted, lineHeight:1.5, padding:"8px 10px", background:RF.bgInput, borderRadius:6, border:"1px solid "+RF.hairline }}>{resolution}</div>
            </div>
            <div>
              <p style={s.sideLabel}>Round Progress</p>
              {steps.map(function(step, i) {
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", flexShrink:0, background: step.done ? RF.fg : step.active ? "rgba(251,191,36,0.9)" : RF.hairlineHov, transition:"background 0.2s" }} />
                    <span style={{ fontSize:11, fontWeight: step.active ? 600 : 400, color: step.done ? RF.fg : step.active ? "rgba(251,191,36,0.9)" : RF.fgDim, fontFamily: step.active ? RF.font : RF.font }}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:5, marginTop:"auto" }}>
              {speaking && <button style={s.actionBtn} onClick={function() { doStopSpeaking(); setSpeaking(false); }}>{"⏹ Stop"}</button>}
              {roundOver && <button style={Object.assign({}, s.actionBtn, { background:RF.fg, color:RF.bg, border:"none", fontWeight:600 })} onClick={function() { setAppMode("setup"); }}>{"↺ New Round"}</button>}
              <button style={s.actionBtn} onClick={resetToLanding}>{"← Home"}</button>
            </div>
          </aside>
          <main style={s.chat}>
            <div style={s.messages}>
              {messages.length === 0 && !loading && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8, textAlign:"center" }}>
                  <div style={{ fontSize:36 }}>{"⚔️"}</div>
                  <p style={{ fontSize:16, fontWeight:700, margin:0 }}>Round starting...</p>
                  {userSide === "Affirmative" && <p style={{ fontSize:13, color:"#94a3b8", margin:0 }}>You open. Deliver your Aff 1 below.</p>}
                </div>
              )}
              {messages.map(function(msg, i) {
                return (
                  <div key={i} style={msg.role === "user" ? s.msgWrapUser : s.msgWrapAsst}>
                    <div style={msg.role === "user" ? s.msgUser : msg.type === "judge" ? s.msgAsstJudge : s.msgAsstOpponent}>
                      {msg.role === "assistant" && msg.type === "opponent" && <div style={Object.assign({}, s.msgTag, { color:"#be123c" })}>{botSide === "Negative" ? "⚔ Neg" : "⚔ Aff"}</div>}
                      {msg.role === "assistant" && msg.type === "judge" && <div style={Object.assign({}, s.msgTag, { color:"#15803d" })}>{"🏛 Judge's Decision"}</div>}
                      {msg.role === "user" && <div style={Object.assign({}, s.msgTag, { color:"rgba(255,255,255,0.6)" })}>{userSide === "Affirmative" ? "🎤 Aff" : "🎤 Neg"}</div>}
                      {msg.role === "assistant" ? <div>{formatMessage(msg.content)}</div> : <p style={{ margin:0, lineHeight:1.6 }}>{msg.content}</p>}
                      {msg.role === "assistant" && msg.verbatim && (
                        <button style={{ marginTop:10, padding:"7px 14px", borderRadius:7, border:"1px solid rgba(240,240,238,0.15)", background:"rgba(240,240,238,0.06)", color:RF.fg, fontSize:11, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontFamily:"'DM Mono',monospace", letterSpacing:"0.08em", textTransform:"uppercase" }} onClick={function() {
                          doSpeakText(msg.verbatim);
                        }}>{"▶ Play Speech"}</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div style={s.msgWrapAsst}>
                  <div style={s.msgAsstOpponent}>
                    <div style={Object.assign({}, s.msgTag, { color:"#be123c" })}>{botSide === "Negative" ? "⚔ Neg" : "⚔ Aff"}</div>
                    <span style={{ color:RF.fgDim, fontSize:12, marginRight:8 }}>Preparing speech</span>
                    <span style={s.loadingDot}/><span style={s.loadingDot}/><span style={s.loadingDot}/>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div style={s.inputBar}>
              {label && <div style={s.speechLabel}>{"🎤 " + label}</div>}
              {speaking && <div style={{ fontSize:11, color:"rgba(196,181,253,0.9)", fontWeight:500, marginBottom:6, fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase" }}>{"🔊 Opponent speaking"}</div>}
              {!userTurn && !loading && !speaking && !roundOver && <div style={{ fontSize:11, color:RF.fgDim, marginBottom:6, fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase" }}>Opponent is preparing...</div>}
              {roundOver && <div style={{ fontSize:11, color:"rgba(74,222,128,0.8)", fontWeight:500, marginBottom:6, fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase" }}>{"Round complete"}</div>}
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
      <style>{GLOBAL_CSS}</style>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>{"⚖"}</div>
          <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
        </div>
        <div style={s.headerBadges}>
          {caseResSet && caseSide && <span style={caseSide === "gov" ? s.badgeGov : s.badgeOpp}>{caseSide === "gov" ? "▲ AFF" : "▼ NEG"}</span>}
          <button onClick={resetToLanding} style={{ background:"transparent", border:"1px solid rgba(240,240,238,0.12)", borderRadius:6, padding:"4px 10px", fontSize:9, color:"rgba(240,240,238,0.4)", cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.08em", textTransform:"uppercase" }}>{"← Home"}</button>
        </div>
      </header>
      <div style={s.body}>
        <aside style={s.sidebar}>
          <div style={s.sideSection}>
            <p style={s.sideLabel}>Resolution</p>
            <textarea style={s.textarea} rows={3} placeholder="Enter the resolution..." value={caseRes} onChange={function(e) { setCaseRes(e.target.value); }} disabled={caseResSet} />
            {!caseResSet
              ? <button style={s.btnPrimary} onClick={function() { if (caseRes.trim()) { setCaseResSet(true); setCaseMsgs([]); } }} disabled={!caseRes.trim()}>Set Resolution</button>
              : <button style={s.btnSecondary} onClick={function() { setCaseResSet(false); setCaseSide(null); setCaseMsgs([]); }}>Change</button>
            }
          </div>
          {caseResSet && (
            <div style={s.sideSection}>
              <p style={s.sideLabel}>Side</p>
              <div style={s.sideGrid}>
                <button style={caseSide === "gov" ? s.btnGovActive : s.btnGovInactive} onClick={function() { setCaseSide("gov"); }}>AFF</button>
                <button style={caseSide === "opp" ? s.btnOppActive : s.btnOppInactive} onClick={function() { setCaseSide("opp"); }}>NEG</button>
              </div>
            </div>
          )}
          {caseResSet && caseSide && (
            <div style={s.sideSection}>
              <p style={s.sideLabel}>Speech</p>
                <select style={s.select} value={caseSpeechType} onChange={function(e) { setCaseSpeechType(e.target.value); }}>
                  <option value="constructive">{caseSide === "gov" ? "Aff 1 Constructive" : "Neg 1 Constructive"}</option>
                  <option value="extension">{caseSide === "gov" ? "Aff 2 Extension" : "Neg 2 Extension"}</option>
                  <option value="whip">{caseSide === "gov" ? "Aff 3 Whip" : "Neg 3 Whip"}</option>
                </select>
              </div>
              <div style={{ marginTop:14 }}>
                <p style={s.sideLabel}>Generate</p>
                {[{ key:"case", label:"📋 Full Case" },{ key:"whip", label:"🏁 Whip Speech" },{ key:"plan", label:"📄 Write a Plan" },{ key:"counterplan", label:"↩️ Counterplan" }].map(function(item) {
                  return <button key={item.key} style={s.actionBtn} onClick={function() { handleCaseQuickAction(item.key); }} disabled={caseLoading}>{item.label}</button>;
                })}
              </div>
            </div>
          )}
          {caseMsgs.length > 0 && (
            <div style={s.sideSection}>
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
                <p style={{ fontSize:20, fontWeight:700, margin:0, letterSpacing:"-0.03em" }}>Ready to debate.</p>
                <p style={{ fontSize:13, color:RF.fgMuted, maxWidth:280, lineHeight:1.6, margin:0 }}>Set a resolution, pick your side, then generate a case.</p>
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
                  <span style={{ color:RF.fgDim, fontSize:12, marginRight:8 }}>Generating</span>
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
