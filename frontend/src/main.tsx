import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initGA } from './analytics'

// Initialize Google Analytics
initGA();

createRoot(document.getElementById("root")!).render(<App />);
