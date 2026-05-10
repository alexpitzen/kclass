import { useDrawTool } from '../context/DrawToolContext.jsx';
import { ImageStampTab } from './ImageStampTab.jsx';
import { SettingsTab } from './SettingsTab.jsx';
import styles from './DrawToolOverlay.module.css';

export const DrawToolOverlay = () => {
    const { activeTab, drawToolVisible, hideDrawTool } = useDrawTool();

    if (!drawToolVisible) return null;

    return (
        <div class={styles.overlay} onClick={hideDrawTool}>
            <div class={styles.content} onClick={(e) => e.stopPropagation()}>
                <div class={styles.body}>
                    {activeTab === 'image' && <ImageStampTab onClose={hideDrawTool} />}
                    {activeTab === 'settings' && <SettingsTab onClose={hideDrawTool} />}
                </div>
            </div>
        </div>
    );
};
