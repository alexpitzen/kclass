import { useDrawTool } from '../context/DrawToolContext.jsx';
import { ImageStampTab } from './ImageStampTab.jsx';
import { TextStampTab } from './TextStampTab.jsx';
import { SettingsTab } from './SettingsTab.jsx';
import styles from './DrawToolOverlay.module.css';
import xIcon from '../icons/x.svg';

export const DrawToolOverlay = () => {
    const { activeTab, drawToolVisible, hideDrawTool } = useDrawTool();

    if (!drawToolVisible) return null;

    return (
        <div class={styles.overlay} onClick={hideDrawTool}>
            <div class={styles.content} onClick={(e) => e.stopPropagation()}>
                <div class={styles.header}>
                    <span></span>
                    <button
                        class={styles.closeBtn} onClick={hideDrawTool}
                        onMouseOver={(e) => e.stopPropagation()}
                    >
                        <span dangerouslySetInnerHTML={{ __html: xIcon }} />
                    </button>
                </div>
                <div class={styles.body}>
                    {activeTab === 'image' && <ImageStampTab />}
                    {activeTab === 'text' && <TextStampTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </div>
        </div>
    );
};
