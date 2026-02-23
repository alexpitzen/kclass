import { useState, useEffect, useRef } from 'preact/hooks';
import { penTypes } from './constants.js';
import { usePrintOverlay } from './PrintOverlay.jsx';
import { useKeyboardMode, keyboardHelpText } from '../hooks/useKeyboardMode.js';
import { updatePenSettings } from '../helpers/actions.js';

export const DrawTab = ({ stamps: _stamps }) => {
    const [hidden, setHidden] = useState(true);
    const [size, setSize] = useState(25);
    const [penColor, setPenColor] = useState('#ff2200');
    const [penType, setPenType] = useState('pen');
    const [hdMode, setHdMode] = useState(false);
    const [text, setText] = useState('');
    const [stampColorType, setStampColorType] = useState('Unchanged');
    const [rainbowSpeed, setRainbowSpeed] = useState(1);
    const [keyboardMode, setKeyboardMode] = useState(false);

    const { showStampPreview, showTextPreview } = usePrintOverlay();
    const textareaRef = useRef(null);
    const stampsRef = useRef(null);
    const rootRef = useRef(null);
    const drawTabRef = { current: null };

    useKeyboardMode(keyboardMode, drawTabRef);

    // Expose keyboard mode state globally for useMarkboxKeys
    useEffect(() => {
        window.__keyboardModeEnabled = keyboardMode;
        window.__setMarkboxKeysEnabled?.(keyboardMode);
        const currentPage = document.querySelector('.ATD0020P-worksheet-container.selected');
        if (keyboardMode) {
            window.__addMarkboxKeys?.(currentPage);
        } else {
            window.__removeMarkboxKeys?.(currentPage);
        }
    }, [keyboardMode]);

    const stamps = window.StampLib?.stamps || {};

    useEffect(() => {
        if (!hidden && textareaRef.current) {
            textareaRef.current.style.height = '';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [text, hidden]);

    useEffect(() => {
        document.body.classList.toggle('drawtab-hidden', hidden);
    }, [hidden]);

    const hide = () => setHidden(true);
    const show = () => {
        setHidden(false);
        updatePenSettings();
    };
    const toggle = () => {
        if (hidden) {
            show();
        } else {
            hide();
        }
    };

    // Expose show/hide/toggle globally for CustomToolbar
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

    const handleSizeChange = (e) => setSize(e.target.value);
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
        const enabled = e.target.checked;
        setHdMode(enabled);
        if (window.__hdModeSetEnabled) {
            window.__hdModeSetEnabled(enabled);
        }
    };

    const handleUndo = () => StampLib.undoLastWriteAll();
    const handleClear = () => StampLib.clearPage();

    const handleTextStamp = (e) => {
        hide();
        const scale = size / 100;
        const writeDimensions = StampLib.getWriteAllDimensions(text, scale);
        showTextPreview(text, writeDimensions, scale, penColor, { x: e.clientX, y: e.clientY });
    };

    const handleStampClick = (stamp, e) => {
        hide();
        const stampDimensions = stamp._cachedDimensions || StampLib.getWriteStampDimensions(stamp, 1);
        const maxScaleFactor = 370 / Math.max(stampDimensions.width, stampDimensions.height);
        const scale = (size / 100) * maxScaleFactor;
        const svg = typeof stamp.svg === 'string' ? stamp.svg : stamp.svg.outerHTML;
        showStampPreview(stamp, stampDimensions, maxScaleFactor, scale, penColor, svg, { x: e.clientX, y: e.clientY });
    };

    // Expose drawTabRef for keyboard handler
    useEffect(() => {
        drawTabRef.current = rootRef.current;
    }, []);

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
        <div ref={rootRef} class={`drawtab ${hidden ? 'hidden' : ''}`} onMouseLeave={handleMouseLeave}>
            <div class="header">
                <div class="buttonsleft">
                    <input
                        type="range"
                        class="sizeslider"
                        min="10"
                        max="100"
                        value={size}
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
                            checked={hdMode}
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
                    <select value={stampColorType} onChange={handleStampColorChange}>
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
                        checked={keyboardMode}
                        onChange={(e) => setKeyboardMode(e.target.checked)}
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
