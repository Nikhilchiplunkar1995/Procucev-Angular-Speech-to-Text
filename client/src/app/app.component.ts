import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

interface Transcript {
  id: string;
  title: string;
  content: string;
  language: string;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}
interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}
interface SpeechRecognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognizer;
  webkitSpeechRecognition?: new () => SpeechRecognizer;
};
const API = "http://localhost:4000/api";
const WHISPER = "http://localhost:8000";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./app.component.html",
})
export class AppComponent implements OnInit, OnDestroy {
  items: Transcript[] = [];
  active: Transcript | null = null;
  query = "";
  title = "Untitled transcription";
  draft = "";
  interim = "";
  language = "en-IN";
  listening = false;
  busy = false;
  elapsed = 0;
  notice = "";
  tab: "all" | "recent" = "all";
  showEditor = false;
  private recognition: SpeechRecognizer | null = null;
  private shouldRun = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
  ) {}
  ngOnInit() {
    void this.load();
  }
  ngOnDestroy() {
    this.stopRecording();
  }
  get filtered() {
    return this.items.filter(
      (x) =>
        this.tab === "all" ||
        Date.now() - new Date(x.created_at).getTime() < 7 * 86400000,
    );
  }
  get wordCount() {
    return this.draft.trim() ? this.draft.trim().split(/\s+/).length : 0;
  }
  duration(seconds: number) {
    const n = Math.max(0, Number(seconds) || 0);
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  }
  date(s: string) {
    return new Date(s).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  async load() {
    try {
      const r = await firstValueFrom(
        this.http.get<{ data: Transcript[] }>(`${API}/transcriptions`, {
          params: { q: this.query },
        }),
      );
      this.items = r.data;
    } catch (e) {
      this.notice =
        "Could not load transcriptions. Check that the API and PostgreSQL are running.";
    }
    this.cd.detectChanges();
  }
  newSession() {
    this.stopRecording();
    this.active = null;
    this.title = "Untitled transcription";
    this.draft = "";
    this.elapsed = 0;
    this.showEditor = true;
  }
  editItem(item: Transcript) {
    this.stopRecording();
    this.active = item;
    this.title = item.title;
    this.draft = item.content;
    this.showEditor = true;
  }
  startRecording() {
    const w = window as SpeechWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      this.notice =
        "Live browser recognition requires Chrome or Edge. You can upload audio to Whisper instead.";
      return;
    }
    const rec = new SR();
    rec.lang = this.language;
    rec.continuous = true;
    rec.interimResults = true;
    this.recognition = rec;
    this.shouldRun = true;
    this.startedAt = Date.now();
    this.elapsed = 0;
    this.interim = "";
    rec.onresult = (e) => {
      let finalText = "";
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalText += result[0].transcript + " ";
        else partial += result[0].transcript;
      }
      if (finalText)
        this.draft += (this.draft.trim() ? " " : "") + finalText.trim();
      this.interim = partial;
      this.cd.detectChanges();
    };
    rec.onerror = (e) => {
      this.notice = `Microphone error: ${e.error}`;
      this.stopRecording();
      this.cd.detectChanges();
    };
    rec.onend = () => {
      if (this.shouldRun) {
        try {
          rec.start();
        } catch {
          this.stopRecording();
        }
      } else this.listening = false;
      this.cd.detectChanges();
    };
    try {
      rec.start();
      this.listening = true;
      this.notice = "";
      this.timer = setInterval(() => {
        this.elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
        this.cd.detectChanges();
      }, 1000);
    } catch (e) {
      this.notice = String(e);
      this.stopRecording();
    }
  }
  stopRecording() {
    this.shouldRun = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.listening = false;
    this.interim = "";
  }
  async save() {
    if (!this.draft.trim()) return;
    this.busy = true;
    try {
      const r = await firstValueFrom(
        this.http.post<{ data: Transcript }>(`${API}/transcriptions`, {
          title: this.title,
          content: this.draft,
          language: this.language,
          duration_seconds: this.elapsed,
        }),
      );
      this.items = [r.data, ...this.items];
      this.active = null;
      this.draft = "";
      this.title = "Untitled transcription";
      this.elapsed = 0;
      this.showEditor = false;
      this.notice = "Transcription saved.";
    } catch (e) {
      this.notice = "Save failed. Check your API connection.";
    } finally {
      this.busy = false;
      this.cd.detectChanges();
    }
  }
  async update() {
    if (!this.active || !this.draft.trim()) return;
    this.busy = true;
    try {
      const r = await firstValueFrom(
        this.http.put<{ data: Transcript }>(
          `${API}/transcriptions/${this.active.id}`,
          { title: this.title, content: this.draft },
        ),
      );
      this.items = this.items.map((x) => (x.id === r.data.id ? r.data : x));
      this.active = null;
      this.showEditor = false;
      this.notice = "Changes saved.";
    } catch {
      this.notice = "Update failed.";
    } finally {
      this.busy = false;
      this.cd.detectChanges();
    }
  }
  async remove(item: Transcript) {
    if (!confirm(`Delete “${item.title}”?`)) return;
    try {
      await firstValueFrom(
        this.http.delete(`${API}/transcriptions/${item.id}`),
      );
      this.items = this.items.filter((x) => x.id !== item.id);
      this.notice = "Transcription deleted.";
    } catch {
      this.notice = "Delete failed.";
    }
  }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.busy = true;
    this.notice = "Transcribing with Whisper AI…";
    try {
      const form = new FormData();
      form.append("file", file);
      const language = this.language.startsWith("hi")
        ? "hi"
        : this.language.startsWith("en")
          ? "en"
          : "auto";
      const r = await firstValueFrom(
        this.http.post<{ text: string }>(
          `${WHISPER}/transcribe?language=${language}`,
          form,
        ),
      );
      this.draft += (this.draft ? "\n" : "") + r.text;
      this.notice = r.text
        ? "Audio transcribed. Review and save."
        : "No speech detected.";
    } catch {
      this.notice =
        "Whisper service unavailable. Check Docker and the transcriber logs.";
    } finally {
      input.value = "";
      this.busy = false;
      this.cd.detectChanges();
    }
  }
  speak() {
    if (!this.draft.trim()) return;
    const speech = new SpeechSynthesisUtterance(this.draft);
    speech.lang = this.language;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
  }
}
