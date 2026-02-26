import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are an expert high school parliamentary debate coach and case writer. You specialize in the 6-speech parliamentary format (Prime Minister, Member of Government, Leader of Opposition, Member of Opposition, Government Whip/Extension, Opposition Whip/Extension).

CRITICAL FORMATTING RULES — NEVER VIOLATE THESE:
1. NEVER use "this isn't X, it's Y" syntax or any equivalent phrasing.
2. Do NOT use lookup-required stats or studies in refutations — argue from logic, structural reasoning, and first principles only.
3. For EVERY contention and refutation, provide FIRST a bullet-point summary, THEN the verbatim speech text below it.
4. Signpost everything: "Layer 1", "Sub-argument 1", "Contention 1", "Voter 1", etc. Make it easy to flow.
5. Every argument needs clear CLAIM → WARRANT → IMPACT structure, labeled.
6. DO NOT sound like an AI. Use human-sounding rhetoric, varied sentence structures, real pathos where appropriate.
7. NEVER be rhythmically uniform. Vary syntax constantly. Mix short punchy sentences with longer analytical ones.
8. DO NOT over-explain obvious points.
9. Try to generate a third contention that is creative, outside-the-box, difficult to refute due to its unique framing — only if genuinely strong. Do NOT force it.
10. Definitions go at the top of every case.
11. Introduction is 2-3 sentences max.
12. 8-minute cases should be full and substantive. Third speeches (4-5 min) focus on WEIGHING, VOTERS, COMPARING — no new arguments.
13. For PLANS: include Plantext, Actor, Timeframe, and Cost/Mechanism.
14. For COUNTERPLANS: only generate when explicitly asked.
15. NEVER use bullet points for anything except the summary section before verbatim text.

DEBATE FORMAT CONTEXT:
- High school parliamentary debate, 6 speeches total (3 per side)
- Government: PM speech, Member of Government (MG), Government Whip
- Opposition: Leader of Opposition (LO), Member of Opposition (MO), Opposition Whip
- PM and LO give main constructive cases (~8 min)
- Whip speeches are summary/extension speeches (~4-5 min), NO new arguments

FULL ROUND PRACTICE MODE — SPECIAL RULES:
You are simulating a full parliamentary debate round as the opponent. The user is debating against you.

Round structure:
- Speech 1 (Bot): You deliver a full opening constructive case for your side (3 contentions, definitions, intro). Make it genuinely strong and challenging.
- Speech 2 (User): User responds — they should refute your points AND defend their own position.
- Speech 3 (Bot): You respond — attack what the user said, extend and reinforce YOUR own contentions, point out drops. Be aggressive but fair.
- Speech 4 (User): User continues the clash — they reinforce their strongest points, attack your extensions.
- Speech 5 (Bot — Whip): You give a whip/summary speech. Weigh the round, explain why your side wins on the key voters. No new arguments.
- Speech 6 (User): User gives their whip — this is their last speech.

After Speech 6, give a judge's critique: who won and why, what the user did well, what they dropped, what they should improve.

Each of your speeches should be labeled clearly: "SPEECH 1 — [SIDE] CONSTRUCTIVE", "SPEECH 3 — [SIDE] REBUTTAL", "SPEECH 5 — [SIDE] WHIP".

After each of your speeches, tell the user clearly what speech number they are on and what they should be doing (e.g. "This is your Speech 2 — respond to my case AND build your own position.").

