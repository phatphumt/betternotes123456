import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

type Answer = { id: string; text: string; correct: boolean };
type Question = {
  id: string;
  text: string;
  answers: Answer[];
  detail: string;
  tag?: string;
};

type Quiz = {
  slug: string;
  title: string;
  subtitle: string;
  difficulty: "ง่าย" | "ปานกลาง" | "ยาก";
  questions: Question[];
  createdAt?: number;
  updatedAt?: number;
};

export default function QuizBuilder() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizSubtitle, setQuizSubtitle] = useState("");
  const [quizDifficulty, setQuizDifficulty] = useState<"ง่าย" | "ปานกลาง" | "ยาก">("ปานกลาง");
  const [error, setError] = useState("");

  // Load quizzes from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("quizzes:custom");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Quiz[];
      if (Array.isArray(parsed)) setQuizzes(parsed);
    } catch (e) {
      console.error("Failed to load quizzes", e);
    }
  }, []);

  function saveQuizzes(next: Quiz[]) {
    try {
      window.localStorage.setItem("quizzes:custom", JSON.stringify(next));
      setQuizzes(next);
    } catch (e) {
      console.error("Failed to save quizzes", e);
    }
  }

  function createSlug(title: string) {
    return (
      title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") || "untitled"
    );
  }

  function handleCreateQuiz() {
    const title = quizTitle.trim();
    if (!title) {
      setError("กรุณากรอกชื่อแบบทดสอบ");
      return;
    }

    const slug = createSlug(title);
    const existing = quizzes.find((q) => q.slug === slug);

    if (existing && !editingQuiz) {
      setError("แบบทดสอบนี้มีอยู่แล้ว");
      return;
    }

    const now = Date.now();
    const newQuiz: Quiz = {
      slug,
      title,
      subtitle: quizSubtitle,
      difficulty: quizDifficulty,
      questions: editingQuiz?.questions || [],
      createdAt: editingQuiz?.createdAt || now,
      updatedAt: now,
    };

    let updated: Quiz[];
    if (editingQuiz) {
      updated = quizzes.map((q) => (q.slug === editingQuiz.slug ? newQuiz : q));
    } else {
      updated = [newQuiz, ...quizzes];
    }

    saveQuizzes(updated);
    resetForm();
    setShowCreateModal(false);
  }

  function resetForm() {
    setQuizTitle("");
    setQuizSubtitle("");
    setQuizDifficulty("ปานกลาง");
    setError("");
    setEditingQuiz(null);
  }

  function handleDeleteQuiz(slug: string) {
    if (window.confirm("คุณแน่ใจหรือว่าต้องการลบแบบทดสอบนี้?")) {
      const updated = quizzes.filter((q) => q.slug !== slug);
      saveQuizzes(updated);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: "#FFF7DA" }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-200 transition text-black"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">โน้ตของคุณ</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="text-4xl">🧠</div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-black">สร้างแบบทดสอบ</h1>
          </div>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowCreateModal(true);
        }} className="bg-[#0f766e] text-white hover:bg-[#0b5f59] flex items-center gap-2">
          <Plus size={18} />
          <span>สร้างใหม่</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="p-6 flex flex-col items-center">
        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-600 mb-4">ยังไม่มีแบบทดสอบที่สร้างขึ้น</p>
            <Button onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }} className="bg-[#0f766e] text-white hover:bg-[#0b5f59]">
              สร้างแบบทดสอบแรก
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quizzes.map((quiz) => (
                <div key={quiz.slug} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition border border-gray-100">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-black text-lg">{quiz.title}</h3>
                        <p className="text-xs text-gray-600 mt-1">{quiz.subtitle}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {quiz.questions.length} ข้อ
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            quiz.difficulty === "ง่าย" ? "bg-green-100 text-green-700" :
                            quiz.difficulty === "ปานกลาง" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {quiz.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => navigate(`/quiz-builder/${quiz.slug}`)}
                        className="flex-1 bg-[#0f766e] text-white hover:bg-[#0b5f59] flex items-center justify-center gap-2"
                        size="sm"
                      >
                        <Edit2 size={14} />
                        แก้ไข
                      </Button>
                      <Button
                        onClick={() => navigate(`/quiz/${quiz.slug}`)}
                        disabled={quiz.questions.length === 0}
                        variant="outline"
                        className="flex-1 border-[#0f766e] text-[#0f766e] flex items-center justify-center gap-2"
                        size="sm"
                      >
                        <Eye size={14} />
                        ดู
                      </Button>
                      <Button
                        onClick={() => handleDeleteQuiz(quiz.slug)}
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        size="sm"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Quiz Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingQuiz ? "แก้ไขแบบทดสอบ" : "สร้างแบบทดสอบใหม่"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-black mb-1 block">ชื่อแบบทดสอบ</label>
                <input
                  value={quizTitle}
                  onChange={(e) => {
                    setQuizTitle(e.target.value);
                    setError("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-1"
                  placeholder="เช่น Respiration Quiz"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-black mb-1 block">คำอธิบาย</label>
                <textarea
                  value={quizSubtitle}
                  onChange={(e) => {
                    setQuizSubtitle(e.target.value);
                    setError("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded h-16 resize-none"
                  placeholder="เช่น แบบทดสอบ • ระดับปิโลเมียนวิชาการ"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-black mb-1 block">ระดับความยาก</label>
                <div className="flex gap-2">
                  {(["ง่าย", "ปานกลาง", "ยาก"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setQuizDifficulty(level)}
                      className={`flex-1 py-2 px-3 rounded text-sm font-semibold transition ${
                        quizDifficulty === level
                          ? "bg-[#0f766e] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <div className="text-sm text-red-600 mt-3 p-2 bg-red-50 rounded">{error}</div>}

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleCreateQuiz}
                className="bg-[#0f766e] text-white hover:bg-[#0b5f59]"
              >
                {editingQuiz ? "บันทึกการเปลี่ยนแปลง" : "สร้าง"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
