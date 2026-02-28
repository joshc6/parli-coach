import { useState, useRef, useEffect, useCallback } from "react";

// ── DIFFICULTY CONFIGS ───────────────────────────────────────────────────────

const DIFFICULTY = {
  novice: {
    label: "Novice",
    color: "#16a34a",
    bg: "#dcfce7",
    border: "#bbf7d0",
    description: "Simple args, forgiving",
    botInstructions: `DIFFICULTY: NOVICE
- Make simple, straightforward arguments. One clear warrant per contention.
- Do NOT call out drops aggressively. Ignore minor gaps.
- Use basic impacts. Do not stack layers.
- Rebuttals should be short and simple, one response per contention.
- Do not run multi-layered arguments.
- Be a beginner-level opponent.`,
  },
  jv: {
    label: "JV",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fde68a",
    description: "Moderate pressure",
    botInstructions: `DIFFICULTY: JV
- Make decent arguments with clear warrants and moderate impacts.
- Occasionally call out drops, but don't harp on them.
- Run 2 contentions max. Don't over-layer.
- Rebuttals cover the main args but may miss secondary points.
- Be a solid but beatable opponent.`,
  },
  varsity: {
    label: "Varsity",
    color: "#7c3aed",
    bg: "#ede9fe",
    border: "#ddd6fe",
    description: "Strong & technical",
    botInstructions: `DIFFICULTY: VARSITY
- Make strong, well-developed arguments with layered warrants and real impacts.
- Aggressively call out drops. Name them explicitly.
- Run 2-3 contentions with sub-arguments.
- Rebuttals go contention by contention and include extensions.
- Whip speech weighs multiple voters and compares worlds.
- Be a genuinely tough opponent.`,
  },
  toc: {
    label: "TOC",
    color: "#dc2626",
    bg: "#fee2e2",
    border: "#fecaca",
    description: "Elite level, brutal",
    botInstructions: `DIFFICULTY: TOC (Tournament of Champions)
- Run the most technically sophisticated arguments possible.
- Call out EVERY drop, even small ones. Name dropped arguments explicitly by label.
- Multi-layer every contention: Claim, Warrant, Internal Link, Impact, Magnitude/Timeframe/Probability.
- Rebuttals are exhaustive — respond to every sub-argument, not just main contentions.
- Run counter-definitions if useful. Challenge framing aggressively.
- Whip speech does full comparative weighing on every voter: magnitude, timeframe, probability.
- Extensions are airtight and pre-empt the user's likely responses.
- Be an elite, nearly unbeatable opponent.`,
  },
};

const getFlowSystemPrompt = (difficulty = "varsity") => {
  const d = DIFFICULTY[difficulty];
  return "You are a parliamentary debate opponent. " + d.botInstructions + "\n\n" +
    "Output ONLY a debate flow sheet. Short bullet points, 5-12 words max. " +
    "Contentions: C1:, C2:, C3: with Claim:, Warrant:, Impact: under each. " +
    "Rebuttals: -> [their arg]: [your response]. No full sentences. No prose. No explanations.";
};

const getVerbatimSystemPrompt = (difficulty = "varsity") => {
  const d = DIFFICULTY[difficulty];
  return "You are converting a debate flow into a spoken speech. " + d.botInstructions + "\n\n" +
    "THE SINGLE MOST IMPORTANT RULE: Your output will be fed directly into text-to-speech. " +
    "If you write any of these characters they will be spoken aloud literally and it will sound terrible: " +
    "* (asterisk), - (dash), — (em dash), • (bullet), # (hash), _ (underscore), -> (arrow), C1 C2 C3, Claim: Warrant: Impact: " +
    "DO NOT USE ANY OF THOSE CHARACTERS OR LABELS. NOT EVEN ONCE. " +
    "Output ONLY plain English sentences with no formatting whatsoever. No lists. No structure. No symbols. " +
    "Just write exactly what a debater would say out loud. " +
    "Expand every argument from the flow into full natural sentences in the same order. " +
    "Speak like a confident high school debater: fast, direct, persuasive. " +
    "Use natural spoken transitions: 'My first contention is', 'Now look at their case', 'They dropped', 'The reason this matters', 'At the end of the day'. " +
    "No bullet points. No dashes. No asterisks. No labels. Plain spoken English only.";
};

const parseResponse = (text) => {
  const verbatimMatch = text.match(/\[VERBATIM\]([\s\S]*?)\[\/VERBATIM\]/);
  const flowMatch = text.match(/\[FLOW\]([\s\S]*?)\[\/FLOW\]/);
  return {
    verbatim: verbatimMatch ? verbatimMatch[1].trim() : text,
    flow: flowMatch ? flowMatch[1].trim() : text,
  };
};

const cleanForSpeech = (text) => {
  const badWords = ["Claim:", "claim:", "Warrant:", "warrant:", "Impact:", "impact:", "Sub:", "sub:", "C1:", "C2:", "C3:", "C4:"];
  let t = text;
  badWords.forEach(w => { t = t.split(w).join(""); });
  const badChars = ["*", "-", "—", "–", "•", "→", "#", "_", "`", "[", "]"];
  t = t.split("").map(c => badChars.includes(c) ? " " : c).join("");
  t = t.split("
").join(" ");
  while (t.includes("  ")) { t = t.split("  ").join(" "); }
  return t.trim();
};

const speakText = (text, onDone) => {
  window.speechSynthesis.cancel();
  const cleanText = cleanForSpeech(text);
  const doSpeak = () => {
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.rate = 1.2;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => v.name === "Google US English") ||
      voices.find(v => v.name === "Google UK English Male") ||
      voices.find(v => v.name.startsWith("Google") && v.lang.startsWith("en")) ||
      voices.find(v => v.name === "Alex") ||
      voices.find(v => v.name === "Samantha") ||
      voices.find(v => v.lang === "en-US") ||
      voices[0];
    if (preferred) utter.voice = preferred;
    utter.onend = () => { if (onDone) onDone(); };
    utter.onerror = () => { if (onDone) onDone(); };
    window.speechSynthesis.speak(utter);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = doSpeak;
  } else {
    doSpeak();
  }
};

