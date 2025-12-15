import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

type Answer = { text: string; correct: boolean };
type Question = {
  id: number;
  text: string;
  answers: Answer[];
  detail: string;
  tag?: string;
};

type QuizResponse = {
  id: number;
  selectedIndex: number;
  correct: boolean;
};

const sampleQuestions: Record<string, Question[]> = {
  respiration: [
    {
      id: 1,
      text: "ตามกฎของบอยล์ (Boyle’s law) เมื่อปริมาตรของถุงลม/ทรวงอกเพิ่มขึ้น ความดันอากาศภายในจะเปลี่ยนอย่างไร (เมื่ออุณหภูมิคงที่)?",
      answers: [
        { text: "ความดันเพิ่มขึ้น", correct: false },
        { text: "ความดันลดลง", correct: true },
        { text: "ความดันคงที่เสมอ", correct: false },
        { text: "ความดันเพิ่มขึ้นแล้วลดลง", correct: false },
      ],
      detail: "กฎบอยล์ระบุว่า P ∝ 1/V ดังนั้นเมื่อ V เพิ่มขึ้น ความดัน (P) จะลดลง",
      tag: "กฎทางฟิสิกส์",
    },
    {
      id: 2,
      text: "ข้อใดอธิบายการหายใจเข้า (inspiration) ได้ถูกต้องที่สุดในภาวะปกติ?",
      answers: [
        {
          text: "กะบังลมหดตัว + กล้ามเนื้อระหว่างซี่โครงชั้นนอกหดตัว → ปริมาตรทรวงอกเพิ่ม → ความดันถุงลมต่ำกว่าบรรยากาศ",
          correct: true,
        },
        {
          text: "กะบังลมหดตัว + กล้ามเนื้อระหว่างซี่โครงชั้นในหดตัว → ปริมาตรทรวงอกลด → ความดันถุงลมสูงกว่าบรรยากาศ",
          correct: false,
        },
        { text: "กะบังลมคลายตัว → ปริมาตรถุงลมเพิ่ม → ความดันถุงลมสูงขึ้น", correct: false },
        { text: "กล้ามเนื้อหน้าท้องหดตัว → ปริมาตรทรวงอกเพิ่ม → อากาศไหลเข้า", correct: false },
      ],
      detail:
        "หายใจเข้า: กะบังลมและ external intercostals หดตัว ทำให้ทรวงอกขยาย ปริมาตรเพิ่ม ความดันถุงลมลดลงต่ำกว่าความดันบรรยากาศ อากาศจึงไหลเข้า",
      tag: "สรีรวิทยาการหายใจ",
    },
    {
      id: 3,
      text: "อากาศจะหยุดไหลเข้าปอดในช่วงหายใจเข้าตอนไหน?",
      answers: [
        { text: "เมื่อความดันถุงลม (P_alv) มากกว่าความดันบรรยากาศ (P_atm)", correct: false },
        { text: "เมื่อ P_alv เท่ากับ P_atm", correct: true },
        { text: "เมื่อปริมาตรถุงลมสูงสุดเสมอเท่านั้น (ไม่ขึ้นกับความดัน)", correct: false },
        { text: "เมื่อความดันในหลอดเลือดปอดเท่ากับความดันถุงลม", correct: false },
      ],
      detail: "การไหลของอากาศเกิดจากความต่างความดัน เมื่อ P_alv = P_atm จะไม่มีความต่างความดัน อากาศจึงหยุดไหล",
      tag: "สรีรวิทยาการหายใจ",
    },
    {
      id: 4,
      text: "การหายใจออกแบบปกติ (quiet expiration) ส่วนใหญ่เกิดจากอะไร?",
      answers: [
        { text: "กล้ามเนื้อหน้าท้องหดตัวอย่างแรง", correct: false },
        { text: "กล้ามเนื้อระหว่างซี่โครงชั้นในหดตัว", correct: false },
        { text: "แรงยืดหยุ่นคืนกลับ (elastic recoil) ของปอดและทรวงอกหลังกล้ามเนื้อคลายตัว", correct: true },
        { text: "การหดตัวต่อเนื่องของกะบังลม", correct: false },
      ],
      detail:
        "หายใจออกปกติมักเป็นกระบวนการ passive: กล้ามเนื้อคลายตัวและแรง elastic recoil ทำให้ปริมาตรลด ความดันถุงลมสูงขึ้นเล็กน้อย อากาศไหลออก",
      tag: "สรีรวิทยาการหายใจ",
    },
    {
      id: 5,
      text: "ข้อใดเป็นกล้ามเนื้อสำคัญที่ใช้ในการหายใจออกแบบแรง (forced expiration)?",
      answers: [
        { text: "External intercostals และกะบังลม", correct: false },
        { text: "กล้ามเนื้อหน้าท้อง และ Internal intercostals", correct: true },
        { text: "Sternocleidomastoid และ Scalenes", correct: false },
        { text: "Pectoralis minor และ External intercostals", correct: false },
      ],
      detail:
        "forced expiration ใช้กล้ามเนื้อหน้าท้องช่วยดันกะบังลมขึ้น และ internal intercostals ช่วยลดซี่โครง ทำให้ทรวงอกยุบมากขึ้น",
      tag: "กล้ามเนื้อหายใจ",
    },
    {
      id: 6,
      text: "ข้อใดเป็น “กล้ามเนื้อช่วยหายใจเข้า” (accessory muscles of inspiration) ที่พบบ่อยเมื่อหายใจแรง?",
      answers: [
        { text: "Sternocleidomastoid, Scalenes, Pectoralis minor", correct: true },
        { text: "Internal intercostals, Rectus abdominis, Obliques", correct: false },
        { text: "Diaphragm เพียงอย่างเดียว", correct: false },
        { text: "กล้ามเนื้อกระบังลมและกล้ามเนื้อหน้าท้องพร้อมกันเท่านั้น", correct: false },
      ],
      detail:
        "การหายใจเข้าแรงมักเรียกใช้กล้ามเนื้อเสริม เช่น sternocleidomastoid, scalenes, pectoralis minor เพื่อยก/ตรึงโครงอกให้ขยายมากขึ้น",
      tag: "กล้ามเนื้อหายใจ",
    },
    {
      id: 7,
      text: "Tidal Volume (TV) หมายถึงอะไร และโดยประมาณในภาวะหายใจปกติ (quiet breathing) เท่าใด?",
      answers: [
        { text: "ปริมาตรอากาศที่หายใจเข้า-ออกใน 1 ครั้งแบบปกติ ≈ 500 mL", correct: true },
        { text: "ปริมาตรอากาศที่หายใจออกได้มากที่สุดหลังหายใจเข้าปกติ ≈ 1.1 L", correct: false },
        { text: "ปริมาตรอากาศที่คงเหลือในปอดหลังหายใจออกสุดแรง ≈ 1.2 L", correct: false },
        { text: "ปริมาตรอากาศที่หายใจเข้าได้เพิ่มจากการหายใจเข้าปกติ ≈ 3 L", correct: false },
      ],
      detail: "TV คือปริมาตรอากาศต่อรอบหายใจแบบปกติ โดยค่ามาตรฐานประมาณ 500 mL",
      tag: "lung volumes",
    },
    {
      id: 8,
      text: "Inspiratory Reserve Volume (IRV) คืออะไร และค่าประมาณตามโน้ตนี้คือเท่าใด?",
      answers: [
        { text: "อากาศที่หายใจเข้าเพิ่มได้จากระดับหายใจเข้าปกติ ≈ 3 L", correct: true },
        { text: "อากาศที่หายใจออกเพิ่มได้จากระดับหายใจออกปกติ ≈ 3 L", correct: false },
        { text: "อากาศคงเหลือในปอดหลังหายใจออกสุดแรง ≈ 3 L", correct: false },
        { text: "อากาศที่เข้า-ออกในรอบหายใจปกติ ≈ 3 L", correct: false },
      ],
      detail: "IRV คือปริมาตรที่ “สูดเข้าเพิ่มได้” นอกเหนือจาก TV โดยประมาณ ≈ 3 L",
      tag: "lung volumes",
    },
    {
      id: 9,
      text: "Expiratory Reserve Volume (ERV) คืออะไร และค่าประมาณตามโน้ตนี้คือเท่าใด?",
      answers: [
        { text: "อากาศที่หายใจออกเพิ่มได้จากระดับหายใจออกปกติ ≈ 1.1 L", correct: true },
        { text: "อากาศที่หายใจเข้าเพิ่มได้จากระดับหายใจเข้าปกติ ≈ 1.1 L", correct: false },
        { text: "อากาศคงเหลือหลังหายใจออกสุดแรง ≈ 1.1 L", correct: false },
        { text: "อากาศในหนึ่งครั้งหายใจปกติ ≈ 1.1 L", correct: false },
      ],
      detail: "ERV คือปริมาตรที่ “เป่าออกเพิ่มได้” ต่อจากการหายใจออกปกติ โดยประมาณ ≈ 1.1 L",
      tag: "lung volumes",
    },
    {
      id: 10,
      text: "Residual Volume (RV) คืออะไร และค่าประมาณตามโน้ตนี้คือเท่าใด?",
      answers: [
        { text: "อากาศที่ยังคงเหลือในทางเดินหายใจ/ปอดหลังหายใจออกสุดแรง ≈ 1.2 L", correct: true },
        { text: "อากาศที่หายใจเข้า-ออกปกติ ≈ 1.2 L", correct: false },
        { text: "อากาศที่หายใจเข้าเพิ่มได้ ≈ 1.2 L", correct: false },
        { text: "อากาศที่หายใจออกเพิ่มได้ ≈ 1.2 L", correct: false },
      ],
      detail: "RV คืออากาศที่เป่าออกไม่ได้หมด แม้หายใจออกสุดแรง โดยประมาณ ≈ 1.2 L",
      tag: "lung volumes",
    },
    {
      id: 11,
      text: "เหตุผลสำคัญที่สไปโรมิเตอร์ (spirometry) วัด RV โดยตรงไม่ได้คืออะไร?",
      answers: [
        { text: "เพราะ RV เป็นอากาศที่ไม่เคลื่อนที่เข้าออกทางปาก จึงไม่ถูกบันทึกโดยสไปโรมิเตอร์", correct: true },
        { text: "เพราะ RV มีออกซิเจนเป็นศูนย์", correct: false },
        { text: "เพราะ RV เกิดเฉพาะตอนหายใจเข้า", correct: false },
        { text: "เพราะ RV เท่ากับ TV เสมอ", correct: false },
      ],
      detail:
        "สไปโรมิเตอร์วัดได้เฉพาะอากาศที่เข้า-ออกผ่านทางเดินหายใจส่วนต้น แต่ RV ยังเหลืออยู่ในปอด จึงวัดตรง ๆ ไม่ได้",
      tag: "lung volumes",
    },
    {
      id: 12,
      text: "Functional Residual Capacity (FRC) มีความสัมพันธ์ตามสูตรใด และค่าประมาณตามโน้ตนี้คือเท่าใด?",
      answers: [
        { text: "FRC = ERV + RV ≈ 2.3 L", correct: true },
        { text: "FRC = TV + IRV ≈ 3.5 L", correct: false },
        { text: "FRC = TV + IRV + ERV ≈ 4.1 L", correct: false },
        { text: "FRC = TV + RV ≈ 1.7 L", correct: false },
      ],
      detail:
        "FRC คือปริมาตรอากาศที่คงอยู่ในปอดหลังหายใจออกปกติ เท่ากับ ERV + RV และในโน้ตประมาณ ≈ 2.3 L",
      tag: "lung capacities",
    },
    {
      id: 13,
      text: "Inspiratory Capacity (IC) มีความสัมพันธ์ตามสูตรใด และค่าประมาณตามโน้ตนี้คือเท่าใด?",
      answers: [
        { text: "IC = TV + IRV ≈ 3.5 L", correct: true },
        { text: "IC = ERV + RV ≈ 3.5 L", correct: false },
        { text: "IC = TV + ERV ≈ 3.5 L", correct: false },
        { text: "IC = IRV + RV ≈ 3.5 L", correct: false },
      ],
     detail:
        "IC คือปริมาตรที่สูดเข้าได้ตั้งแต่ระดับหายใจออกปกติ จึงเท่ากับ TV + IRV โดยโน้ตประมาณ ≈ 3.5 L",
      tag: "lung capacities",
    },
    {
      id: 14,
      text: "Vital Capacity (VC) มีความสัมพันธ์ตามสูตรใด และค่าประมาณตามโน้ตนี้คือเท่าใด?",
      answers: [
        { text: "VC = TV + IRV + ERV ≈ 4.1 L", correct: true },
        { text: "VC = ERV + RV ≈ 4.1 L", correct: false },
        { text: "VC = TV + RV ≈ 4.1 L", correct: false },
        { text: "VC = IRV + RV ≈ 4.1 L", correct: false },
      ],
      detail:
        "VC คือปริมาตรอากาศสูงสุดที่สามารถหายใจออกได้หลังหายใจเข้าสุดแรง เท่ากับ TV + IRV + ERV โดยโน้ตประมาณ ≈ 4.1 L",
      tag: "lung capacities",
    },
    {
      id: 15,
      text: "Total Lung Capacity (TLC) ตามโน้ตนี้มีค่าประมาณเท่าใด?",
      answers: [
        { text: "≈ 2.3 L", correct: false },
        { text: "≈ 3.5 L", correct: false },
        { text: "≈ 4.1 L", correct: false },
        { text: "≈ 5.3 L", correct: true },
      ],
      detail: "TLC คือปริมาตรรวมของปอดเมื่อหายใจเข้าสุดแรง (รวม RV ด้วย) ในโน้ตประมาณ ≈ 5.3 L",
      tag: "lung capacities",
    },
    {
      id: 16,
      text: "ตามกฎของฟิก (Fick’s law) อัตราการแพร่ (J) จะ “เพิ่มขึ้น” เมื่อข้อใดเกิดขึ้น?",
      answers: [
        { text: "พื้นที่ผิวแลกเปลี่ยน (A) เพิ่ม และความต่างความดันย่อย (ΔP) เพิ่ม", correct: true },
        { text: "ความหนาเยื่อกั้น (Δx) เพิ่ม", correct: false },
        { text: "สัมประสิทธิ์การแพร่ (D) ลดลง", correct: false },
        { text: "พื้นที่ผิว (A) ลดลง แต่ความหนา (Δx) เพิ่ม", correct: false },
      ],
      detail:
        "Fick’s law: J = D·A·(ΔP/Δx) ดังนั้น J เพิ่มเมื่อ D, A, หรือ ΔP เพิ่ม และลดเมื่อ Δx เพิ่ม",
      tag: "กฎทางฟิสิกส์",
    },
    {
      id: 17,
      text: "กฎของดอลตัน (Dalton’s law) เกี่ยวกับความดันย่อยของแก๊สเขียนได้ถูกต้องตามข้อใด?",
      answers: [
        { text: "P_total = P1 + P2 + P3 + ...", correct: true },
        { text: "P_total = P1 × P2 × P3 × ...", correct: false },
        { text: "P_total = (P1 + P2 + P3)/3 เสมอ", correct: false },
        { text: "P_total = P1 − P2 − P3 − ...", correct: false },
      ],
      detail: "Dalton’s law ระบุว่าความดันรวมของส่วนผสมแก๊สเท่ากับผลบวกของความดันย่อยของแก๊สแต่ละชนิด",
      tag: "กฎทางฟิสิกส์",
    },
    {
      id: 18,
      text: "ที่ความดันบรรยากาศ 760 mmHg หากอากาศมีสัดส่วน O2 = 21% ความดันย่อยของออกซิเจน (P_O2) เท่ากับเท่าใด?",
      answers: [
        { text: "7.6 mmHg", correct: false },
        { text: "159.6 mmHg", correct: true },
        { text: "592.8 mmHg", correct: false },
        { text: "760 mmHg", correct: false },
      ],
      detail: "ใช้ Dalton’s law: P_O2 = 0.21 × 760 = 159.6 mmHg",
      tag: "กฎทางฟิสิกส์",
    },
    {
      id: 19,
      text: "ข้อใดจับคู่ “ทิศทางการแพร่” และ “ค่าความดันย่อย” ได้ถูกต้องที่สุดตามภาพโน้ต?",
      answers: [
        { text: "ที่ถุงลม: O2 แพร่จากเลือดไปถุงลม เพราะเลือดมี P_O2 = 104 มากกว่าถุงลม", correct: false },
        { text: "ที่ถุงลม: CO2 แพร่จากถุงลมไปเลือด เพราะถุงลมมี P_CO2 = 45 มากกว่าเลือด", correct: false },
        {
          text: "เลือดดำเข้าปอดมี P_O2 ≈ 40 และ P_CO2 ≈ 45 แล้วปรับใกล้ถุงลมเป็น P_O2 ≈ 104 และ P_CO2 ≈ 40",
          correct: true,
        },
        { text: "เลือดออกจากเนื้อเยื่อกลับหัวใจมี P_O2 ≈ 95 และ P_CO2 ≈ 40", correct: false },
      ],
      detail:
        "ในปอด เลือดดำที่มาถึงมี P_O2 ต่ำ (≈40) และ P_CO2 สูง (≈45) จึงรับ O2 จากถุงลม (P_O2 ≈104) และปล่อย CO2 สู่ถุงลม (P_CO2 ≈40) ทำให้เลือดหลังแลกเปลี่ยนมีค่าเข้าใกล้ 104/40",
      tag: "gas exchange",
    },
    {
      id: 20,
      text: "ในเนื้อเยื่อ (tissue capillary) ตามโน้ตนี้ ข้อใดถูกต้อง?",
      answers: [
        { text: "ออกซิเจนแพร่จากเซลล์ไปเลือด เพราะเซลล์มี P_O2 สูงกว่าเลือด", correct: false },
        { text: "คาร์บอนไดออกไซด์แพร่จากเลือดไปเซลล์ เพราะเลือดมี P_CO2 ต่ำกว่าเซลล์", correct: false },
        {
          text: "เลือดแดงเข้าเนื้อเยื่อมี P_O2 ≈ 95, P_CO2 ≈ 40 และเลือดดำออกจากเนื้อเยื่อมี P_O2 ≈ 40, P_CO2 ≈ 45",
          correct: true,
        },
        { text: "ของเหลวระหว่างเซลล์ (interstitial fluid) มี P_O2 ≈ 104 และ P_CO2 ≈ 40", correct: false },
      ],
      detail:
        "ในเนื้อเยื่อ O2 แพร่จากเลือดไปยัง interstitial fluid/เซลล์ (เพราะเซลล์มี P_O2 ต่ำกว่า เช่น ≈20) และ CO2 แพร่กลับจากเซลล์สู่เลือด ทำให้เลือดที่ออกจากเนื้อเยื่อมี P_O2 ลดลง (~40) และ P_CO2 เพิ่มขึ้น (~45)",
      tag: "gas exchange",
    },
  ],
};

