# Quiz Builder Integration Guide

## Overview

The Quiz Builder has been fully integrated with the existing quiz playing system. Custom quizzes created in the Quiz Builder can now be played, reviewed, and managed just like static quizzes.

## Integration Architecture

### Data Flow

```
Quiz Builder (Create/Edit)
    ↓
localStorage: "quizzes:custom"
    ↓
    ├─ Quizzes Page (Load & Display)
    ├─ QuizDetail (Show Stats & Metadata)
    ├─ QuizPlay (Load Questions & Play)
    └─ QuizSummary (Display Results)
```

## Component Updates

### 1. **QuizBuilder.tsx** (No Changes)
- Stores custom quizzes to localStorage
- localStorage key: `quizzes:custom`

### 2. **QuizEditor.tsx** (No Changes)
- Edits questions for custom quizzes
- Route: `/quiz-builder/:slug`

### 3. **QuizDetail.tsx** (Updated)

**New Capabilities:**
- Load custom quizzes from localStorage
- Display custom quiz metadata (title, difficulty, question count)
- Edit/Delete buttons for custom quizzes only
- Performance statistics tracking (average score, best score, attempts)
- Seamless fallback to static quizzes

**Key Changes:**
- Added `loadCustomQuiz()` function to load from localStorage
- Quiz loading logic now tries custom first, then falls back to static
- Type system updated to support string IDs for custom questions
- Edit and Delete buttons now functional for custom quizzes
- History tracking works for both static and custom quizzes

**Example Usage:**
```tsx
// Custom quiz loaded from localStorage
/quiz/my-custom-quiz

// Static quiz (unchanged)
/quiz/respiration
```

### 4. **QuizPlay.tsx** (Updated)

**New Capabilities:**
- Load questions from custom quizzes
- Support string IDs (custom quizzes use UUID strings, static use numbers)
- Review wrong-only mode works with custom quizzes
- Full scoring and timing features

**Key Changes:**
- Added `loadCustomQuiz()` function
- Question loading tries custom quiz first
- `Answer` type now includes optional `id` field
- `Question.id` type changed to `string | number`
- `QuizResponse.id` type changed to `string | number`
- Answer types support both formats

### 5. **QuizSummary.tsx** (Updated)

**Updates:**
- `QuizResult.wrong[].id` type changed to `string | number`
- Supports displaying results from custom quizzes
- Performance history tracking works with both quiz types

### 6. **Quizzes.tsx** (Updated)

**New Features:**
- Lists both static and custom quizzes
- "Create Quiz" button in header
- Empty state with link to create first quiz
- Custom quiz badge ("สร้างเอง") to distinguish from static
- Loads custom quizzes from localStorage on mount

**UI Changes:**
- Added Plus icon and "สร้างแบบทดสอบ" button in header
- Custom quizzes appear first in the list
- Each custom quiz shows (question count + difficulty) in metadata
- Cyan badge shows quiz is custom-made

## Data Structure Compatibility

### Static Quiz (Original)
```typescript
id: number          // 1, 2, 3, ...
text: string
answers: Answer[]   // text & correct fields
detail: string
tag?: string
```

### Custom Quiz (New)
```typescript
id: string          // UUID format
text: string
answers: Answer[]   // text, id, & correct fields
detail: string
tag?: string
```

### Storage

- **Static Quizzes:** Hardcoded in `sampleQuestions`
- **Custom Quizzes:** localStorage key `quizzes:custom` (JSON array)
- **Results:** sessionStorage key `quiz_result_${slug}`
- **History:** sessionStorage key `quiz_history_${slug}`

## Workflow Examples

### Creating and Playing a Custom Quiz

1. **Create Quiz**
   - Navigate to `/quiz-builder`
   - Click "สร้างใหม่"
   - Fill in title, subtitle, difficulty
   - Click "สร้าง"
   - Quiz saved to `localStorage("quizzes:custom")`

2. **Edit Quiz**
   - Click "แก้ไข" on the created quiz
   - Navigate to `/quiz-builder/:slug`
   - Add/edit/delete questions
   - Changes auto-save to localStorage

3. **View Quiz Details**
   - From Quizzes page, click the quiz
   - Route: `/quiz/:slug`
   - Shows metadata, stats, and performance history
   - For custom quizzes, "แก้ไข" and "ลบ" buttons are visible

4. **Play Quiz**
   - Click "เริ่มทำแบบทดสอบ" button
   - Route: `/quiz/:slug/play`
   - Answers questions (works identically to static quizzes)
   - Scores tracked with timing

5. **Review Results**
   - Route: `/quiz/:slug/summary`
   - Shows score, duration, and wrong answers
   - Can review wrong answers only
   - Can restart quiz

### Deleting a Custom Quiz

1. Navigate to `/quiz/:slug` (custom quiz detail page)
2. Click "ลบ" button
3. Confirm deletion dialog
4. Quiz removed from localStorage
5. Redirected to `/quiz-builder`

## Type System Updates

### Answer Type
```typescript
// Before (static)
type Answer = { text: string; correct: boolean };

// After (both)
type Answer = { id?: string; text: string; correct: boolean };
```

