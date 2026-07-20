import { VideoAnalysisResult } from "../types";

export interface SampleVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  duration: number;
  tags: string[];
  thumbnail: string;
  preAnalyzed: VideoAnalysisResult;
}

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    id: "pasta-masterclass",
    title: "Masterclass: El Secreto de la Pasta Carbonara Perfecta",
    description: "Aprende el método tradicional romano para preparar una pasta carbonara cremosa y auténtica sin usar crema de leche en solo 60 segundos.",
    url: "https://assets.mixkit.co/videos/preview/mixkit-cooking-in-a-modern-kitchen-40222-large.mp4",
    duration: 45,
    tags: ["Cocina", "Masterclass", "Gourmet"],
    thumbnail: "https://images.unsplash.com/photo-1612874742237-6526221588e3?q=80&w=600&auto=format&fit=crop",
    preAnalyzed: {
      title: "Masterclass: El Secreto de la Pasta Carbonara Perfecta",
      summary: "Este video culinario tiene un alto potencial de viralidad por su ritmo ágil, tomas cerradas apetitosas y el desmentido del mito común sobre la crema de leche.",
      topic: "Gastronomía Italiana Auténtica",
      totalEstimatedClips: 3,
      clips: [
        {
          id: "pasta-clip-1",
          title: "¡El MITO de la Crema en la Carbonara! 🚫",
          startTime: 0,
          endTime: 12,
          duration: 12,
          viralScore: 98,
          reason: "Desmiente un error común en la cocina inmediatamente, lo que genera controversia e interés inmediato en los primeros 3 segundos.",
          transition: "Zoom In",
          subtitles: [
            { text: "Si le pones crema de leche", start: 0.5, end: 3.0 },
            { text: "a tu salsa carbonara...", start: 3.1, end: 5.5 },
            { text: "¡Estás cometiendo un grave error!", start: 5.6, end: 8.5 },
            { text: "Los italianos se pondrían a llorar.", start: 8.6, end: 11.8 }
          ],
          caption: "¡Deja de arruinar tu pasta! 🇮🇹 Aquí te enseño la receta italiana tradicional sin inventos raros. #pasta #carbonara #recetasfaciles #comidaitaliana",
          hashtags: ["pasta", "carbonara", "cocinaitaliana", "chef"]
        },
        {
          id: "pasta-clip-2",
          title: "El Secreto del Huevo Templado 🥚",
          startTime: 13,
          endTime: 28,
          duration: 15,
          viralScore: 92,
          reason: "Enseña una técnica culinaria muy útil y visualmente atractiva (mezclar yemas y queso pecorino), aumentando el valor percibido del video.",
          transition: "Flash Fade",
          subtitles: [
            { text: "El secreto real está en mezclar", start: 13.2, end: 16.5 },
            { text: "las yemas de huevo con pecorino romano", start: 16.6, end: 20.2 },
            { text: "hasta crear una pasta densa y cremosa.", start: 20.3, end: 24.0 },
            { text: "Sin fuego, ¡así evitas hacer un omelet!", start: 24.1, end: 27.8 }
          ],
          caption: "La magia ocurre fuera del fuego 🔥 Esta es la única forma de lograr la crema perfecta sin nata. #carbonarareceta #trucosdecocina #aprendeacocinar",
          hashtags: ["carbonarareceta", "trucosdecocina", "recetasrapidas"]
        },
        {
          id: "pasta-clip-3",
          title: "El Toque de Pimienta Tostada 🌶️",
          startTime: 29,
          endTime: 45,
          duration: 16,
          viralScore: 89,
          reason: "El emplatado final y el sonido crujiente de la pimienta molida al momento (efecto ASMR) disparan el apetito y garantizan comentarios de antojo.",
          transition: "Glitch",
          subtitles: [
            { text: "Tuesta la pimienta negra", start: 29.5, end: 32.5 },
            { text: "en el mismo sartén del guanciale.", start: 32.6, end: 36.0 },
            { text: "¡El olor te transportará a Roma!", start: 36.1, end: 39.5 },
            { text: "Emplata de inmediato y disfruta.", start: 39.6, end: 44.5 }
          ],
          caption: "¡El toque final que cambia todo! El aroma de la pimienta tostada te llevará directo a Roma. #pastaorganica #foodtok #asmrfood #roma",
          hashtags: ["foodtok", "asmrfood", "gastronomia", "delicioso"]
        }
      ]
    }
  },
  {
    id: "finance-savings",
    title: "Finanzas Personales: El Truco del Ahorro del 1%",
    description: "Una guía ultra rápida y minimalista sobre cómo programar transferencias automáticas para acumular capital sin darte cuenta.",
    url: "https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-in-a-cafe-41718-large.mp4",
    duration: 38,
    tags: ["Finanzas", "Desarrollo", "Ahorro"],
    thumbnail: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop",
    preAnalyzed: {
      title: "Finanzas Personales: El Truco del Ahorro del 1%",
      summary: "Contenido de alto valor educativo con un gancho financiero psicológico fuerte. Simplifica el ahorro para eliminar la fricción mental.",
      topic: "Hábitos de Micro-Ahorro Automático",
      totalEstimatedClips: 2,
      clips: [
        {
          id: "finance-clip-1",
          title: "El Sesgo que te Mantiene Pobre 📉",
          startTime: 0,
          endTime: 18,
          duration: 18,
          viralScore: 96,
          reason: "Llama la atención tocando el dolor financiero básico del espectador mediante el término 'sesgo', estimulando el deseo de superación.",
          transition: "Slide Left",
          subtitles: [
            { text: "La razón por la que no ahorras", start: 0.5, end: 3.5 },
            { text: "no es la falta de dinero...", start: 3.6, end: 6.2 },
            { text: "Es tu cerebro jugando en tu contra.", start: 6.3, end: 10.0 },
            { text: "Queremos gastar hoy para sobrevivir.", start: 10.1, end: 14.2 },
            { text: "Pero hay un hack muy fácil para ganarle.", start: 14.3, end: 17.8 }
          ],
          caption: "Tu cerebro te sabotea 🧠 Aprende a ganarle al impulso de gasto con este micro-truco psicológico. #finanzaspersonales #educacionfinanciera #ahorrar #dinero",
          hashtags: ["finanzaspersonales", "educacionfinanciera", "ahorro"]
        },
        {
          id: "finance-clip-2",
          title: "Configura el Ahorro Invisible 🏦",
          startTime: 19,
          endTime: 38,
          duration: 19,
          viralScore: 94,
          reason: "Proporciona una solución accionable paso a paso para configurar transferencias los días de pago, dándole gran utilidad.",
          transition: "Zoom In",
          subtitles: [
            { text: "Entra a tu aplicación bancaria", start: 19.2, end: 22.0 },
            { text: "y automatiza una transferencia...", start: 22.1, end: 25.5 },
            { text: "del 1% de tu sueldo el día que cobras.", start: 25.6, end: 29.8 },
            { text: "No lo notarás en tus gastos diarios,", start: 29.9, end: 33.5 },
            { text: "pero a fin de año te sorprenderás.", start: 33.6, end: 37.5 }
          ],
          caption: "El truco definitivo del microahorro automático 💵 Si no lo ves, no lo gastas. Pruébalo este mes. #libertadfinanciera #tipsdefinanzas #inversiones",
          hashtags: ["libertadfinanciera", "tipsdefinanzas", "ahorrointeligente"]
        }
      ]
    }
  }
];
