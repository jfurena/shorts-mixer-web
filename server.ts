import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import util from "util";
import { createServer as createViteServer } from "vite";

const execAsync = util.promisify(exec);
const upload = multer({ dest: "uploads/" });

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const exportsDir = path.join(__dirname, 'public', 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}
app.use('/exports', express.static(exportsDir));

const PORT = 3000;

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/transcribe-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    const videoPath = req.file.path;

    // Call Python script
    const { stdout, stderr } = await execAsync(
      `python transcribe.py "${videoPath}"`,
    );

    let result;
    try {
      const lines = stdout.split("\\n");
      const jsonLine = lines.find(
        (line) => line.trim().startsWith("{") && line.trim().endsWith("}"),
      );
      if (jsonLine) {
        result = JSON.parse(jsonLine);
      } else {
        throw new Error("No JSON found in stdout");
      }
    } catch (e) {
      console.error("Python output:", stdout);
      console.error("Python error:", stderr);
      return res.status(500).json({ error: "Failed to parse Python response" });
    }

    // Clean up uploaded file
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ text: result.text });
  } catch (error: any) {
    console.error("Error transcribing video:", error);
    res
      .status(500)
      .json({ error: error.message || "Error al procesar la transcripción" });
  }
});

app.post("/api/analyze-video", async (req, res) => {
  try {
    const {
      title,
      description,
      duration,
      language,
      tone,
      keywords,
      transcript,
    } = req.body;

    if (!title) {
      return res
        .status(400)
        .json({ error: "El título del video es requerido." });
    }

    const videoDuration = Number(duration) || 60;
    const langLabel = language === "en" ? "Inglés" : "Español";

    const systemInstruction = `Eres un editor de video experto en Inteligencia Artificial y un estratega de contenido viral.
Tu tarea es analizar la transcripción de un video y extraer momentos virales en formato de clips verticales para TikTok, YouTube Shorts, Instagram Reels y Facebook Reels.

REGLAS ABSOLUTAS:
1. DURACIÓN: Cada clip DEBE durar entre 45 y 59 segundos exactos (endTime - startTime). NUNCA menos de 45s ni 60s o más.
2. SUBTÍTULOS PERFECTAMENTE SINCRONIZADOS: Los timestamps de cada subtítulo ({ "start": X, "end": Y }) DEBEN corresponder EXACTAMENTE a las marcas de tiempo de la transcripción provista. Copia el texto y los tiempos LITERALMENTE de la transcripción. NUNCA inventes tiempos de subtítulos.
3. COBERTURA: Genera un segmento de subtítulo por cada línea de transcripción dentro del clip. NO dejes huecos grandes sin subtítulos.
4. Los tiempos en los subtítulos son TIEMPOS ABSOLUTOS del video (no relativos al clip). Por ejemplo, si el clip va de 120.0s a 175.0s, y hay una frase en la transcripción a [122.5s - 127.0s], el subtítulo tendrá "start": 122.5, "end": 127.0.`;

    const userPrompt = `Analiza el siguiente video para extraer EXACTAMENTE 10 shorts destacados de acuerdo al tono seleccionado.

Detalles del Video:
- Título: ${title}
- Descripción/Tema: ${description || "No provista"}
- Duración total: ${videoDuration} segundos
- Idioma de salida: ${langLabel}
- Tono del Short: ${tone || "viral"}
- Palabras clave: ${keywords || "No provistas"}

${
  transcript
    ? `Transcripción con Marcas de Tiempo Exactas:
${transcript}

IMPORTANTE: Usa los tiempos [inicio - fin] provistos en la transcripción para sincronizar perfectamente los subtítulos de tu respuesta.`
    : "No se proveyó transcripción. Por favor, crea un guión de diálogos creíbles simulando la transcripción."
}

REGLA CRITICA E INQUEBRANTABLE: Debes extraer EXACTAMENTE 10 clips. CADA clip DEBE tener una duracion estricta de entre 45 y 59 segundos. (endTime - startTime) >= 45. NUNCA extraigas clips cortos de 10 o 20 segundos.

Formatea la respuesta exactamente en JSON de acuerdo al siguiente esquema:
{
  "title": "Título del video procesado",
  "summary": "Resumen general del análisis viral",
  "topic": "Tema principal detectado",
  "totalEstimatedClips": 3,
  "clips": [
    {
      "id": "clip-1",
      "title": "Título gancho del clip",
      "startTime": 5.0,
      "endTime": 22.0,
      "duration": 17.0,
      "viralScore": 95,
      "reason": "Explicación de por qué este momento mantendrá la retención.",
      "transition": "Zoom In",
      "subtitles": [
        { "text": "¡El secreto mejor guardado!", "start": 5.0, "end": 7.2 }
      ],
      "caption": "Copia persuasiva",
      "hashtags": ["fyp", "parati"]
    }
  ]
}`;

    const mistralApiKey = process.env.MISTRAL_API_KEY || "VtPQhqe14olTDwNUhDgCKymLbFxSR2FN";
    if (!mistralApiKey) {
      return res.status(500).json({ error: "Mistral API key not configured" });
    }

    const mistralResponse = await fetch(
      "https://api.mistral.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mistralApiKey}`,
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
            max_tokens: 8192,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!mistralResponse.ok) {
      const errText = await mistralResponse.text();
      throw new Error(
        `Mistral API error: ${mistralResponse.status} - ${errText}`,
      );
    }

    const mistralData = await mistralResponse.json();
    const resultText = mistralData.choices[0].message.content || "{}";
    const data = JSON.parse(resultText);

    // Post-process subtitles to enforce TikTok style (max 2-3 words per line)
    if (data.clips && Array.isArray(data.clips)) {
      data.clips.forEach((clip: any) => {
        if (clip.subtitles && Array.isArray(clip.subtitles)) {
          const newSubtitles: any[] = [];
          clip.subtitles.forEach((sub: any) => {
            const words = sub.text.trim().split(/\s+/);
            if (words.length <= 3) {
              newSubtitles.push(sub);
            } else {
              // Split into chunks of 3 words max
              const duration = sub.end - sub.start;
              const timePerWord = duration / words.length;
              let currentChunk: string[] = [];
              let chunkStart = sub.start;
              
              for (let i = 0; i < words.length; i++) {
                currentChunk.push(words[i]);
                if (currentChunk.length >= 3 || i === words.length - 1) {
                  const chunkEnd = chunkStart + (timePerWord * currentChunk.length);
                  newSubtitles.push({
                    text: currentChunk.join(" "),
                    start: parseFloat(chunkStart.toFixed(2)),
                    end: parseFloat(chunkEnd.toFixed(2))
                  });
                  currentChunk = [];
                  chunkStart = chunkEnd;
                }
              }
            }
          });
          clip.subtitles = newSubtitles;
        }
      });
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error analyzing video with Mistral:", error);
    res.status(500).json({
      error: error.message || "Error al procesar el análisis con Mistral.",
    });
  }
});

// === PROGRESS SSE STATE ===
let exportProgressState = 0;
let sseClients: any[] = [];

app.get("/api/export-progress", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${exportProgressState}

`);
  sseClients.push(res);

  req.on("close", () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});

function broadcastProgress(progress: number) {
  exportProgressState = progress;
  sseClients.forEach((client) =>
    client.write(`data: ${progress}

`),
  );
}

// Convert "00:00:15.00" to seconds
function parseFfmpegTime(timeStr: string) {
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    return (
      parseFloat(parts[0]) * 3600 +
      parseFloat(parts[1]) * 60 +
      parseFloat(parts[2])
    );
  }
  return 0;
}

app.post("/api/export-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }
    const clipDataStr = req.body.clipData;
    if (!clipDataStr) {
      return res.status(400).json({ error: "No clipData provided" });
    }

    const origExt2 = path.extname(req.file.originalname) || ".mp4";
    const videoPath = req.file.path + origExt2;
    fs.renameSync(req.file.path, videoPath);
    const jsonPath = videoPath + "_clip.json";

    // Save clipData to file
    fs.writeFileSync(jsonPath, clipDataStr, 'utf8');

    let stdout = "";
    let stderr = "";

    const clipData = JSON.parse(clipDataStr);
    const totalDuration = clipData.duration || 15;
    
    exportProgressState = 10;
    broadcastProgress(10);

    // Call Python script locally on VPS
    console.log("[Local] Ejecutando export.py localmente...");
    await new Promise<void>((resolve, reject) => {
      const { spawn } = require("child_process");
      const child = spawn("python", ["export.py", videoPath, jsonPath]);

      child.stdout.on("data", (data: any) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data: any) => {
        const str = data.toString();
        stderr += str;
        const match = str.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (match) {
          const sec = parseFfmpegTime(match[1]);
          let prog = 10 + Math.floor((sec / totalDuration) * 80);
          if (prog > 90) prog = 90;
          broadcastProgress(prog);
        }
      });

      child.on("close", (code: number) => {
        if (code !== 0) reject(new Error(`Proceso local falló con código ${code}`));
        else resolve();
      });
    });

    let result: any = {};
    try {
      const lines = stdout.split("\n");
      const jsonLine = lines.find(
        (line) => line.trim().startsWith("{") && line.trim().endsWith("}"),
      );
      if (jsonLine) {
        result = JSON.parse(jsonLine);
      } else {
        throw new Error("No JSON found in stdout");
      }
    } catch (e) {
      console.error("Python output:", stdout);
      console.error("Python error:", stderr);
      return res.status(500).json({ error: "Failed to parse Python response" });
    }

    if (result.error) {
      return res
        .status(500)
        .json({ error: result.error, details: result.details });
    }

    // Save to public/exports for web download
    const finalName = `${clipData.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}.mp4`;
    const finalDestPath = path.join(__dirname, 'public', 'exports', finalName);
    
    if (result.output_path && fs.existsSync(result.output_path)) {
      fs.renameSync(result.output_path, finalDestPath);
    }

    broadcastProgress(100);

    // Cleanup temp files
    [videoPath, jsonPath, videoPath + ".srt"].forEach((p) => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    const downloadUrl = `/exports/${finalName}`;
    return res.json({ success: true, url: downloadUrl, savedPath: finalDestPath });
  } catch (error: any) {
    console.error("Error exporting video:", error);
    res
      .status(500)
      .json({ error: error.message || "Error al exportar el video" });
  }
});

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, server.cjs is located inside the dist/ folder, so __dirname IS the dist path
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap();
