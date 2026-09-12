import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

function cleanText(value, max = 4000) {
  return String(value || "").trim().slice(0, max);
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "zephyr-assistant",
    time: new Date().toISOString()
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = cleanText(req.body.message);
    const memory = cleanText(req.body.memory, 6000);
    const language = cleanText(req.body.language, 40);

    if (!message) {
      return res.status(400).json({
        error: "A message is required."
      });
    }

    if (!process.env.AI_API_KEY) {
      return res.json({
        reply:
          `Demo mode is active. You said: "${message}". ` +
          `Add AI_API_KEY to .env to enable an AI model.`
      });
    }

    const apiUrl =
      process.env.AI_API_URL ||
      "https://api.openai.com/v1/chat/completions";

    const model = process.env.AI_MODEL || "gpt-4o-mini";

    const systemPrompt = `
You are Zephyr, a helpful multilingual voice assistant.
Answer naturally and briefly because your answer will be spoken aloud.
The user's preferred language is: ${language}.
You may explain how to open websites, manage reminders, and remember preferences.
Never claim that you performed an action unless the browser actually performed it.
User memory:
${memory}
`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        error: "AI provider request failed.",
        details: errorText.slice(0, 500)
      });
    }

    const data = await response.json();

    const reply =
      data.choices?.[0]?.message?.content ||
      "I could not generate a response.";

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Server error while processing the request."
    });
  }
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const prompt = cleanText(req.body.prompt, 2000);

    if (!prompt) {
      return res.status(400).json({
        error: "An image prompt is required."
      });
    }

    /*
      This is intentionally provider-neutral.

      Add your image provider's API request here. Keep the API key on
      the server. Do not place it in public/app.js or index.html.
    */

    if (!process.env.IMAGE_API_URL || !process.env.IMAGE_API_KEY) {
      return res.json({
        demo: true,
        message:
          "Image generation is not configured. Add IMAGE_API_URL and IMAGE_API_KEY to .env.",
        prompt
      });
    }

    const response = await fetch(process.env.IMAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.IMAGE_API_KEY}`
      },
      body: JSON.stringify({
        prompt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();

      return res.status(502).json({
        error: "Image provider request failed.",
        details: errorText.slice(0, 500)
      });
    }

    const data = await response.json();

    res.json({
      image: data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Image generation failed."
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Zephyr Assistant running at http://localhost:${PORT}`);
});
