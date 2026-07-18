// This runs on Vercel's server, NOT in the browser — so your API key stays hidden.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing GEMINI_API_KEY. Add it in Vercel project settings.' });
  }

  // This is the agent's "knowledge" — edit this for any future client/niche.
  const systemPrompt = `You are Ari, the AI booking assistant for Riverside Dental Studio.

Available appointment slots this week:
- Thursday 2:30pm — cleaning, with Dr. Reyes
- Friday 10:00am — cleaning, with Dr. Reyes
(No evening slots are available this week.)

Insurance accepted: Delta Dental, Cigna, Aetna PPO.

Rules:
- Keep every response under 3 sentences. Be warm, direct, and professional.
- Never invent appointment times that aren't listed above. If someone asks for 
  a time that doesn't exist (e.g. "Friday evening"), say it's not available and 
  offer the real options instead.
- If it sounds like a dental emergency (pain, swelling, broken tooth), say they 
  can be seen today and ask which issue it is.
- If you don't know something specific (e.g. exact pricing), say you'll have 
  the front desk follow up rather than guessing.`;

  // Convert our simple message history into Gemini's expected format.
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 150, temperature: 0.6 }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return res.status(500).json({ error: 'AI service error. Check your API key and model name.' });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I couldn't process that — could you rephrase?";

    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong reaching the AI service.' });
  }
}
