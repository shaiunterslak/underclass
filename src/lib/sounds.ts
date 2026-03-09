// Notification sound player — plays a short sound when a new simulation appears
// Sounds are in /public/sounds/<platform>.mp3

const soundCache = new Map<string, HTMLAudioElement>();
let soundEnabled = true;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function playSound(platform: string) {
  if (!soundEnabled) return;
  if (typeof window === "undefined") return;

  const soundMap: Record<string, string> = {
    showIMessage: "imessage",
    showSlackMessage: "slack",
    showWhatsApp: "whatsapp",
    showTwitterPost: "twitter",
    showLinkedInPost: "linkedin",
    showEmail: "email",
    showNewsAlert: "news",
    showChatGPT: "chatgpt",
    showClaude: "claude",
    showInstagram: "instagram",
    showPULUpdate: "pul",
    showChapter: "none",
    showAiMilestone: "none",
  };

  const file = soundMap[platform];
  if (!file || file === "none") return;
  const path = `/sounds/${file}.mp3`;

  try {
    let audio = soundCache.get(path);
    if (!audio) {
      audio = new Audio(path);
      audio.volume = 0.3;
      soundCache.set(path, audio);
    }
    // Reset and play
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay blocked — ignore silently
    });
  } catch {
    // Sound not available — no-op
  }
}
