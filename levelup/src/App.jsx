import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import IntroLogo from "./components/IntroLogo";
import WorkspaceLayout from "./layouts/WorkspaceLayout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/workspace/DashboardPage";
import ResumeAnalyzerPage from "./pages/workspace/ResumeAnalyzerPage";
import ResumeAnalysisResultsPage from "./pages/workspace/ResumeAnalysisResultsPage";
import CareerGuidancePage from "./pages/workspace/CareerGuidancePage";
import WhiteboardPage from "./pages/workspace/WhiteboardPage";
import PerformanceTrackerPage from "./pages/workspace/PerformanceTrackerPage";
import CoursesTutorsPage from "./pages/workspace/CoursesTutorsPage";
import DocumentSummarizerPage from "./pages/workspace/DocumentSummarizerPage";
import VideoBriefPage from "./pages/workspace/VideoBriefPage";
import ResumeParserPage from "./pages/workspace/ResumeParserPage";
import JobRolePredictorPage from "./pages/workspace/JobRolePredictorPage";
import LearningRoadmapPage from "./pages/workspace/LearningRoadmapPage";
import AdaptiveLearningPage from "./pages/workspace/AdaptiveLearningPage";
import JobApplicationTrackerPage from "./pages/workspace/JobApplicationTrackerPage";
import MockInterviewLabPage from "./pages/workspace/MockInterviewLabPage";
import SkillGapPage from "./pages/workspace/SkillGapPage";
import SettingsPage from "./pages/workspace/SettingsPage";

export default function App() {
  const [showIntro, setShowIntro] = useState(() => sessionStorage.getItem("introPlayed") !== "true");

  useEffect(() => {
    if (!showIntro) return;
    const timeout = setTimeout(() => {
      sessionStorage.setItem("introPlayed", "true");
      setShowIntro(false);
    }, 6200);
    return () => clearTimeout(timeout);
  }, [showIntro]);

  if (showIntro) {
    return <IntroLogo />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/workspace" element={<WorkspaceLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="resume-analyzer" element={<ResumeAnalyzerPage />} />
        <Route
          path="resume-analyzer/results"
          element={<ResumeAnalysisResultsPage />}
        />
        <Route path="career-guidance" element={<CareerGuidancePage />} />
        <Route path="whiteboard" element={<WhiteboardPage />} />
        <Route path="performance" element={<PerformanceTrackerPage />} />
        <Route path="courses" element={<CoursesTutorsPage />} />
        <Route path="summarizer" element={<DocumentSummarizerPage />} />
        <Route path="document-summarizer" element={<DocumentSummarizerPage />} />
        <Route path="video-brief" element={<VideoBriefPage />} />
        <Route path="resume-parser" element={<ResumeParserPage />} />
        <Route path="job-role-predictor" element={<JobRolePredictorPage />} />
        <Route path="job-applications" element={<JobApplicationTrackerPage />} />
        <Route path="mock-interview" element={<MockInterviewLabPage />} />
        <Route path="adaptive-learning" element={<AdaptiveLearningPage />} />
        <Route path="task-calendar" element={<LearningRoadmapPage />} />
        <Route path="skill-gap-analysis" element={<SkillGapPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
