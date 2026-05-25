import { forwardRef, useRef, useCallback, useImperativeHandle } from 'preact/compat';
import { usePenSettings } from '../context/PenSettingsContext.jsx';
import { useStampSettings } from '../context/StampSettingsContext.jsx';
import { selectEraser } from '../helpers/actions.js';
import { PEN_PRESETS, PRESET_ICONS, getActivePresetId, setStampLibPenSettings } from '../helpers/penPresets.js';
import styles from './PenSettings.module.css';

const stopPropagation = (e) => e.stopPropagation();

export const PenSettings = forwardRef(({ layout = 'inline' }, ref) => {
    const {
        penWidth,
        setPenWidth,
        penAlpha,
        setPenAlpha,
        eraserEnabled,
        setEraserEnabled,
    } = usePenSettings();

    const { singleColor, setSingleColor } = useStampSettings();

    const presetsContainerRef = useRef(null);
    const activePresetId = getActivePresetId(eraserEnabled, penWidth, penAlpha);

    const handleColorChange = useCallback((e) => {
        const val = e.target.value;
        setSingleColor(val);
        if (!eraserEnabled) {
            setStampLibPenSettings(val, penWidth, penAlpha);
        }
    }, [setSingleColor, eraserEnabled, penWidth, penAlpha]);

    const handleWidthChange = useCallback((e) => {
        const newWidth = parseInt(e.target.value);
        setPenWidth(newWidth);
        if (!eraserEnabled) {
            setStampLibPenSettings(singleColor, newWidth, penAlpha);
        } else {
            StampLib.setPenSettings({
                width: newWidth,
            });
        }
    }, [setPenWidth, eraserEnabled, penAlpha, singleColor]);

    const handleAlphaChange = useCallback((e) => {
        const newAlpha = parseFloat(e.target.value);
        setPenAlpha(newAlpha);
        if (!eraserEnabled) {
            setStampLibPenSettings(singleColor, penWidth, newAlpha);
        }
    }, [setPenAlpha, eraserEnabled, penWidth, singleColor]);

    const handlePresetClick = useCallback((e) => {
        const btn = e.currentTarget;
        const presetId = btn.getAttribute('data-preset-id');
        const preset = PEN_PRESETS[presetId];
        if (preset) {
            if (preset.id === 'eraser') {
                setEraserEnabled(true);
                setPenWidth(preset.width);
                setPenAlpha(preset.alpha);
                selectEraser();
            } else {
                setEraserEnabled(false);
                setPenWidth(preset.width);
                setPenAlpha(preset.alpha);
                setStampLibPenSettings(singleColor, preset.width, preset.alpha);
            }
        }
    }, [setEraserEnabled, setPenWidth, setPenAlpha, singleColor]);

    const cycleHighlighter = useCallback(() => {
        const activeBtn = presetsContainerRef.current.querySelector(`.${styles.presetBtnActive}`);
        if (activeBtn?.dataset.presetId == "highlighter") {
            presetsContainerRef.current.querySelector(`button[data-preset-id="thin-highlighter"]`).click();
        } else {
            presetsContainerRef.current.querySelector(`button[data-preset-id="highlighter"]`).click();
        }
    }, []);

    const clickPreset = useCallback((presetId) => {
        const btn = presetsContainerRef.current.querySelector(`button[data-preset-id="${presetId}"]`);
        if (btn) btn.click();
    }, []);

    useImperativeHandle(ref, () => ({
        cycleHighlighter,
        clickPreset,
    }), [cycleHighlighter, clickPreset]);

    const containerClass = `${styles.penSettings} ${styles[layout] || styles.inline}`;

    return (
        <div class={containerClass}>
            <div class={styles.firstRow}>
                {layout !== 'inline' && (
                    <div class={styles.controlGroup}>
                        <label>Color</label>
                        <input
                            type="color"
                            value={singleColor}
                            onChange={handleColorChange}
                        />
                    </div>
                )}

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
            </div>

            <div class={styles.presetsContainer} ref={presetsContainerRef}>
                {Object.values(PEN_PRESETS).map((preset) => (
                    <button
                        key={preset.id}
                        data-preset-id={preset.id}
                        onClick={handlePresetClick}
                        onMouseOver={stopPropagation}
                        class={`${styles.presetBtn} ${preset.id === activePresetId ? styles.presetBtnActive : ''}`}
                    >
                        <span dangerouslySetInnerHTML={{ __html: PRESET_ICONS[preset.id] }} />
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    );
});
