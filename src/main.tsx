import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorLogger } from "./lib/error-logger";

installGlobalErrorLogger();

createRoot(document.getElementById("root")!).render(<App />);
