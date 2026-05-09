import { useRef, useEffect } from 'preact/hooks';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import { usePrintOverlay } from './PrintOverlay.jsx';
import styles from './TextStampTab.module.css';
import stampTextIcon from '../icons/stamp-text.svg';
import undoIcon from '../icons/undo.svg';

export const TextStampTab = ({ onStamp }) => {
    const {
        textStampColor,
        setTextStampColor,
        textStampText,
        setTextStampText,
        stampSize,
        setStampSize,
        handleUndo,
    } = useDrawTool();

    const { showTextPreview } = usePrintOverlay();
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [textStampText]);

    const handleSizeChange = (e) => {
        const newSize = parseInt(e.target.value);
        setStampSize(newSize);

        const textPreview = document.querySelector('.printPreviewDiv');
        if (textPreview?.checkVisibility()) {
            const scale = newSize / 100;
            const writeDimensions = StampLib.getWriteAllDimensions(textStampText, scale);
            textPreview.style.height = `${writeDimensions.height}px`;
            textPreview.style.width = `${writeDimensions.width}px`;
        }
    };

    const handleTextChange = (e) => {
        setTextStampText(e.target.value);
    };

    const handleColorChange = (e) => {
        setTextStampColor(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.color = e.target.value;
        }
    };

    const handleTextStamp = (e) => {
        const scale = stampSize / 100;
        const writeDimensions = StampLib.getWriteAllDimensions(textStampText, scale);
        showTextPreview(textStampText, writeDimensions, scale, textStampColor, { x: e.clientX, y: e.clientY });
        onStamp?.();
    };

    return (
        <div class={styles.tab}>
            <div class={styles.controls}>
                <div class={styles.mainControlRow}>
                    <div class={styles.controlGroup}>
                        <label>Color</label>
                        <input
                            type="color"
                            value={textStampColor}
                            onChange={handleColorChange}
                        />
                    </div>

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

                    <div class={styles.buttons}>
                        <button
                            onClick={handleUndo}
                            onMouseOver={(e) => e.stopPropagation()}
                        >
                            <span dangerouslySetInnerHTML={{ __html: undoIcon }} />
                            Undo
                        </button>
                    </div>
                </div>
            </div>

            <div class={styles.textInput}>
                <textarea
                    ref={textareaRef}
                    value={textStampText}
                    onInput={handleTextChange}
                    style={{ color: textStampColor }}
                />
                <button 
                    class={styles.stampBtn} 
                    onClick={handleTextStamp}
                    onMouseOver={(e) => e.stopPropagation()}
                >
                    <span dangerouslySetInnerHTML={{ __html: stampTextIcon }} />
                    Stamp Text
                </button>
            </div>
        </div>
    );
};
