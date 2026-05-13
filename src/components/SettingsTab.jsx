import { useCallback, useEffect } from 'preact/hooks';
import { useKeyboardMode as useKeyboardModeContext, useHDMode as useHDModeContext } from '../context/AppContext.jsx';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import { usePenSettings } from '../context/PenSettingsContext.jsx';
import { useHelpOverlay } from './HelpOverlay.jsx';
import styles from './SettingsTab.module.css';

import unlockIcon from '../icons/unlock.svg';
import helpCircleIcon from '../icons/help-circle.svg';
import xIcon from '../icons/x.svg';

const stopPropagation = (e) => e.stopPropagation();

export const SettingsTab = ({ close }) => {
    const { keyboardModeEnabled, setKeyboardModeEnabled } = useKeyboardModeContext();
    const { hdModeEnabled, setHdModeEnabled } = useHDModeContext();
    const { showHelpOverlay } = useHelpOverlay();
    const { registerKeyDownHandler } = useDrawTool();
    const { handleUnlock } = usePenSettings();

    const handleKeys = useCallback((e) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.repeat) return;
        if (e.key === "Escape" || e.key === "d") {
            close();
            e.preventDefault();
        }
    }, [close]);

    useEffect(() => {
        return registerKeyDownHandler('settings', handleKeys);
    }, [registerKeyDownHandler, handleKeys]);

    const handleHdToggle = useCallback((e) => {
        setHdModeEnabled(e.target.checked);
    }, [setHdModeEnabled]);

    const handleKeyboardToggle = useCallback((e) => {
        setKeyboardModeEnabled(e.target.checked);
    }, [setKeyboardModeEnabled]);

    const handleHelp = useCallback(() => {
        showHelpOverlay('drawtab');
    }, [showHelpOverlay]);

    return (
        <div class={styles.tab}>
            <div class={styles.controls}>
                <button
                    class={styles.closeBtn}
                    onClick={close}
                    onMouseOver={stopPropagation}
                >
                    <span dangerouslySetInnerHTML={{ __html: xIcon }} />
                </button>
            </div>

            <div class={styles.settingsSection}>
                <div class={styles.controlGroup}>
                    <label>HD Mode</label>
                    <div class={styles.controlRow}>
                        <input
                            type="checkbox"
                            checked={hdModeEnabled}
                            onChange={handleHdToggle}
                        />
                    </div>
                </div>

                <div class={styles.controlGroup}>
                    <label>Keyboard Mode</label>
                    <div class={styles.controlRow}>
                        <input
                            type="checkbox"
                            checked={keyboardModeEnabled}
                            onChange={handleKeyboardToggle}
                        />
                    </div>
                </div>

                <div class={styles.actionButtons}>
                    <button
                        class={styles.actionBtn}
                        onClick={handleHelp}
                        onMouseOver={stopPropagation}
                    >
                        <span dangerouslySetInnerHTML={{ __html: helpCircleIcon }} />
                        Help
                    </button>
                    <button
                        class={styles.actionBtn}
                        onClick={handleUnlock}
                        onMouseOver={stopPropagation}
                    >
                        <span dangerouslySetInnerHTML={{ __html: unlockIcon }} />
                        Unlock Page
                    </button>
                </div>
            </div>
        </div>
    );
};
