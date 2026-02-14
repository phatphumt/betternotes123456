type QuizCard = {
  title: string;
  subtitle: string;
  meta: string;
  thumb: string;
  slug: string;
  isCustom?: boolean;
};

type CustomQuiz = {
  slug: string;
  title: string;
  subtitle: string;
  difficulty: "ง่าย" | "ปานกลาง" | "ยาก";
  questions: any[];
};

const staticQuizzes: QuizCard[] = [
  {
    title: "Respiration Quiz",
    subtitle: "แก้ไขล่าสุดเมื่อ 13 นาทีที่แล้ว",
    meta: "20 ข้อ",
    thumb: "/assets/Respiration.png",
    slug: "respiration",
    isCustom: false,
  },
];

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Quizzes() {
  const navigate = useNavigate();
  const [allQuizzes, setAllQuizzes] = useState<QuizCard[]>(staticQuizzes);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("quizzes:custom");
      if (!raw) {
        setAllQuizzes(staticQuizzes);
        return;
      }
      const customQuizzes = JSON.parse(raw) as CustomQuiz[];
      const customCards: QuizCard[] = customQuizzes.map((q) => ({
        title: q.title,
        subtitle: q.subtitle,
        meta: `${q.questions.length} ข้อ • ${q.difficulty}`,
        thumb: "/assets/Respiration.png",
        slug: q.slug,
        isCustom: true,
      }));
      // Combine custom quizzes with static quizzes
      setAllQuizzes([...customCards, ...staticQuizzes]);
    } catch (e) {
      console.error("Failed to load custom quizzes", e);
      setAllQuizzes(staticQuizzes);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      {/* Header (match Home layout) */}
      <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: "#FFF7DA" }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-200 transition text-black"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">กลับ</span>
          </button>
          <div className="text-4xl">🧠</div>
          <h1 className="text-4xl font-extrabold text-black">Quizzes</h1>
        </div>
        <Button onClick={() => navigate('/quiz-builder')} className="bg-[#0f766e] text-white hover:bg-[#0b5f59] flex items-center gap-2">
          <Plus size={18} />
          สร้างแบบทดสอบ
        </Button>
      </div>

      {/* Content (match Home grid spacing) */}
      <div className="p-6">
        {allQuizzes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">ไม่มีแบบทดสอบ</p>
            <Button onClick={() => navigate('/quiz-builder')} className="bg-[#0f766e] text-white hover:bg-[#0b5f59]">
              สร้างแบบทดสอบแรก
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-700 mb-4">จัดเรียงโดย: เวลาแก้ไขล่าสุด</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allQuizzes.map((quiz) => (
                <div
                  key={quiz.slug}
                  onClick={() => navigate(`/quiz/${quiz.slug}`)}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
                >
                  <div className="p-4">
                    <h3 className="font-bold text-black text-lg">{quiz.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{quiz.subtitle}</p>
                    <p className="text-xs text-gray-500 mt-1">{quiz.meta}</p>
                    {quiz.isCustom && (
                      <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full mt-2 inline-block">สร้างเอง</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

