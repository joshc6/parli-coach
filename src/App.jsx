import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are an expert high school parliamentary debate coach and case writer. You specialize in the 6-speech parliamentary format.

CRITICAL FORMATTING RULES — NEVER VIOLATE THESE:
1. NEVER use "this isn't X, it's Y" syntax or any equivalent phrasing.
2. Do NOT use lookup-required stats or studies in refutations — argue from logic, structural reasoning, and first principles only.
3. For EVERY contention and refutation, provide FIRST a bullet-point summary, THEN the verbatim speech text below it.
4. Signpost everything: "Layer 1", "Sub-argument 1", "Contention 1", "Voter 1", etc.
5. Every argument needs clear CLAIM → WARRANT → IMPACT structure, labeled.
6. DO NOT sound like an AI. Use human-sounding rhetoric, varied sentence structures, real pathos where appropriate.
7. NEVER be rhythmically uniform. Vary syntax constantly.
8. DO NOT over-explain obvious points.
9. Definitions go at the top of every opening case.
10. NEVER use bullet points for anything except the summary section before verbatim text.
11. 8-minute constructive cases should be full and substantive with 2-3 contentions.
12. Whip speeches focus on WEIGHING, VOTERS, COMPARING — no new arguments.`;

// Round flow:
// GOV user: user opens → bot (OPP) rebuts+constructs → user rebuts → bot whip → user whip → judge
// OPP user: bot (GOV) opens → user rebuts+constructs → bot rebuts+extends → user rebuts → bot whip → user whip → judge

const ROUND_PROMPTS = {
  gov_opens: (res) => `The resolution is: "${res}".
You are debating as Government. Deliver a full opening constructive case.
Label it: "— GOVERNMENT CONSTRUCTIVE CASE —"
Include definitions, 2-3 fully developed contentions with Claim, Warrant, Impact.
Make it genuinely challenging. At the end say: "Your turn — deliver the Opposition constructive case AND begin refuting my arguments."`,

  opp_rebuts_and_constructs: (res, userSpeech) => `The resolution is: "${res}".
You are debating as Opposition. The Government just delivered their opening:

"${userSpeech}"

Deliver two things:
1. Label "— OPPOSITION REBUTTAL —" — attack their contentions one by one. Call out logical gaps and weak warrants.
2. Label "— OPPOSITION CONSTRUCTIVE CASE —" — 2-3 of your own contentions for the Opposition side.

At the end say: "Your turn — refute my case and defend yours."`,

  gov_rebuts_and_extends: (res, userSpeech) => `The resolution is: "${res}".
You are debating as Government. The Opposition just responded:

"${userSpeech}"

Deliver your rebuttal and extension:
1. Label "— GOVERNMENT REBUTTAL —" — attack their Opposition contentions one by one. Call out any drops.
2. Label "— GOVERNMENT EXTENSION —" — extend and reinforce your own Government contentions. Explain why they still stand despite their attacks.

At the end say: "Your turn — defend your case and attack my extensions. Then we move to whip speeches."`,

  opp_rebuts_gov_extended: (res, userSpeech) => `The resolution is: "${res}".
You are debating as Opposition. The Government just delivered their rebuttal and extension:

"${userSpeech}"

Deliver your rebuttal:
1. Label "— OPPOSITION REBUTTAL —" — attack their extensions and reinforce your own Opposition contentions.
2. Explain why the Opposition still wins the key clashes.

At the end say: "Your turn — rebut my arguments and defend your case. Then we go to whip speeches."`,

  bot_whip: (res, botSide, userSpeech) => `The resolution is: "${res}".
You are debating as ${botSide}. The user just delivered their rebuttal:

"${userSpeech}"

Deliver your whip speech. NO new arguments.
Label it: "— ${botSide.toUpperCase()} WHIP SPEECH —"
1. Identify the 2-3 key voters in this round.
2. Explain why YOU win on each voter.
3. Weigh your world vs their world.

At the end say: "Your turn — deliver your final whip speech."`,

  judge_critique: (res, userSide, botSide, userWhip) => `The resolution is: "${res}".
The user debated as ${userSide}. The bot debated as ${botSide}. The user just delivered their final whip:

"${userWhip}"

The round is over. Deliver a detailed judge's critique. Label it: "— JUDGE'S CRITIQUE —"
1. Who won and why — be specific about decisive arguments.
2. What did the user do well?
3. What did the user drop or fail to answer?
4. What should they improve?
Be honest and direct. Don't sugarcoat.`,
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
};

