import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker
const updateSW = registerSW({
    onNeedRefresh() {
        if (confirm('New content available. Reload?')) {
            updateSW(true);
        }
    },
});

import App from "./App.tsx";
import "./index.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

createRoot(document.getElementById("root")!).render(
    <ConvexClientProvider>
        <App />
    </ConvexClientProvider>
);
