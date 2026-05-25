import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'preact/hooks';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import { usePrintOverlay } from './PrintOverlay.jsx';
import { useHelpOverlay } from './HelpOverlay.jsx';
import { usePenSettings } from '../context/PenSettingsContext.jsx';
import { useStampSettings, getStampSize, getSingleColor, getStampColorType, getRainbowSpeed, focusTextStampTextareaFnRef } from '../context/StampSettingsContext.jsx';
import { useKeyboardMode as useKeyboardModeContext, useHDMode as useHDModeContext } from '../context/AppContext.jsx';
import { setStampLibPenSettings } from '../helpers/penPresets.js';
import { PenSettings } from './PenSettings.jsx';
import penIcon from '../icons/pen.svg';
import { startScrolling } from '../helpers/scrolling.js';
import { DOWN, UP } from '../helpers/constants.js';
import styles from './ImageStampTab.module.css';
import undoIcon from '../icons/undo.svg';
import trashIcon from '../icons/trash.svg';
import stampTextIcon from '../icons/stamp-text.svg';
import settingsIcon from '../icons/settings.svg';
import unlockIcon from '../icons/unlock.svg';
import helpCircleIcon from '../icons/help-circle.svg';
import xIcon from '../icons/x.svg';

const stamps = window.StampLib?.stamps || {};
const stampCategories = Object.keys(stamps);

const stopPropagation = (e) => e.stopPropagation();

