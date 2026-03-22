import { useState, useEffect, useRef } from 'preact/hooks';
import { penTypes } from './constants.js';
import { usePrintOverlay } from './PrintOverlay.jsx';
import { useKeyboardMode, keyboardHelpText } from '../hooks/useKeyboardMode.js';
import { useDrawTab, useKeyboardMode as useKeyboardModeContext, useHDMode as useHDModeContext, DrawTabProvider } from '../context/AppContext.jsx';
import { updatePenSettings } from '../helpers/actions.js';

const DrawTabContent = ({ stamps: _stamps }) => {
    const { drawTabOpen, setDrawTabOpen, hideDrawTab, showDrawTab, toggleDrawTab } = useDrawTab();
    const { keyboardModeEnabled, setKeyboardModeEnabled } = useKeyboardModeContext();
    const { hdModeEnabled, setHdModeEnabled } = useHDModeContext();

    const penColorRef = useRef('#ff2200');
    const penTypeRef = useRef('pen');
    const stampColorTypeRef = useRef('Unchanged');
    const rainbowSpeedRef = useRef(1);

    const { showStampPreview, showTextPreview } = usePrintOverlay();
    const textareaRef = useRef(null);
    const stampsRef = useRef(null);
    const rootRef = useRef(null);
    const colorInputRef = useRef(null);

    useKeyboardMode(keyboardModeEnabled, drawTabOpen, toggleDrawTab);

    const getPenColor = () => colorInputRef.current?.value || '#ff2200';

    const stamps = window.StampLib?.stamps || {};

    useEffect(() => {
        if (drawTabOpen && textareaRef.current) {
            updateTextAreaSize();
        }
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

    const updateTextAreaSize = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
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
        updateTextAreaSize();

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
        const textPreview = document.querySelector('.printPreviewDiv');
        if (textPreview?.checkVisibility()) {
            const scale = newSize / 100;
            const textareaVal = textareaRef.current?.value || '';
            const writeDimensions = StampLib.getWriteAllDimensions(textareaVal, scale);
            textPreview.style.height = `${writeDimensions.height}px`;
            textPreview.style.width = `${writeDimensions.width}px`;
        }
    };
    const handleColorChange = (e) => {
        penColorRef.current = e.target.value;
        const textarea = rootRef.current?.querySelector('textarea');
        if (textarea) {
            textarea.style.color = e.target.value;
        }
        updatePenSettings();
    };
    const handlePenTypeChange = (e) => {
        penTypeRef.current = e.target.value;
        // Update checked state manually
        const radios = rootRef.current?.querySelectorAll('input[name="penType"]');
        radios?.forEach(r => r.checked = r.value === e.target.value);
        updatePenSettings();
    };
    const handleStampColorChange = (e) => {
        stampColorTypeRef.current = e.target.value;
        // Update disabled state of rainbowspeed input
        const rainbowSpeedInput = rootRef.current?.querySelector('.rainbowspeed');
        if (rainbowSpeedInput) {
            rainbowSpeedInput.disabled = e.target.value !== 'Rainbow' && e.target.value !== 'Rainbow Fill';
        }
    };
    const handleRainbowSpeedChange = (e) => {
        rainbowSpeedRef.current = parseInt(e.target.value);
    };

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
        const textareaVal = textareaRef.current?.value || '';
        const writeDimensions = StampLib.getWriteAllDimensions(textareaVal, scale);
        showTextPreview(textareaVal, writeDimensions, scale, getPenColor(), { x: e.clientX, y: e.clientY });
    };

    const handleStampClick = (stamp, e) => {
        hide();
        const stampDimensions = stamp._cachedDimensions || StampLib.getWriteStampDimensions(stamp, 1);
        const maxScaleFactor = 370 / Math.max(stampDimensions.width, stampDimensions.height);
        const slider = rootRef.current?.querySelector('.sizeslider');
        const currentSize = slider ? parseInt(slider.value) : 25;
        const scale = (currentSize / 100) * maxScaleFactor;
        const svg = typeof stamp.svg === 'string' ? stamp.svg : stamp.svg.outerHTML;
        showStampPreview(stamp, stampDimensions, maxScaleFactor, scale, getPenColor(), svg, { x: e.clientX, y: e.clientY });
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
                            class="hdbtn"
                            checked={hdModeEnabled}
                            onChange={toggleHdMode}
                            accessKey="h"
                        />
                        <label for="hdbtn">HD mode</label>
                    </div>

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

                <span class="stackedButtons">
                    <input
                        ref={colorInputRef}
                        type="color"
                        class="pencolorbtn"
                        defaultValue="#ff2200"
                        onChange={handleColorChange}
                        accessKey="c"
                    />

                    <button class="undoLast" onClick={handleUndo} title="Undo last stamp">
                        Undo stamp
                    </button>
                </span>

                    <fieldset>
                        <legend>Pen type:</legend>
                        {penTypes.map((type) => (
                            <label key={type.value} style={type.value === 'eraser' ? { display: 'none' } : {}}>
                                <input
                                    type="radio"
                                    name="penType"
                                    value={type.value}
                                    defaultChecked={type.value === 'pen'}
                                    onChange={handlePenTypeChange}
                                />
                            {type.label}
                        </label>
                        ))}
                    </fieldset>

                <span class="stackedButtons right">
                    <button class="closeDrawTab squarebtn" onClick={hide} title="Close the draw tab">
                        x
                    </button>
                    <button class="clearAll" onClick={handleClear} title="Clear the entire page">
                        Clear all drawings
                    </button>
                </span>

                <div>
                    <textarea
                        ref={textareaRef}
                        name="stampTextArea"
                        defaultValue=""
                        onInput={updateTextAreaSize}
                        style="color:#FF2200"
                    />
                    <button class="textprintbtn squarebtn" onClick={(e) => handleTextStamp(e)}>
                        T
                    </button>
                </div>

                <label>
                    Stamp Color:
                    <select id="stampColorType" onChange={handleStampColorChange}>
                        <option value="Unchanged">Unchanged</option>
                        <option value="Color Picker">Color Picker</option>
                        <option value="Rainbow">Rainbow</option>
                        <option value="Rainbow Fill">Rainbow Fill</option>
                    </select>
                </label>
                <input
                    type="range"
                    class="rainbowspeed"
                    min="1"
                    max="130"
                    defaultValue="1"
                    onInput={handleRainbowSpeedChange}
                    disabled
                />
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

// Export wrapped version with its own provider
export const DrawTab = (props) => (
    <DrawTabProvider>
        <DrawTabContent {...props} />
    </DrawTabProvider>
);
