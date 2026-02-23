import { useState, useEffect, useRef } from 'preact/hooks';
import { penTypes } from './constants.js';
import { usePrintOverlay } from './PrintOverlay.jsx';
import { useKeyboardMode, keyboardHelpText } from '../hooks/useKeyboardMode.js';
import { useApp } from '../context/AppContext.jsx';
import { updatePenSettings } from '../helpers/actions.js';

export const DrawTab = ({ stamps: _stamps }) => {
    const { 
        drawTabOpen, 
        setDrawTabOpen,
        hideDrawTab,
        showDrawTab,
        toggleDrawTab,
        keyboardModeEnabled,
        setKeyboardModeEnabled,
        hdModeEnabled,
        setHdModeEnabled,
    } = useApp();
    
    const [penColor, setPenColor] = useState('#ff2200');
    const [penType, setPenType] = useState('pen');
    const [text, setText] = useState('');
    const [stampColorType, setStampColorType] = useState('Unchanged');
    const [rainbowSpeed, setRainbowSpeed] = useState(1);

    const { showStampPreview, showTextPreview } = usePrintOverlay();
    const textareaRef = useRef(null);
    const stampsRef = useRef(null);
    const rootRef = useRef(null);

    useKeyboardMode(keyboardModeEnabled, drawTabOpen, toggleDrawTab);

    const stamps = window.StampLib?.stamps || {};

    useEffect(() => {
        if (drawTabOpen && textareaRef.current) {
            textareaRef.current.style.height = '';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [text, drawTabOpen]);

    useEffect(() => {
        document.body.classList.toggle('drawtab-hidden', !drawTabOpen);
    }, [drawTabOpen]);

    const hide = () => setDrawTabOpen(false);
    const show = () => {
        setDrawTabOpen(true);
        updatePenSettings();
    };
    const toggle = () => {
        if (drawTabOpen) {
            hide();
        } else {
            show();
        }
    };

    // Expose toggle globally for CustomToolbar
    useEffect(() => {
        window.__toggleDrawTab = toggle;
        window.__showDrawTab = show;
        window.__hideDrawTab = hide;
        return () => {
            delete window.__toggleDrawTab;
            delete window.__showDrawTab;
            delete window.__hideDrawTab;
        };
    }, [toggle, show, hide]);

    const handleSizeChange = (e) => {
        const newSize = parseInt(e.target.value);
        
        // Update CSS variable for sizeslider
        const drawtab = rootRef.current;
        if (drawtab) {
            drawtab.style.setProperty('--sizeslider', `${newSize} / 100`);
        }
        
        // Update textarea size
        const textarea = drawtab?.querySelector('textarea');
        if (textarea) {
            textarea.style.height = '';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
        
        // Update stamp preview if visible
        const stampPreview = document.querySelector('.stampPrintPreviewDiv');
        if (stampPreview?.checkVisibility()) {
            const maxScaleFactor = stampPreview.maxScaleFactor;
            const scale = (newSize / 100) * maxScaleFactor;
            const dims = stampPreview.stampDimensions;
            if (dims) {
                stampPreview.style.height = `${dims.height * scale}px`;
                stampPreview.style.width = `${dims.width * scale}px`;
            }
        }
        
        // Update text preview if visible
        const textPreview = document.querySelector('.textPrintPreviewDiv');
        if (textPreview?.checkVisibility()) {
            const scale = newSize / 100;
            const writeDimensions = StampLib.getWriteAllDimensions(text, scale);
            textPreview.style.height = `${writeDimensions.height}px`;
            textPreview.style.width = `${writeDimensions.width}px`;
        }
    };
    const handleColorChange = (e) => {
        setPenColor(e.target.value);
        updatePenSettings();
    };
    const handlePenTypeChange = (e) => {
        setPenType(e.target.value);
        updatePenSettings();
    };
    const handleStampColorChange = (e) => setStampColorType(e.target.value);
    const handleRainbowSpeedChange = (e) => setRainbowSpeed(e.target.value);

    const handleUnlock = () => {
        stamp.unlockPage();
        hide();
    };

    const toggleHdMode = (e) => {
        setHdModeEnabled(e.target.checked);
    };

    const handleUndo = () => StampLib.undoLastWriteAll();
    const handleClear = () => StampLib.clearPage();

    const handleTextStamp = (e) => {
        hide();
        const slider = rootRef.current?.querySelector('.sizeslider');
        const currentSize = slider ? parseInt(slider.value) : 25;
        const scale = currentSize / 100;
        const writeDimensions = StampLib.getWriteAllDimensions(text, scale);
        showTextPreview(text, writeDimensions, scale, penColor, { x: e.clientX, y: e.clientY });
    };

    const handleStampClick = (stamp, e) => {
        hide();
        const stampDimensions = stamp._cachedDimensions || StampLib.getWriteStampDimensions(stamp, 1);
        const maxScaleFactor = 370 / Math.max(stampDimensions.width, stampDimensions.height);
        const slider = rootRef.current?.querySelector('.sizeslider');
        const currentSize = slider ? parseInt(slider.value) : 25;
        const scale = (currentSize / 100) * maxScaleFactor;
        const svg = typeof stamp.svg === 'string' ? stamp.svg : stamp.svg.outerHTML;
        showStampPreview(stamp, stampDimensions, maxScaleFactor, scale, penColor, svg, { x: e.clientX, y: e.clientY });
    };

    // Pointer scroll for touch dragging
    useEffect(() => {
        const parent = rootRef.current;
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

    const handleMouseLeave = (e) => {
        const rect = rootRef.current.getBoundingClientRect();
        if (
            e.clientX <= rect.left
            || e.clientX >= rect.right - 2
            || e.clientY <= rect.top
            || e.clientY >= rect.bottom - 2
        ) {
            hide();
        }
    };

    return (
        <div ref={rootRef} class={`drawtab ${drawTabOpen ? '' : 'hidden'}`} onMouseLeave={handleMouseLeave}>
            <div class="header">
                <div class="buttonsleft">
                    <input
                        type="range"
                        class="sizeslider"
                        min="10"
                        max="100"
                        defaultValue="25"
                        onInput={handleSizeChange}
                        title="Adjust stamp size"
                    />

                    <button
                        class="unlockbtn"
                        onClick={handleUnlock}
                        title="Unlock the page for writing"
                    >
                        🔓
                    </button>

                    <div class="toggle">
                        <input
                            type="checkbox"
                            id="hdbtn"
                            checked={hdModeEnabled}
                            onChange={toggleHdMode}
                            accessKey="h"
                        />
                        <label for="hdbtn">HD mode</label>
                    </div>
                </div>

                <span class="stackedButtons">
                    <input
                        type="color"
                        class="pencolorbtn"
                        value={penColor}
                        onInput={handleColorChange}
                        accessKey="c"
                    />

                    <fieldset>
                        <legend>Pen type:</legend>
                        {penTypes.map((type) => (
                            <label key={type.value}>
                                <input
                                    type="radio"
                                    name="penType"
                                    value={type.value}
                                    checked={penType === type.value}
                                    onChange={handlePenTypeChange}
                                />
                                {type.label}
                            </label>
                        ))}
                    </fieldset>

                    <button class="undoLast" onClick={handleUndo} title="Undo last stamp">
                        Undo stamp
                    </button>
                </span>

                <span class="stackedButtons right">
                    <button class="closeDrawTab" onClick={hide} title="Close the draw tab">
                        x
                    </button>
                    <button class="clearAll" onClick={handleClear} title="Clear the entire page">
                        Clear all
                    </button>
                </span>

                <div>
                    <textarea
                        ref={textareaRef}
                        name="stampTextArea"
                        value={text}
                        onInput={(e) => setText(e.target.value)}
                        style={{ color: penColor }}
                    />
                    <button class="textprintbtn" onClick={(e) => handleTextStamp(e)}>
                        T
                    </button>
                </div>

                <label>
                    Stamp Color:
                    <select id="stampColorType" value={stampColorType} onChange={handleStampColorChange}>
                        <option value="Color Picker">Color Picker</option>
                        <option value="Rainbow">Rainbow</option>
                        <option value="Rainbow Fill">Rainbow Fill</option>
                        <option value="Unchanged">Unchanged</option>
                    </select>
                </label>
                <input
                    type="range"
                    class="rainbowspeed"
                    min="1"
                    max="130"
                    value={rainbowSpeed}
                    onInput={handleRainbowSpeedChange}
                    disabled={stampColorType !== 'Rainbow' && stampColorType !== 'Rainbow Fill'}
                />

                <div class="toggle">
                    <input
                        type="checkbox"
                        id="kbbtn"
                        checked={keyboardModeEnabled}
                        onChange={(e) => setKeyboardModeEnabled(e.target.checked)}
                        title={keyboardHelpText}
                        accessKey="k"
                    />
                    <label for="kbbtn" title={keyboardHelpText}>Keyboard mode</label>
                </div>
            </div>

            <div class="stamps" ref={stampsRef}>
                {Object.entries(stamps).map(([category, stampList]) => (
                    <details key={category} open={category === Object.keys(stamps)[0]}>
                        <summary>{category}</summary>
                        {stampList.map((stamp) => (
                            <button
                                key={stamp.name}
                                class="stampbtn"
                                onMouseOver={(e) => e.stopPropagation()}
                                onClick={(e) => handleStampClick(stamp, e)}
                                style={{ '--height-limiter': (() => {
                                    const dims = stamp._cachedDimensions || StampLib.getWriteStampDimensions(stamp, 1);
                                    return dims.height <= dims.width ? 1 : dims.width / dims.height;
                                })() }}
                            >
                                <span dangerouslySetInnerHTML={{ __html: stamp.svg.outerHTML }} />
                            </button>
                        ))}
                    </details>
                ))}
            </div>
        </div>
    );
};
