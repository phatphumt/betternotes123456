import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

type Flashcard = { id: string; front: string; back: string };
type FlashcardDeck = { id: string; title: string; cards: Flashcard[]; createdAt?: number };

export default function Flashcards() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [titleError, setTitleError] = useState("");

  // Load decks from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("flashcards:decks");
      if (!raw) return;
      const parsed = JSON.parse(raw) as FlashcardDeck[];
      if (Array.isArray(parsed)) setDecks(parsed);
    } catch (e) {
      console.error("Failed to load flashcard decks", e);
    }
  }, []);

  function saveDecks(next: FlashcardDeck[]) {
    try {
      window.localStorage.setItem("flashcards:decks", JSON.stringify(next));
      setDecks(next);
    } catch (e) {
      console.error("Failed to save decks", e);
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

  function handleCreateDeck() {
    const title = newDeckTitle || "Untitled";
    const id = createSlug(title);
    if (!id || id.trim() === "") {
      setTitleError("Please enter a deck title");
      return;
    }

    // if already exists, navigate to it
    const existing = decks.find((d) => d.id === id);
    if (existing) {
      setShowCreateModal(false);
      navigate(`/flashcard/${id}`);
      return;
    }

    // create new deck
    try {
      const newDeck: FlashcardDeck = { id, title, cards: [] };
      const next = [newDeck, ...decks];
      saveDecks(next);
      setShowCreateModal(false);
      navigate(`/flashcard/${id}`);
    } catch (e) {
      console.error("Failed to create deck", e);
      setTitleError("Could not create deck");
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
          <div>
            <div className="flex items-center gap-2">
              <div className="text-4xl">🎴</div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-black">Flashcards</h1>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-[#0f766e] text-white hover:bg-[#0b5f59] flex items-center gap-2">
          <Plus size={18} />
          <span>New</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="p-6 flex flex-col items-center">
        {decks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-600 mb-4">No flashcard decks yet</p>
            <Button onClick={() => setShowCreateModal(true)} className="bg-[#0f766e] text-white hover:bg-[#0b5f59]">Create your first deck</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
            {decks.map((deck) => (
              <div
                key={deck.id}
                onClick={() => navigate(`/flashcard/${deck.id}`)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
              >
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl mb-2">🎴</div>
                    <div className="text-sm text-gray-600">{deck.cards.length} cards</div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-black text-lg">{deck.title}</h3>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/flashcard/play/${deck.id}`);
                    }}
                    className="w-full mt-3 bg-[#0f766e] text-white hover:bg-[#0b5f59] flex items-center justify-center gap-2"
                    size="sm"
                  >
                    <BookOpen size={14} />
                    Study
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Deck Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Create New Deck</h3>
            <input
              value={newDeckTitle}
              onChange={(e) => {
                setNewDeckTitle(e.target.value);
                setTitleError("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-3"
              placeholder="Deck title"
              autoFocus
            />
            {titleError && <div className="text-sm text-red-600 mb-3">{titleError}</div>}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewDeckTitle("");
                  setTitleError("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateDeck} className="bg-[#0f766e] text-white hover:bg-[#0b5f59]">Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