const callGemini = async (prompt) => {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: SYSTEM_PROMPT,
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

  // Round
  const [resolution, setResolution] = useState("");
  const [userSide, setUserSide] = useState(null); // "Government" | "Opposition"
  const [botSide, setBotSide] = useState(null);
  const [stage, setStage] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [roundOver, setRoundOver] = useState(false);

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

  const botSpeak = async (prompt, type = "opponent") => {
    setLoading(true);
    try {
      const text = await callGemini(prompt);
      addBotMessage(text, type);
    } catch (e) {
      addBotMessage("Something went wrong — please try again.", type);
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
      const text = await callGemini(`Generate one unique, specific high school parliamentary debate resolution about ${topic}. Seed: ${seed}. Format examples: 'This house would ban social media for minors.' or 'This house believes that democracies should impose term limits on all elected officials.' Return ONLY the resolution text. No quotes, no explanation, nothing else.`);
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
        const text = await callGemini(ROUND_PROMPTS.gov_opens(res));
        setMessages([{ role:"assistant", content:text, type:"opponent" }]);
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

  const handleUserSpeech = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role:"user", content:userText, type:"user" }]);

    if (userSide === "Government") {
      if (stage === 0) {
        setStage(1);
        await botSpeak(ROUND_PROMPTS.opp_rebuts_and_constructs(resolution, userText));
        setStage(2);
      } else if (stage === 2) {
        setStage(3);
        await botSpeak(ROUND_PROMPTS.opp_rebuts_and_constructs(resolution, userText));
        setStage(4);
      } else if (stage === 4) {
        setStage(5);
        await botSpeak(ROUND_PROMPTS.bot_whip(resolution, "Opposition", userText));
        setStage(6);
      } else if (stage === 6) {
        setStage(7);
        await botSpeak(ROUND_PROMPTS.judge_critique(resolution, "Government", "Opposition", userText), "judge");
        setRoundOver(true);
      }
    } else {
      // User is OPP
      if (stage === 2) {
        setStage(3);
        await botSpeak(ROUND_PROMPTS.gov_rebuts_and_extends(resolution, userText));
        setStage(4);
      } else if (stage === 4) {
        setStage(5);
        await botSpeak(ROUND_PROMPTS.bot_whip(resolution, "Government", userText));
        setStage(6);
      } else if (stage === 6) {
        setStage(7);
        await botSpeak(ROUND_PROMPTS.judge_critique(resolution, "Opposition", "Government", userText), "judge");
        setRoundOver(true);
      }
    }
  };

  const getInputLabel = () => {
    if (roundOver || loading) return null;
    if (userSide === "Government") {
      if (stage === 0) return "YOUR SPEECH — Government Opening Constructive";
      if (stage === 2) return "YOUR SPEECH — Government Rebuttal";
      if (stage === 4) return "YOUR SPEECH — Government Rebuttal (Pre-Whip)";
      if (stage === 6) return "YOUR SPEECH — Government Whip (Final)";
    } else {
      if (stage === 2) return "YOUR SPEECH — Opposition Rebuttal + Constructive";
      if (stage === 4) return "YOUR SPEECH — Opposition Rebuttal";
      if (stage === 6) return "YOUR SPEECH — Opposition Whip (Final)";
    }
    return null;
  };

  const isUserTurn = () => {
    if (roundOver || loading) return false;
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
      { label:"Gov Opens", active: stage === 1, done: stage > 1 },
      { label:"You Rebut", active: stage === 2, done: stage > 2 },
      { label:"Gov Extends", active: stage === 3, done: stage > 3 },
      { label:"You Rebut", active: stage === 4, done: stage > 4 },
      { label:"Gov Whip", active: stage === 5, done: stage > 5 },
      { label:"Your Whip", active: stage === 6, done: stage > 6 },
      { label:"Judge", active: stage === 7, done: roundOver },
    ];
  };

  const resetToLanding = () => {
    setAppMode("landing");
    setSetupSide(null);
    setSetupResMode(null);
    setSetupResText("");
    setSetupLoading(false);
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
            <span style={s.badgePractice}>⚔ FULL ROUND</span>
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
                  </div>
                </div>
              ))}

              {loading && (
                <div style={s.msgWrapAsst}>
                  <div style={s.msgAsstOpponent}>
                    <div style={{ ...s.msgTag, color:"#be123c" }}>⚔ {botSide}</div>
                    <span style={{ color:"#94a3b8", fontSize:13, marginRight:8 }}>Speaking</span>
                    <span style={s.loadingDot}/><span style={s.loadingDot}/><span style={s.loadingDot}/>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={s.inputBar}>
              {label && <div style={s.speechLabel}>🎤 {label}</div>}
              {!userTurn && !loading && !roundOver && <div style={{ fontSize:11, color:"#94a3b8", marginBottom:6, fontFamily:"monospace" }}>Opponent is preparing...</div>}
              {roundOver && <div style={{ fontSize:11, color:"#15803d", fontWeight:700, marginBottom:6, fontFamily:"monospace" }}>✓ Round complete — see judge's critique above</div>}
              <div style={s.inputRow}>
                <textarea
                  style={s.inputTextarea}
                  rows={3}
                  placeholder={roundOver ? "Round is over." : !userTurn ? "Wait for the opponent..." : "Deliver your speech — refute their points and build your own case."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={!userTurn}
                  onKeyDown={(e) => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); if (input.trim()&&userTurn) handleUserSpeech(); }}}
                />
                <button
                  style={!input.trim()||!userTurn ? s.sendBtnDisabled : s.sendBtnRed}
                  onClick={handleUserSpeech}
                  disabled={!input.trim()||!userTurn}
                >Deliver</button>
              </div>
              <div style={s.inputHint}>Enter to deliver · Shift+Enter for new line</div>
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
