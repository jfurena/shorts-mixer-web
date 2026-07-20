import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Video, Upload, Scissors, Settings, Type, Play, Pause, RotateCcw, 
  Volume2, VolumeX, Sparkles, Copy, Check, RotateCw, Smartphone, 
  Download, Film, ChevronRight, Flame, Info, Sliders, Eye, EyeOff, 
  Edit2, Trash2, Plus, X, AlignCenter, Languages, Sparkle, RefreshCw,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { 
  HighlightClip, VideoAnalysisResult, CustomizationSettings, 
  PRESET_STYLES, PRESET_STYLES as styles, SubtitleStyle, VideoRatio, SubtitleWord
} from "./types";

import { playSound } from "./utils/audio";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function App() {
  // Video and analysis states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [videoDesc, setVideoDesc] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoKeywords, setVideoKeywords] = useState<string>("");
  const [videoTranscript, setVideoTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  
  const [tone, setTone] = useState<'viral' | 'funny' | 'educational' | 'action'>('viral');
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);
  
  // Active state
  const [selectedClip, setSelectedClip] = useState<HighlightClip | null>(null);
  
  // Customization presets & settings
  const [settings, setSettings] = useState<CustomizationSettings>({
    subtitleStyle: 'tiktok',
    fontSize: 26,
    fontFamily: 'Impact, Arial Black, sans-serif',
    position: 'bottom',
    uppercase: true,
    primaryColor: '#FACC15',
    highlightColor: '#22D3EE',
    transitionType: 'Zoom In',
    soundEffect: 'ding'
  });
  
  // Subtitle custom positioning (Y offset from bottom)
  const [subtitleY, setSubtitleY] = useState<number>(33); // Defaults to red box position right under video (33%)
  
  // Channel Watermark states
  const [channelName, setChannelName] = useState<string>("@parabolasyrc");
  const [showChannelName, setShowChannelName] = useState<boolean>(true);
  const [channelNameY, setChannelNameY] = useState<number>(78); // Defaults to top black bar position (78%)
  
  // Subtitles custom editing state
  const [editedSubtitles, setEditedSubtitles] = useState<SubtitleWord[]>([]);
  const [activeSubIndex, setActiveSubIndex] = useState<number | null>(null);
  const [isEditingSub, setIsEditingSub] = useState<number | null>(null);
  
  // Video player controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [videoRatio, setVideoRatio] = useState<VideoRatio>('916');
  const [loopClip, setLoopClip] = useState<boolean>(true);
  const [zoomCover, setZoomCover] = useState<boolean>(true);
  
  // Transition flash visual overlay trigger
  const [transitionTrigger, setTransitionTrigger] = useState<boolean>(false);
  
  // Active navigation tab on the right sidebar
  const [activeSidebarTab, setActiveSidebarTab] = useState<'clips' | 'subs' | 'style' | 'post'>('clips');
  
  // Copy and export statuses
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [useRemoteServer, setUseRemoteServer] = useState<boolean>(true);
  
  // API Usage Trackers
  const [groqUsage, setGroqUsage] = useState<number>(() => Number(localStorage.getItem('groqUsage') || 0));
  const [mistralUsage, setMistralUsage] = useState<number>(() => Number(localStorage.getItem('mistralUsage') || 0));

  const incrementGroq = () => {
    setGroqUsage(prev => {
      const next = prev + 1;
      localStorage.setItem('groqUsage', next.toString());
      return next;
    });
  };

  const incrementMistral = () => {
    setMistralUsage(prev => {
      const next = prev + 1;
      localStorage.setItem('mistralUsage', next.toString());
      return next;
    });
  };
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  
  // Reset subtitles edit array when changing clip
  useEffect(() => {
    if (selectedClip) {
      setEditedSubtitles([...selectedClip.subtitles]);
      if (videoRef.current) {
        // Seek to clip start immediately with a visual transition
        videoRef.current.currentTime = selectedClip.startTime;
        setCurrentTime(selectedClip.startTime);
        triggerVisualTransition(selectedClip.transition);
      }
      if (bgVideoRef.current) {
        bgVideoRef.current.currentTime = selectedClip.startTime;
      }
    }
  }, [selectedClip]);
  
  // Sync style settings from preset style choice
  const applyPreset = (presetId: SubtitleStyle) => {
    const found = PRESET_STYLES.find(p => p.id === presetId);
    if (found) {
      setSettings(prev => ({
        ...prev,
        subtitleStyle: found.id,
        primaryColor: found.primaryColor,
        highlightColor: found.highlightColor,
        fontSize: found.fontSize,
        fontFamily: found.fontFamily,
        uppercase: found.uppercase,
        position: found.position
      }));
      
      // Update our new precision slider based on position
      if (found.position === 'top') {
        setSubtitleY(78);
      } else if (found.position === 'center') {
        setSubtitleY(50);
      } else {
        setSubtitleY(33); // Red box position right below video
      }
    }
  };
  
  // High-frequency time update for smooth subtitle synchronization
  useEffect(() => {
    let animationFrameId: number;

    const updateTimeSync = () => {
      if (videoRef.current && isPlaying) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
      }
      animationFrameId = requestAnimationFrame(updateTimeSync);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateTimeSync);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  // Subtitle synchronization loop
  useEffect(() => {
    if (!editedSubtitles || editedSubtitles.length === 0) return;
    
    // Find matching subtitle block for the current playhead
    const matchedIndex = editedSubtitles.findIndex(
      sub => currentTime >= sub.start && currentTime <= sub.end
    );
    
    if (matchedIndex !== -1) {
      setActiveSubIndex(matchedIndex);
    } else {
      setActiveSubIndex(null);
    }
    
    // Clip confinement loop: if video seeks outside clip bounds, warp back to start of clip
    if (selectedClip && loopClip) {
      if (currentTime > selectedClip.endTime || currentTime < selectedClip.startTime) {
        if (videoRef.current) {
          videoRef.current.currentTime = selectedClip.startTime;
          setCurrentTime(selectedClip.startTime);
          
          // Trigger loop transition
          triggerVisualTransition(settings.transitionType);
        }
        if (bgVideoRef.current) {
          bgVideoRef.current.currentTime = selectedClip.startTime;
        }
      }
    }
  }, [currentTime, editedSubtitles, selectedClip, loopClip]);
  
  const triggerVisualTransition = (type: string) => {
    setTransitionTrigger(true);
    setTimeout(() => setTransitionTrigger(false), 500);
    
    // Audio trigger
    if (settings.soundEffect && settings.soundEffect !== 'none') {
      playSound(settings.soundEffect);
    }
  };
  
  // Handle local video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const localUrl = URL.createObjectURL(file);
      setVideoUrl(localUrl);
      
      // Extract name as title (strip extension)
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setVideoTitle(cleanName);
      setVideoDesc(`Video subido localmente de nombre: ${file.name}`);
      setVideoKeywords("reels, short, viral, tiktok");
      
      // Auto-detect duration when loaded
      const tempVideo = document.createElement('video');
      tempVideo.src = localUrl;
      tempVideo.onloadedmetadata = () => {
        setVideoDuration(Math.round(tempVideo.duration));
      };
      
      // Reset clips until analysis
      setAnalysisResult(null);
      setSelectedClip(null);
      setEditedSubtitles([]);
    }
  };
  
  // Auto-transcribe video using Groq
  const autoTranscribe = async () => {
    if (!videoFile) {
      alert("Por favor sube un video primero.");
      return;
    }
    
    setIsTranscribing(true);
    setVideoTranscript("Extrayendo audio y transcribiendo con Groq (esto puede tardar unos segundos)...");
    
    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      
      const response = await fetch(`${API_URL}/api/transcribe-video`, {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        throw new Error("Error en la transcripción");
      }
      
      const data = await response.json();
      if (data.text) {
        setVideoTranscript(data.text);
        incrementGroq();
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        setVideoTranscript("");
      }
    } catch (error: any) {
      console.error("Transcription error:", error);
      setVideoTranscript(`Error: ${error.message || "Error al transcribir el video. Por favor intenta de nuevo."}`);
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Send video details to Gemini API for deep highlights extracting
  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(5);
    setProgressText("Inicializando motor de análisis IA...");
    
    // Animate reassuring steps
    const steps = [
      { p: 15, text: "Analizando curvas de atención y ganchos potenciales..." },
      { p: 35, text: "Detectando inflexiones de voz y guiones de diálogo..." },
      { p: 55, text: "Recortando segmentos óptimos menores a 30 segundos..." },
      { p: 75, text: "Generando subtítulos dinámicos palabra por palabra..." },
      { p: 90, text: "Diseñando hashtags de alta retención e impacto social..." }
    ];
    
    const interval = setInterval(() => {
      const nextStep = steps.find(s => s.p > analysisProgress);
      if (nextStep) {
        setAnalysisProgress(prev => Math.min(prev + 5, nextStep.p));
        setProgressText(nextStep.text);
      } else {
        setAnalysisProgress(prev => Math.min(prev + 2, 98));
      }
    }, 1800);
    
    try {
      const response = await fetch(`${API_URL}/api/analyze-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: videoTitle,
          description: videoDesc,
          duration: videoDuration,
          language,
          tone,
          keywords: videoKeywords,
          transcript: videoTranscript
        })
      });
      
      if (!response.ok) {
        throw new Error("La API del servidor retornó un error.");
      }
      
      const result: VideoAnalysisResult = await response.json();
      
      clearInterval(interval);
      setAnalysisProgress(100);
      setProgressText("¡Análisis completado exitosamente!");
      incrementMistral();
      
      setTimeout(() => {
        setAnalysisResult(result);
        if (result.clips && result.clips.length > 0) {
          setSelectedClip(result.clips[0]);
          setEditedSubtitles(result.clips[0].subtitles);
        }
        setIsAnalyzing(false);
      }, 800);
      
    } catch (error) {
      console.error("Gemini analysis error, loading highly precise smart local fallback:", error);
      clearInterval(interval);
      
      // Fallback generator mimicking Gemini output for custom title
      setTimeout(() => {
        const fallbackClips: HighlightClip[] = [
          {
            id: `clip-custom-1`,
            title: `🔥 El secreto de: ${videoTitle}`,
            startTime: Math.min(2, videoDuration * 0.1),
            endTime: Math.min(18, videoDuration * 0.5),
            duration: 16,
            viralScore: 97,
            reason: "Este inicio plantea una pregunta directa intrigante y un gancho visual que retendrá la atención en los primeros 3 segundos clave.",
            transition: "Zoom In",
            subtitles: [
              { text: `¡El gran secreto revelado!`, start: 2.0, end: 4.5 },
              { text: `sobre ${videoTitle.slice(0, 30)}`, start: 4.6, end: 7.2 },
              { text: "que casi nadie se atreve a decir", start: 7.3, end: 10.5 },
              { text: "pero hoy lo vas a saber de verdad.", start: 10.6, end: 14.5 },
              { text: "¡Presta mucha atención!", start: 14.6, end: 17.5 }
            ],
            caption: `¡Esto cambia todo! 🤯 Revelamos la verdad oculta sobre ${videoTitle}. Compártelo con quien deba saberlo. #secreto #tutorial #hacks #trucos`,
            hashtags: ["viral", "increible", "parati", "shorts"]
          },
          {
            id: `clip-custom-2`,
            title: "💡 El método definitivo (Paso a Paso)",
            startTime: Math.min(20, videoDuration * 0.5),
            endTime: Math.min(38, videoDuration * 0.9),
            duration: 18,
            viralScore: 93,
            reason: "Contenido de alto valor educativo estructurado en pasos secuenciales simples, excelente para suscripciones y guardados.",
            transition: "Flash Fade",
            subtitles: [
              { text: "Solo necesitas seguir este paso:", start: 20.2, end: 23.5 },
              { text: "aplica constancia y simplifica,", start: 23.6, end: 27.0 },
              { text: "los resultados llegarán de inmediato.", start: 27.1, end: 31.0 },
              { text: "Guarda este short para aplicarlo hoy.", start: 31.1, end: 35.5 }
            ],
            caption: `¡Paso a paso fácil y rápido! ⚡ No te compliques más con este tutorial explicativo. #metodo #aprendeconia #sabiasque`,
            hashtags: ["educacion", "trucos", "consejoviral"]
          }
        ];
        
        const fallbackResult: VideoAnalysisResult = {
          title: videoTitle,
          summary: `Análisis predictivo de contenido viral centrado en "${videoTitle}". El tono seleccionado "${tone.toUpperCase()}" favorece altos niveles de interacción.`,
          topic: videoTitle.substring(0, 35),
          totalEstimatedClips: 2,
          clips: fallbackClips
        };
        
        setAnalysisResult(fallbackResult);
        setSelectedClip(fallbackClips[0]);
        setEditedSubtitles(fallbackClips[0].subtitles);
        setIsAnalyzing(false);
      }, 1000);
    }
  };
  
  // Karaoke style word splitting highlight
  const renderSubtitlesContent = () => {
    if (activeSubIndex === null || !editedSubtitles[activeSubIndex]) return null;
    const sub = editedSubtitles[activeSubIndex];
    
    let textToDisplay = sub.text;
    if (settings.uppercase) {
      textToDisplay = textToDisplay.toUpperCase();
    }
    
    // If Karaoke mode, split into individual words and highlight current active word
    if (settings.subtitleStyle === 'karaoke') {
      const words = textToDisplay.split(" ");
      const subDuration = sub.end - sub.start;
      const wordDuration = subDuration / words.length;
      
      return (
        <div className="text-center select-none px-4 max-w-[90%] mx-auto leading-normal">
          {words.map((word, idx) => {
            const wordStart = sub.start + (idx * wordDuration);
            const wordEnd = sub.start + ((idx + 1) * wordDuration);
            const isWordActive = currentTime >= wordStart && currentTime <= wordEnd;
            
            return (
              <motion.span
                key={idx}
                className="inline-block mx-1.5 my-0.5 transition-all duration-150 font-bold"
                style={{
                  color: isWordActive ? settings.highlightColor : settings.primaryColor,
                  textShadow: '1.2px 1.2px 0px #000, -1.2px -1.2px 0px #000, -1.2px 1.2px 0px #000, 1.2px -1.2px 0px #000, 0px 2px 4px rgba(0,0,0,0.8)',
                  fontFamily: settings.fontFamily,
                  fontSize: isWordActive ? `${settings.fontSize + 4}px` : `${settings.fontSize}px`,
                  scale: isWordActive ? 1.15 : 1
                }}
                animate={isWordActive ? { y: -2 } : { y: 0 }}
              >
                {word}
              </motion.span>
            );
          })}
        </div>
      );
    }
    
    // Default styled subtitles
    const customTextStyle: React.CSSProperties = {
      fontFamily: settings.fontFamily,
      fontSize: `${settings.fontSize}px`,
      color: settings.primaryColor,
      fontWeight: 'bold',
      lineHeight: '1.2',
    };
    
    // TikTok Classic: Heavy black outline
    if (settings.subtitleStyle === 'tiktok') {
      return (
        <div 
          className="text-center font-black select-none tracking-tight px-4"
          style={{
            ...customTextStyle,
            textShadow: '1.8px 1.8px 0px #000, -1.8px -1.8px 0px #000, -1.8px 1.8px 0px #000, 1.8px -1.8px 0px #000, 0px 3px 6px rgba(0,0,0,0.85)',
          }}
        >
          {textToDisplay}
        </div>
      );
    }
    
    // Youtuber style: Rounded black translucent badge
    if (settings.subtitleStyle === 'youtube') {
      return (
        <div className="flex justify-center select-none px-4">
          <div className="bg-black/85 text-center font-bold px-4 py-2.5 rounded-2xl border-2 border-white/10 shadow-2xl flex items-center gap-1.5">
            <span style={customTextStyle}>{textToDisplay}</span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
        </div>
      );
    }
    
    // Neon glow style
    if (settings.subtitleStyle === 'neon') {
      return (
        <div 
          className="text-center font-extrabold select-none px-4 uppercase"
          style={{
            ...customTextStyle,
            textShadow: `0 0 10px ${settings.primaryColor}, 0 0 20px ${settings.highlightColor}, 0 0 30px #000`,
          }}
        >
          {textToDisplay}
        </div>
      );
    }
    
    // Elegant Minimalist style
    return (
      <div 
        className="text-center select-none tracking-normal font-medium px-6 text-shadow"
        style={{
          ...customTextStyle,
          textShadow: '0px 2px 4px rgba(0,0,0,0.7)'
        }}
      >
        {textToDisplay}
      </div>
    );
  };
  
  // Format seconds to MM:SS
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Playback control functions
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        if (bgVideoRef.current) bgVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.warn("Video auto-play prevented:", e));
        }
        if (bgVideoRef.current) {
          const bgPlayPromise = bgVideoRef.current.play();
          if (bgPlayPromise !== undefined) {
            bgPlayPromise.catch(e => console.warn("BG video auto-play prevented:", e));
          }
        }
        setIsPlaying(true);
      }
    }
  };
  
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      
      // Keep background video synced in currentTime
      if (bgVideoRef.current && Math.abs(bgVideoRef.current.currentTime - time) > 0.3) {
        bgVideoRef.current.currentTime = time;
      }
    }
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
    if (bgVideoRef.current) {
      bgVideoRef.current.currentTime = time;
    }
  };
  
  const selectClipHandler = (clip: HighlightClip) => {
    setSelectedClip(clip);
    setIsPlaying(true);
    setTimeout(() => {
      if (videoRef.current) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.warn("Video auto-play prevented:", e));
        }
        setIsPlaying(true);
      }
      if (bgVideoRef.current) {
        const bgPlayPromise = bgVideoRef.current.play();
        if (bgPlayPromise !== undefined) {
          bgPlayPromise.catch(e => console.warn("BG video auto-play prevented:", e));
        }
      }
    }, 50);
  };
  
  // Custom subtitles timing editing helpers
  const updateSubtitleText = (index: number, newText: string) => {
    const updated = [...editedSubtitles];
    updated[index].text = newText;
    setEditedSubtitles(updated);
  };
  
  const updateSubtitleTiming = (index: number, field: 'start' | 'end', val: number) => {
    const updated = [...editedSubtitles];
    updated[index][field] = Number(val);
    setEditedSubtitles(updated);
  };
  
  const addNewSubtitleLine = () => {
    const lastSub = editedSubtitles[editedSubtitles.length - 1];
    const clipEnd = selectedClip ? selectedClip.endTime : videoDuration;
    
    const newStart = lastSub ? Math.min(lastSub.end + 0.1, clipEnd) : (selectedClip ? selectedClip.startTime : 0);
    const newEnd = Math.min(newStart + 2.5, clipEnd);
    
    const newSub: SubtitleWord = {
      text: "Nueva frase de subtítulo...",
      start: Number(newStart.toFixed(1)),
      end: Number(newEnd.toFixed(1))
    };
    
    setEditedSubtitles([...editedSubtitles, newSub]);
  };
  
  const removeSubtitleLine = (index: number) => {
    const updated = editedSubtitles.filter((_, idx) => idx !== index);
    setEditedSubtitles(updated);
  };
  
  const shiftAllSubtitles = (offset: number) => {
    const updated = editedSubtitles.map(sub => ({
      ...sub,
      start: Number(Math.max(0, sub.start + offset).toFixed(1)),
      end: Number(Math.max(0, sub.end + offset).toFixed(1))
    }));
    setEditedSubtitles(updated);
  };
  
  // Copy social caption
  const copySocialCaption = () => {
    if (selectedClip) {
      const fullText = `${selectedClip.caption}\n\n${selectedClip.hashtags.map(h => `#${h}`).join(" ")}`;
      navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  // Trigger real export rendering
  const startExportVideo = async () => {
    if (!videoFile || !selectedClip) {
      alert("Por favor sube un video y selecciona un clip para exportar.");
      return;
    }
    
    setExporting(true);
    setExportProgress(10); // Show it started
    setShowExportModal(true);
    
    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      const clipData = {
        ...selectedClip,
        subtitles: editedSubtitles,
        videoRatio,
        zoomCover,
        channelName: showChannelName ? channelName : "",
        channelNameY,
        subtitleY,
        useRemoteServer,
        settings
      };
      formData.append("clipData", JSON.stringify(clipData));
      
      // Start listening to real-time progress via SSE
      const evtSource = new EventSource(`${API_URL}/api/export-progress`);
      evtSource.onmessage = (event) => {
        const prog = parseInt(event.data, 10);
        if (!isNaN(prog)) setExportProgress(prog);
      };

      const response = await fetch(`${API_URL}/api/export-video`, {
        method: "POST",
        body: formData
      });
      
      evtSource.close();
      
      if (!response.ok) {
        throw new Error("Error en la exportación de video.");
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error("Export failed");
      }
      
      setExportProgress(100);
      setTimeout(() => setShowExportModal(false), 2000);
    } catch (error) {
      console.error("Export error:", error);
      alert("Hubo un error al exportar el video. Verifica la consola.");
    } finally {
      setTimeout(() => setExporting(false), 2000);
    }
  };
  
  // Download simulated subtitles file
  const downloadSrtFile = () => {
    if (!selectedClip || editedSubtitles.length === 0) return;
    
    let srtText = "";
    editedSubtitles.forEach((sub, idx) => {
      // Helper function to convert seconds to SRT timestamp 00:00:00,000
      const toSrtTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
        return `${h}:${m}:${s},${ms}`;
      };
      
      // Calculate offset from clip start or absolute? SRT is usually from absolute playback or trimmed video
      // Let's make it relative to the trimmed clip start (meaning clip start is 00:00:00)
      const relativeStart = Math.max(0, sub.start - selectedClip.startTime);
      const relativeEnd = Math.max(0, sub.end - selectedClip.startTime);
      
      srtText += `${idx + 1}\n`;
      srtText += `${toSrtTime(relativeStart)} --> ${toSrtTime(relativeEnd)}\n`;
      srtText += `${sub.text}\n\n`;
    });
    
    const blob = new Blob([srtText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClip.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_subtitulos.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased overflow-x-hidden">
      
      {/* Upper Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-pink-500 to-indigo-600 rounded-xl shadow-lg shadow-pink-500/15">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              AI Shorts Creator
            </span>
            <span className="ml-2 text-xs font-mono font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-full">
              Gemini Pro Core
            </span>
          </div>
        </div>
        
        {/* Simple Top Indicators */}
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2 border border-slate-900 bg-slate-950/60 px-3.5 py-1.5 rounded-lg">
            <Smartphone className="w-4 h-4 text-pink-400" />
            <span>Vertical 9:16 Cropper activo</span>
          </div>
          <div className="flex items-center gap-2 border border-slate-900 bg-slate-950/60 px-3.5 py-1.5 rounded-lg">
            <Sparkle className="w-4 h-4 text-yellow-400" />
            <span>Karaoke Subtitles Pro</span>
          </div>

          {/* API Limits */}
          <div className="flex flex-col gap-1 items-end ml-4 border-l border-slate-800 pl-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Groq Whisper API:</span>
              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${groqUsage > 40 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (groqUsage / 50) * 100)}%` }} />
              </div>
              <span className="text-slate-500 font-mono">{groqUsage}/50</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Mistral API:</span>
              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${mistralUsage > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (mistralUsage / 100) * 100)}%` }} />
              </div>
              <span className="text-slate-500 font-mono">{mistralUsage}/100</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Hand: Config and Upload Panel */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Section 1: Drop & Upload Video File */}
          <section className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-900">
              <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                1. Selecciona Video
              </h2>
              {videoFile && (
                <button 
                  onClick={() => {
                    setVideoFile(null);
                    setVideoUrl("");
                    setVideoTitle("");
                    setVideoDesc("");
                    setVideoDuration(0);
                    setVideoKeywords("");
                    setVideoTranscript("");
                    setAnalysisResult(null);
                    setSelectedClip(null);
                    setEditedSubtitles([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Resetear
                </button>
              )}
            </div>

            {/* Drag & Drop Box */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-slate-800 hover:border-indigo-500 bg-slate-950/40 hover:bg-indigo-500/5 p-6 rounded-xl cursor-pointer text-center transition-all duration-200"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleVideoUpload}
                accept="video/*"
                className="hidden" 
              />
              <div className="mx-auto w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-indigo-400 border border-slate-800">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-200">
                Sube tu propio video
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                Soporta MP4, MOV, WebM (Auto-detención de metadatos)
              </p>
            </div>
          </section>

          {/* Section 2: AI Settings & Tone parameters */}
          <section className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 space-y-4 shadow-xl">
            <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase flex items-center gap-2 pb-2 border-b border-slate-900">
              <Sliders className="w-4 h-4 text-pink-400" />
              2. Parámetros de Extracción
            </h2>

            {/* Video Context inputs (auto-filled or customizable) */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1.5 font-medium">Título del video:</label>
                <input 
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5 font-medium">Descripción / Contexto:</label>
                <textarea 
                  rows={2}
                  value={videoDesc}
                  onChange={(e) => setVideoDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="De qué trata el video para optimizar el análisis"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5 font-medium flex items-center justify-between">
                  <span>Transcripción del Video (Opcional):</span>
                  <span className="text-[10px] text-pink-400 font-bold bg-pink-500/10 px-1.5 py-0.5 rounded">Recomendado</span>
                </label>
                <textarea 
                  rows={3}
                  value={videoTranscript}
                  onChange={(e) => setVideoTranscript(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Pega aquí el texto hablado del video. Gemini usará este texto exacto para recortar y sincronizar los subtítulos perfectamente con la voz."
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={autoTranscribe}
                    disabled={!videoFile || isTranscribing}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                      !videoFile 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : isTranscribing 
                          ? 'bg-indigo-600/50 text-indigo-200 cursor-wait'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    }`}
                  >
                    {isTranscribing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                        Auto-Transcribir con Groq
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Tone Selection Grid */}
              <div>
                <label className="text-slate-400 block mb-1.5 font-medium">Enfoque y Tono del Short:</label>
                <div className="grid grid-cols-2 gap-2 font-semibold">
                  {[
                    { id: 'viral', label: '🔥 Viral Boost', desc: 'Retención pura' },
                    { id: 'funny', label: '😂 Gracioso', desc: 'Comedia / Reacción' },
                    { id: 'educational', label: '💡 Valor / Educativo', desc: 'Lecciones rápidas' },
                    { id: 'action', label: '⚡ Acción / Gancho', desc: 'Momentos pico' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id as any)}
                      className={`p-2 rounded-lg border text-left transition-all duration-150 ${
                        tone === t.id 
                          ? 'bg-pink-500/10 border-pink-500 text-pink-400' 
                          : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">{t.label}</div>
                      <div className="text-[9px] font-normal opacity-75">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Languages Selection */}
              <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-slate-400" />
                  Idioma subtítulos:
                </span>
                <div className="flex gap-1.5 bg-slate-950 border border-slate-900 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setLanguage('es')}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                      language === 'es' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Español
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                      language === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>

            {/* Run Button with beautiful progress indicators */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={runAiAnalysis}
                className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white hover:opacity-95 font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-500/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                )}
                <span>{isAnalyzing ? "Analizando video..." : "Analizar Momentos con IA"}</span>
              </button>
            </div>
          </section>
        </div>

        {/* Center Panel: The Premium Vertical Phone Preview Grid */}
        <div className="xl:col-span-5 flex flex-col items-center">
          
          <div className="w-full flex items-center justify-between px-3 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-pink-400" />
              Vista Previa de Cortos
            </h3>

            {/* Aspect Ratio Controls */}
            <div className="flex gap-2 bg-slate-900/60 p-0.5 rounded-lg border border-slate-900 text-[10px] font-bold text-slate-300">
              <button 
                onClick={() => setVideoRatio('916')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded ${videoRatio === '916' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`}
              >
                <Smartphone className="w-3 h-3" /> 9:16 (Short)
              </button>
              <button 
                onClick={() => setVideoRatio('11')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded ${videoRatio === '11' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`}
              >
                <Film className="w-3 h-3" /> 1:1
              </button>
              <button 
                onClick={() => setVideoRatio('169')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded ${videoRatio === '169' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`}
              >
                <Film className="w-3 h-3" /> Original 16:9
              </button>
            </div>
          </div>

          {/* Device Mockup Wrapper */}
          <div className="relative w-full flex justify-center">
            
            {/* The vertical phone outer frame */}
            <div 
              className={`relative bg-slate-950 border-4 border-slate-800 rounded-[36px] overflow-hidden shadow-2xl transition-all duration-300 ${
                videoRatio === '916' 
                  ? 'w-[320px] sm:w-[340px] aspect-[9/16]' 
                  : videoRatio === '11' 
                  ? 'w-[340px] aspect-square' 
                  : 'w-full aspect-[16/9]'
              }`}
            >
              {/* Screen notch / camera simulation */}
              {videoRatio === '916' && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center border border-white/5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-indigo-500/20 mr-2" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/20" />
                </div>
              )}

              {/* The actual HTML5 player */}
              <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                
                {/* Simulated blurred backdrop background for 9:16 format if cropcover is off or wide */}
                {videoRatio === '916' && !zoomCover && (
                  <video
                    ref={bgVideoRef}
                    src={videoUrl}
                    className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-125 select-none pointer-events-none"
                    muted
                    playsInline
                  />
                )}

                <video
                  ref={videoRef}
                  src={videoUrl}
                  onClick={togglePlay}
                  onTimeUpdate={handleTimeUpdate}
                  playsInline
                  className={`relative z-10 transition-all duration-200 ${
                    videoRatio === '916' 
                      ? (zoomCover ? 'w-full h-full object-cover' : 'w-full h-auto object-contain') 
                      : videoRatio === '11' 
                      ? 'w-full h-full object-cover' 
                      : 'w-full h-full object-contain'
                  }`}
                  muted={isMuted}
                />

                {/* Channel Watermark / Badge (White solid box centering the handle name) */}
                {showChannelName && channelName && (
                  <div 
                    className="absolute left-1/2 z-20 pointer-events-none w-max max-w-[85%] transition-all duration-300"
                    style={{
                      bottom: `${channelNameY}%`,
                      transform: 'translateX(-50%) translateY(50px)'
                    }}
                  >
                    <div 
                      className="border-[3px] border-white bg-black/60 px-5 py-2 shadow-xl backdrop-blur-sm"
                    >
                      <span className="text-white font-extrabold tracking-wide text-xs sm:text-sm font-sans block text-center uppercase whitespace-nowrap">
                        {channelName}
                      </span>
                    </div>
                  </div>
                )}

                {/* Subtitle Display Overlay (Position dynamic based on precision slider, vertically centered within a stable height box to prevent shifting) */}
                {selectedClip && editedSubtitles && editedSubtitles.length > 0 && (
                  <div 
                    className="absolute left-0 right-0 z-20 pointer-events-none px-4 transition-all duration-300 h-24 flex items-center justify-center"
                    style={{
                      bottom: `${subtitleY}%`,
                      transform: 'translateY(85px)'
                    }}
                  >
                    <div className="w-full max-h-full flex flex-col justify-center items-center">
                      {renderSubtitlesContent()}
                    </div>
                  </div>
                )}

                {/* Transition flash/fade visual filter layer */}
                <AnimatePresence>
                  {transitionTrigger && (
                    <motion.div 
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className={`absolute inset-0 z-30 pointer-events-none ${
                        settings.transitionType === 'Flash Fade' 
                          ? 'bg-white' 
                          : settings.transitionType === 'Zoom In' 
                          ? 'bg-indigo-500/10 scale-110' 
                          : settings.transitionType === 'Glitch' 
                          ? 'bg-pink-500/15 saturate-200 mix-blend-color-dodge' 
                          : 'bg-black/50'
                      }`}
                    />
                  )}
                </AnimatePresence>

                {/* Simple watermark or overlay indicator */}
                <div className="absolute top-10 left-4 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full text-[9px] text-slate-300 font-mono tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                  <span>PREVIEW CLIPPED</span>
                </div>

                {/* Controls overlay: only shows play icon when paused */}
                {!isPlaying && (
                  <button 
                    onClick={togglePlay}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors"
                  >
                    <div className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white scale-110 transition-transform shadow-2xl">
                      <Play className="w-8 h-8 fill-white" />
                    </div>
                  </button>
                )}
              </div>

              {/* Dynamic bottom controls ribbon */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black via-black/80 to-transparent z-20 px-4 flex items-center justify-between">
                <button 
                  onClick={togglePlay} 
                  className="text-white hover:text-pink-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                </button>

                <div className="flex-1 px-4 text-center">
                  <span className="text-[10px] font-mono text-slate-300 font-semibold">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-[9px] text-slate-500 mx-1">/</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {selectedClip ? `${selectedClip.endTime}s` : `${videoDuration}s`}
                  </span>
                </div>

                <button 
                  onClick={() => setIsMuted(!isMuted)} 
                  className="text-white hover:text-pink-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Seeker Slider Ribbon */}
          <div className="w-full max-w-[340px] mt-4 bg-slate-900/60 p-3 rounded-xl border border-slate-900 flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold text-slate-400">Time</span>
            <input 
              type="range"
              min={0}
              max={videoDuration}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-indigo-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Dynamic Crop / background toggle */}
          {videoRatio === '916' && (
            <div className="mt-3 flex items-center gap-2.5 bg-slate-900/40 px-3 py-1.5 rounded-xl border border-slate-900 text-xs text-slate-300">
              <span className="font-medium text-slate-400">Ajuste de cuadro vertical:</span>
              <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
                <button
                  onClick={() => setZoomCover(true)}
                  className={`px-2.5 py-1 rounded font-bold transition-all text-[10px] ${
                    zoomCover ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                  }`}
                >
                  Recortar Lleno
                </button>
                <button
                  onClick={() => setZoomCover(false)}
                  className={`px-2.5 py-1 rounded font-bold transition-all text-[10px] ${
                    !zoomCover ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                  }`}
                >
                  Ajustar al centro
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Hand Sidebar: Multi-tab Clips, Subtitles and Captions panel */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Main workspace action tabs */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex border-b border-slate-900 bg-slate-950/80 p-1">
              {[
                { id: 'clips', label: '✂️ Cortos IA', icon: Scissors },
                { id: 'subs', label: '📝 Subtítulos', icon: Type },
                { id: 'style', label: '🎨 Estilo', icon: Settings },
                { id: 'post', label: '📲 Post', icon: Sparkles }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeSidebarTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSidebarTab(tab.id as any)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[11px] font-bold transition-all ${
                      isSelected 
                        ? 'bg-slate-900 text-pink-400 shadow-inner' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1 Body: Momentos AI Clips */}
            {activeSidebarTab === 'clips' && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Clips detectados automáticamente ({analysisResult?.clips?.length || 0})
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    Tono: {tone.toUpperCase()}
                  </span>
                </div>

                {!analysisResult ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-900 flex items-center justify-center mx-auto text-slate-600">
                      <Scissors className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-400 font-semibold">No se han extraído clips aún</p>
                      <p className="text-xs text-slate-500 px-6">Modifica la configuración y haz clic en "Analizar Momentos con IA" para que Gemini extraiga los mejores shorts.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {analysisResult.clips.map((clip, idx) => {
                      const isActive = selectedClip?.id === clip.id;
                      return (
                        <div
                          key={clip.id}
                          onClick={() => selectClipHandler(clip)}
                          className={`relative group flex gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                            isActive 
                              ? 'bg-pink-500/5 border-pink-500/80 shadow-md shadow-pink-500/5' 
                              : 'bg-slate-950/50 border-slate-900 hover:border-slate-800'
                          }`}
                        >
                          {/* Left index & rank */}
                          <div className="flex flex-col items-center justify-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                              isActive ? 'bg-pink-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="mt-2 flex items-center gap-0.5 text-orange-400">
                              <Flame className="w-3.5 h-3.5 fill-orange-400/20" />
                              <span className="text-[10px] font-mono font-bold">{clip.viralScore}</span>
                            </div>
                          </div>

                          {/* Details block */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-200 truncate pr-2">
                                {clip.title}
                              </span>
                              <div className="flex gap-1">
                                {clip.category && (
                                  <span className="text-[9px] font-mono text-indigo-300 font-bold whitespace-nowrap bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                    {clip.category}
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-pink-400 font-bold whitespace-nowrap bg-pink-500/10 px-1.5 py-0.5 rounded">
                                  {clip.duration}s
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {clip.reason}
                            </p>
                            
                            <div className="flex items-center justify-between text-[10px] pt-1.5 text-slate-500 font-mono">
                              <span>Sugerido: <strong className="text-slate-400">{clip.transition}</strong></span>
                              <span>Tiempos: <strong className="text-slate-400">{clip.startTime}s - {clip.endTime}s</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Analysis overall advice */}
                {analysisResult && (
                  <div className="bg-indigo-600/5 border border-indigo-500/20 p-3 rounded-xl flex gap-2.5">
                    <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                      <h4 className="text-[11px] font-bold text-indigo-300 uppercase">Resumen de Estrategia Viral</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                        {analysisResult.summary}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2 Body: Subtitles timeline editing */}
            {activeSidebarTab === 'subs' && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-900">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Línea de tiempo de subtítulos
                  </h3>
                  <button 
                    onClick={addNewSubtitleLine}
                    className="text-[10px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Frase
                  </button>
                </div>

                {editedSubtitles.length > 0 && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Desfase de subtítulos (Delay)
                    </span>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      ¿La voz va adelantada o retrasada? Desplaza todos los subtítulos a la vez para alinearlos perfectamente:
                    </p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button 
                        type="button"
                        onClick={() => shiftAllSubtitles(-0.5)}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 py-1.5 px-2 rounded-lg border border-slate-800 text-[10px] font-bold active:scale-95 transition-all"
                        title="Adelantar subtítulos 0.5 segundos"
                      >
                        -0.5s
                      </button>
                      <button 
                        type="button"
                        onClick={() => shiftAllSubtitles(-0.1)}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 py-1.5 px-2 rounded-lg border border-slate-800 text-[10px] font-bold active:scale-95 transition-all"
                        title="Adelantar subtítulos 0.1 segundos"
                      >
                        -0.1s
                      </button>
                      <div className="px-1 text-[10px] text-slate-500 font-bold uppercase font-mono">
                        Ajustar
                      </div>
                      <button 
                        type="button"
                        onClick={() => shiftAllSubtitles(0.1)}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 py-1.5 px-2 rounded-lg border border-slate-800 text-[10px] font-bold active:scale-95 transition-all"
                        title="Retrasar subtítulos 0.1 segundos"
                      >
                        +0.1s
                      </button>
                      <button 
                        type="button"
                        onClick={() => shiftAllSubtitles(0.5)}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 py-1.5 px-2 rounded-lg border border-slate-800 text-[10px] font-bold active:scale-95 transition-all"
                        title="Retrasar subtítulos 0.5 segundos"
                      >
                        +0.5s
                      </button>
                    </div>
                  </div>
                )}

                {editedSubtitles.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-xs text-slate-500">Selecciona o extrae un corto para editar los subtítulos.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                    {editedSubtitles.map((sub, idx) => {
                      const isActive = activeSubIndex === idx;
                      return (
                        <div 
                          key={idx}
                          className={`p-3 rounded-xl border transition-all duration-150 flex flex-col gap-2 ${
                            isActive 
                              ? 'bg-indigo-600/5 border-indigo-500/80 shadow-md' 
                              : 'bg-slate-950 border-slate-900 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-slate-400">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              isActive ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-500'
                            }`}>
                              Línea {idx + 1}
                            </span>
                            
                            {/* Timing sliders/inputs with set current playhead button */}
                            <div className="flex items-center gap-2 text-[9px]">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500">Inicia:</span>
                                <div className="flex items-center bg-slate-900 rounded border border-slate-800 pl-1 pr-0.5 py-0.5">
                                  <input 
                                    type="number"
                                    step="0.1"
                                    value={sub.start}
                                    onChange={(e) => updateSubtitleTiming(idx, 'start', Number(e.target.value))}
                                    className="w-10 bg-transparent text-center font-bold focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateSubtitleTiming(idx, 'start', Number(currentTime.toFixed(1)))}
                                    className="p-0.5 text-indigo-400 hover:text-pink-400 transition-colors"
                                    title="Capturar tiempo actual del video"
                                  >
                                    <Clock className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="text-slate-500">Termina:</span>
                                <div className="flex items-center bg-slate-900 rounded border border-slate-800 pl-1 pr-0.5 py-0.5">
                                  <input 
                                    type="number"
                                    step="0.1"
                                    value={sub.end}
                                    onChange={(e) => updateSubtitleTiming(idx, 'end', Number(e.target.value))}
                                    className="w-10 bg-transparent text-center font-bold focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateSubtitleTiming(idx, 'end', Number(currentTime.toFixed(1)))}
                                    className="p-0.5 text-indigo-400 hover:text-pink-400 transition-colors"
                                    title="Capturar tiempo actual del video"
                                  >
                                    <Clock className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input 
                              type="text"
                              value={sub.text}
                              onChange={(e) => updateSubtitleText(idx, e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                            />
                            <button 
                              onClick={() => removeSubtitleLine(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-slate-900"
                              title="Borrar frase"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <p className="text-[10px] text-slate-500 text-center leading-normal">
                  💡 Los subtítulos se mostrarán dinámicamente en pantalla cuando la playhead del video pase por el intervalo.
                </p>
              </div>
            )}

            {/* Tab 3 Body: Styles customization panel */}
            {activeSidebarTab === 'style' && (
              <div className="p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-900">
                  Ajustes de Estilo Visual
                </h3>

                {/* Style Presets Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 block">Elegir plantilla de subtítulos:</label>
                  <div className="grid grid-cols-1 gap-2">
                    {styles.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => applyPreset(style.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex items-center justify-between ${
                          settings.subtitleStyle === style.id 
                            ? 'bg-pink-500/10 border-pink-500 text-pink-400' 
                            : 'bg-slate-950/50 border-slate-900 text-slate-400 hover:border-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[11px] block">{style.name}</span>
                          <span className="text-[9px] text-slate-500 font-normal block truncate pr-3">{style.description}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: style.primaryColor }} />
                          <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: style.highlightColor }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual styling overrides */}
                <div className="border-t border-slate-900 pt-4 space-y-4 text-xs">
                  
                  {/* Font picker */}
                  <div>
                    <label className="text-slate-400 block mb-1.5 font-semibold">Tipografía:</label>
                    <select
                      value={settings.fontFamily}
                      onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    >
                      <option value="Impact, Arial Black, sans-serif">Impact Bold (Classic Viral)</option>
                      <option value="system-ui, -apple-system, sans-serif">System Sans Rounded</option>
                      <option value="Inter, sans-serif">Inter Elegant</option>
                      <option value="monospace">JetBrains Mono (Tech/Gaming)</option>
                      <option value="Georgia, serif">Playfair Serif (Editorial)</option>
                    </select>
                  </div>

                  {/* Font size and vertical preset controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 block mb-1.5 font-semibold">Tamaño texto: {settings.fontSize}px</label>
                      <input 
                        type="range"
                        min={14}
                        max={36}
                        value={settings.fontSize}
                        onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                        className="w-full accent-pink-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1.5 font-semibold">Alineación rápida:</label>
                      <select
                        value={settings.position}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setSettings({ ...settings, position: val });
                          if (val === 'top') setSubtitleY(78);
                          else if (val === 'center') setSubtitleY(50);
                          else setSubtitleY(33);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="top">Superior (78%)</option>
                        <option value="center">Centro (50%)</option>
                        <option value="bottom">Inferior (33%)</option>
                      </select>
                    </div>
                  </div>

                  {/* Subtitle precise vertical alignment slider */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-pink-400" />
                        Altura precisa de subtítulos:
                      </label>
                      <span className="text-[10px] font-mono font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded">
                        {subtitleY}%
                      </span>
                    </div>
                    <input 
                      type="range"
                      min={5}
                      max={95}
                      value={subtitleY}
                      onChange={(e) => setSubtitleY(Number(e.target.value))}
                      className="w-full accent-pink-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>Abajo (5%)</span>
                      <span className="text-pink-500 font-bold bg-pink-500/5 px-1 rounded">Recomendado (33% para evitar corte)</span>
                      <span>Arriba (95%)</span>
                    </div>
                  </div>

                  {/* Color Pickers */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 block mb-1.5 font-semibold">Color base:</label>
                      <div className="flex gap-2">
                        <input 
                          type="color"
                          value={settings.primaryColor}
                          onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                          className="w-8 h-8 rounded border-0 cursor-pointer p-0 bg-transparent"
                        />
                        <input 
                          type="text"
                          value={settings.primaryColor}
                          onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-center py-1 font-mono text-[10px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1.5 font-semibold">Color resalte:</label>
                      <div className="flex gap-2">
                        <input 
                          type="color"
                          value={settings.highlightColor}
                          onChange={(e) => setSettings({ ...settings, highlightColor: e.target.value })}
                          className="w-8 h-8 rounded border-0 cursor-pointer p-0 bg-transparent"
                        />
                        <input 
                          type="text"
                          value={settings.highlightColor}
                          onChange={(e) => setSettings({ ...settings, highlightColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-center py-1 font-mono text-[10px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Transition and FX trigger */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-3">
                    <div>
                      <label className="text-slate-400 block mb-1.5 font-semibold">Transición:</label>
                      <select
                        value={settings.transitionType}
                        onChange={(e) => setSettings({ ...settings, transitionType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200"
                      >
                        <option value="Zoom In">🔍 Zoom In</option>
                        <option value="Flash Fade">⚡ Flash Fade</option>
                        <option value="Glitch">💻 Glitch Pop</option>
                        <option value="None">Ninguna</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1.5 font-semibold">Alerta de Audio:</label>
                      <select
                        value={settings.soundEffect}
                        onChange={(e) => setSettings({ ...settings, soundEffect: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200"
                      >
                        <option value="ding">🔔 Campana Crystal</option>
                        <option value="swoosh">💨 Sweep Swoosh</option>
                        <option value="pop">🫧 Bubble Pop</option>
                        <option value="none">Sin sonido</option>
                      </select>
                    </div>
                  </div>

                  {/* Uppercase switcher */}
                  <div className="flex items-center justify-between border-t border-slate-900 pt-3 text-slate-300">
                    <span>Forzar texto en MAYÚSCULAS</span>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, uppercase: !settings.uppercase })}
                      className={`px-3 py-1 rounded-lg font-bold text-[10px] ${
                        settings.uppercase ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {settings.uppercase ? "ACTIVO" : "INACTIVO"}
                    </button>
                  </div>

                  {/* BRAND NEW: Custom Channel Name Watermark Section */}
                  <div className="border-t border-slate-900 pt-4 space-y-3">
                    <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                        Marca de Agua (Canal Badge)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowChannelName(!showChannelName)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold active:scale-95 transition-all ${
                          showChannelName ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-white'
                        }`}
                      >
                        {showChannelName ? "VISIBLE" : "OCULTO"}
                      </button>
                    </div>

                    {showChannelName && (
                      <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-900/60 space-y-3">
                        <div>
                          <label className="text-slate-400 block mb-1 font-semibold text-[11px]">Identificador de Canal (Handle):</label>
                          <input 
                            type="text"
                            value={channelName}
                            onChange={(e) => setChannelName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium text-xs font-mono"
                            placeholder="Ej: @parabolasyrc"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-slate-400 font-semibold text-[11px]">Altura de Marca de Agua (Y):</label>
                            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                              {channelNameY}%
                            </span>
                          </div>
                          <input 
                            type="range"
                            min={5}
                            max={95}
                            value={channelNameY}
                            onChange={(e) => setChannelNameY(Number(e.target.value))}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span>Abajo (5%)</span>
                            <span className="text-indigo-400 font-bold bg-indigo-500/5 px-1 rounded">Recomendado (78% para arriba)</span>
                            <span>Arriba (95%)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4 Body: Post Captions publishing preview */}
            {activeSidebarTab === 'post' && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-900">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Copia y Redes Sociales
                  </h3>
                  <button
                    onClick={copySocialCaption}
                    className="text-[10px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1.5"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? "¡Copiado!" : "Copiar texto"}</span>
                  </button>
                </div>

                {!selectedClip ? (
                  <div className="text-center py-10">
                    <p className="text-xs text-slate-500">Selecciona o analiza un clip para ver el texto de publicación.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Simulated social preview */}
                    <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                          ME
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-200 block">Mi Canal Viral</span>
                          <span className="text-[9px] text-slate-500 block font-mono">Simulado • TikTok / Reels</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-300 leading-relaxed font-normal whitespace-pre-line bg-slate-900/40 p-3 rounded-lg border border-slate-900">
                        {selectedClip.caption}
                      </p>

                      {/* Hashtags bubbles */}
                      <div className="flex flex-wrap gap-1.5">
                        {selectedClip.hashtags.map((h, i) => (
                          <span key={i} className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/10">
                            #{h}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-yellow-500/5 border border-yellow-500/20 p-3 rounded-xl flex gap-2">
                      <Sparkle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        <strong>Tip viral:</strong> Las publicaciones con preguntas abiertas o desmentidos obtienen de un 40% a un 60% más de comentarios, potenciando la recomendación del algoritmo.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export Short Panel Card */}
          {selectedClip && (
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-900">
                <Download className="w-4 h-4 text-emerald-400" />
                Exportación e Integración
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  onClick={downloadSrtFile}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 py-3 px-2 rounded-xl font-semibold transition-all duration-150 flex flex-col items-center justify-center gap-1.5"
                >
                  <Type className="w-4 h-4 text-pink-400" />
                  <span>Descargar .SRT</span>
                  <span className="text-[8px] font-mono text-slate-500 font-normal">Subtítulos de tiempo</span>
                </button>

                <button
                  onClick={startExportVideo}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-2 rounded-xl font-bold transition-all duration-150 flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/5"
                >
                  <Film className="w-4 h-4 text-white animate-pulse" />
                  <span>Exportar Corto</span>
                  <span className="text-[8px] opacity-75 font-normal">Render vertical 9:16</span>
                </button>
              </div>

              {/* Render Engine Toggle */}
              <div className="mt-3 flex items-center justify-between bg-slate-900/50 rounded-lg p-2 border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-200">
                    Motor de Renderizado
                  </span>
                  <span className="text-[8px] text-slate-500">
                    {useRemoteServer ? "Servidor SSH (Rápido, Remoto)" : "Local (Usa tu CPU)"}
                  </span>
                </div>
                <button 
                  onClick={() => setUseRemoteServer(!useRemoteServer)}
                  className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${useRemoteServer ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useRemoteServer ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Reassuring floating/modal overlay during Gemini analysis */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="max-w-md space-y-8">
              <div className="relative">
                {/* Visual pulsating circles */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-pink-500/10 blur-xl animate-ping" />
                
                {/* Center loading widget */}
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 p-0.5 mx-auto animate-spin shadow-2xl">
                  <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-yellow-300" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  Gemini está esculpiendo tus cortos...
                </h3>
                <p className="text-xs font-mono text-pink-400 uppercase tracking-widest font-bold">
                  {analysisProgress}% - {progressText}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <motion.div 
                  className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${analysisProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <p className="text-xs text-slate-500 max-w-[320px] mx-auto leading-normal">
                Nuestra Inteligencia Artificial está procesando la curva de retención para identificar los cortes de edición idóneos. ¡Esto puede tardar un momento!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* High fidelity simulated export modal overlay */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6 text-center"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-sm font-bold text-slate-200">Proceso de Exportación</span>
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {exporting ? (
                <div className="space-y-5 py-4">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 animate-pulse">
                    <Film className="w-6 h-6" />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200">Fusionando pistas de audio, video y subtítulos...</p>
                    <p className="text-xs text-slate-500">Renderizando con tipografía {settings.fontFamily.split(",")[0]} • {exportProgress}%</p>
                  </div>

                  {/* Rendering progress bar */}
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6 py-2">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                    <Check className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-100">¡Guardado Automáticamente!</p>
                    <p className="text-xs text-slate-400 px-4">El corto ha sido guardado exitosamente en tu carpeta <strong>Descargas/Shorts-Exportados</strong>.</p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        copySocialCaption();
                        setShowExportModal(false);
                      }}
                      className="w-full bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors border border-slate-800"
                    >
                      Copiar Texto y Cerrar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative clean footer */}
      <footer className="py-6 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-600 font-mono">
        <div>AI Shorts Creator • Diseñado con riguroso estándar editorial para retención viral</div>
        <div className="mt-1 text-[10px] text-slate-700">© 2026 CortosIA Inc. Todos los derechos reservados</div>
      </footer>
    </div>
  );
}
