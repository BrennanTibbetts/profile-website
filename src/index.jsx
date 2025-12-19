import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { useState, useEffect, useRef } from 'react'
import { Leva } from 'leva'
import "./styles.css";
import Experience from "./Experience";
import Header from "./Header";
import Actions from "./Actions";
import ViewInfo from "./ViewInfo";
import { bioText } from './data';
import { projects } from './projects';

function App() {
    const [slideIndex, setSlideIndex] = useState(1)
    const viewIndex = ((slideIndex % 3) + 3) % 3
    const [theme, setTheme] = useState('dark')
    const [showLeva, setShowLeva] = useState(false)
    const [showInfo, setShowInfo] = useState(false)
    const [showBio, setShowBio] = useState(false)
    const touchStart = useRef(null)
    const touchEnd = useRef(null)
    const touchStartY = useRef(null)
    const touchEndY = useRef(null)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const [hasSwiped, setHasSwiped] = useState(false)
    const [hasClicked, setHasClicked] = useState(false)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const minSwipeDistance = 50

    const onTouchStart = (e) => {
        touchStart.current = e.targetTouches[0].clientX
        touchStartY.current = e.targetTouches[0].clientY
    }

    const onTouchEnd = (e) => {
        if (showInfo || showBio) return
        if (!touchStart.current) return
        
        const touchEndX = e.changedTouches[0].clientX
        const touchEndY = e.changedTouches[0].clientY
        
        const distanceX = touchStart.current - touchEndX
        const distanceY = touchStartY.current - touchEndY
        const isLeftSwipe = distanceX > minSwipeDistance
        const isRightSwipe = distanceX < -minSwipeDistance
        
        // Only swipe if horizontal movement is greater than vertical movement
        if (Math.abs(distanceX) > Math.abs(distanceY)) {
            if (isLeftSwipe) {
                next()
            }
            if (isRightSwipe) {
                prev()
            }
        }
        
        touchStart.current = null
        touchStartY.current = null
    }

    const prev = () => {
        setSlideIndex((s) => s - 1)
        setHasSwiped(true)
    }
    const next = () => {
        setSlideIndex((s) => s + 1)
        setHasSwiped(true)
    }

    useEffect(() => {
        document.body.classList.toggle('light', theme === 'light')
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
        <div className="main" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="landscape-warning">
                <p>Please rotate your device to portrait mode</p>
            </div>
            <Leva hidden={!showLeva} />
            
            {showInfo && (
                <div className="mobile-info-overlay" onClick={(e) => e.target === e.currentTarget && setShowInfo(false)}>
                    <div className="mobile-info-content">
                        <div className="mobile-info-header">
                            <h2 className="title">{projects[viewIndex].title}</h2>
                            <button className="close-info-btn" onClick={() => setShowInfo(false)}>×</button>
                        </div>
                        <div className="mobile-info-body">
                            <ViewInfo viewIndex={viewIndex} />
                        </div>
                    </div>
                </div>
            )}

            {showBio && (
                <div className="mobile-info-overlay" onClick={(e) => e.target === e.currentTarget && setShowBio(false)}>
                    <div className="mobile-info-content">
                        <div className="mobile-info-header">
                            <h2 className="title" style={{marginTop: 0}}>About Me</h2>
                            <button className="close-info-btn" onClick={() => setShowBio(false)}>×</button>
                        </div>
                        <div className="mobile-info-body">
                            <p className="bio">{bioText}</p>
                        </div>
                    </div>
                </div>
            )}
            <aside className="panel-left">
                <Header />
                <div className="desktop-view-info">
                    <ViewInfo viewIndex={viewIndex} />
                </div>
                <Actions theme={theme} setTheme={setTheme} viewControlProps={{prev, next, viewIndex}} hasSwiped={hasSwiped} hasClicked={hasClicked} isMobile={isMobile} />
            </aside>

            <div className="mobile-top-right">
                <button className="mobile-bio-btn" onClick={() => setShowBio(true)} aria-label="About Me">
                    <img src="/images/bio.png" alt="Bio" />
                </button>
            </div>

            <button className="mobile-info-btn" onClick={() => setShowInfo(true)}>
                Learn more
            </button>

            <main className="panel-right">
                <div className="canvas-container">
                    <Canvas camera={{ position: [0, 0, isMobile ? 16 : 12], fov: 45 }}>
                        <Experience 
                            slideIndex={slideIndex} 
                            setSlideIndex={(val) => {
                                setSlideIndex(val)
                                setHasSwiped(true)
                            }} 
                            theme={theme} 
                            onModelClick={() => {
                                if (isMobile) {
                                    setShowInfo(true)
                                    setHasClicked(true)
                                }
                            }}
                        />
                    </Canvas>

                    <div className="view-controls desktop-only">
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
