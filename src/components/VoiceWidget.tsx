"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Send, Sparkles, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SPEECH_LANG: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  gu: "gu-IN",
};

const SUGGESTIONS: Record<string, string[]> = {
  en: [
    "How much GST did I save this month?",
    "What's my net GST payable?",
    "How many invoices need review?",
  ],
  hi: [
    "इस महीने कितना GST बचा?",
    "मुझे कितना GST देना है?",
    "कितनी इनवॉइस समीक्षा के लिए बाकी हैं?",
  ],
};

interface Turn {
  role: "user" | "assistant";
  text: string;
}

export function VoiceWidget({ language, useSarvam = false }: { language: string; useSarvam?: boolean }) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [micAvailable, setMicAvailable] = useState(false);
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const speechLang = SPEECH_LANG[language] ?? "en-IN";
  const suggestions = SUGGESTIONS[language] ?? SUGGESTIONS.en;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const canRecord =
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof (window as any).MediaRecorder === "function";
    setMicAvailable(useSarvam ? canRecord : Boolean(SR));
  }, [useSarvam]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  // ---- Output: Sarvam TTS with browser fallback ----
  async function speak(text: string) {
    if (useSarvam) {
      try {
        setSpeaking(true);
        const res = await fetch("/api/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language }),
        });
        const data = await res.json();
        if (data.audio) {
          audioRef.current?.pause();
          const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
          audioRef.current = audio;
          audio.onended = () => setSpeaking(false);
          await audio.play();
          return;
        }
      } catch {
        /* fall through to browser TTS */
      } finally {
        // if Sarvam produced audio, onended clears speaking; otherwise clear now
      }
    }
    setSpeaking(false);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = speechLang;
      window.speechSynthesis.speak(u);
    }
  }

  async function ask(question: string) {
    if (!question.trim()) return;
    setTurns((t) => [...t, { role: "user", text: question }]);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/voice/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, language }),
      });
      const data = await res.json();
      const answer = data.answerText ?? "Sorry, I couldn't work that out.";
      setTurns((t) => [...t, { role: "assistant", text: answer }]);
      speak(answer);
    } catch {
      setTurns((t) => [...t, { role: "assistant", text: "Something went wrong. Please try again." }]);
    } finally {
      setThinking(false);
    }
  }

  // ---- Input path A: Sarvam STT via MediaRecorder ----
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setListening(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size < 800) return; // ignore empty taps
        setThinking(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "question.webm");
          const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          setThinking(false);
          if (data.transcript) ask(data.transcript);
          else setTurns((t) => [...t, { role: "assistant", text: "I couldn't catch that, please try again or type." }]);
        } catch {
          setThinking(false);
        }
      };
      recorderRef.current = mr;
      mr.start();
      setListening(true);
    } catch {
      setMicAvailable(false);
    }
  }

  // ---- Input path B: browser SpeechRecognition ----
  function startBrowserRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = speechLang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      ask(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  function toggleListen() {
    if (!micAvailable) return;
    if (listening) {
      if (useSarvam) recorderRef.current?.stop();
      else recognitionRef.current?.stop();
      return;
    }
    if (useSarvam) startRecording();
    else startBrowserRecognition();
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-pop transition hover:scale-105 hover:bg-brand-700"
          aria-label="Ask Hisaab"
        >
          <Mic className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[540px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-pop">
          <div className="flex items-center justify-between bg-ink px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-300" />
              <span className="text-sm font-semibold">Ask Hisaab</span>
              {useSarvam && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                  Sarvam voice
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-ink-muted">Ask about your GST out loud, in your language. Try:</p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="block w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-left text-sm text-ink-soft transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                    t.role === "user" ? "bg-brand-600 text-white" : "bg-surface-muted text-ink",
                  )}
                >
                  {t.text}
                  {t.role === "assistant" && (
                    <button onClick={() => speak(t.text)} className="mt-1 flex items-center gap-1 text-xs text-brand-600">
                      <Volume2 className="h-3 w-3" /> Play
                    </button>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-surface-muted px-3.5 py-2 text-sm text-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-surface-border p-3">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleListen}
                disabled={!micAvailable}
                title={
                  micAvailable
                    ? listening
                      ? "Stop"
                      : "Speak"
                    : "Voice input not available in this browser"
                }
                className={cn(
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition",
                  listening ? "bg-danger text-white" : "bg-brand-50 text-brand-600 hover:bg-brand-100",
                  !micAvailable && "opacity-40",
                )}
              >
                {listening && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-danger/40" />}
                <Mic className="h-5 w-5" />
              </button>
              <form
                className="flex flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
              >
                <input
                  className="input py-2"
                  placeholder={listening ? "Listening…" : speaking ? "Speaking…" : "Type or speak your question"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" className="btn-primary shrink-0 px-3 py-2" disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