### Question.id Type
```typescript
// Before (static only)
id: number

// After (both)
id: string | number
```

### Quiz Type (New)
```typescript
type Quiz = {
  slug: string;                    // URL-safe ID
  title: string;
  subtitle: string;
  difficulty: "ง่าย" | "ปานกลาง" | "ยาก";
  questions: Question[];
  createdAt?: number;
  updatedAt?: number;
  tip?: string;
  isCustom?: boolean;
};
```

## Performance Tracking

### For Both Quiz Types
- **Attempts**: Number of times completed
- **Average Score**: Mean of all attempts
- **Best Score**: Highest score achieved
- **Average Duration**: Mean time per attempt
- **Trend**: Score change from previous best

### Storage Keys
```javascript
// History tracking
sessionStorage.setItem(`quiz_history_${slug}`, JSON.stringify(history))
// Example key: quiz_history_my-custom-quiz

// Result tracking
sessionStorage.setItem(`quiz_result_${slug}`, JSON.stringify(result))
// Example key: quiz_result_respiration
```

## Error Handling

### Quiz Not Found
- Custom quiz not in localStorage → Checked and returns null
- Static quiz slug not found → Falls back to respiration
- Both not found → Redirects to `/quizzes`

### Corrupted Data
- localStorage data corrupted → Try-catch returns null
- Falls back to static quiz or empty state
- No data loss (corrupt data simply not loaded)

### Empty Custom Quiz
- Cannot play quiz with 0 questions
- Play button disabled on detail page
- Error message if trying to access `/quiz/:slug/play` directly

## Navigation Flow

```
Home
  ├─ Quiz Builder Card (✏️ สร้างแบบทดสอบ)
  │   └─ /quiz-builder
  │        ├─ /quiz-builder (list)
  │        └─ /quiz-builder/:slug (editor)
  │
  └─ Quizzes Card (🧠 Quizzes)
      └─ /quizzes
           ├─ Static & Custom Quiz List
           ├─ Plus Button → /quiz-builder
           └─ Click Quiz → /quiz/:slug
                ├─ /quiz/:slug/play
                └─ /quiz/:slug/summary
```

## localStorage Structure

```javascript
// Custom Quizzes
localStorage["quizzes:custom"] = JSON.stringify([
  {
    slug: "my-custom-quiz",
    title: "My Custom Quiz",
    subtitle: "Description",
    difficulty: "ปานกลาง",
    questions: [
      {
        id: "uuid-1",
        text: "Question text",
        answers: [
          { id: "ans-1", text: "Option 1", correct: true },
          { id: "ans-2", text: "Option 2", correct: false }
        ],
        detail: "Explanation",
        tag: "Category"
      }
    ],
    createdAt: 1707864000000,
    updatedAt: 1707864000000
  }
])

// Quiz Results (sessionStorage)
sessionStorage["quiz_result_my-custom-quiz"] = JSON.stringify({
  slug: "my-custom-quiz",
  total: 10,
  correct: 8,
  score: 80,
  durationMs: 300000,
  finishedAt: 1707864000000,
  wrong: [...]
})

// Quiz History (sessionStorage)
sessionStorage["quiz_history_my-custom-quiz"] = JSON.stringify([
  { score: 75, durationMs: 320000, finishedAt: 1707863000000 },
  { score: 80, durationMs: 300000, finishedAt: 1707864000000 }
])
```

## Testing Checklist

- [ ] Create a custom quiz
- [ ] View custom quiz in /quizzes list (appears first, has "สร้างเอง" badge)
- [ ] Click custom quiz → shows in /quiz/:slug with Edit/Delete buttons
- [ ] Edit custom quiz → navigate to /quiz-builder/:slug
- [ ] Add questions to custom quiz
- [ ] Play custom quiz → /quiz/:slug/play works correctly
- [ ] Score is calculated and saved
- [ ] View results → /quiz/:slug/summary shows correct data
- [ ] Review wrong answers
- [ ] Delete custom quiz → confirms deletion, returns to /quiz-builder
- [ ] Verify static quizzes still work (respiration)
- [ ] Static quizzes don't show Edit/Delete buttons
- [ ] Create button in Quizzes page header links to /quiz-builder
- [ ] Empty state shows when no quizzes exist (unlikely after adding static)
- [ ] Performance history tracks attempts across sessions

## Backwards Compatibility

✅ **Fully Compatible**
- Static quizzes (respiration) work unchanged
- Existing localStorage data unaffected
- sessionStorage results/history work for all quiz types
- Can mix custom and static quizzes seamlessly
- No breaking changes to component APIs

## Future Enhancements

- [ ] Import/Export quizzes as JSON
- [ ] Share custom quizzes via URL
- [ ] Clone/Duplicate existing quizzes
- [ ] Search quizzes by keyword
- [ ] Sort quizzes by difficulty/date/attempts
- [ ] Batch delete custom quizzes
- [ ] Quiz analytics dashboard
- [ ] Difficulty level auto-suggestion based on performance
- [ ] Time limit per question
- [ ] Question shuffling/randomization
- [ ] Answer shuffling
