import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { HomePage } from "../pages/home/HomePage";
import { StartPage } from "../pages/start/StartPage";
import { InterviewPage } from "../pages/interview/InterviewPage";
import { ReviewPage } from "../pages/review/ReviewPage";
import { MemoryPage } from "../pages/memory/MemoryPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "start", element: <StartPage /> },
      { path: "interview/:sessionId", element: <InterviewPage /> },
      { path: "review/:recordingId", element: <ReviewPage /> },
      { path: "memory/:sessionId", element: <MemoryPage /> },
    ],
  },
]);
