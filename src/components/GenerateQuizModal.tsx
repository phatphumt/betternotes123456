import { useState } from "react";
import type { GenerateQuizResponse } from "@/lib/aiService";
import { aiService } from "@/lib/aiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { X, Loader2, AlertCircle, CheckCircle, ImageIcon } from "lucide-react";

export interface GenerateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (quiz: GenerateQuizResponse) => void;
  initialContent?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export default function GenerateQuizModal({
  isOpen,
  onClose,
  onGenerate,
  initialContent = "",
  canvasRef,
}: GenerateQuizModalProps) {
  const [inputMethod, setInputMethod] = useState<"text" | "image">("text");
  const [content, setContent] = useState(initialContent);
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [capturedImagePreview, setCapturedImagePreview] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"ง่าย" | "ปานกลาง" | "ยาก">("ปานกลาง");
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState<"Thai" | "English">("Thai");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedQuiz, setGeneratedQuiz] = useState<GenerateQuizResponse | null>(null);
  const [step, setStep] = useState<"input" | "preview">("input");

  const handleCaptureCanvas = () => {
    if (!canvasRef?.current) {
      setError("ไม่สามารถจับภาพแคนวาส");
      return;
    }

    const dataUrl = canvasRef.current.toDataURL("image/png");
    setImageDataUrl(dataUrl);
    setCapturedImagePreview(dataUrl);
    setError("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageDataUrl(dataUrl);
      setCapturedImagePreview(dataUrl);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateFromImage = async () => {
    setError("");

    if (!imageDataUrl) {
      setError("กรุณาอัพโหลดรูปภาพ");
      return;
    }

    setIsLoading(true);
    try {
      const response = await aiService.generateQuizFromImage({
        imageDataUrl,
        difficulty,
        count,
        language,
      });
      setGeneratedQuiz(response);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสร้างแบบทดสอบจากรูปภาพ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setError("");
    
    if (!content.trim()) {
      setError("กรุณากรอกเนื้อหา");
      return;
    }

    if (content.length < 50) {
      setError("เนื้อหาต้องมีอย่างน้อย 50 ตัวอักษร");
      return;
    }

    setIsLoading(true);
    try {
      const response = await aiService.generateQuiz({
        content,
        difficulty,
        count,
        language,
      });
      setGeneratedQuiz(response);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (generatedQuiz) {
      onGenerate(generatedQuiz);
      handleClose();
    }
  };

  const handleClose = () => {
    setContent(initialContent);
    setImageDataUrl("");
    setCapturedImagePreview("");
    setInputMethod("text");
    setDifficulty("ปานกลาง");
    setCount(5);
    setLanguage("Thai");
    setError("");
    setGeneratedQuiz(null);
    setStep("input");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              🤖 สร้างแบบทดสอบจากเนื้อหา
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === "input" ? "ส่วนที่ 1: กรอกเนื้อหา" : "ส่วนที่ 2: ตรวจสอบ"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "input" ? (
            <div className="space-y-5">
              {/* Input Method Tabs */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  วิธีการนำเข้า
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "text", label: "📝 ข้อความ", desc: "วางเนื้อหาข้อความ" },
                    { id: "image", label: "📸 รูปภาพ", desc: "อัพโหลดหรือจับภาพแคนวาส" },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setInputMethod(method.id as "text" | "image")}
                      className={`flex-1 p-3 rounded-lg border-2 transition ${
                        inputMethod === method.id
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium text-sm">{method.label}</div>
                      <div className="text-xs text-gray-500">{method.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Input - Text Mode */}
              {inputMethod === "text" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    เนื้อหา
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="วางเนื้อหาที่คุณต้องการให้สร้างแบบทดสอบ..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    disabled={isLoading}
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    {content.length} ตัวอักษร (ต้องการ 50+)
                  </div>
                </div>
              )}

              {/* Image Input - Image Mode */}
              {inputMethod === "image" && (
                <div className="space-y-4">
                  {/* Canvas Capture Button */}
                  {canvasRef && (
                    <div>
                      <button
                        onClick={handleCaptureCanvas}
                        disabled={isLoading}
                        className="w-full p-3 bg-blue-100 border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                      >
                        <ImageIcon size={20} className="mx-auto mb-2" />
                        <div className="font-medium text-sm text-blue-700">จับภาพแคนวาส</div>
                        <div className="text-xs text-blue-600">บันทึกเนื้อหาแคนวาสปัจจุบัน</div>
                      </button>
                    </div>
                  )}

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      หรืออัพโหลดรูปภาพ
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isLoading}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Image Preview */}
                  {capturedImagePreview && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ตัวอย่างรูปภาพ
                      </label>
                      <img
                        src={capturedImagePreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Settings Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ระดับความยาก
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(e.target.value as "ง่าย" | "ปานกลาง" | "ยาก")
                    }
                    disabled={isLoading}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ง่าย">ง่าย</option>
                    <option value="ปานกลาง">ปานกลาง</option>
                    <option value="ยาก">ยาก</option>
                  </select>
                </div>

                {/* Question Count */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    จำนวนคำถาม
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold text-teal-600 w-8">
                      {count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ภาษา
                </label>
                <div className="flex gap-2">
                  {["Thai", "English"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang as "Thai" | "English")}
                      disabled={isLoading}
                      className={`flex-1 p-2 rounded-lg border-2 transition ${
                        language === lang
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {lang === "Thai" ? "ไทย" : "English"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          ) : (
            // Preview Step
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900">สร้างสำเร็จ</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      {generatedQuiz?.questions.length} คำถามถูกสร้างขึ้น
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">หัวข้อ</h3>
                <Input
                  type="text"
                  value={generatedQuiz?.title || ""}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">รายละเอียด</h3>
                <Input
                  type="text"
                  value={generatedQuiz?.subtitle || ""}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>

              {/* Questions Preview */}
              <div className="border-t pt-4 max-h-64 overflow-y-auto">
                <h3 className="font-semibold text-gray-900 mb-3">
                  ตัวอย่างคำถาม
                </h3>
                <div className="space-y-3">
                  {generatedQuiz?.questions.slice(0, 3).map((q, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {idx + 1}. {q.text}
                      </p>
                      <div className="mt-2 space-y-1">
                        {q.answers.map((a, aidx) => (
                          <p
                            key={aidx}
                            className={`text-xs ${
                              a.correct
                                ? "text-green-700 font-semibold"
                                : "text-gray-600"
                            }`}
                          >
                            {a.correct ? "✓ " : ""}
                            {a.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                  {generatedQuiz && generatedQuiz.questions.length > 3 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      +{generatedQuiz.questions.length - 3} คำถามเพิ่มเติม
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6">
          {step === "input" ? (
            <>
              <Button
                onClick={handleClose}
                variant="outline"
                disabled={isLoading}
              >
                ยกเลิก
              </Button>
              {inputMethod === "text" ? (
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !content.trim() || content.length < 50}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      สร้างกำลังดำเนิน...
                    </>
                  ) : (
                    "สร้างแบบทดสอบ"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateFromImage}
                  disabled={isLoading || !imageDataUrl}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      สร้างกำลังดำเนิน...
                    </>
                  ) : (
                    "สร้างแบบทดสอบจากรูปภาพ"
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={() => setStep("input")}
                variant="outline"
              >
                ย้อนกลับ
              </Button>
              <Button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                บันทึกแบบทดสอบ
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
