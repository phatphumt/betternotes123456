import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RotateCw, BookOpen, CheckCircle2, XCircle, ChevronLast } from "lucide-react";
import { Button } from "@/components/ui/button";

type Flashcard = { id: string; front: string; back: string };
type FlashcardDeck = { id: string; title: string; cards: Flashcard[]; createdAt?: number };

export default function FlashcardPlay() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Load deck from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("flashcards:decks");
      if (!raw) return;
      const decks = JSON.parse(raw) as FlashcardDeck[];
      const found = decks.find((d) => d.id === deckId);
      if (found && found.cards.length > 0) {
        setDeck(found);
      }
    } catch (e) {
      console.error("Failed to load deck", e);
    }
  }, [deckId]);

  if (!deck || deck.cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f3ea]">
        <p className="text-gray-600 mb-4">ไม่มีการ์ดในชุดนี้</p>
        <Button onClick={() => navigate("/flashcards")}>กลับไปยังชุดการ์ด</Button>
      </div>
    );
  }

  const currentCard = deck.cards[currentCardIdx];
  const progress = Math.round(((currentCardIdx + 1) / deck.cards.length) * 100);

  function handleCorrect() {
    setCorrectCount((c) => c + 1);
    handleNext();
  }

  function handleNext() {
    if (!deck) return;
    if (currentCardIdx + 1 >= deck.cards.length) {
      setIsFinished(true);
    } else {
      setCurrentCardIdx((i) => i + 1);
      setIsFlipped(false);
    }
  }

  function handleRestart() {
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setCorrectCount(0);
    setIsFinished(false);
  }

  if (isFinished) {
    const completionPercentage = Math.round((correctCount / deck.cards.length) * 100);
    return (
      <div className="min-h-screen bg-[#f7f3ea]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: "#FFF7DA" }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/flashcard/${deck.id}`)}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-200 transition text-black"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">กลับหน้าแก้ไข</span>
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-black">เสร็จแล้ว!</h1>
              <div className="text-sm text-gray-700 mt-1">
                {correctCount}/{deck.cards.length} ถูก
              </div>
            </div>
          </div>
          <Button
            className="bg-[#0f766e] hover:bg-[#0b5f59] text-white flex items-center gap-2"
            onClick={handleRestart}
          >
            <RotateCw size={16} />
            เริ่มใหม่
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-6">
          <div className="bg-[#fff7e5] rounded-2xl shadow-md p-6 w-full max-w-4xl border border-[#f5e6c5]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Score ring */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-48 h-48">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(#22c55e ${completionPercentage * 3.6}deg, #ef4444 0deg)`,
                    }}
                  />
                  <div className="absolute inset-3 rounded-full bg-[#fff7e5] border border-[#f5e6c5]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-sm text-gray-700">คะแนน</div>
                    <div className="text-3xl font-bold text-black">{completionPercentage}%</div>
                  </div>
                </div>

                <div className="text-xs text-gray-600">เรียนเสร็จแล้ว!</div>
              </div>

              {/* Stats + Actions */}
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatChip
                    icon={<CheckCircle2 size={16} />}
                    label="ถูก"
                    value={`${correctCount} การ์ด`}
                  />
                  <StatChip
                    icon={<XCircle size={16} />}
                    label="ผิด"
                    value={`${deck.cards.length - correctCount} การ์ด`}
                  />
                  <StatChip
                    icon={<BookOpen size={16} />}
                    label="รวม"
                    value={`${deck.cards.length} การ์ด`}
                  />
                  <StatChip
                    icon={<CheckCircle2 size={16} />}
                    label="อัตรา"
                    value={`${completionPercentage}%`}
                  />
                </div>

                <Button
                  className="bg-[#0f766e] hover:bg-[#0b5f59] text-white text-base h-11 flex items-center gap-2 justify-center"
                  onClick={handleRestart}
                >
                  <RotateCw size={16} />
                  เรียนอีกครั้ง
                </Button>

                <Button
                  variant="outline"
                  className="border-[#0f766e] text-[#0f766e] h-11 flex items-center gap-2 justify-center hover:bg-[#f0fdfb]"
                  onClick={() => navigate(`/flashcard/${deck.id}`)}
                >
                  <BookOpen size={16} />
                  แก้ไขชุด
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: "#FFF7DA" }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/flashcard/${deck.id}`)}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-200 transition text-black"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">กลับ</span>
          </button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-black">{deck.title}</h1>
            <p className="text-sm text-gray-700 mt-1">การ์ด {currentCardIdx + 1} จาก {deck.cards.length}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 px-6">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div className="bg-[#0f766e] h-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-600 mt-2">{progress}% เสร็จแล้ว</p>
      </div>

      {/* Card Display */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full max-w-xl aspect-square bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-lg cursor-pointer flex items-center justify-center p-8 transition-transform hover:scale-105 border border-yellow-200"
        >
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-4 uppercase font-semibold">
              {isFlipped ? "คำตอบ" : "คำถาม"}
            </p>
            <p className="text-3xl md:text-4xl font-bold text-black text-center line-clamp-6 leading-relaxed">
              {isFlipped ? currentCard.back : currentCard.front}
            </p>
            <p className="text-xs text-gray-500 mt-6">คลิกเพื่อพลิก</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-2 flex items-center justify-center gap-4">
        {isFlipped ? (
          <>
            <Button variant="outline" onClick={handleNext} className="border-[#0f766e] text-[#0f766e] hover:bg-[#f0fdfb] px-8 h-11">
              <ChevronLast size={16}/>
              ข้าม
            </Button>
            <Button onClick={handleCorrect} className="px-8 bg-green-600 hover:bg-green-700 h-11 flex items-center gap-2">
              <CheckCircle2 size={16} />
              ถูก
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsFlipped(true)} className="px-8 bg-[#0f766e] hover:bg-[#0b5f59] text-white h-11">
            แสดงคำตอบ
          </Button>
        )}
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
