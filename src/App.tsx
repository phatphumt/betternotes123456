import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import Register from "./pages/Register";
import PdfViewer from "./pages/PdfViewer";
import ProtectedRoute from "./lib/ProtectedRoute";
import Quizzes from "./pages/Quizzes";
import QuizDetail from "./pages/QuizDetail";
import QuizPlay from "./pages/QuizPlay";
import QuizSummary from "./pages/QuizSummary";


export default function App() {
  return (
    <div className="min-h-screen">

      <Routes>
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/quizzes" element={<ProtectedRoute><Quizzes /></ProtectedRoute>} />
        <Route path="/pdf/:pdfName" element={<ProtectedRoute><PdfViewer /></ProtectedRoute>} />
        <Route path="/quiz/:slug" element={<ProtectedRoute><QuizDetail /></ProtectedRoute>} />
        <Route path="/quiz/:slug/play" element={<ProtectedRoute><QuizPlay /></ProtectedRoute>} />
        <Route path="/quiz/:slug/summary" element={<ProtectedRoute><QuizSummary /></ProtectedRoute>} />
        <Route path="/register" element={<Register />} />
        <Route path="/signin" element={<SignIn />} />
      </Routes>
    </div>
  );
}
