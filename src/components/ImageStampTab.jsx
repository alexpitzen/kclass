import { useState, useRef, useEffect, useMemo, useCallback } from 'preact/hooks';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import { usePrintOverlay } from './PrintOverlay.jsx';
import styles from './ImageStampTab.module.css';
import undoIcon from '../icons/undo.svg';
import trashIcon from '../icons/trash.svg';
import stampTextIcon from '../icons/stamp-text.svg';
import xIcon from '../icons/x.svg';

const stamps = window.StampLib?.stamps || {};
const stampCategories = Object.keys(stamps);

const stopPropagation = (e) => e.stopPropagation();

const imageStampSizeRef = { current: 25 };
const singleColorRef = { current: '#ff2200' };
const stampColorTypeRef = { current: 'Unchanged' };
const rainbowSpeedRef = { current: 100 };
const rainbowFillSpeedRef = { current: 20 };
const activeStampTabRef = { current: '' };
const textStampModeActiveRef = { current: false };
const textareaValueRef = { current: '' };

export const ImageStampTab = ({ onStampClick, close }) => {
    const { handleUndo, handleClear } = useDrawTool();
    const { showStampPreview, showTextPreview } = usePrintOverlay();

    const [imageStampSize, setImageStampSize] = useState(imageStampSizeRef.current);
    const [stampColorType, setStampColorTypeState] = useState(stampColorTypeRef.current);
    const [rainbowSpeed, setRainbowSpeedState] = useState(rainbowSpeedRef.current);
    const [rainbowFillSpeed, setRainbowFillSpeedState] = useState(rainbowFillSpeedRef.current);
    const [singleColor, setSingleColor] = useState(singleColorRef.current);
    const [activeStampTab, setActiveStampTabState] = useState(activeStampTabRef.current);
    const [textStampModeActive, setTextStampModeActiveState] = useState(textStampModeActiveRef.current);

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

    const setTextStampModeActive = useCallback((valOrFn) => {
        const newVal = typeof valOrFn === 'function' ? valOrFn(textStampModeActiveRef.current) : valOrFn;
        textStampModeActiveRef.current = newVal;
        setTextStampModeActiveState(newVal);
    }, []);

    const textareaRef = useRef(null);
    const stampsRef = useRef(null);
    const activeStamps = stamps[activeStampTab] || [];

    useEffect(() => {
        imageStampSizeRef.current = imageStampSize;
    }, [imageStampSize]);

    useEffect(() => {
        singleColorRef.current = singleColor;
    }, [singleColor]);

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
    }, []);

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
                            <label>Color Style</label>
                            <select value={stampColorType} onChange={handleColorTypeChange}>
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

            <div class={`${styles.textInput} ${!textStampModeActive ? styles.textInputCollapsed : ''}`}>
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

            <div class={styles.stampTabs}>
                <button
                    class={`${styles.stampTabBtn} ${textStampModeActive ? styles.stampTabBtnActive : ''}`}
                    onClick={handleTextStampToggle}
                    onMouseOver={stopPropagation}
                >
                    <span dangerouslySetInnerHTML={{ __html: stampTextIcon }} />
                    Text
                </button>
                {renderedStampTabs}
            </div>

            <div class={styles.stamps} ref={stampsRef}>
                {renderedStamps}
            </div>
        </div>
    );
};
