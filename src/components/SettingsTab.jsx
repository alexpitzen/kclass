import { useRef, useEffect, useCallback } from 'preact/hooks';
import { usePenSettings } from '../context/PenSettingsContext.jsx';
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
import xIcon from '../icons/x.svg';

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

const setStampLibPenSettings = (color, width, alpha) => {
    StampLib.setPenSettings({
        color: color,
        width: width,
        alpha: Math.round(alpha * 255),
    });
};

export const SettingsTab = ({ onClose }) => {
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
    } = usePenSettings();

    const { keyboardModeEnabled, setKeyboardModeEnabled } = useKeyboardModeContext();
    const { hdModeEnabled, setHdModeEnabled } = useHDModeContext();
    const { showHelpOverlay } = useHelpOverlay();

    const penColorRef = useRef(penColor);
    const penWidthRef = useRef(penWidth);
    const penAlphaRef = useRef(penAlpha);
    const eraserEnabledRef = useRef(eraserEnabled);

    useEffect(() => {
        penColorRef.current = penColor;
    }, [penColor]);

    useEffect(() => {
        penWidthRef.current = penWidth;
    }, [penWidth]);

    useEffect(() => {
        penAlphaRef.current = penAlpha;
    }, [penAlpha]);

    useEffect(() => {
        eraserEnabledRef.current = eraserEnabled;
    }, [eraserEnabled]);

    const activePresetId = getActivePresetId(eraserEnabled, penWidth, penAlpha);

    const handleColorChange = useCallback((e) => {
        const newColor = e.target.value;
        setPenColor(newColor);
        if (!eraserEnabledRef.current) {
            setStampLibPenSettings(newColor, penWidthRef.current, penAlphaRef.current);
        }
        updatePenSettings();
    }, [setPenColor]);

    const handleWidthChange = useCallback((e) => {
        const newWidth = parseInt(e.target.value);
        setPenWidth(newWidth);
        if (!eraserEnabledRef.current) {
            setStampLibPenSettings(penColorRef.current, newWidth, penAlphaRef.current);
        }
    }, [setPenWidth]);

    const handleAlphaChange = useCallback((e) => {
        const newAlpha = parseFloat(e.target.value);
        setPenAlpha(newAlpha);
        if (!eraserEnabledRef.current) {
            setStampLibPenSettings(penColorRef.current, penWidthRef.current, newAlpha);
        }
    }, [setPenAlpha]);

    const handleEraserToggle = useCallback((e) => {
        const isEnabled = e.target.checked;
        setEraserEnabled(isEnabled);
        if (isEnabled) {
            setPenMode('eraser');
        } else {
            setPenMode('pen');
            setStampLibPenSettings(penColorRef.current, penWidthRef.current, penAlphaRef.current);
        }
        updatePenSettings();
    }, [setEraserEnabled, setPenMode]);

    const handlePreset = useCallback((preset) => {
        if (preset.id === 'eraser') {
            setEraserEnabled(true);
            setPenMode('eraser');
        } else {
            setEraserEnabled(false);
            setPenMode('pen');
            setPenWidth(preset.width);
            setPenAlpha(preset.alpha);
            setStampLibPenSettings(penColorRef.current, preset.width, preset.alpha);
        }
        updatePenSettings();
    }, [setEraserEnabled, setPenMode, setPenWidth, setPenAlpha]);

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
                    onClick={onClose}
                    onMouseOver={(e) => e.stopPropagation()}
                >
                    <span dangerouslySetInnerHTML={{ __html: xIcon }} />
                </button>

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
                        <label>Width: {penWidth}</label>
                        <div class={styles.controlRow}>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={penWidth}
                                onInput={handleWidthChange}
                            />
                        </div>
                    </div>

                    <div class={styles.controlGroup}>
                        <label>Alpha: {penAlpha}</label>
                        <div class={styles.controlRow}>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={penAlpha}
                                onInput={handleAlphaChange}
                            />
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
