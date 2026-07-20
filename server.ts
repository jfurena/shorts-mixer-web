import express from "express";

import path from "path";

import dotenv from "dotenv";

import multer from "multer";

import { exec } from "child_process";

import fs from "fs";

import util from "util";



const execAsync = util.promisify(exec);

const upload = multer({ dest: 'uploads/' });



dotenv.config();



const app = express();

app.use(express.json({ limit: "50mb" }));



const PORT = 3000;



// API Routes

app.get("/api/health", (req, res) => {

  res.json({ status: "ok" });

});



app.post("/api/analyze-video", async (req, res) => {

  try {

    const { title, description, duration, language, tone, keywords, transcript } = req.body;



    if (!title) {

      return res.status(400).json({ error: "El título del video es requerido." });

    }



    const videoDuration = Number(duration) || 60;

    const langLabel = language === "en" ? "Inglés" : "Español";



    // System instruction and user prompt to guide Mistral in generating perfect vertical clips using exact timestamps

    const systemInstruction = `Eres un editor de video experto en Inteligencia Artificial y un estratega de contenido viral.

Tu tarea es analizar los detalles de un video y extraer los momentos más destacados en formato de clips verticales OPTIMIZADOS para TikTok, YouTube Shorts, Instagram Reels y Facebook Reels.

CRÍTICO DE DURACIÓN: Cada clip DEBE durar entre 45 y 59 segundos. NUNCA menos de 45s ni 60s o más. Esto es OBLIGATORIO para maximizar el alcance en los algoritmos de todas las plataformas.

CRÍTICO DE TIEMPO: La transcripción incluye marcas de tiempo exactas en el formato [inicio - fin]. DEBES usar esos tiempos para tus clips y subtítulos. No inventes los tiempos.

Los subtítulos deben ser dinámicos, cortos (máximo 4-6 palabras por segmento) y bien distribuidos a lo largo de los 45-59 segundos.

Para cada clip extraído, genera un título llamativo, una justificación viral, una sugerencia de transición y un texto de publicación optimizado con hashtags.`;



    const userPrompt = `Analiza el siguiente video para extraer EXACTAMENTE 10 shorts destacados de acuerdo al tono seleccionado.



Detalles del Video:

- Título: ${title}

- Descripción/Tema: ${description || "No provista"}

- Duración total: ${videoDuration} segundos

- Idioma de salida: ${langLabel}

- Tono del Short: ${tone || "viral"}

- Palabras clave: ${keywords || "No provistas"}



${transcript ? `Transcripción con Marcas de Tiempo Exactas:\n${transcript}\n\nIMPORTANTE: Usa los tiempos [inicio - fin] provistos en la transcripción para sincronizar perfectamente los subtítulos de tu respuesta.` : "No se proveyó transcripción. Por favor, crea un guión de diálogos creíbles simulando la transcripción."}



REGLA CRÍTICA: Cada clip DEBE tener una duración (endTime - startTime) de entre 45 y 59 segundos exactos. Es OBLIGATORIO para que los shorts sean detectados por los algoritmos de TikTok, YouTube Shorts, Instagram Reels y Facebook Reels. Genera suficientes subtítulos para cubrir toda la duración (un segmento cada 5-7 segundos aproximadamente).



Formatea la respuesta exactamente en JSON de acuerdo al siguiente esquema:

{

  "title": "Título del video procesado",

  "summary": "Resumen general del análisis viral",

  "topic": "Tema principal detectado",

  "totalEstimatedClips": 3,

  "clips": [

    {

      "id": "clip-1",

      "title": "Título gancho del clip (ej: ¡El secreto que no te cuentan!)",

      "startTime": 5.0,

      "endTime": 22.0,

      "duration": 17.0,

      "viralScore": 95,

      "reason": "Explicación de por qué este momento mantendrá la retención del usuario en los primeros 3 segundos.",

      "transition": "Zoom In" or "Glitch" or "Slide Left" or "Flash Fade",

      "subtitles": [

        { "text": "¡El secreto mejor guardado!", "start": 5.0, "end": 7.2 },

        { "text": "que nadie te está diciendo", "start": 7.3, "end": 9.5 },

        { "text": "sobre este tema...", "start": 9.6, "end": 11.8 }

      ],

      "caption": "Copia persuasiva para la publicación en redes sociales.",

      "hashtags": ["fyp", "parati", "viral", "editor"]



    const videoDuration = Number(duration) || 60;

    const langLabel = language === "en" ? "Inglés" : "Español";



    // System instruction and user prompt to guide Mistral in generating perfect vertical clips using exact timestamps

    const systemInstruction = `Eres un editor de video experto en IA y estratega de contenido viral.

Tu tarea es analizar la transcripción de un video y extraer EXACTAMENTE 10 momentos virales en formato de clips verticales para TikTok, YouTube Shorts, Instagram Reels y Facebook Reels.



REGLAS ABSOLUTAS:

1. DURACIÓN: Cada clip DEBE durar entre 45 y 59 segundos exactos (endTime - startTime). NUNCA menos de 45s ni 60s o más.

2. SUBTÍTULOS PERFECTAMENTE SINCRONIZADOS: Los timestamps de cada subtítulo ({ "start": X, "end": Y }) DEBEN corresponder EXACTAMENTE a las marcas de tiempo de la transcripción provista. Copia el texto y los tiempos LITERALMENTE de la transcripción. NUNCA inventes tiempos de subtítulos.

3. COBERTURA: Genera un segmento de subtítulo por cada línea de transcripción dentro del clip. NO dejes huecos grandes sin subtítulos.

4. Los tiempos en los subtítulos son TIEMPOS ABSOLUTOS del video (no relativos al clip). Por ejemplo, si el clip va de 120.0s a 175.0s, y hay una frase en la transcripción a [122.5s - 127.0s], el subtítulo tendrá "start": 122.5, "end": 127.0.`;



    const userPrompt = `Analiza el siguiente video y extrae EXACTAMENTE 10 shorts virales según el tono seleccionado.



Detalles del Video:

- Título: ${title}

- Descripción/Tema: ${description || "No provista"}

- Duración total: ${videoDuration} segundos

- Idioma de salida: ${langLabel}

- Tono del Short: ${tone || "viral"}

- Palabras clave: ${keywords || "No provistas"}



${transcript ? `=== TRANSCRIPCIÓN CON TIMESTAMPS EXACTOS ===

${transcript}

=== FIN DE TRANSCRIPCIÓN ===



INSTRUCCION CRÍTICA PARA SUBTÍTULOS:

Cada objeto de subtítulo { "text": "...", "start": X, "end": Y } DEBE:

- Tomar el texto LITERALMENTE de las líneas de la transcripción de arriba

- Usar los tiempos de inicio y fin EXACTAMENTE como aparecen en la transcripción (formato [Xs - Ys])

- NO redondear ni ajustar los tiempos

- Cubrir CADA línea de transcripción que caiga dentro del clip

Esto es lo que garantiza que los subtítulos estén sincronizados con lo que se dice en el video.` : `No se proveyó transcripción. Genera subtítulos creativos imaginando el diálogo del video.`}



REGLA DE DURACIÓN OBLIGATORIA: endTime - startTime DEBE estar entre 45 y 59 segundos.



Responde EXCLUSIVAMENTE con JSON válido siguiendo este esquema:

{

  "title": "Título del video procesado",

  "summary": "Resumen general del análisis viral",

  "topic": "Tema principal detectado",

  "totalEstimatedClips": 3,

  "clips": [

    {

      "id": "clip-1",

      "title": "Título gancho del clip",

      "startTime": 120.0,

      "endTime": 174.5,

      "duration": 54.5,

      "viralScore": 95,

      "reason": "Explicación de por qué este momento es viral.",

      "transition": "Zoom In",

      "subtitles": [

        { "text": "texto exacto de la transcripción", "start": 120.0, "end": 124.5 },

        { "text": "siguiente frase de la transcripción", "start": 124.6, "end": 129.0 }

      ],

      "caption": "Texto para publicación en redes sociales.",

      "hashtags": ["fyp", "parati", "viral"]

    }



    if (!mistralResponse.ok) {

      const errText = await mistralResponse.text();

      throw new Error(`Mistral API error: ${mistralResponse.status} - ${errText}`);

    }



    const mistralData = await mistralResponse.json();

    const resultText = mistralData.choices[0].message.content || "{}";

    const data = JSON.parse(resultText);

    const transcript = result.text;
    const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

        "Authorization": `Bearer ${mistralApiKey}`

      },

      body: JSON.stringify({

        model: "mistral-large-latest",

        messages: [

          { role: "system", content: systemInstruction },

          { role: "user", content: userPrompt }

        ],

        response_format: { type: "json_object" }

      })

    });



    if (!mistralResponse.ok) {

      const errText = await mistralResponse.text();

      throw new Error(`Mistral API error: ${mistralResponse.status} - ${errText}`);

    }



    const mistralData = await mistralResponse.json();

    const resultText = mistralData.choices[0].message.content || "{}";

    const data = JSON.parse(resultText);



    // Override AI hallucinated subtitles with strictly sliced accurate transcript chunks

    if (data.clips && Array.isArray(data.clips) && transcript) {

      const parsedTranscript = parseTranscript(transcript);

      if (parsedTranscript.length > 0) {

        data.clips = data.clips.map((clip: any) => {

          const startTime = parseFloat(clip.startTime) || 0;

          const endTime = parseFloat(clip.endTime) || 0;

          

          // Slice the original transcript to find exactly what fits in this clip's time window

          const exactSubtitles = parsedTranscript.filter(sub => 

            (sub.start >= startTime && sub.start < endTime) ||

            (sub.end > startTime && sub.end <= endTime) ||

            (sub.start <= startTime && sub.end >= endTime)

          );

          

          return {

            ...clip,

            subtitles: exactSubtitles.length > 0 ? exactSubtitles : clip.subtitles

          };

        });

      }

    }



    // Post-process: split long subtitle segments so they show max 5 words at a time

    if (data.clips && Array.isArray(data.clips)) {

      data.clips = data.clips.map((clip: any) => ({

        ...clip,

        subtitles: splitSubtitles(clip.subtitles || [], 5)

      }));

    }



    res.json(data);

  } catch (error: any) {

    console.error("Error analyzing video with Mistral:", error);

    res.status(500).json({ error: error.message || "Error al procesar el análisis con Mistral." });

  }

});



