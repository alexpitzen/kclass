import { createContext } from 'preact';
import { useContext, useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { getGradingStartTime, getStudyFinishTime } from '../helpers/ng.js';

const DiffViewOverlayContext = createContext(null);

export const useDiffViewOverlay = () => {
    const context = useContext(DiffViewOverlayContext);
    if (!context) {
        throw new Error('useDiffViewOverlay must be used within DiffViewOverlayProvider');
    }
    return context;
};

export const DiffViewOverlayProvider = ({ children }) => {
    const [diffViewOverlayVisible, setVisible] = useState(false);
    // const savedStrokes = useRef(null);
    const firstMarkAfterGrading = useRef(-1);
    const atd = useRef(null);
    const fakeErasers = useRef({});
    const realErasers = useRef({});

    const showDiffViewOverlay = useCallback(() => {
        onShow();
        setVisible(true);
    }, []);
    const hideDiffViewOverlay = useCallback(() => {
        onHide();
        setVisible(false);
    }, []);

    const onShow = useCallback(() => {
        // TODO: implement stub
        let gradingStartTime = getGradingStartTime();
        let gradingStartTimeMs = gradingStartTime?.toTemporalInstant().epochMilliseconds;
        if (!gradingStartTimeMs) {
            console.log("No gradingStartTime");
            gradingStartTimeMs = 0;
            // TODO: hide
            // setVisible(false);
            // return;
        }
        atd.current = StampLib.getStudentAtd();
        const is = atd.current.currentDrawing.is;
        // savedStrokes.current = is;
        if (is.length > 0) {
            const lastStroke = new Date(is[is.length - 1].cs[0].t);
            if (lastStroke < gradingStartTime) {
            } else {
                firstMarkAfterGrading.current = is.findIndex(i => i.cs[0].t > gradingStartTimeMs);
                // drawing.is = is.slice(firstMarkAfterGrading);
                // Make eraser marks visible
                if (firstMarkAfterGrading.current > -1) {
                    is.slice(firstMarkAfterGrading.current).forEach(i => {
                        // Eraser type is 203
                        // oldType is 3
                        if (i.st.tp == 203 && i.st.oldType == 3) {
                            if (!(i.st.w in fakeErasers.current)) {
                                // Create a visible eraser type with the required width
                                let eraser = atd.current.createStationeryByType("hp00");
                                eraser.w = i.st.w;
                                eraser.col.R = 200;
                                eraser.col.G = 200;
                                eraser.col.B = 255;
                                fakeErasers.current[i.st.w] = eraser;
                                realErasers.current[i.st.w] = i.st;
                            }
                            i.st = fakeErasers.current[i.st.w];
                        } else {
                            // Make strokes red
                            i.st.col.R = 255;
                            i.st.col.G = 50;
                            i.st.col.B = 50;
                        }
                    });
                }
                atd.current.redrawCurrentLayerByInk();
            }
        }
    }, []);

    const onHide = useCallback(() => {
        if (atd.current && firstMarkAfterGrading.current > -1) {
            // Make eraser marks invisible again
            atd.current.currentDrawing.is.slice(firstMarkAfterGrading.current).forEach(i => {
                if (i.st.col.R == 200) {
                    // Fake eraser, set back to real eraser
                    try {
                        i.st = realErasers.current[i.st.w];
                    } catch {}
                } else {
                    // Set back to black
                    i.st.col.R = 0;
                    i.st.col.G = 0;
                    i.st.col.B = 0;
                }
            });
            // atd.current.currentDrawing.is = savedStrokes.current;
            atd.current.redrawCurrentLayerByInk();
        }
        // savedStrokes.current = null;
        firstMarkAfterGrading.current = null;
        atd.current = null;
    }, []);

    return (
        <DiffViewOverlayContext.Provider value={{
            diffViewOverlayVisible,
            showDiffViewOverlay,
            hideDiffViewOverlay,
        }}>
            {children}
        </DiffViewOverlayContext.Provider>
    );
};

export const DiffViewOverlay = () => {
    const { diffViewOverlayVisible, hideDiffViewOverlay } = useDiffViewOverlay();
    const overlayRef = useRef(null);

    useEffect(() => {
        if (!diffViewOverlayVisible || !overlayRef.current) return;

        const overlay = overlayRef.current;

        const handleKeyDown = (e) => {
            hideDiffViewOverlay();
            if (e.key == "Backspace" || e.key == "D" || e.key == "m") {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        const handleClick = (e) => {
            hideDiffViewOverlay();
        };

        overlay.addEventListener('keydown', handleKeyDown);
        overlay.addEventListener('click', handleClick);
        overlay.focus();

        return () => {
            overlay.removeEventListener('keydown', handleKeyDown);
            overlay.removeEventListener('click', handleClick);
        };
    }, [diffViewOverlayVisible, hideDiffViewOverlay]);

    if (!diffViewOverlayVisible) return null;

    return (
        <div
            ref={overlayRef}
            class="diffview-overlay"
            tabIndex={-1}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                zIndex: 9999,
            }}
        />
    );
};
