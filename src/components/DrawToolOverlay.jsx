import { useEffect, useRef } from 'preact/hooks';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import { ImageStampTab } from './ImageStampTab.jsx';
import { SettingsTab } from './SettingsTab.jsx';
import styles from './DrawToolOverlay.module.css';

export const DrawToolOverlay = () => {
    const { activeTab, drawToolVisible, hideDrawTool } = useDrawTool();
    const bodyRef = useRef(null);

    useEffect(() => {
        if (drawToolVisible && bodyRef.current) {
            const focusableElement = bodyRef.current.querySelector('[tabindex]');
            if (focusableElement) {
                focusableElement.focus();
            }
        }
    }, [drawToolVisible, activeTab]);

    return (
        <div
            class={styles.overlay}
            onClick={hideDrawTool}
            style={{ display: drawToolVisible ? 'flex' : 'none' }}
        >
            <div class={styles.content} onClick={(e) => e.stopPropagation()}>
                <div ref={bodyRef} class={styles.body}>
                    <div style={{ display: activeTab === 'image' ? 'contents' : 'none' }}>
                        <ImageStampTab close={hideDrawTool} />
                    </div>
                    <div style={{ display: activeTab === 'settings' ? 'contents' : 'none' }}>
                        <SettingsTab close={hideDrawTool} />
                    </div>
                </div>
            </div>
        </div>
    );
};
