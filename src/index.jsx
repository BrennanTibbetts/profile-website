import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { useState, useEffect } from 'react'
import { Leva } from 'leva'
import "./styles.css";
import Experience from "./Experience";
import Header from "./Header";
import Actions from "./Actions";
import ViewInfo from "./ViewInfo";

function App() {
    const [viewIndex, setViewIndex] = useState(1)
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
    const [showLeva, setShowLeva] = useState(false)

    const prev = () => setViewIndex((s) => (s - 1 + 3) % 3)
    const next = () => setViewIndex((s) => (s + 1) % 3)

    useEffect(() => {
        document.body.classList.toggle('light', theme === 'light')
        try { localStorage.setItem('theme', theme) } catch (e) {}
    }, [theme])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.shiftKey && e.key.toLowerCase() === 'h') {
                setShowLeva((s) => !s)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <div className="main">
            <Leva hidden={!showLeva} />
            <aside className="panel-left">
                <Header />
                <ViewInfo viewIndex={viewIndex} />
                <Actions theme={theme} setTheme={setTheme} />
            </aside>
            <main className="panel-right">
                <div className="canvas-container">
                    <Canvas>
                        <Experience viewIndex={viewIndex} theme={theme} />
                    </Canvas>

                    <div className="view-controls">
                        <button className="btn view-btn" onClick={prev} aria-label="Previous view">‹</button>
                        <div className="view-indicator">{viewIndex + 1} / 3</div>
                        <button className="btn view-btn" onClick={next} aria-label="Next view">›</button>
                    </div>
                </div>
            </main>
        </div>
    )
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
