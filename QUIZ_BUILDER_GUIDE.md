# Quiz Builder - Feature Guide

## Overview

A complete Thai-language quiz creation and editing system with localStorage persistence. Users can create custom quizzes, manage questions and answers, and organize them by difficulty level.

## Features

### 📋 Quiz Builder Page (`/quiz-builder`)
The main hub for managing all custom quizzes.

**Features:**
- List all created quizzes with metadata
- Create new quiz with title, description, and difficulty level
- Edit quiz details (title, subtitle, difficulty)
- Delete quizzes with confirmation
- View quiz statistics (number of questions, difficulty badge)
- Quick links to edit or view quiz details
- Empty state with helpful guidance

**UI Elements (in Thai):**
- "สร้างแบบทดสอบ" (Create Quiz)
- "สร้างใหม่" (Create New)
- "แก้ไข" (Edit)
- "ดู" (View)
- "ยังไม่มีแบบทดสอบที่สร้างขึ้น" (No quizzes created yet)
- Difficulty levels: "ง่าย" (Easy), "ปานกลาง" (Medium), "ยาก" (Hard)

### ✏️ Quiz Editor Page (`/quiz-builder/:slug`)
Detailed editor for creating and managing quiz questions.

**Features:**
- Edit quiz metadata (title, subtitle, difficulty)
- Add, edit, and delete questions
- Manage multiple-choice answers (min 2, max unlimited)
- Mark correct answers with check icons
- Add optional tags and detailed explanations for each question
- Real-time validation and error handling
- Question counter and organization

**UI Elements (in Thai):**
- "เพิ่มคำถาม" (Add Question)
- "ข้อคำถาม" (Question Text)
- "แท็ก" (Tag)
- "ตัวเลือก" (Options/Answers)
- "คำตอบที่ถูกต้อง" (Correct Answer)
- "คำอธิบายละเอียด" (Detailed Explanation)
- "ลบตัวเลือก" (Delete Option)
- "เพิ่มตัวเลือก" (Add Option)
- "แก้ไข" (Edit)
- "บันทึก" (Save)

## Data Structure

### Quiz Object
```typescript
type Quiz = {
  slug: string;                    // URL-safe identifier
  title: string;                   // Quiz title
  subtitle: string;                // Description
  difficulty: "ง่าย" | "ปานกลาง" | "ยาก";  // Difficulty level
  questions: Question[];           // Array of questions
  createdAt?: number;              // Creation timestamp
  updatedAt?: number;              // Last modification timestamp
};
```

### Question Object
```typescript
type Question = {
  id: string;                      // Unique question ID
  text: string;                    // Question text
  answers: Answer[];               // Multiple-choice options
  detail: string;                  // Detailed explanation
  tag?: string;                    // Optional category tag
};
```

### Answer Object
```typescript
type Answer = {
  id: string;                      // Unique answer ID
  text: string;                    // Answer text
  correct: boolean;                // Is this the correct answer?
};
```

## Storage

**localStorage Key:** `quizzes:custom`

Stores array of Quiz objects as JSON string.

Example:
```javascript
// Load all custom quizzes
const quizzes = JSON.parse(localStorage.getItem("quizzes:custom"));

// Load single quiz
const quiz = quizzes.find(q => q.slug === "my-quiz");

// Save/update
localStorage.setItem("quizzes:custom", JSON.stringify(quizzes));
```

## Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/quiz-builder` | `QuizBuilder` | List and manage all quizzes |
| `/quiz-builder/:slug` | `QuizEditor` | Create/edit questions for a quiz |
| `/quiz/:slug` | `QuizDetail` | View quiz details |
| `/quiz/:slug/play` | `QuizPlay` | Take the quiz |
| `/quiz/:slug/summary` | `QuizSummary` | View quiz results |

## Validation Rules

### Quiz Creation
- ✅ Title is required and cannot be empty
- ✅ Slug is auto-generated from title (lowercase, hyphens, alphanumeric only)
- ✅ Cannot create duplicate quizzes (same slug)
- ✅ Subtitle and difficulty are optional but have defaults

