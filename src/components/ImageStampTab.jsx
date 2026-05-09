import { useRef, useEffect, useState } from 'preact/hooks';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import { usePrintOverlay } from './PrintOverlay.jsx';
import styles from './ImageStampTab.module.css';
import undoIcon from '../icons/undo.svg';
import trashIcon from '../icons/trash.svg';

const stamps = window.StampLib?.stamps || {};

export const ImageStampTab = ({ onStampClick }) => {
    const {
        stampSize,
        setStampSize,
        stampColorType,
        setStampColorType,
        rainbowSpeed,
        setRainbowSpeed,
        rainbowFillSpeed,
        setRainbowFillSpeed,
        singleColor,
        setSingleColor,
        handleUndo,
        handleClear,
    } = useDrawTool();

    const { showStampPreview } = usePrintOverlay();
    const stampsRef = useRef(null);

    const stampCategories = Object.keys(stamps);
    const [activeStampTab, setActiveStampTab] = useState(stampCategories[0] || '');

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

    const handleStampClick = (stamp, e) => {
        const stampDimensions = stamp._cachedDimensions || StampLib.getWriteStampDimensions(stamp, 1);
        const maxScaleFactor = 370 / Math.max(stampDimensions.width, stampDimensions.height);
        const scale = (stampSize / 100) * maxScaleFactor;
        const svg = typeof stamp.svg === 'string' ? stamp.svg : stamp.svg.outerHTML;
        showStampPreview(stamp, stampDimensions, maxScaleFactor, scale, singleColor, svg, { x: e.clientX, y: e.clientY });
        onStampClick?.();
    };

    const handleSizeChange = (e) => {
        setStampSize(parseInt(e.target.value));
    };

    const handleColorTypeChange = (e) => {
        setStampColorType(e.target.value);
    };

    const handleSpeedChange = (e) => {
        if (stampColorType === 'Rainbow') {
            setRainbowSpeed(parseInt(e.target.value));
        } else if (stampColorType === 'Rainbow Fill') {
            setRainbowFillSpeed(parseInt(e.target.value));
        }
    };

    const isRainbow = stampColorType === 'Rainbow';
    const isRainbowFill = stampColorType === 'Rainbow Fill';

    const speedValue = isRainbow ? rainbowSpeed : isRainbowFill ? rainbowFillSpeed : 1;
    const speedMin = isRainbow ? 1 : isRainbowFill ? 1 : 0;
    const speedMax = isRainbow ? 130 : isRainbowFill ? 100 : 0;

    const activeStamps = stamps[activeStampTab] || [];

    return (
        <div class={styles.tab}>
            <div class={styles.controls}>
                <div class={styles.mainControlRow}>
                    <div class={styles.controlGroup}>
                        <label>Size</label>
                        <div class={styles.controlRow}>
                            <input
                                type="range"
                                min="10"
                                max="100"
                                value={stampSize}
                                onInput={handleSizeChange}
                            />
                            <span>{stampSize}%</span>
                        </div>
                    </div>

                    <div class={styles.controlGroup}>
                        <label>Color</label>
                        <input
                            type="color"
                            value={singleColor}
                            onInput={(e) => setSingleColor(e.target.value)}
                        />
                    </div>

                    <div class={styles.controlGroupWrapper}>
                        <div class={styles.controlGroup}>
                            <label>Mode</label>
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

            <div class={styles.stampTabs}>
                {stampCategories.map((category) => (
                    <button
                        key={category}
                        class={`${styles.stampTabBtn} ${activeStampTab === category ? styles.stampTabBtnActive : ''}`}
                        onClick={() => setActiveStampTab(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div class={styles.stamps} ref={stampsRef}>
                {activeStamps.map((stamp) => (
                    <button
                        key={stamp.name}
                        class={styles.stampBtn}
                        onMouseOver={(e) => e.stopPropagation()}
                        onClick={(e) => handleStampClick(stamp, e)}
                        style={{
                            '--height-limiter': (() => {
                                const dims = stamp._cachedDimensions || StampLib.getWriteStampDimensions(stamp, 1);
                                return dims.height <= dims.width ? 1 : dims.width / dims.height;
                            })()
                        }}
                    >
                        <span dangerouslySetInnerHTML={{ __html: stamp.svg.outerHTML }} />
                    </button>
                ))}
            </div>
        </div>
    );
};
