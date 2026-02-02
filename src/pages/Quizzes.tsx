type QuizCard = {
  title: string;
  subtitle: string;
  meta: string;
  thumb: string;
  slug: string;
};

const quizzes: QuizCard[] = [
  {
    title: "Respiration Quiz",
    subtitle: "แก้ไขล่าสุดเมื่อ 13 นาทีที่แล้ว",
    meta: "20 ข้อ",
    thumb: "/assets/Respiration.png",
    slug: "respiration",
  },
];

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Quizzes() {
  const navigate = useNavigate();

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
      </div>

      {/* Content (match Home grid spacing) */}
      <div className="p-6">
        <p className="text-sm text-gray-700 mb-4">จัดเรียงโดย: เวลาแก้ไขล่าสุด</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.title}
              onClick={() => navigate(`/quiz/${quiz.slug}`)}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
            >
              <div className="aspect-video bg-gray-200 overflow-hidden flex items-center justify-center">
                <img src={quiz.thumb} alt={quiz.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-black text-lg">{quiz.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{quiz.subtitle}</p>
                <p className="text-xs text-gray-500 mt-1">{quiz.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

