export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { system, messages } = req.body;

  // Convert to Gemini format and merge consecutive same-role messages
  const rawContents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const contents = [];
  for (const msg of rawContents) {
    const last = contents[contents.length - 1];
    if (last && last.role === msg.role) {
      // Merge into previous message
      last.parts[0].text += "\n\n" + msg.parts[0].text;
    } else {
      contents.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
    }
  }

  // Gemini requires conversation to start with a user message
  if (contents.length === 0 || contents[0].role !== "user") {
    return res.status(400).json({ error: "Conversation must start with a user message" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: 8000 },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(response.status).json({ error: data.error?.message || "Gemini API error" });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("No text in Gemini response:", JSON.stringify(data));
      return res.status(500).json({ error: "No text returned from Gemini" });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
