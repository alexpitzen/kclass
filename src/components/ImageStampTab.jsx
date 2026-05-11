import { useState, useRef, useEffect, useMemo, useCallback } from 'preact/hooks';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import { usePrintOverlay } from './PrintOverlay.jsx';
import { useHelpOverlay } from './HelpOverlay.jsx';
import { usePenSettings } from '../context/PenSettingsContext.jsx';
import { selectEraser } from '../helpers/actions.js';
import { startScrolling } from '../helpers/scrolling.js';
import { DOWN, UP, LEFT, RIGHT } from '../helpers/constants.js';
import styles from './ImageStampTab.module.css';
import undoIcon from '../icons/undo.svg';
import trashIcon from '../icons/trash.svg';
import stampTextIcon from '../icons/stamp-text.svg';
import penIcon from '../icons/pen.svg';
import highlighterIcon from '../icons/highlighter.svg';
import thinHighlighterIcon from '../icons/thin-highlighter.svg';
import eraserIcon from '../icons/eraser.svg';
import xIcon from '../icons/x.svg';

const stamps = window.StampLib?.stamps || {};
const stampCategories = Object.keys(stamps);

const stopPropagation = (e) => e.stopPropagation();

const PEN_PRESETS = [
    { id: 'pen', label: 'Pen', width: 2, alpha: 1 },
    { id: 'highlighter', label: 'Highlighter', width: 20, alpha: 0.3 },
    { id: 'thin-highlighter', label: 'Thin Highlighter', width: 10, alpha: 0.5 },
    { id: 'eraser', label: 'Eraser', width: 20, alpha: 1 },
];

const PRESET_ICONS = {
    pen: penIcon,
    highlighter: highlighterIcon,
    'thin-highlighter': thinHighlighterIcon,
    eraser: eraserIcon,
};

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

const imageStampSizeRef = { current: 25 };
const singleColorRef = { current: '#ff2200' };
const stampColorTypeRef = { current: 'Unchanged' };
const rainbowSpeedRef = { current: 100 };
const rainbowFillSpeedRef = { current: 20 };
const activeStampTabRef = { current: '' };
const textStampModeActiveRef = { current: false };
const penSettingsModeActiveRef = { current: false };
const textareaValueRef = { current: '' };

