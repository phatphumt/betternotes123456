import { useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  // Notes index stored in localStorage as "notes:index"
  const [notesIndex, setNotesIndex] = useState<Array<{ id: string; title: string; lastEdited: number }>>([]);
  const [notePreviews, setNotePreviews] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  // load notes index from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("notes:index");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{ id: string; title: string; lastEdited: number }>;
      if (Array.isArray(parsed)) setNotesIndex(parsed);
    } catch (e) {
      console.error("Failed to load notes index", e);
    }
  }, []);

  function saveNotesIndex(next: Array<{ id: string; title: string; lastEdited: number }>) {
    try {
      window.localStorage.setItem("notes:index", JSON.stringify(next));
      setNotesIndex(next);
    } catch (e) {
      console.error("Failed to save notes index", e);
    }
  }

  // Render a small preview image for a note by drawing its strokes into an offscreen canvas.
  function renderNotePreview(id: string) {
    try {
      const raw = window.localStorage.getItem(`note:${id}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      const strokes: any[] = parsed.strokes || [];

      const PREW = 480; // preview pixel width
      const PREH = 320; // preview pixel height
      const BASE_W = 900;
      const BASE_H = 1200;

      const canvas = document.createElement("canvas");
      canvas.width = PREW;
      canvas.height = PREH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // background
      ctx.fillStyle = "#fbf7ee";
      ctx.fillRect(0, 0, PREW, PREH);

      const scale = Math.min(PREW / BASE_W, PREH / BASE_H);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      for (const s of strokes) {
        if (!s || !Array.isArray(s.points) || s.points.length === 0) continue;
        ctx.beginPath();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.globalAlpha = s.alpha ?? 1;
        ctx.strokeStyle = s.color === "red" ? "#d9534f" : s.color === "blue" ? "#2563eb" : "#000";
        ctx.lineWidth = s.width ?? 3;
        const pts = s.points;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      return canvas.toDataURL("image/png");
    } catch (e) {
      return null;
    }
  }

  // Generate previews when notesIndex changes
  useEffect(() => {
    if (notesIndex.length === 0) return;
    const next: Record<string, string> = {};
    for (const n of notesIndex) {
      const p = renderNotePreview(n.id);
      if (p) next[n.id] = p;
    }
    setNotePreviews((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesIndex]);

  function createSlug(title: string) {
    return (
      title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") || "untitled"
    );
  }

  function openCreateModal() {
    setNewTitle("");
    setTitleError("");
    setShowCreateModal(true);
  }

  function handleCreateCancel() {
    setShowCreateModal(false);
    setNewTitle("");
    setTitleError("");
  }

  function handleCreateNote() {
    const title = newTitle || "Untitled";
    const id = createSlug(title);
    if (!id || id.trim() === "") {
      setTitleError("กรุณากรอกชื่อโน้ต");
      return;
    }

    const now = Date.now();

    // if already exists, navigate to it
    const existing = notesIndex.find((n) => n.id === id);
    if (existing) {
      setShowCreateModal(false);
      navigate(`/note/${id}`);
      return;
    }

    // persist minimal note object
    try {
      const noteObj = { id, title, lastEdited: now, strokes: [] } as any;
      window.localStorage.setItem(`note:${id}`, JSON.stringify(noteObj));
      const next = [{ id, title, lastEdited: now }, ...notesIndex];
      saveNotesIndex(next);
      setShowCreateModal(false);
      navigate(`/note/${id}`);
    } catch (e) {
      console.error("Failed to create note", e);
      setTitleError("ไม่สามารถสร้างโน้ตได้");
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate("/signin");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      {/* Header with account icon */}
      <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: "#FFF7DA" }}>
        <div className="flex items-center gap-4">
          <div className="text-4xl">📝</div>
          <h1 className="text-4xl font-extrabold text-black">โน้ตของคุณ</h1>
        </div>
        
        {/* Account Icon with Tooltip */}
        <div
          className="relative pt-2"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button className="p-2 hover:bg-gray-200 rounded-full transition">
            <UserCircle size={32} className="text-[#2f6f72]" />
          </button>
          
          {showTooltip && user && (
            <div className="absolute right-0 top-full mt-0 bg-white shadow-lg rounded-lg p-4 w-56 text-sm z-10 border border-gray-200">
              <p className="font-semibold text-black">{user.displayName || "User"}</p>
              <p className="text-gray-600 mb-3">{user.email}</p>
              <Button
                onClick={handleLogout}
                size="sm"
                className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                ออกจากระบบ
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Grid of Note Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Note Card (FIRST) */}
          <div
            onClick={openCreateModal}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
          >
            <div className="aspect-video bg-gray-200 overflow-hidden flex items-center justify-center">
              <div className="text-6xl">➕</div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-black text-lg">สร้างโน้ตใหม่</h3>
              <p className="text-xs text-gray-600 mt-1">แตะเพื่อเริ่มเขียน</p>
            </div>
          </div>

          {/* User-created notes from localStorage index */}
          {notesIndex.map((n) => (
            <div key={n.id} onClick={() => navigate(`/note/${n.id}`)} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer">
              <div className="aspect-video bg-gray-100 overflow-hidden">
                {notePreviews[n.id] ? (
                  <img src={notePreviews[n.id]} alt={n.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-gray-600">Canvas</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-black text-lg">{n.title}</h3>
                <p className="text-xs text-gray-600 mt-1">แก้ไขล่าสุดเมื่อ {new Date(n.lastEdited).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Canvas</p>
              </div>
            </div>
          ))}

          {/* Note Card 1 (PDF) */}
          <div 
            onClick={() => navigate("/pdf/respiration")}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
          >
            <div className="aspect-video bg-gray-200 overflow-hidden">
              <img src="/assets/Respiration.png" alt="Respiration" className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-black text-lg">Respiration</h3>
              <p className="text-xs text-gray-600 mt-1">แก้ไขล่าสุดเมื่อ 1 เดือนที่ผ่านมา</p>
              <p className="text-xs text-gray-500 mt-1">5 หน้า</p>
            </div>
          </div>

          {/* Note Card 2 (PDF) */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition" onClick={() => navigate("/pdf/plants")}>
            <div className="aspect-video bg-gray-200 overflow-hidden">
              <img src="/assets/plants.png" alt="พืชที่น่ารัก" className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-black text-lg">พืชที่น่ารัก</h3>
              <p className="text-xs text-gray-600 mt-1">แก้ไขล่าสุดเมื่อ 1 เดือนที่ผ่านมา</p>
              <p className="text-xs text-gray-500 mt-1">6 หน้า</p>
            </div>
          </div>

          {/* Flashcards Folder */}
          <div
            onClick={() => navigate("/flashcards")}
            className="bg-purple-50 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition flex flex-col items-center justify-center p-8 cursor-pointer border border-purple-200"
          >
            <div className="text-6xl mb-2">🎴</div>
            <h3 className="font-bold text-black text-lg">Flashcards</h3>
            <p className="text-xs text-gray-600 mt-1">Study with flashcards</p>
            <p className="text-xs text-gray-500 mt-1">Practice mode</p>
          </div>

          {/* Quizzes Folder */}
          <div
            onClick={() => navigate("/quizzes")}
            className="bg-blue-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition flex flex-col items-center justify-center p-8 cursor-pointer"
          >
            <div className="text-6xl text-blue-gray-400 mb-2">📁</div>
            <h3 className="font-bold text-black text-lg">Quizzes</h3>
            <p className="text-xs text-gray-600 mt-1">แก้ไขล่าสุดเมื่อ 1 เดือนที่ผ่านมา</p>
            <p className="text-xs text-gray-500 mt-1">2 รายการ</p>
          </div>
        </div>
      </div>

      {/* Create Note Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-[90%] max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-2">สร้างโน้ตใหม่</h3>
            <input
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                setTitleError("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
              placeholder="ใส่ชื่อโน้ต"
            />
            {titleError && <div className="text-sm text-red-600 mb-2">{titleError}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleCreateCancel}>ยกเลิก</Button>
              <Button onClick={handleCreateNote}>สร้าง</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
