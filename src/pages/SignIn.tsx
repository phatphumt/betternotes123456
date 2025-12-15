import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const emailOk = useMemo(() => {
    const t = email.trim();
    return t.length > 3 && t.includes("@") && t.includes(".") && !t.includes(" ");
  }, [email]);

  const passwordOk = password.length >= 6;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailOk || !passwordOk) return;

    setSubmitting(true);
    setError("");
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      console.log("signed in", userCred.user);
      navigate((location.state as any)?.from?.pathname || "/");
    } catch (err: any) {
      setError(err.message || "เข้าสู่ระบบล้มเหลว");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f3ea]">
      {/* Subtle watermark */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-24 rotate-[-18deg] select-none text-[220px] font-black tracking-tight text-black/5 sm:text-[280px]">
          B
        </div>
        <div className="absolute left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] select-none whitespace-nowrap text-[120px] font-black tracking-tight text-black/5 sm:text-[160px]">
          BetterNotes
        </div>
      </div>

      <div className="relative text-5xl mx-auto flex min-h-screen max-w-5xl items-start justify-center px-4 py-10 sm:items-center">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-center gap-4 sm:justify-start">
            {/* Replace this with an <img /> if you have a logo file */}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <span className="text-2xl">📝</span>
            </div>

            <div>
              <div className="text-4xl font-extrabold tracking-tight text-black">BetterNotes</div>
              <div className="mt-1 text-xl font-semibold text-black/80">เข้าสู่ระบบ</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="grid gap-5">
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">{error}</div>}
            
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm text-black/80">
                อีเมล
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="betternotes@betternotes.com"
                className="h-12 rounded-lg border-0 bg-[#f3e3aa] text-black placeholder:text-black/40 shadow-sm ring-1 ring-black/10 focus-visible:ring-2 focus-visible:ring-[#2f6f72]/35 focus-visible:ring-offset-0"
                autoComplete="email"
              />
              {!emailOk && email.length > 0 ? (
                <p className="text-xs text-red-600">กรุณากรอกอีเมลให้ถูกต้อง</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm text-black/80">
                รหัสผ่าน
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 rounded-lg border-0 bg-[#f3e3aa] text-black placeholder:text-black/40 shadow-sm ring-1 ring-black/10 focus-visible:ring-2 focus-visible:ring-[#2f6f72]/35 focus-visible:ring-offset-0"
                autoComplete="current-password"
              />

              <div className="text-xs text-black/55">
                <a
                  href="#"
                  className="hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    console.log("forgot password");
                  }}
                >
                  ลืมรหัสผ่าน?
                </a>
                <span className="px-2">·</span>
                <Link to="/register" className="hover:underline">
                  สมัครสมาชิก
                </Link>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={!emailOk || !passwordOk || submitting}
                className="h-12 w-full rounded-lg bg-[#2f6f72] text-base font-semibold text-white shadow-sm hover:bg-[#295f61] disabled:opacity-60"
              >
                {submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
