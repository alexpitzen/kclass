import { useRef, useEffect, useMemo, useCallback } from 'preact/hooks';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import { useImageStampSettings } from '../context/ImageStampSettingsContext.jsx';
import { usePrintOverlay } from './PrintOverlay.jsx';
import styles from './ImageStampTab.module.css';
import undoIcon from '../icons/undo.svg';
import trashIcon from '../icons/trash.svg';
import stampTextIcon from '../icons/stamp-text.svg';
import xIcon from '../icons/x.svg';

const stamps = window.StampLib?.stamps || {};

export const ImageStampTab = ({ onStampClick, onClose }) => {
    const {
        imageStampSize,
        setImageStampSize,
        stampColorType,
        setStampColorType,
        rainbowSpeed,
        setRainbowSpeed,
        rainbowFillSpeed,
        setRainbowFillSpeed,
        singleColor,
        setSingleColor,
        activeStampTab,
        setActiveStampTab,
        textStampModeActive,
        setTextStampModeActive,
        textStampText,
        setTextStampText,
    } = useImageStampSettings();

    const { handleUndo, handleClear } = useDrawTool();

    const imageStampSizeRef = useRef(imageStampSize);
    const singleColorRef = useRef(singleColor);

    const textStampTextRef = useRef(textStampText);

    useEffect(() => {
        imageStampSizeRef.current = imageStampSize;
    }, [imageStampSize]);

    useEffect(() => {
        singleColorRef.current = singleColor;
    }, [singleColor]);

    useEffect(() => {
        textStampTextRef.current = textStampText;
    }, [textStampText]);

    const { showStampPreview, showTextPreview } = usePrintOverlay();
    const stampsRef = useRef(null);

    const stampCategories = Object.keys(stamps);

    useEffect(() => {
        if (stampCategories.length > 0 && !stampCategories.includes(activeStampTab)) {
            setActiveStampTab(stampCategories[0]);
        }
    }, [stampCategories, activeStampTab]);

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

    const handleStampClick = useCallback((stamp, e) => {
        const stampDimensions = stamp._cachedDimensions || StampLib.getWriteStampDimensions(stamp, 1);
        const maxScaleFactor = 370 / Math.max(stampDimensions.width, stampDimensions.height);
        const scale = (imageStampSizeRef.current / 100) * maxScaleFactor;
        const svg = typeof stamp.svg === 'string' ? stamp.svg : stamp.svg.outerHTML;
        showStampPreview(stamp, stampDimensions, maxScaleFactor, scale, singleColorRef.current, svg, { x: e.clientX, y: e.clientY });
        onStampClick?.();
    }, [showStampPreview, onStampClick]);

    const handleTextStampToggle = useCallback(() => {
        setTextStampModeActive(prev => !prev);
    }, []);

    const handleTextStampTextChange = useCallback((e) => {
        setTextStampText(e.target.value);
    }, []);

    const handleTextStamp = useCallback((e) => {
        const scale = imageStampSizeRef.current / 100;
        const writeDimensions = StampLib.getWriteAllDimensions(textStampTextRef.current, scale);
        showTextPreview(textStampTextRef.current, writeDimensions, scale, singleColorRef.current, { x: e.clientX, y: e.clientY });
    }, [showTextPreview]);

    const handleSizeChange = useCallback((e) => {
        setImageStampSize(parseInt(e.target.value));
    }, [setImageStampSize]);

    const handleColorTypeChange = useCallback((e) => {
        setStampColorType(e.target.value);
    }, [setStampColorType]);

    const handleSpeedChange = useCallback((e) => {
        if (stampColorType === 'Rainbow') {
            setRainbowSpeed(parseInt(e.target.value));
        } else if (stampColorType === 'Rainbow Fill') {
            setRainbowFillSpeed(parseInt(e.target.value));
        }
    }, [stampColorType, setRainbowSpeed, setRainbowFillSpeed]);

    const isRainbow = stampColorType === 'Rainbow';
    const isRainbowFill = stampColorType === 'Rainbow Fill';

    const speedValue = isRainbow ? rainbowSpeed : isRainbowFill ? rainbowFillSpeed : 1;
    const speedMin = isRainbow ? 1 : isRainbowFill ? 1 : 0;
    const speedMax = isRainbow ? 130 : isRainbowFill ? 100 : 0;

    const activeStamps = stamps[activeStampTab] || [];

    const renderedStampTabs = useMemo(() => {
        return stampCategories.map((category) => (
            <button
                key={category}
                class={`${styles.stampTabBtn} ${activeStampTab === category ? styles.stampTabBtnActive : ''}`}
                onClick={() => setActiveStampTab(category)}
            >
                {category}
            </button>
        ));
    }, [stampCategories, activeStampTab]);

    const renderedStamps = useMemo(() => {
        return activeStamps.map((stamp) => {
            const dims = stamp._cachedDimensions || StampLib.getWriteStampDimensions(stamp, 1);
            const heightLimiter = dims.height <= dims.width ? 1 : dims.width / dims.height;
            return (
                <button
                    key={stamp.name}
                    class={styles.stampBtn}
                    onMouseOver={(e) => e.stopPropagation()}
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
                    onClick={onClose}
                    onMouseOver={(e) => e.stopPropagation()}
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
                            onChange={(e) => setSingleColor(e.target.value)}
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
                            onMouseOver={(e) => e.stopPropagation()}
                        >
                            <span dangerouslySetInnerHTML={{ __html: undoIcon }} />
                            Undo
                        </button>
                        <button
                            onClick={handleClear}
                            onMouseOver={(e) => e.stopPropagation()}
                        >
                            <span dangerouslySetInnerHTML={{ __html: trashIcon }} />
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            <div class={`${styles.textInput} ${!textStampModeActive ? styles.textInputCollapsed : ''}`}>
                    <textarea
                        value={textStampText}
                        onInput={handleTextStampTextChange}
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
                        onMouseOver={(e) => e.stopPropagation()}
                    >
                        <span dangerouslySetInnerHTML={{ __html: stampTextIcon }} />
                        Stamp Text
                    </button>
                </div>

            <div class={styles.stampTabs}>
                <button
                    class={`${styles.stampTabBtn} ${textStampModeActive ? styles.stampTabBtnActive : ''}`}
                    onClick={handleTextStampToggle}
                    onMouseOver={(e) => e.stopPropagation()}
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
