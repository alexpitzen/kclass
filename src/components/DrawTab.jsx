import { useState, useEffect, useRef } from 'preact/hooks';
import { penTypes } from './constants.js';
import { usePrintOverlay } from './PrintOverlay.jsx';

export const DrawTab = ({ stamps: _stamps }) => {
    const [hidden, setHidden] = useState(true);
    const [size, setSize] = useState(25);
    const [penColor, setPenColor] = useState('#ff2200');
    const [penType, setPenType] = useState('pen');
    const [hdMode, setHdMode] = useState(false);
    const [text, setText] = useState('');
    const [stampColorType, setStampColorType] = useState('Unchanged');
    const [rainbowSpeed, setRainbowSpeed] = useState(1);

    const { showStampPreview, showTextPreview } = usePrintOverlay();
    const textareaRef = useRef(null);
    const stampsRef = useRef(null);

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
    const show = () => setHidden(false);

    const handleSizeChange = (e) => setSize(e.target.value);
    const handleColorChange = (e) => setPenColor(e.target.value);
    const handlePenTypeChange = (e) => setPenType(e.target.value);
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

    const handleTextStamp = () => {
        hide();
        const scale = size / 100;
        const writeDimensions = StampLib.getWriteAllDimensions(text, scale);
        showTextPreview(text, writeDimensions, scale, penColor);
    };

    const handleStampClick = (stamp) => {
        hide();
        const stampDimensions = StampLib.getWriteStampDimensions(stamp, 1);
        const maxScaleFactor = 370 / Math.max(stampDimensions.width, stampDimensions.height);
        const scale = (size / 100) * maxScaleFactor;
        const svg = typeof stamp.svg === 'string' ? stamp.svg : stamp.svg.outerHTML;
        showStampPreview(stamp, stampDimensions, maxScaleFactor, scale, penColor, svg);
    };

    return (
        <div class={`drawtab ${hidden ? 'hidden' : ''}`}>
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
                    <button class="textprintbtn" onClick={handleTextStamp}>
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
            </div>

            <div class="stamps" ref={stampsRef}>
                {Object.entries(stamps).map(([category, stampList]) => (
                    <details key={category} open={category === Object.keys(stamps)[0]}>
                        <summary>{category}</summary>
                        {stampList.map((stamp) => (
                            <button
                                key={stamp.name}
                                class="stampbtn"
                                onClick={() => handleStampClick(stamp)}
                            >
                                {typeof stamp.svg === 'string' ? stamp.svg : stamp.svg}
                            </button>
                        ))}
                    </details>
                ))}
            </div>
        </div>
    );
};
