import { useDrawTool } from '../context/DrawToolContext.jsx';
import { useKeyboardMode as useKeyboardModeContext, useHDMode as useHDModeContext } from '../context/AppContext.jsx';
import { updatePenSettings } from '../helpers/actions.js';
import { useHelpOverlay } from './HelpOverlay.jsx';
import styles from './SettingsTab.module.css';

import penIcon from '../icons/pen.svg';
import highlighterIcon from '../icons/highlighter.svg';
import thinHighlighterIcon from '../icons/thin-highlighter.svg';
import eraserIcon from '../icons/eraser.svg';
import unlockIcon from '../icons/unlock.svg';
import helpCircleIcon from '../icons/help-circle.svg';

const PRESET_ICONS = {
    pen: penIcon,
    highlighter: highlighterIcon,
    'thin-highlighter': thinHighlighterIcon,
    eraser: eraserIcon,
};

const PEN_PRESETS = [
    { id: 'pen', label: 'Pen', width: 2, alpha: 1 },
    { id: 'highlighter', label: 'Highlighter', width: 20, alpha: 0.3 },
    { id: 'thin-highlighter', label: 'Thin Highlighter', width: 10, alpha: 0.5 },
    { id: 'eraser', label: 'Eraser', width: 20, alpha: 1 },
];

const getActivePresetId = (eraserEnabled, penWidth, penAlpha) => {
    if (eraserEnabled) return 'eraser';
    if (penWidth === 2 && penAlpha === 1) return 'pen';
    if (penWidth === 20 && Math.abs(penAlpha - 0.3) < 0.01) return 'highlighter';
    if (penWidth === 10 && Math.abs(penAlpha - 0.5) < 0.01) return 'thin-highlighter';
    return null;
};

export const SettingsTab = () => {
    const {
        penColor,
        setPenColor,
        penWidth,
        setPenWidth,
        penAlpha,
        setPenAlpha,
        penMode,
        setPenMode,
        eraserEnabled,
        setEraserEnabled,
        handleUnlock,
    } = useDrawTool();

    const { keyboardModeEnabled, setKeyboardModeEnabled } = useKeyboardModeContext();
    const { hdModeEnabled, setHdModeEnabled } = useHDModeContext();
    const { showHelpOverlay } = useHelpOverlay();

    const activePresetId = getActivePresetId(eraserEnabled, penWidth, penAlpha);

    const handleColorChange = (e) => {
        setPenColor(e.target.value);
        updatePenSettings();
    };

    const handleWidthChange = (e) => {
        setPenWidth(parseInt(e.target.value));
        updatePenSettings();
    };

    const handleAlphaChange = (e) => {
        setPenAlpha(parseFloat(e.target.value));
        updatePenSettings();
    };

    const handlePenModeChange = (e) => {
        setPenMode(e.target.value);
        updatePenSettings();
    };

    const handleEraserToggle = (e) => {
        setEraserEnabled(e.target.checked);
        updatePenSettings();
    };

    const handlePreset = (preset) => {
        if (preset.id === 'eraser') {
            setEraserEnabled(true);
            setPenMode('eraser');
        } else {
            setEraserEnabled(false);
            setPenMode('pen');
            setPenWidth(preset.width);
            setPenAlpha(preset.alpha);
        }
        updatePenSettings();
    };

    const handleHdToggle = (e) => {
        setHdModeEnabled(e.target.checked);
    };

    const handleKeyboardToggle = (e) => {
        setKeyboardModeEnabled(e.target.checked);
    };

    const handleHelp = () => {
        showHelpOverlay('drawtab');
    };

    return (
        <div class={styles.tab}>
            <div class={styles.controls}>
                
                {/* Top subgroup - controls (rounded TOP corners) */}
                <div class={styles.controlsSubgroup}>
                    <div class={styles.controlGroup}>
                        <label>Color</label>
                        <input
                            type="color"
                            value={penColor}
                            onChange={handleColorChange}
                        />
                    </div>

                    <div class={styles.controlGroup}>
                        <label>Width</label>
                        <div class={styles.controlRow}>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={penWidth}
                                onInput={handleWidthChange}
                            />
                            <span>{penWidth}px</span>
                        </div>
                    </div>

                    <div class={styles.controlGroup}>
                        <label>Alpha</label>
                        <div class={styles.controlRow}>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={penAlpha}
                                onInput={handleAlphaChange}
                            />
                            <span>{penAlpha}</span>
                        </div>
                    </div>

                    <div class={styles.controlGroup}>
                        <label>Tool</label>
                        <div class={styles.controlRow}>
                            <input
                                type="checkbox"
                                checked={eraserEnabled}
                                onChange={handleEraserToggle}
                            />
                            <span>Eraser</span>
                        </div>
                    </div>
                </div>
                
                {/* Bottom subgroup - presets (rounded BOTTOM corners) */}
                <div class={styles.presetsSubgroup}>
                    {PEN_PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => handlePreset(preset)}
                            onMouseOver={(e) => e.stopPropagation()}
                            class={`${styles.presetBtn} ${preset.id === activePresetId ? styles.presetBtnActive : ''}`}
                        >
                            <span dangerouslySetInnerHTML={{ __html: PRESET_ICONS[preset.id] }} />
                            {preset.label}
                        </button>
                    ))}
                </div>
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
                        onMouseOver={(e) => e.stopPropagation()}
                    >
                        <span dangerouslySetInnerHTML={{ __html: helpCircleIcon }} />
                        Help
                    </button>
                    <button
                        class={styles.actionBtn}
                        onClick={handleUnlock}
                        onMouseOver={(e) => e.stopPropagation()}
                    >
                        <span dangerouslySetInnerHTML={{ __html: unlockIcon }} />
                        Unlock Page
                    </button>
                </div>
            </div>
        </div>
    );
};
