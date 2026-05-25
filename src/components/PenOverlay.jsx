import { useEffect, useRef, useCallback } from 'preact/hooks';
import { PenSettings } from './PenSettings.jsx';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import styles from './PenOverlay.module.css';
import xIcon from '../icons/x.svg';

const stopPropagation = (e) => e.stopPropagation();

export const PenOverlay = () => {
    const { penOverlayVisible, hidePenOverlay, registerPenOverlayKeyDownHandler } = useDrawTool();
    const bodyRef = useRef(null);
    const penSettingsRef = useRef(null);

    const handleKeyDown = useCallback((e) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.repeat) return;
        switch (e.key) {
            case "Escape":
            case "Backspace":
                hidePenOverlay();
                e.preventDefault();
                break;
            case "p":
                penSettingsRef.current?.clickPreset?.('pen');
                e.preventDefault();
                break;
            case "h":
                penSettingsRef.current?.cycleHighlighter();
                e.preventDefault();
                break;
            case "e":
                penSettingsRef.current?.clickPreset?.('eraser');
                e.preventDefault();
                break;
        }
    }, [hidePenOverlay]);

    useEffect(() => {
        return registerPenOverlayKeyDownHandler(handleKeyDown);
    }, [registerPenOverlayKeyDownHandler, handleKeyDown]);

    useEffect(() => {
        if (penOverlayVisible && bodyRef.current) {
            const focusableElement = bodyRef.current.querySelector('[tabindex]');
            if (focusableElement) {
                focusableElement.focus();
            }
        }
    }, [penOverlayVisible]);

    return (
        <div
            class={styles.overlay}
            onClick={hidePenOverlay}
            style={{ display: penOverlayVisible ? 'flex' : 'none' }}
        >
            <div class={styles.content} onClick={stopPropagation}>
                <button
                    class={styles.closeBtn}
                    onClick={(e) => { e.stopPropagation(); hidePenOverlay(); }}
                    onMouseOver={stopPropagation}
                >
                    <span dangerouslySetInnerHTML={{ __html: xIcon }} />
                </button>
                <div ref={bodyRef} class={styles.body}>
                    <PenSettings ref={penSettingsRef} layout="stacked" />
                </div>
            </div>
        </div>
    );
};