### Question Addition
- ✅ Question text is required
- ✅ At least 2 answer options required
- ✅ At least 1 correct answer required
- ✅ Answers are automatically filtered to remove empty options
- ✅ Detail explanation is optional

## Color Scheme

- **Primary (Teal):** #0f766e - Main actions, buttons
- **Header (Cream):** #FFF7DA - Top navigation bar
- **Background:** #f7f3ea - Page background
- **Difficulty Colors:**
  - Easy (ง่าย): Green #22c55e
  - Medium (ปานกลาง): Yellow #eab308
  - Hard (ยาก): Red #ef4444

## UI Components Used

- `Button` - Custom button component from `@/components/ui/button`
- Icons from `lucide-react`: ArrowLeft, Plus, Trash2, Edit2, Eye, Check, Copy

## Integration Points

### Home Page
Added Quiz Builder card with:
- Emoji: ✏️
- Title: "สร้างแบบทดสอบ" (Create Quiz)
- Navigation to `/quiz-builder`
- Cyan-colored background (border-cyan-200)

### App Routes
New routes added to `App.tsx`:
```tsx
<Route path="/quiz-builder" element={<ProtectedRoute><QuizBuilder /></ProtectedRoute>} />
<Route path="/quiz-builder/:slug" element={<ProtectedRoute><QuizEditor /></ProtectedRoute>} />
```

## Error Handling

### Quiz Builder
- Missing title: "กรุณากรอกชื่อแบบทดสอบ" (Please enter quiz name)
- Duplicate quiz: "แบบทดสอบนี้มีอยู่แล้ว" (Quiz already exists)
- Delete confirmation: "คุณแน่ใจหรือว่าต้องการลบแบบทดสอบนี้?" (Confirm delete?)

### Question Editor
- Missing question text: "กรุณากรอกข้อคำถาม" (Please enter question)
- No answer options: "กรุณากรอกตัวเลือกสำหรับคำถาม" (Please add answer options)
- No correct answer: "กรุณาเลือกคำตอบที่ถูกต้องอย่างน้อยหนึ่งข้อ" (Select at least one correct answer)

## Usage Example

### Creating a Quiz
1. Navigate to `/quiz-builder`
2. Click "สร้างใหม่" (Create New)
3. Fill in:
   - Title: "Respiration Quiz"
   - Subtitle: "แบบทดสอบ • ระดับปิโลเมียนวิชาการ"
   - Difficulty: Select "ปานกลาง"
4. Click "สร้าง" (Create)
5. Click "แก้ไข" (Edit) to add questions

### Adding Questions
1. Click "เพิ่มคำถาม" (Add Question) or "แก้ไข" (Edit) on existing question
2. Fill in:
   - Question text
   - Optional tag
   - Multiple answer options
3. Mark correct answers with the check icon
4. Add detailed explanation (optional)
5. Click "เพิ่มคำถาม" (Add Question) or "บันทึก" (Save)

## Future Enhancements

- [ ] Question preview/preview mode
- [ ] Duplicate question functionality
- [ ] Bulk import from CSV
- [ ] Question reordering (drag-and-drop)
- [ ] Quiz templates
- [ ] Question bank/library
- [ ] Export quiz as JSON
- [ ] Quiz sharing/collaboration
- [ ] Analytics/performance tracking
- [ ] Time limits per question
- [ ] Question randomization options

## Troubleshooting

**Issue:** Quiz not saving
- **Solution:** Check browser localStorage quota. Clear cache if needed.

**Issue:** Questions not appearing
- **Solution:** Verify quiz slug matches in URL. Reload page.

**Issue:** Cannot delete quiz
- **Solution:** Confirm deletion dialog must be accepted. Try again.

**Issue:** Correct answer not marking
- **Solution:** Click the check icon next to the answer option to toggle correct/incorrect status.

## Files Modified/Created

### New Files
- `src/pages/QuizBuilder.tsx` - Main quiz management page
- `src/pages/QuizEditor.tsx` - Question editor page
- `QUIZ_BUILDER_GUIDE.md` - This documentation

### Modified Files
- `src/App.tsx` - Added quiz builder routes
- `src/pages/Home.tsx` - Added Quiz Builder card link
