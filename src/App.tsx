import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import Register from "./pages/Register";
import PdfViewer from "./pages/PdfViewer";
import NoteCanvas from "./pages/NoteCanvas";
import ProtectedRoute from "./lib/ProtectedRoute";
import Quizzes from "./pages/Quizzes";
import QuizDetail from "./pages/QuizDetail";
import QuizPlay from "./pages/QuizPlay";
import QuizSummary from "./pages/QuizSummary";
import QuizBuilder from "./pages/QuizBuilder";
import QuizEditor from "./pages/QuizEditor";
import Flashcards from "./pages/Flashcards";
import FlashcardDetail from "./pages/FlashcardDetail";
import FlashcardPlay from "./pages/FlashcardPlay";


export default function App() {
  return (
    <div className="min-h-screen">

      <Routes>
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/quizzes" element={<ProtectedRoute><Quizzes /></ProtectedRoute>} />
        <Route path="/quiz-builder" element={<ProtectedRoute><QuizBuilder /></ProtectedRoute>} />
        <Route path="/quiz-builder/:slug" element={<ProtectedRoute><QuizEditor /></ProtectedRoute>} />
        <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
        <Route path="/flashcard/:deckId" element={<ProtectedRoute><FlashcardDetail /></ProtectedRoute>} />
        <Route path="/flashcard/play/:deckId" element={<ProtectedRoute><FlashcardPlay /></ProtectedRoute>} />
        <Route path="/pdf/:pdfName" element={<ProtectedRoute><PdfViewer /></ProtectedRoute>} />
        <Route path="/note/:noteId" element={<ProtectedRoute><NoteCanvas /></ProtectedRoute>} />
        <Route path="/quiz/:slug" element={<ProtectedRoute><QuizDetail /></ProtectedRoute>} />
        <Route path="/quiz/:slug/play" element={<ProtectedRoute><QuizPlay /></ProtectedRoute>} />
        <Route path="/quiz/:slug/summary" element={<ProtectedRoute><QuizSummary /></ProtectedRoute>} />
        <Route path="/register" element={<Register />} />
        <Route path="/signin" element={<SignIn />} />
      </Routes>
    </div>
  );
}
