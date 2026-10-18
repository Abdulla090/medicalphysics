import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';

// A build cannot reload an active clinical encounter. Apply it after the
// encounter unmounts and its serialized save queue has settled.
let pendingUpdate=false;
const updateSW = registerSW({onNeedRefresh(){pendingUpdate=true;}});
window.addEventListener('clinical-safe-update',()=>{
    if(pendingUpdate&&!document.documentElement.dataset.clinicalEncounter){pendingUpdate=false;void updateSW(true);}
});

import App from "./App.tsx";
import "./index.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

createRoot(document.getElementById("root")!).render(
    <ConvexClientProvider>
        <App />
    </ConvexClientProvider>
);
