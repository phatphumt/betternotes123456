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
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

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
          {/* Note Card 1 */}
          <div 
            onClick={() => navigate("/pdf/respiration")}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
          >
            <div className="aspect-video bg-gray-200 overflow-hidden">
              <img src="/public/assets/Respiration.png" alt="Respiration" className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-black text-lg">Respiration</h3>
              <p className="text-xs text-gray-600 mt-1">แก้ไขล่าสุดเมื่อ 1 เดือนที่ผ่านมา</p>
              <p className="text-xs text-gray-500 mt-1">5 หน้า</p>
            </div>
          </div>

          {/* Note Card 2 */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition" onClick={() => navigate("/pdf/plants")}>
            <div className="aspect-video bg-gray-200 overflow-hidden">
              <img src="/public/assets/plants.png" alt="พืชที่น่ารัก" className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-black text-lg">พืชที่น่ารัก</h3>
              <p className="text-xs text-gray-600 mt-1">แก้ไขล่าสุดเมื่อ 1 เดือนที่ผ่านมา</p>
              <p className="text-xs text-gray-500 mt-1">6 หน้า</p>
            </div>
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
    </div>
  );
}