export const ImageStampTab = ({ onStampClick, close }) => {
    const { handleUndo, handleClear, registerKeyDownHandler } = useDrawTool();
    const { showStampPreview, showTextPreview } = usePrintOverlay();
    const { showHelpOverlay } = useHelpOverlay();
    const {
        penWidth,
        setPenWidth,
        penAlpha,
        setPenAlpha,
        penMode,
        setPenMode,
        eraserEnabled,
        setEraserEnabled,
        setPenColor,
    } = usePenSettings();

    const [imageStampSize, setImageStampSize] = useState(imageStampSizeRef.current);
    const [stampColorType, setStampColorTypeState] = useState(stampColorTypeRef.current);
    const [rainbowSpeed, setRainbowSpeedState] = useState(rainbowSpeedRef.current);
    const [rainbowFillSpeed, setRainbowFillSpeedState] = useState(rainbowFillSpeedRef.current);
    const [singleColor, setSingleColorState] = useState(singleColorRef.current);
    const [activeStampTab, setActiveStampTabState] = useState(activeStampTabRef.current);
    const [textStampModeActive, setTextStampModeActiveState] = useState(textStampModeActiveRef.current);
    const [penSettingsModeActive, setPenSettingsModeActiveState] = useState(penSettingsModeActiveRef.current);

    const setStampColorType = useCallback((val) => {
        stampColorTypeRef.current = val;
        setStampColorTypeState(val);
    }, []);

    const setRainbowSpeed = useCallback((val) => {
        rainbowSpeedRef.current = val;
        setRainbowSpeedState(val);
    }, []);

    const setRainbowFillSpeed = useCallback((val) => {
        rainbowFillSpeedRef.current = val;
        setRainbowFillSpeedState(val);
    }, []);

    const setActiveStampTab = useCallback((val) => {
        activeStampTabRef.current = val;
        setActiveStampTabState(val);
    }, []);

    const setSingleColor = useCallback((val) => {
        singleColorRef.current = val;
        setSingleColorState(val);
        setPenColor(val);
        if (!eraserEnabled) {
            setStampLibPenSettings(val, penWidth, penAlpha);
        }
    }, [setPenColor, eraserEnabled, penWidth, penAlpha]);

    const setTextStampModeActive = useCallback((valOrFn) => {
        const newVal = typeof valOrFn === 'function' ? valOrFn(textStampModeActiveRef.current) : valOrFn;
        textStampModeActiveRef.current = newVal;
        setTextStampModeActiveState(newVal);
        if (newVal) {
            penSettingsModeActiveRef.current = false;
            setPenSettingsModeActiveState(false);
            requestAnimationFrame(() => {
                textareaRef.current.focus();
                textareaRef.current.select();
            });
        }
    }, []);

    const setPenSettingsModeActive = useCallback((valOrFn) => {
        const newVal = typeof valOrFn === 'function' ? valOrFn(penSettingsModeActiveRef.current) : valOrFn;
        penSettingsModeActiveRef.current = newVal;
        setPenSettingsModeActiveState(newVal);
        if (newVal) {
            textStampModeActiveRef.current = false;
            setTextStampModeActiveState(false);
        }
    }, []);

    const sizeSliderRef = useRef(null);
    const presetsContainerRef = useRef(null);
    const stampColorTypeElementRef = useRef(null);
    const textareaRef = useRef(null);
    const stampsRef = useRef(null);
    const activeStamps = stamps[activeStampTab] || [];
    const activePresetId = getActivePresetId(eraserEnabled, penWidth, penAlpha);

    useEffect(() => {
        imageStampSizeRef.current = imageStampSize;
    }, [imageStampSize]);

    useEffect(() => {
        if (stampCategories.length > 0 && !stampCategories.includes(activeStampTab)) {
            setActiveStampTab(stampCategories[0]);
        }
    }, [activeStampTab, setActiveStampTab]);

    const handleTextareaInput = useCallback((e) => {
        textareaValueRef.current = e.target.value;
    }, []);

    useEffect(() => {
        if (textareaRef.current && textareaValueRef.current) {
            textareaRef.current.value = textareaValueRef.current;
        }
    }, []);

    useEffect(() => {
        const parent = stampsRef.current;
        const draggable = stampsRef.current;
        if (!parent || !draggable) return;

        let dragging = false;
        let startY = 0;
        let scrollStart = 0;
        let dragged = 0;

        const dragStart = (ev) => {
            dragging = true;
            startY = ev.clientY;
            scrollStart = parent.scrollTop;
            dragged = 0;
        };

        const dragEnd = (ev) => {
            dragging = false;
            if (draggable.hasPointerCapture(ev.pointerId)) {
                draggable.releasePointerCapture(ev.pointerId);
            }
        };

        const drag = (ev) => {
            if (dragging) {
                dragged++;
                parent.scrollTop = scrollStart - (ev.clientY - startY);
                if (dragged === 40) {
                    draggable.setPointerCapture(ev.pointerId);
                }
            }
        };

        draggable.addEventListener('pointerdown', dragStart);
        draggable.addEventListener('pointerup', dragEnd);
        draggable.addEventListener('pointermove', drag);

        return () => {
            draggable.removeEventListener('pointerdown', dragStart);
            draggable.removeEventListener('pointerup', dragEnd);
            draggable.removeEventListener('pointermove', drag);
        };
    }, []);

    const isRainbow = stampColorType === 'Rainbow';
    const isRainbowFill = stampColorType === 'Rainbow Fill';
    const speedValue = isRainbow ? rainbowSpeed : isRainbowFill ? rainbowFillSpeed : 1;
    const speedMin = isRainbow ? 1 : isRainbowFill ? 1 : 0;
    const speedMax = isRainbow ? 130 : isRainbowFill ? 100 : 0;

    const handleStampClick = useCallback((stamp, e) => {
        const stampDimensions = stamp._cachedDimensions || StampLib.getWriteStampDimensions(stamp, 1);
        const maxScaleFactor = 370 / Math.max(stampDimensions.width, stampDimensions.height);
        const scale = (imageStampSizeRef.current / 100) * maxScaleFactor;
        const svg = typeof stamp.svg === 'string' ? stamp.svg : stamp.svg.outerHTML;
        const currentStampColorType = stampColorTypeRef.current;
        const currentSpeed = currentStampColorType === 'Rainbow' ? rainbowSpeedRef.current : rainbowFillSpeedRef.current;
        showStampPreview(stamp, stampDimensions, maxScaleFactor, scale, singleColorRef.current, svg, { x: e.clientX, y: e.clientY }, currentStampColorType, currentSpeed);
        close();
    }, [showStampPreview, close]);

    const handleTextStampToggle = useCallback(() => {
        setTextStampModeActive(prev => !prev);
    }, [setTextStampModeActive]);

    const handlePenSettingsToggle = useCallback(() => {
        setPenSettingsModeActive(prev => !prev);
    }, [setPenSettingsModeActive]);

    const handleTextStamp = useCallback((e) => {
        const scale = imageStampSizeRef.current / 100;
        const textareaVal = textareaRef.current?.value || '';
        const writeDimensions = StampLib.getWriteAllDimensions(textareaVal, scale);
        showTextPreview(textareaVal, writeDimensions, scale, singleColorRef.current, { x: e.clientX, y: e.clientY });
        close();
    }, [showTextPreview, close]);

    const handleSizeChange = useCallback((e) => {
        setImageStampSize(parseInt(e.target.value));
    }, []);

    const handleSingleColorChange = useCallback((e) => {
        setSingleColor(e.target.value);
    }, [setSingleColor]);

    const handleColorTypeChange = useCallback((e) => {
        setStampColorType(e.target.value);
    }, [setStampColorType]);

    const handleSpeedChange = useCallback((e) => {
        const currentType = stampColorTypeRef.current;
        if (currentType === 'Rainbow') {
            setRainbowSpeed(parseInt(e.target.value));
        } else if (currentType === 'Rainbow Fill') {
            setRainbowFillSpeed(parseInt(e.target.value));
        }
    }, [setRainbowSpeed, setRainbowFillSpeed]);

    const handleWidthChange = useCallback((e) => {
        const newWidth = parseInt(e.target.value);
        setPenWidth(newWidth);
        if (!eraserEnabled) {
            setStampLibPenSettings(singleColorRef.current, newWidth, penAlpha);
        }
    }, [setPenWidth, eraserEnabled, penAlpha]);

    const handleAlphaChange = useCallback((e) => {
        const newAlpha = parseFloat(e.target.value);
        setPenAlpha(newAlpha);
        if (!eraserEnabled) {
            setStampLibPenSettings(singleColorRef.current, penWidth, newAlpha);
        }
    }, [setPenAlpha, eraserEnabled, penWidth]);

    const handlePresetClick = useCallback((e) => {
        const btn = e.currentTarget;
        const presetId = btn.getAttribute('data-preset-id');
        const preset = PEN_PRESETS.find(p => p.id === presetId);
        if (preset) {
            if (preset.id === 'eraser') {
                setEraserEnabled(true);
                setPenMode('eraser');
                selectEraser();
            } else {
                setEraserEnabled(false);
                setPenMode('pen');
                setPenWidth(preset.width);
                setPenAlpha(preset.alpha);
                setStampLibPenSettings(singleColorRef.current, preset.width, preset.alpha);
            }
        }
    }, [setEraserEnabled, setPenMode, setPenWidth, setPenAlpha]);

    const handleStampTabClick = useCallback((e) => {
        const btn = e.currentTarget;
        const category = btn.getAttribute('data-category');
        if (category) {
            setActiveStampTab(category);
        }
    }, [setActiveStampTab]);

    const renderedStampTabs = useMemo(() => {
        return stampCategories.map((category) => (
            <button
                key={category}
                data-category={category}
                class={`${styles.stampTabBtn} ${activeStampTab === category ? styles.stampTabBtnActive : ''}`}
                onClick={handleStampTabClick}
                onMouseOver={stopPropagation}
            >
                {category}
            </button>
        ));
    }, [activeStampTab, handleStampTabClick]);

    const renderedStamps = useMemo(() => {
        return activeStamps.map((stamp) => {
            const dims = stamp._cachedDimensions || StampLib.getWriteStampDimensions(stamp, 1);
            const heightLimiter = dims.height <= dims.width ? 1 : dims.width / dims.height;
            return (
                <button
                    key={stamp.name}
                    class={styles.stampBtn}
                    onMouseOver={stopPropagation}
                    onClick={(e) => handleStampClick(stamp, e)}
                    style={{ '--height-limiter': heightLimiter }}
                >
                    <span dangerouslySetInnerHTML={{ __html: stamp.svg.outerHTML }} />
                </button>
            );
        });
    }, [activeStamps, handleStampClick]);

    const cycleHighlighter = useCallback(() => {
        const activeBtn = presetsContainerRef.current.querySelector(`.${styles.presetBtnActive}`);
        if (activeBtn?.dataset.presetId == "highlighter") {
            presetsContainerRef.current.querySelector(`button[data-preset-id="thin-highlighter"]`).click();
        } else {
            presetsContainerRef.current.querySelector(`button[data-preset-id="highlighter"]`).click();
        }
    }, []);

    const handleKeys = useCallback((e) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if ((e.target.nodeName === "INPUT" && e.target.type !== "checkbox") || e.target.nodeName === "TEXTAREA") {
            if (e.key === "Escape") {
                close();
            }
            return;
        }
        if (e.repeat) return;
        switch (e.key) {
            case "d":
            case "Escape":
                close();
                break;
            case "-":
                sizeSliderRef.current.value--;
                sizeSliderRef.current.dispatchEvent(new Event("input"));
                break;
            case "+":
            case "=":
                sizeSliderRef.current.value++;
                sizeSliderRef.current.dispatchEvent(new Event("input"));
                break;
            case "J":
            case "K":
                startScrolling(e.key == "J" ? DOWN : UP, `.${styles.stamps}`);
                break;
            case "h":
                setPenSettingsModeActive(true);
                cycleHighlighter();
                break;
            case "p":
                setPenSettingsModeActive(true);
                presetsContainerRef.current.querySelector(`button[data-preset-id="pen"]`).click();
                break;
            case "P":
            case "H":
            case "E":
                setPenSettingsModeActive(false);
                break;
            case "e":
                setPenSettingsModeActive(true);
                presetsContainerRef.current.querySelector(`button[data-preset-id="eraser"]`).click();
                break;
            case "r":
            case "u":
            case "c":
                if (e.key === "r") stampColorTypeElementRef.current.value = stampColorTypeElementRef.current.value === "Rainbow Fill" ? "Rainbow" : "Rainbow Fill";
                else if (e.key === "u") stampColorTypeElementRef.current.value = "Unchanged";
                else if (e.key === "c") stampColorTypeElementRef.current.value = "Color Picker";
                stampColorTypeElementRef.current.dispatchEvent(new Event("change"));
                break;
            case "t":
                setTextStampModeActive(true);
                break;
            case "T":
                setTextStampModeActive(false);
                break;
            case "?":
                showHelpOverlay("drawtab");
                break;
        }
    }, [close, showHelpOverlay, cycleHighlighter, setPenSettingsModeActive, setTextStampModeActive]);

    useEffect(() => {
        return registerKeyDownHandler('image', handleKeys);
    }, [registerKeyDownHandler, handleKeys]);

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
                <div class={styles.mainControlRow}>
                    <div class={styles.controlGroup}>
                        <label>Size: {imageStampSize}%</label>
                        <div class={styles.controlRow}>
                            <input
                                ref={sizeSliderRef}
                                type="range"
                                min="10"
                                max="100"
                                value={imageStampSize}
                                onInput={handleSizeChange}
                            />
                        </div>
                    </div>

                    <div class={styles.controlGroup}>
                        <label>Color</label>
                        <input
                            type="color"
                            value={singleColor}
                            onChange={handleSingleColorChange}
                        />
                    </div>

                    <div class={styles.controlGroupWrapper}>
                        <div class={styles.controlGroup}>
                            <label>Stamp Color</label>
                            <select ref={stampColorTypeElementRef} value={stampColorType} onChange={handleColorTypeChange}>
                                <option value="Unchanged">Unchanged</option>
                                <option value="Color Picker">Single Color</option>
                                <option value="Rainbow">Rainbow</option>
                                <option value="Rainbow Fill">Rainbow Fill</option>
                            </select>
                        </div>

                        {(isRainbow || isRainbowFill) && (
                            <div class={styles.controlGroup}>
                                <label>Rainbow Speed</label>
                                <input
                                    type="range"
                                    min={speedMin}
                                    max={speedMax}
                                    value={speedValue}
                                    onChange={handleSpeedChange}
                                />
                            </div>
                        )}
                    </div>

                     <div class={styles.buttons}>
                        <button
                            onClick={handleUndo}
                            onMouseOver={stopPropagation}
                        >
                            <span dangerouslySetInnerHTML={{ __html: undoIcon }} />
                            Undo
                        </button>
                        <button
                            onClick={handleClear}
                            onMouseOver={stopPropagation}
                        >
                            <span dangerouslySetInnerHTML={{ __html: trashIcon }} />
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            <div class={styles.stampTabs}>
                <button
                    class={`${styles.stampTabBtn} ${textStampModeActive ? styles.stampTabBtnActive : ''}`}
                    onClick={handleTextStampToggle}
                    onMouseOver={stopPropagation}
                >
                    <span dangerouslySetInnerHTML={{ __html: stampTextIcon }} />
                    Text
                </button>

                <button
                    class={`${styles.stampTabBtn} ${penSettingsModeActive ? styles.stampTabBtnActive : ''}`}
                    onClick={handlePenSettingsToggle}
                    onMouseOver={stopPropagation}
                >
                    <span dangerouslySetInnerHTML={{ __html: penIcon }} />
                    Pen
                </button>

                <div class={styles.stampTabDivider} />

                {renderedStampTabs}
            </div>

            <div class={`${styles.auxPanelWrapper} ${textStampModeActive || penSettingsModeActive ? '' : styles.auxPanelWrapperCollapsed}`}>
                <div class={`${styles.textInput} ${textStampModeActive ? styles.auxPanelActive : ''}`}>
                    <textarea
                        ref={textareaRef}
                        name="stampTextArea"
                        onInput={handleTextareaInput}
                        placeholder="Enter text..."
                        rows="1"
                        style={{
                            color: singleColor,
                            fontSize: `calc((${imageStampSize} / 100) * 57px)`
                        }}
                    />
                    <button
                        class={styles.textStampBtn}
                        onClick={handleTextStamp}
                        onMouseOver={stopPropagation}
                    >
                        <span dangerouslySetInnerHTML={{ __html: stampTextIcon }} />
                        Stamp Text
                    </button>
                </div>

                <div class={`${styles.penSettingsInput} ${penSettingsModeActive ? styles.auxPanelActive : ''}`}>
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

                    <div class={styles.presetsContainer} ref={presetsContainerRef}>
                        {PEN_PRESETS.map((preset) => (
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
            </div>

            <div class={styles.stamps} ref={stampsRef}>
                {renderedStamps}
            </div>
        </div>
    );
};
