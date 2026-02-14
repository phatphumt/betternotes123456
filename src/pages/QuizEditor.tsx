import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Copy, Check } from "lucide-react";
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

export default function QuizEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionTag, setQuestionTag] = useState("");
  const [questionDetail, setQuestionDetail] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([
    { id: "1", text: "", correct: false },
    { id: "2", text: "", correct: true },
    { id: "3", text: "", correct: false },
    { id: "4", text: "", correct: false },
  ]);
  const [error, setError] = useState("");

  // Load quiz from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("quizzes:custom");
      if (!raw) return;
      const quizzes = JSON.parse(raw) as Quiz[];
      const found = quizzes.find((q) => q.slug === slug);
      if (found) {
        setQuiz(found);
      }
    } catch (e) {
      console.error("Failed to load quiz", e);
    }
  }, [slug]);

  function saveQuiz(updated: Quiz) {
    try {
      const raw = window.localStorage.getItem("quizzes:custom");
      if (!raw) return;
      const quizzes = JSON.parse(raw) as Quiz[];
      const idx = quizzes.findIndex((q) => q.slug === updated.slug);
      if (idx >= 0) {
        quizzes[idx] = { ...updated, updatedAt: Date.now() };
        window.localStorage.setItem("quizzes:custom", JSON.stringify(quizzes));
        setQuiz(quizzes[idx]);
      }
    } catch (e) {
      console.error("Failed to save quiz", e);
    }
  }

  function handleAddQuestion() {
    if (!questionText.trim()) {
      setError("กรุณากรอกข้อคำถาม");
      return;
    }

    if (answers.every((a) => !a.text.trim())) {
      setError("กรุณากรอกตัวเลือกสำหรับคำถาม");
      return;
    }

    if (answers.filter((a) => a.correct).length === 0) {
      setError("กรุณาเลือกคำตอบที่ถูกต้องอย่างน้อยหนึ่งข้อ");
      return;
    }

    if (!quiz) return;

    const newQuestion: Question = {
      id: editingQuestionId || Math.random().toString(36).slice(2),
      text: questionText,
      answers: answers.filter((a) => a.text.trim()),
      detail: questionDetail,
      tag: questionTag || undefined,
    };

    let updatedQuestions: Question[];
    if (editingQuestionId) {
      updatedQuestions = quiz.questions.map((q) =>
        q.id === editingQuestionId ? newQuestion : q
      );
    } else {
      updatedQuestions = [...quiz.questions, newQuestion];
    }

    const updatedQuiz = { ...quiz, questions: updatedQuestions };
    saveQuiz(updatedQuiz);
    resetForm();
    setShowAddQuestion(false);
  }

  function handleDeleteQuestion(questionId: string) {
    if (!quiz) return;
    const updated = {
      ...quiz,
      questions: quiz.questions.filter((q) => q.id !== questionId),
    };
    saveQuiz(updated);
  }

  function handleEditQuestion(question: Question) {
    setEditingQuestionId(question.id);
    setQuestionText(question.text);
    setQuestionTag(question.tag || "");
    setQuestionDetail(question.detail);
    setAnswers(
      question.answers.length > 0
        ? question.answers
        : [
            { id: "1", text: "", correct: false },
            { id: "2", text: "", correct: true },
            { id: "3", text: "", correct: false },
            { id: "4", text: "", correct: false },
          ]
    );
    setShowAddQuestion(true);
  }

  function resetForm() {
    setQuestionText("");
    setQuestionTag("");
    setQuestionDetail("");
    setAnswers([
      { id: "1", text: "", correct: false },
      { id: "2", text: "", correct: true },
      { id: "3", text: "", correct: false },
      { id: "4", text: "", correct: false },
    ]);
    setError("");
    setEditingQuestionId(null);
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f3ea]">
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: "#FFF7DA" }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/quiz-builder")}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-200 transition text-black"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">กลับ</span>
          </button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-black">{quiz.title}</h1>
            <div className="text-sm text-gray-700 mt-1">
              {quiz.questions.length} ข้อ • {quiz.difficulty}
            </div>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowAddQuestion(true);
          }}
          className="bg-[#0f766e] text-white hover:bg-[#0b5f59] flex items-center gap-2"
        >
          <Plus size={18} />
          เพิ่มคำถาม
        </Button>
      </div>

      {/* Questions List */}
      <div className="p-6 flex flex-col items-center">
        {quiz.questions.length === 0 ? (
          <div className="text-center py-12 w-full">
            <p className="text-gray-600 mb-4">ยังไม่มีคำถาม</p>
            <Button
              onClick={() => {
                resetForm();
                setShowAddQuestion(true);
              }}
              className="bg-[#0f766e] text-white hover:bg-[#0b5f59]"
            >
              เพิ่มคำถามแรก
            </Button>
          </div>
        ) : (
          <div className="space-y-3 w-full max-w-4xl">
            {quiz.questions.map((question, idx) => (
              <div
                key={question.id}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition border border-gray-100"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-semibold mt-1">
                        ข้อ {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-black text-sm">{question.text}</p>
                        {question.tag && (
                          <p className="text-xs text-gray-500 mt-1">แท็ก: {question.tag}</p>
                        )}
                        <div className="text-xs text-gray-600 mt-2">
                          ตัวเลือก: {question.answers.length} ข้อ
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-2">
                    <button
                      onClick={() => handleEditQuestion(question)}
                      className="p-2 text-[#0f766e] hover:bg-blue-50 rounded transition"
                      title="แก้ไข"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="ลบ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Question Modal */}
      {showAddQuestion && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-[95%] max-w-2xl shadow-xl my-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingQuestionId ? "แก้ไขคำถาม" : "เพิ่มคำถาม"}
            </h3>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Question Text */}
              <div>
                <label className="text-sm font-semibold text-black mb-1 block">ข้อคำถาม</label>
                <textarea
                  value={questionText}
                  onChange={(e) => {
                    setQuestionText(e.target.value);
                    setError("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded h-20 resize-none"
                  placeholder="เช่น ตามกฎของบอยล์ เมื่อปริมาตรเพิ่มขึ้น..."
                />
              </div>

              {/* Tag */}
              <div>
                <label className="text-sm font-semibold text-black mb-1 block">แท็ก (ไม่บังคับ)</label>
                <input
                  value={questionTag}
                  onChange={(e) => {
                    setQuestionTag(e.target.value);
                    setError("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="เช่น กฎทางฟิสิกส์"
                />
              </div>

              {/* Answers */}
              <div>
                <label className="text-sm font-semibold text-black mb-2 block">ตัวเลือก</label>
                <div className="space-y-2">
                  {answers.map((answer, idx) => (
                    <div key={answer.id} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const updated = answers.map((a) =>
                            a.id === answer.id
                              ? { ...a, correct: !a.correct }
                              : a
                          );
                          setAnswers(updated);
                        }}
                        className={`p-2 rounded transition shrink-0 ${
                          answer.correct
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                        title={answer.correct ? "ถูกต้อง" : "ไม่ถูกต้อง"}
                      >
                        <Check size={16} />
                      </button>
                      <input
                        value={answer.text}
                        onChange={(e) => {
                          const updated = answers.map((a) =>
                            a.id === answer.id
                              ? { ...a, text: e.target.value }
                              : a
                          );
                          setAnswers(updated);
                          setError("");
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder={`ตัวเลือก ${idx + 1}`}
                      />
                      <button
                        onClick={() => {
                          const updated = answers.filter((a) => a.id !== answer.id);
                          if (updated.length > 0) {
                            setAnswers(updated);
                          }
                        }}
                        disabled={answers.length <= 2}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        title="ลบตัวเลือก"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => {
                    const newId = Math.random().toString(36).slice(2);
                    setAnswers([...answers, { id: newId, text: "", correct: false }]);
                  }}
                  variant="outline"
                  className="w-full mt-2 border-[#0f766e] text-[#0f766e] hover:bg-[#f0fdfb]"
                  size="sm"
                >
                  <Plus size={14} className="mr-1" />
                  เพิ่มตัวเลือก
                </Button>
              </div>

              {/* Detail */}
              <div>
                <label className="text-sm font-semibold text-black mb-1 block">
                  คำอธิบายละเอียด (ไม่บังคับ)
                </label>
                <textarea
                  value={questionDetail}
                  onChange={(e) => {
                    setQuestionDetail(e.target.value);
                    setError("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded h-16 resize-none"
                  placeholder="อธิบายเพิ่มเติมหรือให้ข้อมูลเพิ่มเติมเกี่ยวกับคำถาม..."
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 mt-3 p-2 bg-red-50 rounded">{error}</div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddQuestion(false);
                  resetForm();
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleAddQuestion}
                className="bg-[#0f766e] text-white hover:bg-[#0b5f59]"
              >
                {editingQuestionId ? "บันทึก" : "เพิ่มคำถาม"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