Be a genuinely tough opponent. Don't go easy. Point out drops explicitly. Make the user work for it.`;

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
  smallBtnGray: { fontSize:11, padding:"5px 10px", borderRadius:6, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer" },
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
  sendBtnDisabled: { background:"#f1f5f9", color:"#94a3b8", border:"none", borderRadius:12, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"not-allowed" },
  inputHint: { fontSize:11, color:"#cbd5e1", marginTop:6, fontFamily:"monospace" },

  // Landing
  landing: { flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc" },
  landingCard: { background:"#fff", borderRadius:20, padding:"48px 40px", boxShadow:"0 4px 24px rgba(0,0,0,0.08)", maxWidth:480, width:"100%", textAlign:"center" },
  landingIcon: { fontSize:52, marginBottom:16 },
  landingTitle: { fontSize:26, fontWeight:700, margin:"0 0 8px 0", letterSpacing:"-0.02em" },
  landingSubtitle: { fontSize:14, color:"#94a3b8", margin:"0 0 36px 0", lineHeight:1.6 },
  landingGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
  landingBtnCase: { background:"#4f46e5", color:"#fff", border:"none", borderRadius:12, padding:"20px 16px", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  landingBtnPractice: { background:"#fff", color:"#1e293b", border:"2px solid #e2e8f0", borderRadius:12, padding:"20px 16px", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  landingBtnIcon: { fontSize:28 },
  landingBtnSub: { fontSize:11, fontWeight:400, opacity:0.75 },

  // Practice setup
  practiceLanding: { flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc" },
  practiceLandingCard: { background:"#fff", borderRadius:20, padding:"40px 36px", boxShadow:"0 4px 24px rgba(0,0,0,0.08)", maxWidth:460, width:"100%", textAlign:"center" },
  practiceLandingTitle: { fontSize:20, fontWeight:700, margin:"0 0 8px 0" },
  practiceLandingSubtitle: { fontSize:13, color:"#94a3b8", margin:"0 0 28px 0" },
  practiceResGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 },
  practiceResBtn: { background:"#fef3c7", color:"#92400e", border:"2px solid #fde68a", borderRadius:12, padding:"18px 12px", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6 },
  practiceResBtnAlt: { background:"#fff", color:"#475569", border:"2px solid #e2e8f0", borderRadius:12, padding:"18px 12px", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6 },
  practiceResInput: { width:"100%", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 12px", fontSize:13, color:"#1e293b", fontFamily:"Georgia, serif", boxSizing:"border-box", marginBottom:10 },
  practiceResSubmit: { width:"100%", background:"#e11d48", color:"#fff", border:"none", borderRadius:10, padding:"10px 0", fontSize:13, fontWeight:700, cursor:"pointer" },
  backBtn: { background:"none", border:"none", color:"#94a3b8", fontSize:12, cursor:"pointer", marginTop:14, fontFamily:"Georgia, serif" },

  // Speech tracker
  speechTracker: { display:"flex", gap:6, flexWrap:"wrap" },
  speechBubbleDone: { padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#dcfce7", color:"#15803d", border:"1px solid #bbf7d0" },
  speechBubbleCurrent: { padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#fef3c7", color:"#92400e", border:"1px solid #fde68a" },
  speechBubblePending: { padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#f8fafc", color:"#cbd5e1", border:"1px solid #e2e8f0" },
};

const SPEECH_LABELS = [
  "S1: Bot Opens",
  "S2: Your Response",
  "S3: Bot Rebuts",
  "S4: Your Clash",
  "S5: Bot Whip",
  "S6: Your Whip",
];

export default function App() {
  const [appMode, setAppMode] = useState("landing");
  const [practiceResMode, setPracticeResMode] = useState(null);
  const [practiceCustomRes, setPracticeCustomRes] = useState("");

  const [resolution, setResolution] = useState("");
  const [side, setSide] = useState(null);
  const [speechType, setSpeechType] = useState("constructive");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolutionSet, setResolutionSet] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [practiceMode, setPracticeMode] = useState(false);
  const [speechNumber, setSpeechNumber] = useState(0); // 0 = not started, 1-6 = speech #
  const [roundOver, setRoundOver] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText, isFeedback = false) => {
    if (!messageText.trim()) return;
    const userMsg = { role: "user", content: messageText, isFeedback };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setFeedbackMode(null);
    setFeedbackText("");
    setLoading(true);

    try {
      const contextHeader = `RESOLUTION: "${resolution}"\nUSER SIDE: ${side === "gov" ? "Government" : "Opposition"}\nBOT SIDE: ${side === "gov" ? "Opposition" : "Government"}\nSPEECH MODE: Full Round Practice\nCURRENT SPEECH NUMBER: ${speechNumber}\n\n`;
      const apiMessages = newMessages.map((m, i) => ({
        role: m.role,
        content: i === 0 ? contextHeader + m.content : m.content,
      }));

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: SYSTEM_PROMPT, messages: apiMessages }),
      });

      const data = await res.json();
      const assistantText = data.text || "No response.";

      const isOpponentSpeech = [1, 3, 5].includes(speechNumber);
      const isJudge = speechNumber === 6;

      const assistantMsg = {
        role: "assistant",
        content: assistantText,
        isOpponentSpeech: isOpponentSpeech && !isJudge,
        isJudgeFeedback: isJudge,
      };

      // Advance speech counter
      if (speechNumber === 6) {
        setRoundOver(true);
        setSpeechNumber(7);
      } else {
        setSpeechNumber((prev) => prev + 1);
      }

      setMessages([...newMessages, assistantMsg]);
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", content: "Error reaching the API. Please try again." }]);
    }
    setLoading(false);
  };

  const startPracticeWithResolution = (res, chosenSide) => {
    setResolution(res);
    setResolutionSet(true);
    setPracticeMode(true);
    setRoundOver(false);
    setAppMode("practice");
    setMessages([]);
    setSide(chosenSide);
    setSpeechNumber(1);

    const botSide = chosenSide === "gov" ? "Opposition" : "Government";
    const prompt = `The resolution is: "${res}". You are debating as the ${botSide} side. The user is debating as the ${chosenSide === "gov" ? "Government" : "Opposition"} side.

Please deliver SPEECH 1 — your full opening constructive case. Label it clearly as "SPEECH 1 — ${botSide.toUpperCase()} CONSTRUCTIVE". Give 2-3 strong contentions with definitions and intro. Make it genuinely challenging.

After your speech, clearly tell the user: "This is your SPEECH 2 — refute my contentions AND build your own case for the ${chosenSide === "gov" ? "Government" : "Opposition"} side."`;

    const firstMsg = { role: "user", content: prompt };
    const msgs = [firstMsg];
    setMessages([]);
    setLoading(true);

    fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `RESOLUTION: "${res}"\nUSER SIDE: ${chosenSide === "gov" ? "Government" : "Opposition"}\nBOT SIDE: ${botSide}\nSPEECH MODE: Full Round Practice\nCURRENT SPEECH NUMBER: 1\n\n${prompt}` }],
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const assistantText = data.text || "No response.";
        setMessages([{ role: "assistant", content: assistantText, isOpponentSpeech: true }]);
        setSpeechNumber(2);
        setLoading(false);
      })
      .catch(() => {
        setMessages([{ role: "assistant", content: "Error starting the round. Please try again." }]);
        setLoading(false);
      });
  };

  const handleUserSpeech = () => {
    if (!input.trim() || loading) return;

    let prompt = input;

    if (speechNumber === 2) {
      prompt = `SPEECH 2 — USER RESPONSE:\n\n${input}\n\n[Now deliver SPEECH 3 — your rebuttal. Attack what I said, extend your own contentions, point out anything I dropped. Label it "SPEECH 3 — ${side === "gov" ? "OPPOSITION" : "GOVERNMENT"} REBUTTAL". After, tell me: "This is your SPEECH 4 — continue the clash, reinforce your strongest points."]`;
    } else if (speechNumber === 4) {
      prompt = `SPEECH 4 — USER CLASH:\n\n${input}\n\n[Now deliver SPEECH 5 — your whip. Weigh the round, explain key voters, summarize why your side wins. NO new arguments. Label it "SPEECH 5 — ${side === "gov" ? "OPPOSITION" : "GOVERNMENT"} WHIP". After, tell me: "This is your SPEECH 6 — your final whip speech. Weigh the round and tell me why YOU win."]`;
    } else if (speechNumber === 6) {
      prompt = `SPEECH 6 — USER WHIP:\n\n${input}\n\n[The round is over. Now give a detailed judge's critique. Who won and why? What did the user do well? What did they drop? What should they improve? Be honest and specific.]`;
    }

    sendMessage(prompt);
  };

  const handleGenerateResolution = (chosenSide) => {
    setPracticeResMode("generating");
    fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "You generate debate resolutions. Return only the resolution text, nothing else. No quotes, no explanation.",
        messages: [{ role: "user", content: "Generate one strong, interesting high school parliamentary debate resolution." }],
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const res = data.text?.trim() || "This house would ban social media for minors.";
        startPracticeWithResolution(res, chosenSide);
      })
      .catch(() => startPracticeWithResolution("This house would ban social media for minors.", chosenSide));
  };

  const handleQuickAction = (action) => {
    if (!resolutionSet || !side) return;
    const prompts = {
      case: `Generate a full ${side === "gov" ? "Prime Minister (Government)" : "Leader of Opposition"} constructive case for this resolution. Complete 8-minute case with definitions, intro, and all contentions fully fleshed out. Include a creative third contention if possible.`,
      whip: `Generate a ${side === "gov" ? "Government" : "Opposition"} Whip speech (5 minutes). Third speech — focus on weighing, voters, comparing the two worlds, summarizing why we win. No new arguments.`,
      plan: `Write a policy plan for the ${side === "gov" ? "Government" : "Opposition"} side. Include: Plantext, Actor, Timeframe, and Cost/Mechanism.`,
      counterplan: `Write a counterplan for the ${side === "gov" ? "Government" : "Opposition"} side. Include: Plantext, Net Benefit, Actor, Timeframe, and Cost/Mechanism.`,
    };
    sendMessage(prompts[action]);
  };

  const resetToLanding = () => {
    setAppMode("landing");
    setPracticeResMode(null);
    setPracticeCustomRes("");
    setResolution("");
    setResolutionSet(false);
    setSide(null);
    setMessages([]);
    setPracticeMode(false);
    setSpeechNumber(0);
    setRoundOver(false);
    setInput("");
  };

  const formatMessage = (text) => {
    return text.split("\n").map((line, i) => {
      if (/^#{1,3} /.test(line)) {
        const content = line.replace(/^#{1,3} /, "");
        return <div key={i} style={{ fontWeight:700, fontSize:14, marginTop:12, marginBottom:4, color:"#1e293b" }}>{content}</div>;
      }
      if (/^\*\*(.+)\*\*$/.test(line)) {
        return <div key={i} style={{ fontWeight:700, marginTop:8, marginBottom:2 }}>{line.replace(/\*\*/g, "")}</div>;
      }
      if (/^\*\*(.+)\*\*/.test(line)) {
        const parts = line.split(/\*\*/g);
        return <div key={i} style={{ marginBottom:2 }}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : <span key={j}>{p}</span>)}</div>;
      }
      if (/^- /.test(line)) {
        return <div key={i} style={{ paddingLeft:16, marginBottom:2, color:"#475569" }}>•&nbsp;{line.slice(2)}</div>;
      }
      if (/^(Contention|Layer|Sub-argument|Voter|CONTENTION|LAYER|VOTER|SPEECH)\s/i.test(line)) {
        return <div key={i} style={{ fontWeight:700, color:"#4f46e5", marginTop:14, marginBottom:4, fontSize:13, textTransform:"uppercase", letterSpacing:"0.04em" }}>{line}</div>;
      }
      if (/^(CLAIM|WARRANT|IMPACT|Claim:|Warrant:|Impact:)/i.test(line)) {
        return <div key={i} style={{ fontWeight:700, color:"#0f766e", marginTop:8, marginBottom:2, fontSize:12, fontFamily:"monospace" }}>{line}</div>;
      }
      if (line.trim() === "") return <div key={i} style={{ height:8 }} />;
      return <div key={i} style={{ marginBottom:2, lineHeight:1.7 }}>{line}</div>;
    });
  };

  const getCurrentSpeechLabel = () => {
    if (speechNumber === 2) return "YOUR SPEECH 2 — Refute & Build Your Case";
    if (speechNumber === 4) return "YOUR SPEECH 4 — Continue the Clash";
    if (speechNumber === 6) return "YOUR SPEECH 6 — Final Whip";
    return null;
  };

  const isUserTurn = practiceMode && [2, 4, 6].includes(speechNumber) && !loading;
  const canChat = resolutionSet && side && !loading;

  // ── LANDING ──
  if (appMode === "landing") {
    return (
      <div style={s.app}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>⚖</div>
            <div>
              <p style={s.headerTitle}>Parli Coach</p>
              <p style={s.headerSub}>HS Parliamentary Debate</p>
            </div>
          </div>
        </header>
        <div style={s.landing}>
          <div style={s.landingCard}>
            <div style={s.landingIcon}>⚖️</div>
            <p style={s.landingTitle}>Ready to debate.</p>
            <p style={s.landingSubtitle}>Generate a full case or simulate a complete debate round against the AI.</p>
            <div style={s.landingGrid}>
              <button style={s.landingBtnCase} onClick={() => setAppMode("case")}>
                <span style={s.landingBtnIcon}>📋</span>
                Case Generator
                <span style={s.landingBtnSub}>Build a full 8-min case</span>
              </button>
              <button style={s.landingBtnPractice} onClick={() => setAppMode("practice_setup")}>
                <span style={s.landingBtnIcon}>⚔️</span>
                Full Round Practice
                <span style={s.landingBtnSub}>Simulate a complete round</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PRACTICE SETUP ──
  if (appMode === "practice_setup") {
    return (
      <div style={s.app}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>⚖</div>
            <div>
              <p style={s.headerTitle}>Parli Coach</p>
              <p style={s.headerSub}>HS Parliamentary Debate</p>
            </div>
          </div>
          <span style={s.badgePractice}>⚔ PRACTICE</span>
        </header>
        <div style={s.practiceLanding}>
          <div style={s.practiceLandingCard}>
            <div style={{ fontSize:36, marginBottom:12 }}>⚔️</div>
            <p style={s.practiceLandingTitle}>Full Round Practice</p>
            <p style={s.practiceLandingSubtitle}>6 speeches. The AI debates you for real — you refute, extend, and weigh just like a real round.</p>

            {/* Side selection always shown */}
            <div style={{ marginBottom:20 }}>
              <p style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"monospace", marginBottom:8 }}>Pick Your Side</p>
              <div style={s.sideGrid}>
                <button style={side === "gov" ? s.btnGovActive : s.btnGovInactive} onClick={() => setSide("gov")}>GOV</button>
                <button style={side === "opp" ? s.btnOppActive : s.btnOppInactive} onClick={() => setSide("opp")}>OPP</button>
              </div>
            </div>

            {side && practiceResMode === null && (
              <>
                <p style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"monospace", marginBottom:12 }}>Resolution</p>
                <div style={s.practiceResGrid}>
                  <button style={s.practiceResBtn} onClick={() => handleGenerateResolution(side)}>
                    <span style={{ fontSize:24 }}>🎲</span>
                    Generate one
                  </button>
                  <button style={s.practiceResBtnAlt} onClick={() => setPracticeResMode("custom")}>
                    <span style={{ fontSize:24 }}>✏️</span>
                    I have my own
                  </button>
                </div>
              </>
            )}

            {practiceResMode === "generating" && (
              <div style={{ color:"#94a3b8", fontSize:13, padding:"20px 0" }}>Setting up your round...</div>
            )}

            {practiceResMode === "custom" && side && (
              <>
                <input
                  autoFocus
                  style={s.practiceResInput}
                  placeholder="Enter your resolution..."
                  value={practiceCustomRes}
                  onChange={(e) => setPracticeCustomRes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && practiceCustomRes.trim()) {
                      startPracticeWithResolution(practiceCustomRes.trim(), side);
                    }
                  }}
                />
                <button
                  style={{ ...s.practiceResSubmit, opacity: practiceCustomRes.trim() ? 1 : 0.5 }}
                  disabled={!practiceCustomRes.trim()}
                  onClick={() => startPracticeWithResolution(practiceCustomRes.trim(), side)}
                >
                  Start Round →
                </button>
              </>
            )}

            <button style={s.backBtn} onClick={resetToLanding}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ── CASE GENERATOR ──
  if (appMode === "case") {
    return (
      <div style={s.app}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.logo}>⚖</div>
            <div>
              <p style={s.headerTitle}>Parli Coach</p>
              <p style={s.headerSub}>HS Parliamentary Debate</p>
            </div>
          </div>
          <div style={s.headerBadges}>
            {resolutionSet && side && <span style={side === "gov" ? s.badgeGov : s.badgeOpp}>{side === "gov" ? "▲ GOV" : "▼ OPP"}</span>}
            <button onClick={resetToLanding} style={{ background:"none", border:"1px solid #e2e8f0", borderRadius:8, padding:"4px 10px", fontSize:11, color:"#94a3b8", cursor:"pointer" }}>← Home</button>
          </div>
        </header>
        <div style={s.body}>
          <aside style={s.sidebar}>
            <div>
              <p style={s.sideLabel}>Resolution</p>
              <textarea style={s.textarea} rows={3} placeholder="Enter the resolution..." value={resolution} onChange={(e) => setResolution(e.target.value)} disabled={resolutionSet} />
              {!resolutionSet
                ? <button style={s.btnPrimary} onClick={() => { if (resolution.trim()) { setResolutionSet(true); setMessages([]); } }} disabled={!resolution.trim()}>Set Resolution</button>
                : <button style={s.btnSecondary} onClick={() => { setResolutionSet(false); setSide(null); setMessages([]); }}>Change</button>
              }
            </div>
            {resolutionSet && (
              <div>
                <p style={s.sideLabel}>Side</p>
                <div style={s.sideGrid}>
                  <button style={side === "gov" ? s.btnGovActive : s.btnGovInactive} onClick={() => setSide("gov")}>GOV</button>
                  <button style={side === "opp" ? s.btnOppActive : s.btnOppInactive} onClick={() => setSide("opp")}>OPP</button>
                </div>
              </div>
            )}
            {resolutionSet && side && (
              <div>
                <p style={s.sideLabel}>Speech</p>
                <select style={s.select} value={speechType} onChange={(e) => setSpeechType(e.target.value)}>
                  <option value="constructive">{side === "gov" ? "PM Constructive" : "LO Constructive"}</option>
                  <option value="extension">{side === "gov" ? "MG Extension" : "MO Extension"}</option>
                  <option value="whip">{side === "gov" ? "Gov Whip (3rd)" : "Opp Whip (3rd)"}</option>
                </select>
              </div>
            )}
            {resolutionSet && side && (
              <div>
                <p style={s.sideLabel}>Generate</p>
                {[
                  { key:"case", icon:"📋", label:"Full Case" },
                  { key:"whip", icon:"🏁", label:"Whip Speech" },
                  { key:"plan", icon:"📄", label:"Write a Plan" },
                  { key:"counterplan", icon:"↩️", label:"Counterplan" },
                ].map(({ key, icon, label }) => (
                  <button key={key} style={s.actionBtn} onClick={() => handleQuickAction(key)} disabled={loading}>{icon} {label}</button>
                ))}
              </div>
            )}
            {messages.length > 0 && (
              <div>
                <p style={s.sideLabel}>Export</p>
                <button style={s.exportBtn} onClick={() => {
                  const content = messages.map((m) => `[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n---\n\n");
                  const blob = new Blob([`RESOLUTION: ${resolution}\nSIDE: ${side?.toUpperCase()}\n\n${content}`], { type:"text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `parli-case-${Date.now()}.txt`;
                  a.click();
                }}>⬇ Export .txt</button>
              </div>
            )}
          </aside>

          <main style={s.chat}>
            <div style={s.messages}>
              {messages.length === 0 && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", textAlign:"center", gap:8 }}>
                  <div style={{ fontSize:48 }}>⚖️</div>
                  <p style={{ fontSize:22, fontWeight:700, margin:0 }}>Ready to debate.</p>
                  <p style={{ fontSize:13, color:"#94a3b8", maxWidth:280, lineHeight:1.6, margin:0 }}>Set a resolution, pick your side, then generate a case.</p>
                  {!resolutionSet && <p style={{ fontSize:13, color:"#4f46e5", fontWeight:600, margin:0 }}>← Start with a resolution</p>}
                  {resolutionSet && !side && <p style={{ fontSize:13, color:"#4f46e5", fontWeight:600, margin:0 }}>← Pick Government or Opposition</p>}
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={msg.role === "user" ? s.msgWrapUser : s.msgWrapAsst}>
                  <div style={msg.role === "user" ? s.msgUser : s.msgAsst}>
                    {msg.isFeedback && <div style={{ ...s.msgTag, color:"rgba(255,255,255,0.7)" }}>✏ Revision Request</div>}
                    {msg.role === "assistant" ? <div>{formatMessage(msg.content)}</div> : <p style={{ margin:0, lineHeight:1.6 }}>{msg.content}</p>}
                    {msg.role === "assistant" && i === messages.length - 1 && !loading && (
                      <div style={s.msgActions}>
                        <button style={s.smallBtn} onClick={() => setFeedbackMode(i)}>✏ Request Revision</button>
                        <button style={s.smallBtn} onClick={() => navigator.clipboard.writeText(msg.content)}>📋 Copy</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={s.msgWrapAsst}>
                  <div style={s.msgAsst}>
                    <span style={{ color:"#94a3b8", fontSize:13, marginRight:8 }}>Generating</span>
                    <span style={s.loadingDot} /><span style={s.loadingDot} /><span style={s.loadingDot} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {feedbackMode !== null && (
              <div style={s.revBar}>
                <div style={s.revLabel}>✏ Revision Request</div>
                <div style={s.revRow}>
                  <textarea autoFocus style={{ ...s.textarea, flex:1, marginBottom:0 }} rows={2} placeholder="What should change?" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (feedbackText.trim()) sendMessage(`REVISION REQUEST: ${feedbackText}`, true); }}} />
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <button style={s.revBtnSend} onClick={() => { if (feedbackText.trim()) sendMessage(`REVISION REQUEST: ${feedbackText}`, true); }} disabled={!feedbackText.trim()}>Send</button>
                    <button style={s.revBtnCancel} onClick={() => { setFeedbackMode(null); setFeedbackText(""); }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div style={s.inputBar}>
              <div style={s.inputRow}>
                <textarea style={s.inputTextarea} rows={2}
                  placeholder={!resolutionSet ? "Set a resolution to begin..." : !side ? "Pick a side first..." : "Ask anything..."}
                  value={input} onChange={(e) => setInput(e.target.value)} disabled={!canChat}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim() && canChat) sendMessage(input); }}} />
                <button style={!input.trim() || !canChat ? s.sendBtnDisabled : s.sendBtn}
                  onClick={() => { if (input.trim() && canChat) sendMessage(input); }} disabled={!input.trim() || !canChat}>Send</button>
              </div>
              <div style={s.inputHint}>Enter to send · Shift+Enter for new line</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── FULL ROUND PRACTICE ──
  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>⚖</div>
          <div>
            <p style={s.headerTitle}>Parli Coach</p>
            <p style={s.headerSub}>HS Parliamentary Debate</p>
          </div>
        </div>
        <div style={s.headerBadges}>
          <span style={side === "gov" ? s.badgeGov : s.badgeOpp}>{side === "gov" ? "▲ GOV" : "▼ OPP"}</span>
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
            <div style={s.speechTracker}>
              {SPEECH_LABELS.map((label, idx) => {
                const num = idx + 1;
                let style = s.speechBubblePending;
                if (speechNumber > num) style = s.speechBubbleDone;
                else if (speechNumber === num) style = s.speechBubbleCurrent;
                return <span key={idx} style={style}>{label}</span>;
              })}
            </div>
          </div>
          {roundOver && (
            <div>
              <p style={s.sideLabel}>Round Over</p>
              <button style={{ ...s.actionBtn, background:"#4f46e5", color:"#fff", border:"none", fontWeight:700 }} onClick={resetToLanding}>Start New Round</button>
            </div>
          )}
          <div>
            <button style={s.actionBtn} onClick={resetToLanding}>← Back to Home</button>
          </div>
        </aside>

        <main style={s.chat}>
          <div style={s.messages}>
            {messages.map((msg, i) => (
              <div key={i} style={msg.role === "user" ? s.msgWrapUser : s.msgWrapAsst}>
                <div style={
                  msg.role === "user" ? s.msgUser
                  : msg.isJudgeFeedback ? s.msgAsstJudge
                  : msg.isOpponentSpeech ? s.msgAsstOpponent
                  : s.msgAsst
                }>
                  {msg.isOpponentSpeech && <div style={{ ...s.msgTag, color:"#be123c" }}>⚔ Opponent</div>}
                  {msg.isJudgeFeedback && <div style={{ ...s.msgTag, color:"#15803d" }}>🏛 Judge's Critique</div>}
                  {msg.role === "assistant" ? <div>{formatMessage(msg.content)}</div> : <p style={{ margin:0, lineHeight:1.6 }}>{msg.content}</p>}
                </div>
              </div>
            ))}
            {loading && (
              <div style={s.msgWrapAsst}>
                <div style={s.msgAsstOpponent}>
                  <span style={{ color:"#94a3b8", fontSize:13, marginRight:8 }}>Opponent is speaking</span>
                  <span style={s.loadingDot} /><span style={s.loadingDot} /><span style={s.loadingDot} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={s.inputBar}>
            {isUserTurn && getCurrentSpeechLabel() && (
              <div style={s.speechLabel}>🎤 {getCurrentSpeechLabel()}</div>
            )}
            {!isUserTurn && !loading && !roundOver && speechNumber > 0 && (
              <div style={{ fontSize:11, color:"#94a3b8", marginBottom:6, fontFamily:"monospace" }}>Waiting for opponent...</div>
            )}
            {roundOver && (
              <div style={{ fontSize:11, color:"#15803d", fontWeight:700, marginBottom:6, fontFamily:"monospace" }}>✓ Round complete — see judge's critique above</div>
            )}
            <div style={s.inputRow}>
              <textarea
                style={s.inputTextarea}
                rows={3}
                placeholder={
                  roundOver ? "Round is over. Start a new round from the sidebar."
                  : !isUserTurn ? "Wait for the opponent to finish..."
                  : "Deliver your speech here..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!isUserTurn || roundOver}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && isUserTurn) handleUserSpeech();
                  }
                }}
              />
              <button
                style={!input.trim() || !isUserTurn || roundOver ? s.sendBtnDisabled : s.sendBtn}
                onClick={handleUserSpeech}
                disabled={!input.trim() || !isUserTurn || roundOver}
              >
                Deliver
              </button>
            </div>
            <div style={s.inputHint}>Enter to deliver · Shift+Enter for new line</div>
          </div>
        </main>
      </div>
    </div>
  );
}