export default function QuizPlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();

  const questionsAll = useMemo(
    () => (slug && sampleQuestions[slug] ? sampleQuestions[slug] : sampleQuestions.respiration),
    [slug]
  );

  // ✅ Review wrong-only mode (จาก summary)
  const { reviewOnly, wrongIds } = (location.state ?? {}) as {
    reviewOnly?: boolean;
    wrongIds?: number[];
  };

  const questions = useMemo(() => {
    if (reviewOnly && Array.isArray(wrongIds) && wrongIds.length > 0) {
      return questionsAll.filter((q) => wrongIds.includes(q.id));
    }
    return questionsAll;
  }, [questionsAll, reviewOnly, wrongIds]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // ✅ store answers + timing
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [startedAt] = useState<number>(() => Date.now());

  const q = questions[index];
  const progress = ((index + 1) / questions.length) * 100;

  const handleSelect = (i: number) => {
    if (submitted) return;
    setSelected(i);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);

    const isCorrect = q.answers[selected]?.correct === true;

    setResponses((prev) => {
      const exists = prev.find((r) => r.id === q.id);
      if (exists) {
        return prev.map((r) => (r.id === q.id ? { id: q.id, selectedIndex: selected, correct: isCorrect } : r));
      }
      return [...prev, { id: q.id, selectedIndex: selected, correct: isCorrect }];
    });
  };

  const finishQuiz = (finalResponses: QuizResponse[]) => {
    const total = questions.length;
    const correct = finalResponses.filter((r) => r.correct).length;
    const score = Math.round((correct / total) * 100);
    const finishedAt = Date.now();
    const durationMs = finishedAt - startedAt;

    const wrong = questions
      .map((qq) => {
        const r = finalResponses.find((x) => x.id === qq.id);
        if (!r || r.correct) return null;

        const selectedText = qq.answers[r.selectedIndex]?.text ?? "(ไม่ได้เลือก)";
        const correctText = qq.answers.find((a) => a.correct)?.text ?? "(ไม่พบคำตอบที่ถูก)";

        return {
          id: qq.id,
          text: qq.text,
          tag: qq.tag,
          selectedText,
          correctText,
          detail: qq.detail,
        };
      })
      .filter(Boolean) as any[];

    if (slug) {
      sessionStorage.setItem(
        `quiz_result_${slug}`,
        JSON.stringify({
          slug,
          total,
          correct,
          score,
          durationMs,
          finishedAt,
          wrong,
        })
      );

      // ✅ ไป summary
      navigate(`/quiz/${slug}/summary`, { replace: true });
    } else {
      navigate(-1);
    }
  };

  const handleNext = () => {
    const next = index + 1;

    if (next < questions.length) {
      setIndex(next);
      setSelected(null);
      setSubmitted(false);
      setShowDetail(false);
      return;
    }

    // ✅ ensure last answer is included
    const lastAlready = responses.find((r) => r.id === q.id);
    let finalResponses = responses;

    if (!lastAlready && selected !== null) {
      const isCorrect = q.answers[selected]?.correct === true;
      finalResponses = [...responses, { id: q.id, selectedIndex: selected, correct: isCorrect }];
    }

    finishQuiz(finalResponses);
  };

  return (
    <div className="min-h-screen bg-[#f7f3ea] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b" style={{ backgroundColor: "#FFF7DA" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-gray-200 transition text-black"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">โน้ตของคุณ</span>
          </button>
          <div className="font-semibold text-sm sm:text-base text-center">
            {slug ? `${slug} Quiz` : "Quiz"}
            {reviewOnly ? " • ทบทวนข้อผิด" : ""}
          </div>
        </div>
        <div className="text-xs text-gray-600">{q.tag ?? ""}</div>
      </div>

      {/* Progress */}
      <div className="px-6 pt-4">
        <div className="text-xs text-gray-600 mb-2">
          {index + 1}/{questions.length}
        </div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-2 bg-[#0f766e]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="p-6 flex flex-col gap-4 items-center">
        <div className="w-full max-w-3xl bg-[#fff7e5] border border-[#f5e6c5] rounded-xl shadow-sm p-4">
          <div className="flex justify-between text-[11px] text-gray-600 mb-2">
            <span>
              {index + 1}/{questions.length}
            </span>
            <span className="text-red-500">{q.tag ?? ""}</span>
          </div>
          <div className="text-sm sm:text-base text-black leading-6">{q.text}</div>
        </div>

        {/* Answers */}
        <div className="w-full max-w-3xl flex flex-col gap-2">
          {q.answers.map((a, i) => {
            const base = "w-full rounded-md px-3 py-3 text-sm sm:text-base text-center border transition";
            const neutral = "bg-[#f9f7f2] border-transparent text-gray-800 hover:border-[#0f766e]/40 hover:shadow-sm";
            const correct = "bg-[#c7f5d9] border-[#22c55e] text-[#14532d]";
            const wrong = "bg-[#fcd6d6] border-[#ef4444] text-[#7f1d1d]";
            const disabled = "cursor-not-allowed opacity-90";

            let cls = `${base} ${neutral}`;
            if (submitted) {
              if (a.correct) cls = `${base} ${correct} ${disabled}`;
              else if (selected === i) cls = `${base} ${wrong} ${disabled}`;
              else cls = `${base} ${neutral} ${disabled}`;
            } else if (selected === i) {
              cls = `${base} border-[#0f766e] bg-white shadow-sm`;
            }

            return (
              <button key={a.text} className={cls} onClick={() => handleSelect(i)} disabled={submitted}>
                {a.text}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="w-full max-w-3xl flex items-center justify-between gap-3 pt-2 flex-wrap">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-[#0f766e] text-[#0f766e]"
              onClick={() => setShowDetail(true)}
              disabled={!submitted}
            >
              <Info size={16} className="mr-1" />
              เฉลยละเอียด
            </Button>
          </div>

          <div className="flex gap-2">
            {!submitted ? (
              <Button
                className="bg-[#0f766e] hover:bg-[#0b5f59] text-white"
                onClick={handleSubmit}
                disabled={selected === null}
              >
                ยืนยันคำตอบ
              </Button>
            ) : (
              <Button className="bg-[#0f766e] hover:bg-[#0b5f59] text-white" onClick={handleNext}>
                {index + 1 === questions.length ? "ดูสรุปผล" : "ข้อต่อไป"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {showDetail && submitted && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 relative">
            <div className="text-base font-semibold text-[#0f766e] mb-2">เฉลยละเอียด</div>
            <div className="text-sm text-black leading-6 mb-4 whitespace-pre-line">{q.detail}</div>
            <div className="flex justify-end">
              <Button onClick={() => setShowDetail(false)}>ปิด</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
