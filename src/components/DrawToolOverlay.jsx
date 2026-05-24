import { useEffect, useRef } from 'preact/hooks';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import { ImageStampTab } from './ImageStampTab.jsx';
import styles from './DrawToolOverlay.module.css';

export const DrawToolOverlay = () => {
    const { drawToolVisible, hideDrawTool } = useDrawTool();
    const bodyRef = useRef(null);

    useEffect(() => {
        if (drawToolVisible && bodyRef.current) {
            const focusableElement = bodyRef.current.querySelector('[tabindex]');
            if (focusableElement) {
                focusableElement.focus();
            }
        }
    }, [drawToolVisible]);

    return (
        <div
            class={styles.overlay}
            onClick={hideDrawTool}
            style={{ display: drawToolVisible ? 'flex' : 'none' }}
        >
            <div class={styles.content} onClick={(e) => e.stopPropagation()}>
                <div ref={bodyRef} class={styles.body}>
                    <ImageStampTab close={hideDrawTool} />
                </div>
            </div>
        </div>
    );
};
