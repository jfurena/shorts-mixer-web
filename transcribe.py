import sys
import os
import json
import requests
from moviepy.editor import VideoFileClip

# Obtenemos la clave de API por variable de entorno
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

def transcribe(video_path):
    if not os.path.exists(video_path):
        print(json.dumps({"error": f"File not found: {video_path}"}))
        sys.exit(1)

    try:
        # Extraer audio con moviepy
        clip = VideoFileClip(video_path)
        audio_path = video_path + ".mp3"
        
        # Guardar como mp3 con bitrate bajo (64k) para asegurar un archivo < 25MB
        clip.audio.write_audiofile(audio_path, bitrate="64k", verbose=False, logger=None)
        clip.close()

        # Enviar a Groq API
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}"
        }
        
        with open(audio_path, "rb") as f:
            files = {
                "file": (os.path.basename(audio_path), f, "audio/mpeg")
            }
            data = {
                "model": "whisper-large-v3", # Usamos whisper de Groq
                "response_format": "verbose_json"
            }
            response = requests.post(url, headers=headers, files=files, data=data)
            
        # Eliminar el archivo de audio temporal
        if os.path.exists(audio_path):
            os.remove(audio_path)
            
        if response.status_code == 200:
            result = response.json()
            segments = result.get("segments", [])
            formatted_text = ""
            for seg in segments:
                start = seg.get("start", 0.0)
                end = seg.get("end", 0.0)
                text = seg.get("text", "").strip()
                if text:
                    # Format: exact numeric timestamps that Mistral can copy directly into subtitle JSON
                    formatted_text += f"[{start:.2f}s - {end:.2f}s]: {text}\n"
            
            if not formatted_text:
                formatted_text = result.get("text", "")
                
            print(json.dumps({"text": formatted_text.strip()}))
        else:
            print(json.dumps({"error": f"API Error {response.status_code}: {response.text}"}))
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python transcribe.py <path_to_video>"}))
        sys.exit(1)
        
    transcribe(sys.argv[1])
