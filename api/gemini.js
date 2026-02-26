export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { system, messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No messages provided" });
  }

  const rawContents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content || "" }],
  }));

  const contents = [];
  for (const msg of rawContents) {
    const last = contents[contents.length - 1];
    if (last && last.role === msg.role) {
      last.parts[0].text += "\n\n" + msg.parts[0].text;
    } else {
      contents.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
    }
  }

  if (contents[0].role !== "user") {
    return res.status(400).json({ error: "First message must be from user" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system || "" }] },
          contents,
          generationConfig: {
            maxOutputTokens: 8000,
            temperature: 1.0,
            topP: 0.95,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", JSON.stringify(data));
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini API error",
      });
    }

    if (!data.candidates || data.candidates.length === 0) {
      console.error("No candidates:", JSON.stringify(data));
      return res.status(500).json({ error: "Gemini returned no candidates" });
    }

    const text = data.candidates[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Empty text:", JSON.stringify(data.candidates[0]));
      return res.status(500).json({ error: "Gemini returned empty text" });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
