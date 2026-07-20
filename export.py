import sys
import json
import os
import subprocess
import tempfile
import shutil

def find_ffmpeg():
    """Find ffmpeg: try imageio_ffmpeg first, then system ffmpeg."""
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and os.path.exists(exe):
            return exe
    except Exception:
        pass
    # fallback to system ffmpeg
    for name in ["ffmpeg", "ffmpeg.exe"]:
        found = shutil.which(name)
        if found:
            return found
    return None

def generate_srt(subtitles, clip_start, srt_path):
    """Generate a properly timed .srt file offset relative to clip_start."""
    with open(srt_path, "w", encoding="utf-8") as f:
        valid_idx = 1
        for sub in subtitles:
            raw_start = float(sub.get('start', 0))
            raw_end   = float(sub.get('end', 0))
            text = sub.get('text', '').strip()

            if not text:
                continue

            # Offset so time 0 = start of clip
            start = max(0.0, raw_start - clip_start)
            end   = max(0.0, raw_end   - clip_start)

            # Skip subtitles that fall entirely outside the clip
            if start == end:
                continue

            def fmt(secs):
                h  = int(secs // 3600)
                m  = int((secs % 3600) // 60)
                s  = int(secs % 60)
                ms = int((secs % 1) * 1000)
                return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

            f.write(f"{valid_idx}\n")
            f.write(f"{fmt(start)} --> {fmt(end)}\n")
            f.write(f"{text}\n\n")
            valid_idx += 1


def split_long_subtitles(subtitles, max_words=5):
    """
    Break any subtitle segment with more than max_words words into
    smaller chunks, distributing the time span proportionally.
    This prevents text overload / subtitle saturation on screen.
    """
    result = []
    for sub in subtitles:
        text = sub.get('text', '').strip()
        words = text.split()
        if len(words) <= max_words:
            result.append(sub)
            continue
        # Split into chunks
        start = float(sub.get('start', 0))
        end   = float(sub.get('end', 0))
        duration = end - start
        chunks = [words[i:i+max_words] for i in range(0, len(words), max_words)]
        chunk_dur = duration / len(chunks)
        for idx, chunk in enumerate(chunks):
            result.append({
                'text':  ' '.join(chunk),
                'start': round(start + idx * chunk_dur, 3),
                'end':   round(start + (idx + 1) * chunk_dur, 3)
            })
    return result


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python export.py <video_path> <json_data_path>"}))
        sys.exit(1)

    video_path = os.path.abspath(sys.argv[1])
    json_path  = os.path.abspath(sys.argv[2])

    if not os.path.exists(video_path):
        print(json.dumps({"error": f"Video file not found: {video_path}"}))
        sys.exit(1)

    if not os.path.exists(json_path):
        print(json.dumps({"error": f"JSON file not found: {json_path}"}))
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        clip_data = json.load(f)

    start_time = float(clip_data["startTime"])
    end_time   = float(clip_data["endTime"])
    subtitles  = clip_data.get("subtitles", [])

    # Extract export settings
    videoRatio = clip_data.get("videoRatio", "169")
    zoomCover  = clip_data.get("zoomCover", True)
    settings   = clip_data.get("settings", {})
    
    channel_name   = clip_data.get("channelName", "")
    channel_name_y = float(clip_data.get("channelNameY", 78))
    subtitle_y     = float(clip_data.get("subtitleY", 33))
    
    ffmpeg_exe = find_ffmpeg()
    if not ffmpeg_exe:
        print(json.dumps({"error": "ffmpeg not found. Please install ffmpeg and add it to PATH."}))
        sys.exit(1)

    # Convert Hex (#RRGGBB) to ASS color (&H00BBGGRR)
    def hex_to_ass(hex_str):
        if not hex_str or len(hex_str) < 7:
            return "&H00FFFFFF" # fallback white
        h = hex_str.lstrip('#')
        # ASS is BGR instead of RGB
        return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}"

    work_dir = tempfile.mkdtemp()
    try:
        ext = os.path.splitext(video_path)[1] or ".mp4"
        local_video = os.path.join(work_dir, "input" + ext)
        shutil.copy2(video_path, local_video)

        srt_path    = os.path.join(work_dir, "subs.srt")
        output_path = os.path.join(work_dir, "output.mp4")

        # Subtitle styling rules
        if settings.get("uppercase"):
            for s in subtitles:
                if "text" in s:
                    s["text"] = str(s["text"]).upper()

        # Split long subtitles into short chunks (max 5 words) for professional look
        subtitles = split_long_subtitles(subtitles, max_words=5)

        generate_srt(subtitles, start_time, srt_path)
        
        # Determine ASS alignment
        # We ALWAYS use 2 (Bottom Center) so MarginV correctly pushes up from the bottom
        alignment = "2" # Bottom Center

        primary_ass = hex_to_ass(settings.get("primaryColor", "#FFFFFF"))
        
        # Pick a safe Windows font based on the family string
        font_str = settings.get("fontFamily", "Arial").lower()
        if "impact" in font_str:
            font_name = "Impact"
        elif "monospace" in font_str:
            font_name = "Consolas"
        else:
            font_name = "Arial"

        font_size = settings.get("fontSize", 24)
        # Scale font size based on video height (UI usually renders at ~600px height)
        # 26px in 600px height is 4.3% -> in 1920 is ~83px
        scale_factor = expected_h / 600.0
        font_size = int(font_size * scale_factor)

        srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
        
        # Build dynamic style
        # Calculate absolute MarginV based on expected output height
        expected_h = 1920 if videoRatio == "916" else (1080 if videoRatio == "11" else 1080)
        margin_v = int(expected_h * (subtitle_y / 100.0))

        subtitle_style = (
            f"FontName={font_name},"
            f"FontSize={font_size},"
            f"PrimaryColour={primary_ass},"
            "OutlineColour=&H00000000,"
            "BackColour=&H80000000,"
            "Bold=1,"
            "BorderStyle=1,"
            "Outline=2,"
            "Shadow=1,"
            f"Alignment={alignment},"
            f"MarginV={margin_v}"
        )

        # Apply drawtext if channel_name is provided
        drawtext_filter = ""
        if channel_name:
            # y coordinate from top: h - (h * percentage)
            # Scale font size based on resolution
            channel_font_size = int(18 * (expected_h / 600.0))
            drawtext_filter = f",drawtext=text='{channel_name}':fontcolor=white:fontsize={channel_font_size}:x=(w-text_w)/2:y=(h-(h*{channel_name_y}/100)):shadowcolor=black:shadowx=4:shadowy=4"

        sub_filter = f"subtitles='{srt_escaped}':force_style='{subtitle_style}'{drawtext_filter}"

        # Aspect Ratio Cropping, Scaling & Padding
        # We standardize the output size using scale before adding subtitles/watermarks
        # to ensure our MarginV and drawtext coordinate calculations are accurate.
        
        filter_complex = False
        vf_arg = ""
        
        if videoRatio == "916":
            if zoomCover:
                vf_arg = f"crop=ih*(9/16):ih,scale=1080:1920,{sub_filter}"
            else:
                filter_complex = True
                vf_arg = (
                    "[0:v]split=2[bg][fg];"
                    "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:20[bgb];"
                    "[fg]scale=1080:1920:force_original_aspect_ratio=decrease[fg_scaled];"
                    f"[bgb][fg_scaled]overlay=format=auto:x=(W-w)/2:y=(H-h)/2,{sub_filter}"
                )
        elif videoRatio == "11":
            if zoomCover:
                vf_arg = f"crop=ih:ih,scale=1080:1080,{sub_filter}"
            else:
                filter_complex = True
                vf_arg = (
                    "[0:v]split=2[bg][fg];"
                    "[bg]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,boxblur=20:20[bgb];"
                    "[fg]scale=1080:1080:force_original_aspect_ratio=decrease[fg_scaled];"
                    f"[bgb][fg_scaled]overlay=format=auto:x=(W-w)/2:y=(H-h)/2,{sub_filter}"
                )
        else:
            vf_arg = sub_filter

        cmd = [
            ffmpeg_exe,
            "-y",
            "-ss", str(start_time),
            "-to", str(end_time),
            "-i",  local_video
        ]
        
        if filter_complex:
            cmd.extend(["-filter_complex", vf_arg])
        else:
            cmd.extend(["-vf", vf_arg])
            
        cmd.extend([
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            output_path
        ])

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=work_dir,
            universal_newlines=True,
            bufsize=1
        )

        stderr_lines = []
        # Read stderr line by line as it is produced
        for line in process.stderr:
            sys.stderr.write(line)
            sys.stderr.flush()
            stderr_lines.append(line)

        process.wait()

        if process.returncode != 0:
            stderr_text = "".join(stderr_lines)
            print(json.dumps({"error": "FFmpeg failed", "details": stderr_text}))
            sys.exit(1)

        # Copy output back to video directory so server can download it
        final_path = video_path + "_exported.mp4"
        shutil.copy2(output_path, final_path)

        print(json.dumps({"success": True, "output_path": final_path}))

    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "details": traceback.format_exc()}))
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
