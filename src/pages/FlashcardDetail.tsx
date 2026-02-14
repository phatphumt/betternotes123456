import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, BookOpen, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GenerateFlashcardModal from "@/components/GenerateFlashcardModal";
import type { GenerateFlashcardResponse } from "@/lib/aiService";

type Flashcard = { id: string; front: string; back: string };
type FlashcardDeck = { id: string; title: string; cards: Flashcard[]; createdAt?: number };

export default function FlashcardDetail() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [error, setError] = useState("");

  // Load deck from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("flashcards:decks");
      if (!raw) return;
      const decks = JSON.parse(raw) as FlashcardDeck[];
      const found = decks.find((d) => d.id === deckId);
      if (found) setDeck(found);
    } catch (e) {
      console.error("Failed to load deck", e);
    }
  }, [deckId]);

  function saveDeck(updated: FlashcardDeck) {
    try {
      const raw = window.localStorage.getItem("flashcards:decks");
      if (!raw) return;
      const decks = JSON.parse(raw) as FlashcardDeck[];
      const idx = decks.findIndex((d) => d.id === updated.id);
      if (idx >= 0) decks[idx] = updated;
      window.localStorage.setItem("flashcards:decks", JSON.stringify(decks));
      setDeck(updated);
    } catch (e) {
      console.error("Failed to save deck", e);
    }
  }

  function handleAddCard() {
    if (!frontText.trim() || !backText.trim()) {
      setError("กรุณากรอกข้อมูลทั้งสองด้าน");
      return;
    }
    if (!deck) return;

    const newCard: Flashcard = {
      id: Math.random().toString(36).slice(2),
      front: frontText,
      back: backText,
    };
    const updated = { ...deck, cards: [...deck.cards, newCard] };
    saveDeck(updated);
    setFrontText("");
    setBackText("");
    setError("");
    setShowAddCardModal(false);
  }

  function handleDeleteCard(cardId: string) {
    if (!deck) return;
    const updated = { ...deck, cards: deck.cards.filter((c) => c.id !== cardId) };
    saveDeck(updated);
  }

  function handleGenerateFlashcards(response: GenerateFlashcardResponse) {
    if (!deck) return;

    // Convert generated flashcards to Flashcard objects and add to deck
    const newCards: Flashcard[] = response.flashcards.map((fc) => ({
      id: Math.random().toString(36).slice(2),
      front: fc.front,
      back: fc.back,
    }));

    const updated = { ...deck, cards: [...deck.cards, ...newCards] };
    saveDeck(updated);
    setShowGenerateModal(false);
  }

  if (!deck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f3ea]">
        <p>กำลังโหลดชุดการ์ด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: "#FFF7DA" }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/flashcards")}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-200 transition text-black"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">กลับ</span>
          </button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-black">{deck.title}</h1>
            <div className="text-sm text-gray-700 mt-1">{deck.cards.length} การ์ด</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`/flashcard/play/${deck.id}`)}
            disabled={deck.cards.length === 0}
            className="bg-[#0f766e] text-white hover:bg-[#0b5f59] flex items-center gap-2"
          >
            <BookOpen size={16} />
            เรียน
          </Button>
          <Button
            onClick={() => setShowGenerateModal(true)}
            variant="outline"
            className="border-[#0f766e] text-[#0f766e] hover:bg-[#f0fdfb] flex items-center gap-2"
          >
            <Wand2 size={16} />
            🤖 สร้าง
          </Button>
          <Button onClick={() => setShowAddCardModal(true)} variant="outline" className="border-[#0f766e] text-[#0f766e] hover:bg-[#f0fdfb] flex items-center gap-2">
            <Plus size={18} />
            เพิ่ม
          </Button>
        </div>
      </div>

      {/* Cards List */}
      <div className="p-6 flex flex-col items-center">
        <div className="space-y-3 w-full max-w-4xl">
          {deck.cards.map((card, idx) => (
            <div key={card.id} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-semibold mt-1">{idx + 1}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-black text-sm">{card.front}</p>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">{card.back}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCard(card.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition shrink-0 ml-2"
                  title="Delete card"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {deck.cards.length === 0 && (
          <div className="text-center py-12 w-full">
            <p className="text-gray-600 mb-4">ยังไม่มีการ์ด เพิ่มการ์ดเพื่อเริ่มต้น!</p>
            <Button onClick={() => setShowAddCardModal(true)} className="bg-[#0f766e] text-white hover:bg-[#0b5f59]">เพิ่มการ์ดแรก</Button>
          </div>
        )}
      </div>

      {/* Generate Flashcard Modal */}
      <GenerateFlashcardModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerateFlashcards}
      />

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">เพิ่มการ์ด</h3>
            <input
              value={frontText}
              onChange={(e) => {
                setFrontText(e.target.value);
                setError("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-3"
              placeholder="ด้านหน้า (คำถาม)"
              autoFocus
            />
            <textarea
              value={backText}
              onChange={(e) => {
                setBackText(e.target.value);
                setError("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-3 h-24 resize-none"
              placeholder="ด้านหลัง (คำตอบ)"
            />
            {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddCardModal(false);
                  setFrontText("");
                  setBackText("");
                  setError("");
                }}
              >
                ยกเลิก
              </Button>
              <Button onClick={handleAddCard} className="bg-[#0f766e] text-white hover:bg-[#0b5f59]">เพิ่ม</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