const stopSpeaking = () => window.speechSynthesis.cancel();

const JUDGE_SYSTEM = `You are an impartial parliamentary debate judge. Your only job is to evaluate who won based on the arguments made.

CRITICAL JUDGING RULES:
- You are NOT rooting for the human user. You are NOT rooting for the AI opponent.
- Judge purely on: argument quality, dropped arguments, weighing, and clash.
- If the user lost, say so clearly and explain why. Do not soften it.
- If the AI opponent lost, say so clearly.
- A dropped argument is a conceded argument. Treat it that way.
- Whoever did better comparative weighing in the whip wins close calls.
- Be specific. Name the exact arguments that were decisive.
- Write in full prose. Be direct, honest, and impartial.`;

// Round flow:
// GOV user: user opens -> bot (OPP) rebuts+constructs -> user rebuts -> bot whip -> user whip -> judge
// OPP user: bot (GOV) opens -> user rebuts+constructs -> bot rebuts+extends -> user rebuts -> bot whip -> user whip -> judge

const ROUND_PROMPTS = {
  gov_opens: (res) => `Resolution: "${res}"
You are Government. Output your opening constructive case in FLOW FORMAT.
Label it: "— GOVERNMENT CONSTRUCTIVE —"
Include: brief definitions, C1, C2, and C3 if strong. Each contention: Claim, Warrant, Impact. Keep bullets short.
End with one line: "Your turn — OPP constructive + rebut my case."`,

  opp_rebuts_and_constructs: (res, userSpeech) => `Resolution: "${res}"
You are Opposition. The Government just said:
"${userSpeech}"

Output in FLOW FORMAT:
1. Label "— OPPOSITION REBUTTAL —" — go through each of their contentions with responses
2. Label "— OPPOSITION CONSTRUCTIVE —" — C1, C2, (C3 if strong). Each: Claim, Warrant, Impact.
Keep all bullets short. No prose.
End with one line: "Your turn — rebut my case and defend yours."`,

  gov_rebuts_and_extends: (res, userSpeech) => `Resolution: "${res}"
You are Government. The Opposition just said:
"${userSpeech}"

Output in FLOW FORMAT:
1. Label "— GOVERNMENT REBUTTAL —" — responses to each OPP contention, call out drops
2. Label "— GOVERNMENT EXTENSION —" — re-extend your own contentions, show they still stand
Keep all bullets short. No prose.
End with one line: "Your turn — defend your case, attack my extensions. Then whip speeches."`,

  opp_rebuts_gov_extended: (res, userSpeech) => `Resolution: "${res}"
You are Opposition. Government just extended:
"${userSpeech}"

Output in FLOW FORMAT:
Label "— OPPOSITION REBUTTAL —" — responses to their extensions, reinforce your own contentions
Keep all bullets short. No prose.
End with one line: "Your turn — rebut and defend. Then whip speeches."`,

  bot_whip: (res, botSide, userSpeech) => `Resolution: "${res}"
You are ${botSide}. User just said:
"${userSpeech}"

Output in FLOW FORMAT:
Label "— ${botSide.toUpperCase()} WHIP —"
- List 2-3 voters as bullets
- Under each voter: why YOU win it (1-2 bullets)
- Final bullet: your world vs their world — why judge votes ${botSide}
NO new arguments. Keep bullets short.
End with one line: "Your turn — final whip speech."`,

  judge_critique: (res, userSide, botSide, userWhip, difficulty) => {
    const diffLabel = DIFFICULTY[difficulty]?.label || "Varsity";
    return `Resolution: "${res}"
Difficulty: ${diffLabel}. Human debated as ${userSide}. AI opponent debated as ${botSide}.
Human's final whip: "${userWhip}"

You are an impartial judge. Evaluate this round fairly — do not favor either side.
Label: "— JUDGE'S DECISION —"

1. DECISION: Who won — ${userSide} or ${botSide} — and the core reason in 1-2 sentences.
2. DECISIVE ARGUMENTS: The 2-3 arguments that decided the round. Be specific.
3. WHAT THE HUMAN DID WELL: Genuine praise only. Do not inflate.
4. WHAT THE HUMAN DROPPED OR LOST: Be direct. Name specific arguments.
5. WHAT TO IMPROVE: Specific, actionable coaching.`;
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
  micBtn: (recording) => ({
    width:52, height:52, borderRadius:"50%", border:"none", cursor:"pointer", fontSize:20, flexShrink:0,
    background: recording ? "#dc2626" : "#6366f1",
    boxShadow: recording ? "0 0 0 6px rgba(220,38,38,0.2)" : "0 0 0 3px rgba(99,102,241,0.2)",
    transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff",
  }),
  transcriptBox: { flex:1, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#1e293b", minHeight:52, lineHeight:1.6, fontFamily:"Georgia, serif" },
  replayBtn: { fontSize:11, padding:"5px 10px", borderRadius:6, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer", marginTop:8 },
  diffBtn: (active, color, bg, border) => ({
    padding:"10px 8px", borderRadius:10, fontSize:12, fontWeight: active ? 700 : 600,
    border: active ? `2px solid ${color}` : "2px solid #e2e8f0",
    background: active ? bg : "#fff",
    color: active ? color : "#64748b",
    cursor:"pointer", textAlign:"center",
  }),
};

const callGemini = async (prompt, systemOverride = null) => {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: systemOverride || getFlowSystemPrompt("varsity"),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "API error");
  }
  const data = await res.json();
  if (!data.text) throw new Error("No text in response");
  return data.text;
};

export default function App() {
  const [appMode, setAppMode] = useState("landing");

  // Setup
  const [setupSide, setSetupSide] = useState(null);
  const [setupResMode, setSetupResMode] = useState(null);
  const [setupResText, setSetupResText] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  const [setupDifficulty, setSetupDifficulty] = useState("varsity");

  // Round
  const [difficulty, setDifficulty] = useState("varsity");
  const [resolution, setResolution] = useState("");
  const [userSide, setUserSide] = useState(null); // "Government" | "Opposition"
  const [botSide, setBotSide] = useState(null);
  const [stage, setStage] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [roundOver, setRoundOver] = useState(false);

  // Voice / mic state
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef(null);

  // Case gen
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
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, caseMsgs]);

  const addBotMessage = (content, type = "opponent") => {
    setMessages(prev => [...prev, { role:"assistant", content, type }]);
  };

  const botSpeak = async (prompt, type = "opponent", useJudge = false) => {
    setLoading(true);
    try {
      if (useJudge) {
        const text = await callGemini(prompt, JUDGE_SYSTEM);
        setMessages(prev => [...prev, { role:"assistant", content:text, flow:text, verbatim:text, type }]);
        setSpeaking(true);
        speakText(text, () => setSpeaking(false));
      } else {
        // Step 1: Generate flow first
        const flow = await callGemini(prompt, getFlowSystemPrompt(difficulty));
        // Step 2: Pass the flow to verbatim so it speaks the SAME arguments
        const verbatimPrompt = "Here is the debate flow to expand into a spoken speech:\n\n" + flow + "\n\nNow deliver this as a full natural spoken speech. Same arguments, same order, no bullet points, no symbols, just natural spoken prose as a real debater would say it.";
        const verbatim = await callGemini(verbatimPrompt, getVerbatimSystemPrompt(difficulty));
        setMessages(prev => [...prev, { role:"assistant", content:flow, flow, verbatim, type }]);
        setSpeaking(true);
        speakText(verbatim, () => setSpeaking(false));
      }
    } catch (e) {
      setMessages(prev => [...prev, { role:"assistant", content:`Error: ${e.message} — please try again.`, flow:`Error: ${e.message}`, verbatim:"", type }]);
    }
    setLoading(false);
  };

  const generateResolution = async () => {
    setSetupLoading(true);
    setSetupResMode("generating");
    const topics = ["technology","education","environment","healthcare","criminal justice","foreign policy","economics","social media","artificial intelligence","democracy","free speech","housing","immigration","energy","sports"];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const seed = Math.floor(Math.random() * 99999);
    try {
      const text = await callGemini(`Generate one unique, specific high school parliamentary debate resolution about ${topic}. Seed: ${seed}. Format examples: 'This house would ban social media for minors.' or 'This house believes that democracies should impose term limits on all elected officials.' Return ONLY the resolution text. No quotes, no explanation, nothing else.`, "You generate debate resolutions. Return only the resolution text, nothing else.");
      setSetupResText(text.trim().replace(/^["']|["']$/g, "").replace(/\.$/, ""));
      setSetupResMode("done");
    } catch {
      const fallbacks = [
        "This house would ban social media for minors",
        "This house believes that universal basic income should be implemented",
        "This house would make voting mandatory",
        "This house believes that AI development should be internationally regulated",
        "This house would abolish the death penalty",
      ];
      setSetupResText(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
      setSetupResMode("done");
    }
    setSetupLoading(false);
  };

  const startRound = async () => {
    const res = setupResText.trim();
    const uSide = setupSide === "gov" ? "Government" : "Opposition";
    const bSide = setupSide === "gov" ? "Opposition" : "Government";

    // Set all state first, then switch mode
    setDifficulty(setupDifficulty);
    setResolution(res);
    setUserSide(uSide);
    setBotSide(bSide);
    setMessages([]);
    setRoundOver(false);
    setInput("");

    if (setupSide === "opp") {
      setStage(1);
      setLoading(true);
      setAppMode("practice");
      try {
        const fl = await callGemini(ROUND_PROMPTS.gov_opens(res), getFlowSystemPrompt(setupDifficulty));
        const vbPrompt = "Here is the debate flow to expand into a spoken speech:\n\n" + fl + "\n\nNow deliver this as a full natural spoken speech. Same arguments, same order, no bullet points, no symbols, just natural spoken prose as a real debater would say it.";
        const vb = await callGemini(vbPrompt, getVerbatimSystemPrompt(setupDifficulty));
        setMessages([{ role:"assistant", content:fl, flow:fl, verbatim:vb, type:"opponent" }]);
        setSpeaking(true);
        speakText(vb, () => setSpeaking(false));
        setStage(2);
      } catch (e) {
        setMessages([{ role:"assistant", content:`Error: ${e.message} — please go back and try again.`, type:"opponent" }]);
      }
      setLoading(false);
    } else {
      setStage(0);
      setAppMode("practice");
    }
  };

  // GOV user round stages:
  // 0 = user delivers opening
  // 1 = bot (OPP) rebuts+constructs (loading)
  // 2 = user rebuts bot
  // 3 = bot (OPP) rebuts+extends (loading)
  // 4 = user rebuts again / going to whip
  // 5 = bot whip (loading)
  // 6 = user whip
  // 7 = judge (loading) → done

  // OPP user round stages:
  // 1 = bot (GOV) opens (loading)
  // 2 = user rebuts+constructs
  // 3 = bot (GOV) rebuts+extends (loading)
  // 4 = user rebuts
  // 5 = bot whip (loading)
  // 6 = user whip
  // 7 = judge (loading) → done

  // Load voices on mount
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Please use Chrome."); return; }
    stopSpeaking();
    setSpeaking(false);
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let finalText = transcript;
    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { finalText += e.results[i][0].transcript + " "; }
        else { interim = e.results[i][0].transcript; }
      }
      setTranscript(finalText);
      setInterimTranscript(interim);
    };
    recognition.onend = () => { setRecording(false); setInterimTranscript(""); };
    recognition.onerror = () => { setRecording(false); setInterimTranscript(""); };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }, [transcript]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
    setInterimTranscript("");
  }, []);

  const handleUserSpeech = async () => {
    const userText = (transcript.trim() || input.trim());
    if (!userText || loading || speaking) return;
    setInput("");
    setTranscript("");
    setInterimTranscript("");
    setMessages(prev => [...prev, { role:"user", content:userText, type:"user" }]);

    if (userSide === "Government") {
      if (stage === 0) {
        // GOV constructive -> bot OPP constructive+rebuttal
        setStage(1);
        await botSpeak(ROUND_PROMPTS.opp_rebuts_and_constructs(resolution, userText));
        setStage(2);
      } else if (stage === 2) {
        // GOV rebuttal+rebuild -> bot OPP rebuttal+rebuild
        setStage(3);
        await botSpeak(ROUND_PROMPTS.opp_rebuts_gov_extended(resolution, userText));
        setStage(4);
      } else if (stage === 4) {
        // After OPP rebuild: bot delivers OPP whip
        setStage(5);
        await botSpeak(ROUND_PROMPTS.bot_whip(resolution, "Opposition", userText));
        setStage(6);
      } else if (stage === 6) {
        // GOV whip (final) -> judge
        setStage(7);
        await botSpeak(ROUND_PROMPTS.judge_critique(resolution, "Government", "Opposition", userText, difficulty), "judge", true);
        setRoundOver(true);
      }
    } else {
      // User is OPP
      if (stage === 2) {
        // OPP constructive+rebuttal -> bot GOV rebuttal+rebuild
        setStage(3);
        await botSpeak(ROUND_PROMPTS.gov_rebuts_and_extends(resolution, userText));
        setStage(4);
      } else if (stage === 4) {
        // OPP rebuttal+rebuild -> user delivers OPP whip next (stage 6)
        // But first nothing — user goes to stage 6 directly
        setStage(6);
      } else if (stage === 6) {
        // OPP whip delivered -> bot GOV whip (final) -> judge
        setStage(5);
        await botSpeak(ROUND_PROMPTS.bot_whip(resolution, "Government", userText));
        setStage(7);
        await botSpeak(ROUND_PROMPTS.judge_critique(resolution, "Opposition", "Government", userText, difficulty), "judge", true);
        setRoundOver(true);
      }
    }
  };

  const getInputLabel = () => {
    if (roundOver || loading) return null;
    if (userSide === "Government") {
      if (stage === 0) return "YOUR SPEECH — Government Constructive";
      if (stage === 2) return "YOUR SPEECH — Government Rebuttal + Rebuild";
      if (stage === 4) return "YOUR SPEECH — Government Rebuttal + Rebuild (2nd)";
      if (stage === 6) return "YOUR SPEECH — Government Whip (Final)";
    } else {
      if (stage === 2) return "YOUR SPEECH — Opposition Constructive + Rebuttal";
      if (stage === 4) return "YOUR SPEECH — Opposition Rebuttal + Rebuild";
      if (stage === 6) return "YOUR SPEECH — Opposition Whip";
    }
    return null;
  };

  const isUserTurn = () => {
    if (roundOver || loading || speaking) return false;
    if (userSide === "Government") return [0, 2, 4, 6].includes(stage);
    return [2, 4, 6].includes(stage);
  };

  const getProgressSteps = () => {
    if (userSide === "Government") {
      return [
        { label:"You Open", active: stage === 0, done: stage > 0 },
        { label:"Opp Rebuts", active: stage === 1, done: stage > 1 },
        { label:"You Rebut", active: stage === 2, done: stage > 2 },
        { label:"Opp Extends", active: stage === 3, done: stage > 3 },
        { label:"You Rebut", active: stage === 4, done: stage > 4 },
        { label:"Opp Whip", active: stage === 5, done: stage > 5 },
        { label:"Your Whip", active: stage === 6, done: stage > 6 },
        { label:"Judge", active: stage === 7, done: roundOver },
      ];
    }
    return [
      { label:"Gov Constructive", active: stage === 1, done: stage > 1 },
      { label:"Opp Constructive+Rebuttal", active: stage === 2, done: stage > 2 },
      { label:"Gov Rebuttal+Rebuild", active: stage === 3, done: stage > 3 },
      { label:"Opp Rebuttal+Rebuild", active: stage === 4, done: stage > 4 },
      { label:"Opp Whip", active: stage === 6, done: stage > 6 },
      { label:"Gov Whip", active: stage === 7, done: roundOver },
      { label:"Judge", active: stage === 7, done: roundOver },
    ];
  };

  const resetToLanding = () => {
    setAppMode("landing");
    stopSpeaking();
    recognitionRef.current?.stop();
    setSpeaking(false);
    setRecording(false);
    setTranscript("");
    setInterimTranscript("");
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

  const sendCaseMessage = async (text, isFeedback = false) => {
    if (!text.trim()) return;
    const newMsgs = [...caseMsgs, { role:"user", content:text, isFeedback }];
    setCaseMsgs(newMsgs);
    setCaseInput("");
    setCaseFeedbackMode(null);
    setCaseFeedbackText("");
    setCaseLoading(true);
    try {
      const context = `RESOLUTION: "${caseRes}"\nSIDE: ${caseSide === "gov" ? "Government" : "Opposition"}\nSPEECH TYPE: ${caseSpeechType}\n\n`;
      const apiMsgs = newMsgs.map((m, i) => ({ role:m.role, content: i===0 ? context+m.content : m.content }));
      const res = await fetch("/api/gemini", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ system: SYSTEM_PROMPT, messages: apiMsgs }),
      });
      const data = await res.json();
      setCaseMsgs([...newMsgs, { role:"assistant", content: data.text || "No response." }]);
    } catch {
      setCaseMsgs([...newMsgs, { role:"assistant", content:"Error — please try again." }]);
    }
    setCaseLoading(false);
  };

  const handleCaseQuickAction = (action) => {
    if (!caseResSet || !caseSide) return;
    const side = caseSide === "gov" ? "Government" : "Opposition";
    const prompts = {
      case: `Generate a full ${side === "Government" ? "Prime Minister (Government)" : "Leader of Opposition"} constructive case. Complete 8-minute case with definitions, intro, and all contentions fully fleshed out. Include a creative third contention if possible.`,
      whip: `Generate a ${side} Whip speech (5 minutes). Focus on weighing, voters, comparing the two worlds. No new arguments.`,
      plan: `Write a policy plan for the ${side} side. Include: Plantext, Actor, Timeframe, and Cost/Mechanism.`,
      counterplan: `Write a counterplan for the ${side} side. Include: Plantext, Net Benefit, Actor, Timeframe, and Cost/Mechanism.`,
    };
    sendCaseMessage(prompts[action]);
  };

  const formatMessage = (text) => {
    return text.split("\n").map((line, i) => {
      if (/^#{1,3} /.test(line)) return <div key={i} style={{ fontWeight:700, fontSize:14, marginTop:12, marginBottom:4 }}>{line.replace(/^#{1,3} /,"")}</div>;
      if (/^\*\*(.+)\*\*$/.test(line)) return <div key={i} style={{ fontWeight:700, marginTop:8, marginBottom:2 }}>{line.replace(/\*\*/g,"")}</div>;
      if (/^\*\*(.+)\*\*/.test(line)) {
        const parts = line.split(/\*\*/g);
        return <div key={i} style={{ marginBottom:2 }}>{parts.map((p,j) => j%2===1 ? <strong key={j}>{p}</strong> : <span key={j}>{p}</span>)}</div>;
      }
      if (/^- /.test(line)) return <div key={i} style={{ paddingLeft:16, marginBottom:2, color:"#475569" }}>•&nbsp;{line.slice(2)}</div>;
      if (/^(Contention|Layer|Sub-argument|Voter|CONTENTION|LAYER|VOTER|—)\s*/i.test(line)) return <div key={i} style={{ fontWeight:700, color:"#4f46e5", marginTop:14, marginBottom:4, fontSize:13, letterSpacing:"0.02em" }}>{line}</div>;
      if (/^(CLAIM|WARRANT|IMPACT|Claim:|Warrant:|Impact:)/i.test(line)) return <div key={i} style={{ fontWeight:700, color:"#0f766e", marginTop:8, marginBottom:2, fontSize:12, fontFamily:"monospace" }}>{line}</div>;
      if (line.trim()==="") return <div key={i} style={{ height:8 }} />;
      return <div key={i} style={{ marginBottom:2, lineHeight:1.7 }}>{line}</div>;
    });
  };

  const canStart = setupSide && setupResText.trim();

  // ── LANDING ──
  if (appMode === "landing") {
    return (
      <div style={s.app}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>⚖</div>
            <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
          </div>
        </header>
        <div style={s.landing}>
          <div style={s.landingCard}>
            <div style={{ fontSize:52, marginBottom:16 }}>⚖️</div>
            <p style={s.landingTitle}>Ready to debate.</p>
            <p style={s.landingSubtitle}>Generate a full case or simulate a complete debate round against the AI.</p>
            <div style={s.landingGrid}>
              <button style={s.landingBtnCase} onClick={() => setAppMode("case")}>
                <span style={{ fontSize:28 }}>📋</span>
                Case Generator
                <span style={s.landingBtnSub}>Build a full 8-min case</span>
              </button>
              <button style={s.landingBtnPractice} onClick={() => setAppMode("setup")}>
                <span style={{ fontSize:28 }}>⚔️</span>
                Full Round Practice
                <span style={s.landingBtnSub}>Simulate a real round</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SETUP ──
  if (appMode === "setup") {
    return (
      <div style={s.app}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>⚖</div>
            <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
          </div>
          <span style={s.badgePractice}>⚔ SETUP</span>
        </header>
        <div style={s.landing}>
          <div style={s.setupCard}>
            <p style={s.setupTitle}>⚔️ Full Round Practice</p>
            <p style={s.setupSubtitle}>Pick your side and resolution. Gov always opens, Opp always responds first.</p>

            <div style={s.setupSection}>
              <span style={s.setupSectionLabel}>Your Side</span>
              <div style={s.sideGrid}>
                <button style={setupSide === "gov" ? s.btnGovActive : s.btnGovInactive} onClick={() => setSetupSide("gov")}>GOV</button>
                <button style={setupSide === "opp" ? s.btnOppActive : s.btnOppInactive} onClick={() => setSetupSide("opp")}>OPP</button>
              </div>
              {setupSide && (
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:8, fontFamily:"monospace" }}>
                  {setupSide === "gov" ? "You open. Bot plays Opposition." : "Bot opens as Government. You respond first."}
                </div>
              )}
            </div>

            <div style={s.setupSection}>
              <span style={s.setupSectionLabel}>Difficulty</span>
              <div style={s.diffGrid}>
                {Object.entries(DIFFICULTY).map(([key, d]) => (
                  <button
                    key={key}
                    style={s.diffBtn(setupDifficulty === key, d.color, d.bg, d.border)}
                    onClick={() => setSetupDifficulty(key)}
                  >
                    {d.label}
                    <div style={{ fontSize:10, fontWeight:400, marginTop:3, opacity:0.8 }}>{d.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={s.setupSection}>
              <span style={s.setupSectionLabel}>Resolution</span>
              <div style={s.optionGrid}>
                <button
                  style={setupResMode === "generating" ? { ...s.optionBtn, opacity:0.5 } : s.optionBtn}
                  onClick={generateResolution}
                  disabled={setupLoading}
                >
                  {setupLoading ? "Generating..." : "🎲 Generate one"}
                </button>
                <button
                  style={setupResMode === "custom" ? s.optionBtnActive : s.optionBtn}
                  onClick={() => { setSetupResMode("custom"); setSetupResText(""); }}
                >
                  ✏️ Enter my own
                </button>
              </div>
              {(setupResMode === "custom" || setupResMode === "done") && (
                <input
                  autoFocus={setupResMode === "custom"}
                  style={{ ...s.resInput, marginTop:10 }}
                  placeholder="Type your resolution..."
                  value={setupResText}
                  onChange={(e) => setSetupResText(e.target.value)}
                />
              )}
            </div>

            <button
              style={canStart && !setupLoading ? s.startBtn : s.startBtnDisabled}
              disabled={!canStart || setupLoading}
              onClick={startRound}
            >
              Start Round →
            </button>
            <button style={s.backBtn} onClick={resetToLanding}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ── FULL ROUND ──
  if (appMode === "practice") {
    const steps = getProgressSteps();
    const label = getInputLabel();
    const userTurn = isUserTurn();

    return (
      <div style={s.app}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>⚖</div>
            <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
          </div>
          <div style={s.headerBadges}>
            <span style={userSide === "Government" ? s.badgeGov : s.badgeOpp}>{userSide === "Government" ? "▲ GOV" : "▼ OPP"}</span>
            <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background: DIFFICULTY[difficulty]?.bg || "#ede9fe", color: DIFFICULTY[difficulty]?.color || "#7c3aed", border:`1px solid ${DIFFICULTY[difficulty]?.border || "#ddd6fe"}` }}>{DIFFICULTY[difficulty]?.label || "Varsity"}</span>
            <span style={s.badgePractice}>⚔ FULL ROUND</span>
            {speaking && <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#ede9fe", color:"#7c3aed", border:"1px solid #ddd6fe" }}>🔊 Speaking</span>}
            {recording && <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#fee2e2", color:"#dc2626", border:"1px solid #fecaca" }}>🔴 Recording</span>}
            <button onClick={resetToLanding} style={{ background:"none", border:"1px solid #e2e8f0", borderRadius:8, padding:"4px 10px", fontSize:11, color:"#94a3b8", cursor:"pointer" }}>← Home</button>
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
              {steps.map((step, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background: step.done ? "#4f46e5" : step.active ? "#fbbf24" : "#e2e8f0" }} />
                  <span style={{ fontSize:12, fontWeight: step.active ? 700 : 400, color: step.done ? "#4f46e5" : step.active ? "#92400e" : "#cbd5e1" }}>{step.label}</span>
                </div>
              ))}
            </div>
            {speaking && (
              <div>
                <p style={s.sideLabel}>Audio</p>
                <button style={s.actionBtn} onClick={() => { stopSpeaking(); setSpeaking(false); }}>⏹ Stop Speaking</button>
              </div>
            )}
            {roundOver && (
              <button style={{ ...s.actionBtn, background:"#4f46e5", color:"#fff", border:"none", fontWeight:700, cursor:"pointer" }} onClick={() => setAppMode("setup")}>🔄 New Round</button>
            )}
            <button style={s.actionBtn} onClick={resetToLanding}>← Home</button>
          </aside>

          <main style={s.chat}>
            <div style={s.messages}>
              {messages.length === 0 && !loading && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8, textAlign:"center" }}>
                  <div style={{ fontSize:36 }}>⚔️</div>
                  <p style={{ fontSize:16, fontWeight:700, margin:0 }}>Round starting...</p>
                  {userSide === "Government" && <p style={{ fontSize:13, color:"#94a3b8", margin:0 }}>You open. Deliver your Government constructive case below.</p>}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} style={msg.role === "user" ? s.msgWrapUser : s.msgWrapAsst}>
                  <div style={
                    msg.role === "user" ? s.msgUser
                    : msg.type === "judge" ? s.msgAsstJudge
                    : s.msgAsstOpponent
                  }>
                    {msg.role === "assistant" && msg.type === "opponent" && <div style={{ ...s.msgTag, color:"#be123c" }}>⚔ {botSide}</div>}
                    {msg.role === "assistant" && msg.type === "judge" && <div style={{ ...s.msgTag, color:"#15803d" }}>🏛 Judge's Critique</div>}
                    {msg.role === "user" && <div style={{ ...s.msgTag, color:"rgba(255,255,255,0.6)" }}>🎤 {userSide}</div>}
                    {msg.role === "assistant" ? <div>{formatMessage(msg.content)}</div> : <p style={{ margin:0, lineHeight:1.6 }}>{msg.content}</p>}
                    {msg.role === "assistant" && msg.verbatim && (
                      <button style={s.replayBtn} onClick={() => { stopSpeaking(); setSpeaking(true); speakText(msg.verbatim, () => setSpeaking(false)); }}>
                        🔊 Replay speech
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={s.msgWrapAsst}>
                  <div style={s.msgAsstOpponent}>
                    <div style={{ ...s.msgTag, color:"#be123c" }}>⚔ {botSide}</div>
                    <span style={{ color:"#94a3b8", fontSize:13, marginRight:8 }}>Preparing speech</span>
                    <span style={s.loadingDot}/><span style={s.loadingDot}/><span style={s.loadingDot}/>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={s.inputBar}>
              {label && <div style={s.speechLabel}>🎤 {label}</div>}
              {speaking && <div style={{ fontSize:11, color:"#7c3aed", fontWeight:700, marginBottom:6, fontFamily:"monospace" }}>🔊 Opponent speaking — hit mic to interrupt</div>}
              {!userTurn && !loading && !speaking && !roundOver && <div style={{ fontSize:11, color:"#94a3b8", marginBottom:6, fontFamily:"monospace" }}>Opponent is preparing...</div>}
              {roundOver && <div style={{ fontSize:11, color:"#15803d", fontWeight:700, marginBottom:6, fontFamily:"monospace" }}>✓ Round complete — see judge's decision above</div>}
              <div style={s.inputRow}>
                <button
                  style={s.micBtn(recording)}
                  onClick={recording ? stopRecording : startRecording}
                  disabled={!userTurn && !recording}
                  title={recording ? "Stop recording" : "Start recording"}
                >
                  {recording ? "⏹" : "🎤"}
                </button>
                <div style={s.transcriptBox}>
                  {transcript || interimTranscript
                    ? <span>{transcript}<span style={{ color:"#94a3b8" }}>{interimTranscript}</span></span>
                    : <span style={{ color:"#cbd5e1" }}>
                        {roundOver ? "Round is over." : !userTurn ? "Wait for opponent..." : "Hit mic and speak, or type below..."}
                      </span>
                  }
                </div>
                <button
                  style={!(transcript.trim()||input.trim())||!userTurn||speaking ? s.sendBtnDisabled : s.sendBtnRed}
                  onClick={handleUserSpeech}
                  disabled={!(transcript.trim()||input.trim())||!userTurn||speaking}
                >Deliver</button>
              </div>
              <div style={s.inputRow} style={{ marginTop:6 }}>
                <textarea
                  style={{ ...s.inputTextarea, fontSize:12 }}
                  rows={2}
                  placeholder="Or type your speech here..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={!userTurn || speaking}
                  onKeyDown={(e) => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); if ((input.trim()||transcript.trim())&&userTurn) handleUserSpeech(); }}}
                />
              </div>
              <div style={s.inputHint}>🎤 Mic to record · Type to write · Deliver when done · Chrome recommended</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── CASE GENERATOR ──
  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>⚖</div>
          <div><p style={s.headerTitle}>Parli Coach</p><p style={s.headerSub}>HS Parliamentary Debate</p></div>
        </div>
        <div style={s.headerBadges}>
          {caseResSet && caseSide && <span style={caseSide==="gov" ? s.badgeGov : s.badgeOpp}>{caseSide==="gov" ? "▲ GOV" : "▼ OPP"}</span>}
          <button onClick={resetToLanding} style={{ background:"none", border:"1px solid #e2e8f0", borderRadius:8, padding:"4px 10px", fontSize:11, color:"#94a3b8", cursor:"pointer" }}>← Home</button>
        </div>
      </header>
      <div style={s.body}>
        <aside style={s.sidebar}>
          <div>
            <p style={s.sideLabel}>Resolution</p>
            <textarea style={s.textarea} rows={3} placeholder="Enter the resolution..." value={caseRes} onChange={(e) => setCaseRes(e.target.value)} disabled={caseResSet} />
            {!caseResSet
              ? <button style={s.btnPrimary} onClick={() => { if (caseRes.trim()) { setCaseResSet(true); setCaseMsgs([]); }}} disabled={!caseRes.trim()}>Set Resolution</button>
              : <button style={s.btnSecondary} onClick={() => { setCaseResSet(false); setCaseSide(null); setCaseMsgs([]); }}>Change</button>
            }
          </div>
          {caseResSet && (
            <div>
              <p style={s.sideLabel}>Side</p>
              <div style={s.sideGrid}>
                <button style={caseSide==="gov" ? s.btnGovActive : s.btnGovInactive} onClick={() => setCaseSide("gov")}>GOV</button>
                <button style={caseSide==="opp" ? s.btnOppActive : s.btnOppInactive} onClick={() => setCaseSide("opp")}>OPP</button>
              </div>
            </div>
          )}
          {caseResSet && caseSide && (
            <>
              <div>
                <p style={s.sideLabel}>Speech</p>
                <select style={s.select} value={caseSpeechType} onChange={(e) => setCaseSpeechType(e.target.value)}>
                  <option value="constructive">{caseSide==="gov" ? "PM Constructive" : "LO Constructive"}</option>
                  <option value="extension">{caseSide==="gov" ? "MG Extension" : "MO Extension"}</option>
                  <option value="whip">{caseSide==="gov" ? "Gov Whip (3rd)" : "Opp Whip (3rd)"}</option>
                </select>
              </div>
              <div>
                <p style={s.sideLabel}>Generate</p>
                {[
                  { key:"case", icon:"📋", label:"Full Case" },
                  { key:"whip", icon:"🏁", label:"Whip Speech" },
                  { key:"plan", icon:"📄", label:"Write a Plan" },
                  { key:"counterplan", icon:"↩️", label:"Counterplan" },
                ].map(({key,icon,label}) => (
                  <button key={key} style={s.actionBtn} onClick={() => handleCaseQuickAction(key)} disabled={caseLoading}>{icon} {label}</button>
                ))}
              </div>
            </>
          )}
          {caseMsgs.length > 0 && (
            <div>
              <p style={s.sideLabel}>Export</p>
              <button style={s.exportBtn} onClick={() => {
                const content = caseMsgs.map(m=>`[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n---\n\n");
                const blob = new Blob([`RESOLUTION: ${caseRes}\nSIDE: ${caseSide?.toUpperCase()}\n\n${content}`],{type:"text/plain"});
                const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`parli-case-${Date.now()}.txt`; a.click();
              }}>⬇ Export .txt</button>
            </div>
          )}
        </aside>

        <main style={s.chat}>
          <div style={s.messages}>
            {caseMsgs.length===0 && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", textAlign:"center", gap:8 }}>
                <div style={{ fontSize:48 }}>⚖️</div>
                <p style={{ fontSize:22, fontWeight:700, margin:0 }}>Ready to debate.</p>
                <p style={{ fontSize:13, color:"#94a3b8", maxWidth:280, lineHeight:1.6, margin:0 }}>Set a resolution, pick your side, then generate a case.</p>
                {!caseResSet && <p style={{ fontSize:13, color:"#4f46e5", fontWeight:600, margin:0 }}>← Start with a resolution</p>}
                {caseResSet && !caseSide && <p style={{ fontSize:13, color:"#4f46e5", fontWeight:600, margin:0 }}>← Pick Government or Opposition</p>}
              </div>
            )}
            {caseMsgs.map((msg,i) => (
              <div key={i} style={msg.role==="user" ? s.msgWrapUser : s.msgWrapAsst}>
                <div style={msg.role==="user" ? s.msgUser : s.msgAsst}>
                  {msg.role==="assistant" ? <div>{formatMessage(msg.content)}</div> : <p style={{ margin:0, lineHeight:1.6 }}>{msg.content}</p>}
                  {msg.role==="assistant" && i===caseMsgs.length-1 && !caseLoading && (
                    <div style={s.msgActions}>
                      <button style={s.smallBtn} onClick={() => setCaseFeedbackMode(i)}>✏ Request Revision</button>
                      <button style={s.smallBtn} onClick={() => navigator.clipboard.writeText(msg.content)}>📋 Copy</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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

          {caseFeedbackMode!==null && (
            <div style={s.revBar}>
              <div style={s.revLabel}>✏ Revision Request</div>
              <div style={s.revRow}>
                <textarea autoFocus style={{...s.textarea,flex:1,marginBottom:0}} rows={2} placeholder="What should change?" value={caseFeedbackText} onChange={(e)=>setCaseFeedbackText(e.target.value)}
                  onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(caseFeedbackText.trim())sendCaseMessage(`REVISION REQUEST: ${caseFeedbackText}`,true);}}}/>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <button style={s.revBtnSend} onClick={()=>{if(caseFeedbackText.trim())sendCaseMessage(`REVISION REQUEST: ${caseFeedbackText}`,true);}} disabled={!caseFeedbackText.trim()}>Send</button>
                  <button style={s.revBtnCancel} onClick={()=>{setCaseFeedbackMode(null);setCaseFeedbackText("");}}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div style={s.inputBar}>
            <div style={s.inputRow}>
              <textarea style={s.inputTextarea} rows={2}
                placeholder={!caseResSet?"Set a resolution to begin...":!caseSide?"Pick a side first...":"Ask anything..."}
                value={caseInput} onChange={(e)=>setCaseInput(e.target.value)}
                disabled={!caseResSet||!caseSide||caseLoading}
                onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(caseInput.trim())sendCaseMessage(caseInput);}}}/>
              <button style={!caseInput.trim()||!caseResSet||!caseSide||caseLoading?s.sendBtnDisabled:s.sendBtn}
                onClick={()=>{if(caseInput.trim())sendCaseMessage(caseInput);}}
                disabled={!caseInput.trim()||!caseResSet||!caseSide||caseLoading}>Send</button>
            </div>
            <div style={s.inputHint}>Enter to send · Shift+Enter for new line</div>
          </div>
        </main>
      </div>
    </div>
  );
}
