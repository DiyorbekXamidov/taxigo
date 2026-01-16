import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Firebase Analytics
import { initializeAnalytics } from "./integrations/firebase/client";
initializeAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