export const ImageStampTab = ({ onStampClick, close }) => {
    const { handleUndo, handleClear, registerKeyDownHandler } = useDrawTool();
     const { showStampPreview, showTextPreview, updatePreview, state: printOverlayState } = usePrintOverlay();
    const { showHelpOverlay } = useHelpOverlay();
    const { keyboardModeEnabled, setKeyboardModeEnabled } = useKeyboardModeContext();
    const { hdModeEnabled, setHdModeEnabled } = useHDModeContext();
    const {
        penWidth,
        setPenWidth,
        penAlpha,
        setPenAlpha,
        eraserEnabled,
    } = usePenSettings();

    const {
        stampSize, setStampSize,
        stampColorType, setStampColorType,
        rainbowSpeed, setRainbowSpeed,
        rainbowFillSpeed, setRainbowFillSpeed,
        singleColor, setSingleColor,
        textStampModeActive, setTextStampModeActive,
    } = useStampSettings();

    const [activeStampTab, setActiveStampTab] = useState('');
    const [penSettingsModeActive, setPenSettingsModeActive] = useState(false);
    const [settingsModeActive, setSettingsModeActive] = useState(false);

    const sizeSliderRef = useRef(null);
    const penSettingsRef = useRef(null);
    const stampColorTypeElementRef = useRef(null);
    const textareaRef = useRef(null);
    const stampsRef = useRef(null);
    const activeStamps = stamps[activeStampTab] || [];

     useEffect(() => {
         if (printOverlayState.visible) {
             updatePreview();
         }
     }, [stampSize, printOverlayState.visible, updatePreview]);

     useEffect(() => {
         if (printOverlayState.visible) {
             updatePreview();
         }
     }, [singleColor, printOverlayState.visible, updatePreview]);

      useEffect(() => {
          if (!eraserEnabled) {
              setStampLibPenSettings(getSingleColor(), penWidth, penAlpha);
          }
      }, [eraserEnabled, singleColor, penWidth, penAlpha]);

     useEffect(() => {
        if (stampCategories.length > 0 && !stampCategories.includes(activeStampTab)) {
            setActiveStampTab(stampCategories[0]);
        }
    }, [activeStampTab, setActiveStampTab]);

    useLayoutEffect(() => {
        if (textStampModeActive) {
            setPenSettingsModeActive(false);
            requestAnimationFrame(() => {
                textareaRef.current?.focus();
                textareaRef.current?.select();
            });
        }
    }, [textStampModeActive]);

    useEffect(() => {
        focusTextStampTextareaFnRef.current = () => {
            textareaRef.current?.focus();
            textareaRef.current?.select();
        };
        return () => {
            focusTextStampTextareaFnRef.current = null;
        };
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
        const scale = (getStampSize() / 100) * maxScaleFactor;
        const svg = typeof stamp.svg === 'string' ? stamp.svg : stamp.svg.outerHTML;
        const currentStampColorType = getStampColorType();
        const currentSpeed = getRainbowSpeed();
        showStampPreview(stamp, stampDimensions, maxScaleFactor, scale, getSingleColor(), svg, { x: e.clientX, y: e.clientY }, currentStampColorType, currentSpeed);
        close();
    }, [showStampPreview, close]);

    const handleTextStampToggle = useCallback(() => {
        setTextStampModeActive(prev => {
            const next = !prev;
            if (next) {
                setPenSettingsModeActive(false);
                setSettingsModeActive(false);
            }
            return next;
        });
    }, [setTextStampModeActive]);

    const handlePenSettingsToggle = useCallback(() => {
        setPenSettingsModeActive(prev => {
            const next = !prev;
            if (next) {
                setTextStampModeActive(false);
                setSettingsModeActive(false);
            }
            return next;
        });
    }, []);

    const handleSettingsToggle = useCallback(() => {
        setSettingsModeActive(prev => {
            const next = !prev;
            if (next) {
                setTextStampModeActive(false);
                setPenSettingsModeActive(false);
            }
            return next;
        });
    }, []);

    const handleTextStamp = useCallback((e) => {
        const scale = getStampSize() / 100;
        const textareaVal = textareaRef.current?.value || '';
        const writeDimensions = StampLib.getWriteAllDimensions(textareaVal, scale);
        showTextPreview(textareaVal, writeDimensions, scale, getSingleColor(), { x: e.clientX, y: e.clientY });
        close();
    }, [showTextPreview, close]);

    const handleSizeChange = useCallback((e) => {
        setStampSize(parseInt(e.target.value));
    }, [setStampSize]);

    const handleSingleColorChange = useCallback((e) => {
        const val = e.target.value;
        setSingleColor(val);
        if (!eraserEnabled) {
            setStampLibPenSettings(val, penWidth, penAlpha);
        }
    }, [setSingleColor, eraserEnabled, penWidth, penAlpha]);

    const handleColorTypeChange = useCallback((e) => {
        setStampColorType(e.target.value);
    }, [setStampColorType]);

    const handleSpeedChange = useCallback((e) => {
        const currentType = getStampColorType();
        if (currentType === 'Rainbow') {
            setRainbowSpeed(parseInt(e.target.value));
        } else if (currentType === 'Rainbow Fill') {
            setRainbowFillSpeed(parseInt(e.target.value));
        }
    }, [setRainbowSpeed, setRainbowFillSpeed]);

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

    const handleKeys = useCallback((e) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if ((e.target.nodeName === "INPUT" && e.target.type !== "checkbox" && e.target.type !== "color" && e.target.type != "range") || e.target.nodeName === "TEXTAREA") {
            if (e.key === "Escape") {
                close();
            }
            return;
        }
        if (e.repeat && !["+", "-", "="].includes(e.key)) return;
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
                setTextStampModeActive(false);
                setSettingsModeActive(false);
                penSettingsRef.current?.cycleHighlighter();
                break;
            case "p":
                setPenSettingsModeActive(true);
                setTextStampModeActive(false);
                setSettingsModeActive(false);
                penSettingsRef.current?.clickPreset?.('pen');
                break;
            case "P":
            case "H":
            case "E":
                setPenSettingsModeActive(false);
                break;
            case "e":
                setPenSettingsModeActive(true);
                setTextStampModeActive(false);
                setSettingsModeActive(false);
                penSettingsRef.current?.clickPreset?.('eraser');
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
                setPenSettingsModeActive(false);
                setSettingsModeActive(false);
                requestAnimationFrame(() => {
                    textareaRef.current?.focus();
                    textareaRef.current?.select();
                });
                break;
            case "T":
                setTextStampModeActive(false);
                break;
            case "s":
                setSettingsModeActive(true);
                setTextStampModeActive(false);
                setPenSettingsModeActive(false);
                break;
            case "S":
                setSettingsModeActive(false);
                break;
            case "?":
                showHelpOverlay("drawtab");
                break;
        }
    }, [close, showHelpOverlay, setPenSettingsModeActive, setTextStampModeActive, setSettingsModeActive]);

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
                        <label>Size: {stampSize}%</label>
                        <div class={styles.controlRow}>
                            <input
                                ref={sizeSliderRef}
                                type="range"
                                min="10"
                                max="100"
                                value={stampSize}
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
                             accessKey="c"
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

                <button
                    class={`${styles.stampTabBtn} ${settingsModeActive ? styles.stampTabBtnActive : ''}`}
                    onClick={handleSettingsToggle}
                    onMouseOver={stopPropagation}
                >
                    <span dangerouslySetInnerHTML={{ __html: settingsIcon }} />
                    Settings
                </button>

                <div class={styles.stampTabDivider} />

                {renderedStampTabs}
            </div>

            <div class={`${styles.auxPanelWrapper} ${textStampModeActive || penSettingsModeActive || settingsModeActive ? '' : styles.auxPanelWrapperCollapsed}`}>
                <div class={`${styles.textInput} ${textStampModeActive ? styles.auxPanelActive : ''}`}>
                    <textarea
                        ref={textareaRef}
                        name="stampTextArea"
                        placeholder="Enter text..."
                        rows="1"
                        style={{
                            color: singleColor,
                            fontSize: `calc((${stampSize} / 100) * 57px)`
                        }}
                        onKeyUp={stopPropagation}
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
                    <PenSettings ref={penSettingsRef} layout="inline" />
                </div>

                <div class={`${styles.settingsInput} ${settingsModeActive ? styles.auxPanelActive : ''}`}>
                    <div class={styles.settingsGroup}>
                        <div class={styles.controlGroup}>
                            <label>HD Mode</label>
                            <label class={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={hdModeEnabled}
                                    onChange={(e) => setHdModeEnabled(e.target.checked)}
                                    accessKey="h"
                                />
                                <span class={styles.toggleSlider}></span>
                            </label>
                        </div>
                        <div class={styles.controlGroup}>
                            <label>Keyboard Mode</label>
                            <label class={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={keyboardModeEnabled}
                                    onChange={(e) => setKeyboardModeEnabled(e.target.checked)}
                                    accessKey="k"
                                />
                                <span class={styles.toggleSlider}></span>
                            </label>
                        </div>
                    </div>
                    <div class={styles.settingsActions}>
                        <button
                            class={styles.presetBtn}
                            onClick={() => showHelpOverlay('grading')}
                            onMouseOver={stopPropagation}
                        >
                            <span dangerouslySetInnerHTML={{ __html: helpCircleIcon }} />
                            Help
                        </button>
                        <button
                            class={styles.presetBtn}
                            onClick={StampLib.unlockPage}
                            onMouseOver={stopPropagation}
                        >
                            <span dangerouslySetInnerHTML={{ __html: unlockIcon }} />
                            Unlock Page
                        </button>
                    </div>
                </div>
            </div>

            <div class={styles.stamps} ref={stampsRef}>
                {renderedStamps}
            </div>
        </div>
    );
};
