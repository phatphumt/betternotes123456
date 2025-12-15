import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, BookOpen, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

type QuizResult = {
  slug: string;
  total: number;
  correct: number;
  score: number; // 0-100
  durationMs: number;
  finishedAt: number;
  // สำหรับ list ข้อผิด
  wrong: Array<{
    id: number;
    text: string;
    tag?: string;
    selectedText: string;
    correctText: string;
    detail: string;
  }>;
};

function msToMinSec(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function QuizSummary() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    if (!slug) return;

    const raw = sessionStorage.getItem(`quiz_result_${slug}`);
    if (!raw) {
      // ไม่มีผลลัพธ์ => กลับไปหน้า quiz detail
      navigate(`/quiz/${slug}`, { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as QuizResult;
      setResult(parsed);
    } catch {
      sessionStorage.removeItem(`quiz_result_${slug}`);
      navigate(`/quiz/${slug}`, { replace: true });
    }
  }, [slug, navigate]);

  const circleStyle = useMemo(() => {
    const score = result?.score ?? 0;
    return {
      background: `conic-gradient(#22c55e ${score * 3.6}deg, #ef4444 0deg)`,
    };
  }, [result]);

  if (!result || !slug) return null;

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: "#FFF7DA" }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/quiz/${slug}`)}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-200 transition text-black"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">กลับหน้าแบบทดสอบ</span>
          </button>

          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-black">สรุปผลคะแนน</h1>
            <div className="text-sm text-gray-700 mt-1">
              {result.correct}/{result.total} ถูก • เวลา {msToMinSec(result.durationMs)}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-[#0f766e] text-[#0f766e] flex items-center gap-2"
            onClick={() => {
              sessionStorage.removeItem(`quiz_result_${slug}`);
              navigate(`/quiz/${slug}/play`);
            }}
          >
            <RotateCcw size={16} />
            ทำใหม่
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
                  <div className="text-sm text-gray-700">คะแนน</div>
                  <div className="text-3xl font-bold text-black">{result.score}%</div>
                </div>
              </div>

              <div className="text-xs text-gray-600">
                ทำเสร็จเมื่อ {new Date(result.finishedAt).toLocaleString()}
              </div>
            </div>

            {/* Stats + Actions */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <StatChip icon={<CheckCircle2 size={16} />} label="ถูก" value={`${result.correct} ข้อ`} />
                <StatChip icon={<XCircle size={16} />} label="ผิด" value={`${result.total - result.correct} ข้อ`} />
                <StatChip icon={<Timer size={16} />} label="เวลา" value={msToMinSec(result.durationMs)} />
                <StatChip icon={<BookOpen size={16} />} label="รวม" value={`${result.total} ข้อ`} />
              </div>

              <Button
                className="bg-[#0f766e] hover:bg-[#0b5f59] text-white text-base h-11 flex items-center gap-2 justify-center"
                onClick={() => navigate(`/quiz/${slug}/play`)}
              >
                <BookOpen size={16} />
                เล่นอีกครั้ง
              </Button>

              <Button
                variant="outline"
                className="border-[#0f766e] text-[#0f766e] h-11 flex items-center gap-2 justify-center"
                onClick={() => {
                  // ส่งเฉพาะข้อผิดไปโหมด review
                  navigate(`/quiz/${slug}/play`, {
                    state: { reviewOnly: true, wrongIds: result.wrong.map((w) => w.id) },
                  });
                }}
                disabled={result.wrong.length === 0}
              >
                <XCircle size={16} />
                ทบทวนข้อผิด
              </Button>
            </div>
          </div>
        </div>

        {/* Wrong list */}
        <div className="w-full max-w-4xl">
          <div className="text-lg font-bold text-black mb-3">ข้อที่ทำผิด</div>

          {result.wrong.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-700">
              ไม่มีข้อผิด 🎉
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {result.wrong.map((w) => (
                <div key={w.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        ข้อ {w.id} {w.tag ? `• ${w.tag}` : ""}
                      </div>
                      <div className="text-sm text-black leading-6">{w.text}</div>
                    </div>
                    <div className="shrink-0 text-xs px-2 py-1 rounded-md bg-[#fcd6d6] text-[#7f1d1d] border border-[#ef4444]">
                      ผิด
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="text-[11px] text-gray-500 mb-1">คำตอบของคุณ</div>
                      <div className="text-[#7f1d1d]">{w.selectedText}</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="text-[11px] text-gray-500 mb-1">คำตอบที่ถูก</div>
                      <div className="text-[#14532d]">{w.correctText}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-[12px] text-gray-700 whitespace-pre-line bg-[#f9f7f2] border border-gray-200 rounded-lg p-3">
                    {w.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
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
