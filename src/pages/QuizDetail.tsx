import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, RefreshCw, BookOpen, Target, Clock3, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

type QuizStaticInfo = {
  title: string;
  subtitle: string;
  questionsLabel: string; // เช่น "จำนวน 20 ข้อ"
  tip: string;
  difficulty: "ง่าย" | "ปานกลาง" | "ยาก";
  estDuration: string; // เวลาโดยประมาณ (fallback)
};

type StoredResult = {
  slug: string;
  total: number;
  correct: number;
  score: number; // 0-100
  durationMs: number;
  finishedAt: number;
  wrong: Array<{
    id: number;
    text: string;
    tag?: string;
    selectedText: string;
    correctText: string;
    detail: string;
  }>;
};

type HistoryItem = Pick<StoredResult, "score" | "durationMs" | "finishedAt">;

const quizData: Record<string, QuizStaticInfo> = {
  respiration: {
    title: "Respiration Quiz",
    subtitle: "แบบทดสอบ • ระดับปิโลเมียนวิชาการ",
    questionsLabel: "จำนวน 20 ข้อ",
    tip: "Tip: HCO3 ออกจาก RBC เพื่อแลกเปลี่ยน Cl- (รักษาความเป็นไฟฟ้า)",
    difficulty: "ปานกลาง",
    estDuration: "15 นาที",
  },
};

function msToMinSec(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function QuizDetail() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const quiz = useMemo(() => {
    if (!slug) return null;
    return quizData[slug] ?? null;
  }, [slug]);

  // ====== Sync latest result -> history ======
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!quiz || !slug) {
      navigate("/quizzes");
      return;
    }

    const histKey = `quiz_history_${slug}`;
    const resultKey = `quiz_result_${slug}`;

    const hist = safeParseJSON<HistoryItem[]>(sessionStorage.getItem(histKey)) ?? [];
    const latest = safeParseJSON<StoredResult>(sessionStorage.getItem(resultKey));

    // ถ้ามี result ล่าสุด และยังไม่ถูกบันทึกใน history (ดูจาก finishedAt) -> เพิ่มเข้า history
    if (latest && !hist.some((h) => h.finishedAt === latest.finishedAt)) {
      const nextHist = [...hist, { score: latest.score, durationMs: latest.durationMs, finishedAt: latest.finishedAt }];
      sessionStorage.setItem(histKey, JSON.stringify(nextHist));
      setHistory(nextHist);
    } else {
      setHistory(hist);
    }
  }, [quiz, slug, navigate]);

  if (!quiz || !slug) return null;

  // ====== Compute performance ======
  const attempts = history.length;

  const avgScore = useMemo(() => {
    if (attempts === 0) return 0;
    const sum = history.reduce((acc, h) => acc + (h.score ?? 0), 0);
    return Math.round(sum / attempts);
  }, [history, attempts]);

  const best = useMemo(() => {
    if (attempts === 0) return 0;
    return Math.max(...history.map((h) => h.score ?? 0));
  }, [history, attempts]);

  const avgDurationLabel = useMemo(() => {
    if (attempts === 0) return quiz.estDuration;
    const avgMs = Math.round(history.reduce((acc, h) => acc + (h.durationMs ?? 0), 0) / attempts);
    return msToMinSec(avgMs);
  }, [history, attempts, quiz.estDuration]);

  const change = useMemo(() => {
    // เปอร์เซ็นต์ delta เทียบ "best ก่อนหน้าครั้งล่าสุด"
    if (attempts < 2) return 0;
    const last = history[attempts - 1].score ?? 0;
    const prevBest = Math.max(...history.slice(0, attempts - 1).map((h) => h.score ?? 0));
    return last - prevBest;
  }, [history, attempts]);

  // ====== Score ring style ======
  const circleStyle = useMemo(() => {
    if (attempts === 0) {
      return { background: "conic-gradient(#e5e7eb 360deg, #e5e7eb 0deg)" };
    }
    return {
      background: `conic-gradient(#22c55e ${avgScore * 3.6}deg, #ef4444 0deg)`,
    };
  }, [attempts, avgScore]);

  const changeNode =
    attempts < 2 ? (
      <span className="text-gray-500">เริ่มทำครั้งแรกได้เลย</span>
    ) : change >= 0 ? (
      <span className="text-green-600">+{change}%</span>
    ) : (
      <span className="text-red-600">{change}%</span>
    );

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: "#FFF7DA" }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-200 transition text-black"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">โน้ตของคุณ</span>
          </button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-black">{quiz.title}</h1>
            <div className="text-sm text-gray-700 mt-1 flex gap-2 flex-wrap">
              <span>{quiz.subtitle}</span>
              <span className="text-gray-400">•</span>
              <span>{quiz.questionsLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="bg-[#0f766e] text-white hover:bg-[#0b5f59] flex items-center gap-2">
            <Edit2 size={16} />
            <span>แก้ไข</span>
          </Button>
          <Button variant="destructive" className="flex items-center gap-2">
            <Trash2 size={16} />
            <span>ลบ</span>
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 flex flex-col items-center gap-6">
        <div className="bg-[#fff7e5] rounded-2xl shadow-md p-6 w-full max-w-4xl border border-[#f5e6c5]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Score ring */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 rounded-full" style={circleStyle} />
                <div className="absolute inset-3 rounded-full bg-[#fff7e5] border border-[#f5e6c5]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-sm text-gray-700">{attempts === 0 ? "ยังไม่มีคะแนน" : "คะแนนเฉลี่ย"}</div>
                  <div className="text-3xl font-bold text-black">{attempts === 0 ? "—" : `${avgScore}%`}</div>
                </div>
              </div>

              <div className="text-xs text-gray-600">
                {attempts === 0 ? (
                  <span>ยังไม่เคยทำแบบทดสอบ</span>
                ) : (
                  <>
                    ค่าเฉลี่ย {attempts} ครั้ง • {changeNode}
                  </>
                )}
              </div>
            </div>

            {/* Actions + meta */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <StatChip icon={<Target size={16} />} label="ดีที่สุด" value={attempts === 0 ? "—" : `${best}%`} />
                <StatChip icon={<Flame size={16} />} label="ระดับ" value={quiz.difficulty} />
                <StatChip icon={<Clock3 size={16} />} label="เวลาเฉลี่ย" value={avgDurationLabel} />
                <StatChip icon={<RefreshCw size={16} />} label="ครั้งที่ทำ" value={`${attempts} ครั้ง`} />
              </div>

              <Button
                className="bg-[#0f766e] hover:bg-[#0b5f59] text-white text-base h-11 flex items-center gap-2 justify-center"
                onClick={() => navigate(`/quiz/${slug}/play`)}
              >
                <BookOpen size={16} />
                {attempts === 0 ? "เริ่มทำแบบทดสอบ" : "ทำแบบทดสอบอีกครั้ง"}
              </Button>

              <Button
                variant="outline"
                className="border-[#0f766e] text-[#0f766e] h-11 flex items-center gap-2 justify-center"
                onClick={() => navigate(`/quiz/${slug}/summary`)}
                disabled={attempts === 0}
              >
                <RefreshCw size={16} />
                ทบทวนข้อผิด
              </Button>

              <div className="text-[11px] text-gray-600 text-center bg-white rounded-md px-3 py-2 border border-gray-200 shadow-sm">
                {quiz.tip}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
      <div className="text-[#0f766e]">{icon}</div>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-black">{value}</span>
      </div>
    </div>
  );
}