app.post("/api/transcribe-video", upload.single("video"), async (req, res) => {

  try {

    if (!req.file) {

      return res.status(400).json({ error: "No video file provided" });

    }



    // Rename to preserve original extension so moviepy/ffmpeg can detect format

    const origExt1 = path.extname(req.file.originalname) || ".mp4";

    const videoPath = req.file.path + origExt1;

    fs.renameSync(req.file.path, videoPath);

    

    // Call Python script

    const { stdout, stderr } = await execAsync(`python transcribe.py "${videoPath}"`);

    

    let result;

    try {

      const lines = stdout.split("\n");

      const jsonLine = lines.find(line => line.trim().startsWith("{") && line.trim().endsWith("}"));

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

    res.status(500).json({ error: error.message || "Error al procesar la transcripción" });

  }

// === PROGRESS SSE STATE ===

let exportProgressState = 0;

let sseClients: any[] = [];



app.get("/api/export-progress", (req, res) => {

  res.setHeader("Content-Type", "text/event-stream");

  res.setHeader("Cache-Control", "no-cache");

  res.setHeader("Connection", "keep-alive");

  

  res.write(`data: ${exportProgressState}\n\n`);

  sseClients.push(res);

  

  req.on("close", () => {

    sseClients = sseClients.filter(client => client !== res);

  });

});



function broadcastProgress(progress: number) {

  exportProgressState = progress;

  sseClients.forEach(client => client.write(`data: ${progress}\n\n`));

}



// Convert "00:00:15.00" to seconds

function parseFfmpegTime(timeStr: string) {

  const parts = timeStr.split(':');

  if (parts.length === 3) {

    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);

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



    // Rename to preserve original extension so FFmpeg can detect format

    const origExt2 = path.extname(req.file.originalname) || ".mp4";

    const videoPath = req.file.path + origExt2;

    fs.renameSync(req.file.path, videoPath);

    const jsonPath = videoPath + "_clip.json";

    

    // Save clipData to a temporary JSON file (must use utf8 to avoid BOM issues)

       const sshHost = process.env.SSH_HOST;

    const sshKeyPath = process.env.SSH_KEY_PATH;



    let stdout = "";

    let stderr = "";

    let remoteDir = "";

    

    // Parse duration for progress and rendering engine preference

    const clipData = JSON.parse(clipDataStr);

    const totalDuration = clipData.duration || 15;

    const useRemoteServer = clipData.useRemoteServer !== false; // default true if missing

    

    exportProgressState = 10;

    broadcastProgress(10);

    

    try {

      if (useRemoteServer && sshHost && sshKeyPath) {

        console.log(`[SSH] Conectando a ${sshHost}...`);

        remoteDir = `/tmp/shorts_mixer_${Date.now()}`;

        

        // Ensure remote dir exists

        await execAsync(`ssh -o StrictHostKeyChecking=no -i "${sshKeyPath}" ${sshHost} "mkdir -p ${remoteDir}"`);

        

        // Upload video, json and export script

        const videoBase = path.basename(videoPath);

        const jsonBase = path.basename(jsonPath);

        await execAsync(`scp -o StrictHostKeyChecking=no -i "${sshKeyPath}" "${videoPath}" "${jsonPath}" "export.py" ${sshHost}:${remoteDir}/`);

        

        // Execute python script remotely using spawn to read stderr in real time

        console.log(`[SSH] Ejecutando export.py en ${sshHost}...`);

        

        await new Promise<void>((resolve, reject) => {

          const { spawn } = require('child_process');

          const child = spawn('ssh', [

            '-o', 'StrictHostKeyChecking=no',

            '-i', sshKeyPath,

            sshHost,

            `cd ${remoteDir} && python3 export.py "${remoteDir}/${videoBase}" "${remoteDir}/${jsonBase}"`

          ]);

          

          child.stdout.on('data', (data) => {

            stdout += data.toString();

          });

          

          child.stderr.on('data', (data) => {

            const str = data.toString();

            stderr += str;

            // Parse time=00:00:15.00

            const match = str.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);

            if (match) {

              const sec = parseFfmpegTime(match[1]);

              let prog = 10 + Math.floor((sec / totalDuration) * 80);

              if (prog > 90) prog = 90;

              broadcastProgress(prog);

            }

          });

          

          child.on('close', (code) => {

            if (code !== 0) reject(new Error(`SSH process exited with code ${code}`));

            else resolve();

          });

        });



      } else {

        // Call Python script locally

        console.log("[Local] Ejecutando export.py localmente...");

        await new Promise<void>((resolve, reject) => {

          const { spawn } = require('child_process');

          const child = spawn('python', ['export.py', videoPath, jsonPath]);

          

          child.stdout.on('data', (data) => {

            stdout += data.toString();

          });

          

          child.stderr.on('data', (data) => {

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

          

          child.on('close', (code) => {

            if (code !== 0) reject(new Error(`Local Python exited with code ${code}`));

            else resolve();

          });

        });

      }

    } catch (err: any) {

      console.error("Execution error:", err);

      return res.status(500).json({ error: "Fallo en la ejecución de export.py", details: err.message || String(err) });

    }



    broadcastProgress(95);



    let result;

    try {

      const lines = stdout.split("\n");

      const jsonLine = lines.find(line => line.trim().startsWith("{") && line.trim().endsWith("}"));

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

      return res.status(500).json({ error: result.error, details: result.details });

    }

    

    // Create Shorts-Exportados folder

    const exportFolder = path.join(require('os').homedir(), "Downloads", "Shorts-Exportados");

    if (!fs.existsSync(exportFolder)) {

      fs.mkdirSync(exportFolder, { recursive: true });

    }

    const finalName = `${clipData.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_final.mp4`;

    const finalDestPath = path.join(exportFolder, finalName);

    

    // Download remote output if using SSH directly to final dest

    if (useRemoteServer && sshHost && sshKeyPath && result.output_path) {

      console.log(`[SSH] Descargando video exportado desde ${sshHost}...`);

      await execAsync(`scp -o StrictHostKeyChecking=no -i "${sshKeyPath}" ${sshHost}:"${result.output_path}" "${finalDestPath}"`);

      // Cleanup remote

      await execAsync(`ssh -o StrictHostKeyChecking=no -i "${sshKeyPath}" ${sshHost} "rm -rf ${remoteDir}"`);

    } else if (result.output_path && fs.existsSync(result.output_path)) {

      fs.renameSync(result.output_path, finalDestPath);

    }

    

    broadcastProgress(100);

    

    // Cleanup temp files

    [videoPath, jsonPath, videoPath + ".srt"].forEach(p => {

      if (fs.existsSync(p)) fs.unlinkSync(p);

    });

    

    return res.json({ success: true, savedPath: finalDestPath });



  } catch (error: any) {

    console.error("Error exporting video:", error);

    res.status(500).json({ error: error.message || "Error al exportar el video" });

  }

});

    });
    
    return res.json({ success: true, savedPath: finalDestPath });

  } catch (error: any) {
    console.error("Error exporting video:", error);
    res.status(500).json({ error: error.message || "Error al exportar el video" });
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
