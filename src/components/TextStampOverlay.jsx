import { createContext } from 'preact';
import { useContext, useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'preact/hooks';
import styles from './TextStampOverlay.module.css';
import xIcon from '../icons/x.svg';
import plusIcon from '../icons/plus.svg';
import stampTextIcon from '../icons/stamp-text.svg';
import { useStampSettings } from '../context/StampSettingsContext.jsx';

const stopPropagation = (e) => e.stopPropagation();

const MIN_WIDTH = 60;
const MIN_HEIGHT = 40;
const MIN_FONT_SIZE = 5;
const MAX_FONT_SIZE = 50;
const MOVE_LIMIT_LEFT = 6;
const MOVE_LIMIT_TOP = 21;
const MOVE_LIMIT_BOTTOM = 6;

const clamp = (value, min, max) => Math.min(Math.max(min, value), max);
const clampFontSize = (size) => clamp(size, MIN_FONT_SIZE, MAX_FONT_SIZE);

const hexToRgba = (hex, alpha) => {
    const value = hex.replace('#', '');
    const full = value.length === 3
        ? value.split('').map((c) => c + c).join('')
        : value;
    const num = parseInt(full, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
};

const HANDLE_DIRS = ['e', 'w'];

const TextStampOverlayContext = createContext(null);

export const useTextStampOverlay = () => {
    const context = useContext(TextStampOverlayContext);
    if (!context) {
        throw new Error('useTextStampOverlay must be used within TextStampOverlayProvider');
    }
    return context;
};

const createBox = (id) => {
    const width = 360;
    const height = MIN_HEIGHT;
    return {
        id,
        text: '',
        x: Math.max(0, Math.round((window.innerWidth - width) / 2)),
        y: Math.max(0, Math.round((window.innerHeight - height) / 2)),
        width,
        height,
        fontSize: 12,
    };
};

export const TextStampOverlayProvider = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [textareas, setTextareas] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const textareasRef = useRef([]);
    const nextIdRef = useRef(1);
    const keyDownHandlerRef = useRef(null);
    const [autoDrag, setAutoDrag] = useState(false);

    const commitTextareas = useCallback((next) => {
        textareasRef.current = next;
        setTextareas(next);
    }, []);

    const hideTextStampOverlay = useCallback(() => setVisible(false), []);

    const addTextarea = useCallback(() => {
        const box = createBox(nextIdRef.current++);
        commitTextareas([...textareasRef.current, box]);
        setSelectedId(box.id);
        setAutoDrag(true);
    }, [commitTextareas]);

    const showTextStampOverlay = useCallback(() => {
        setVisible(true);
        setAutoDrag(true);
        if (textareasRef.current.length === 0) {
            addTextarea();
        }
    }, [addTextarea]);

    const removeTextarea = useCallback((id) => {
        const next = textareasRef.current.filter((b) => b.id !== id);
        commitTextareas(next);
        setSelectedId((sel) => (sel === id ? null : sel));
        if (next.length === 0) {
            setVisible(false);
        }
    }, [commitTextareas]);

    const updateTextarea = useCallback((id, patch) => {
        commitTextareas(textareasRef.current.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    }, [commitTextareas]);

    const select = useCallback((id) => setSelectedId(id), []);

    const registerTextStampKeyDownHandler = useCallback((handler) => {
        keyDownHandlerRef.current = handler;
        return () => {
            keyDownHandlerRef.current = null;
        };
    }, []);

    const callTextStampKeyDownHandler = useCallback((e) => {
        keyDownHandlerRef.current?.(e);
    }, []);

    const contextValue = useMemo(() => ({
        textStampOverlayVisible: visible,
        showTextStampOverlay,
        hideTextStampOverlay,
        textareas,
        selectedId,
        addTextarea,
        removeTextarea,
        updateTextarea,
        select,
        registerTextStampKeyDownHandler,
        callTextStampKeyDownHandler,
        autoDrag,
        setAutoDrag,
    }), [
        visible,
        textareas,
        selectedId,
        showTextStampOverlay,
        hideTextStampOverlay,
        addTextarea,
        removeTextarea,
        updateTextarea,
        select,
        registerTextStampKeyDownHandler,
        callTextStampKeyDownHandler,
        autoDrag,
        setAutoDrag,
    ]);

    return (
        <TextStampOverlayContext.Provider value={contextValue}>
            {children}
        </TextStampOverlayContext.Provider>
    );
};

const TextStampBox = ({ box, selected, singleColor, onSelect, onUpdate, onRemove, registerTextarea, autoDrag }) => {
    const boxRef = useRef(null);
    const textareaRef = useRef(null);
    const handleRefs = useRef([]);

    useLayoutEffect(() => {
        const boxEl = boxRef.current;
        const el = textareaRef.current;
        if (!boxEl || !el) return;
        const prevFlex = el.style.flex;
        const prevHeight = el.style.height;
        el.style.flex = 'none';
        el.style.height = '0px';
        const contentHeight = el.scrollHeight;
        el.style.flex = prevFlex;
        el.style.height = prevHeight;
        const target = Math.round(boxEl.getBoundingClientRect().height - el.clientHeight + contentHeight);
        if (target !== box.height) {
            onUpdate(box.id, { height: target });
        }
    }, [box.text, box.fontSize, box.width, box.id, onUpdate]);

    const touchPreventDefaultHandler = (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
        }
    };

    useEffect(() => {
        handleRefs.current.forEach((el) => {
            el.addEventListener("touchstart", touchPreventDefaultHandler, { passive: false });
        });
        return () => {
            handleRefs.current.forEach((el) => {
                el?.removeEventListener("touchstart", touchPreventDefaultHandler);
            })
        };
    }, []);

    useEffect(() => {
        if (!selected) {
            textareaRef.current.blur();
        }
    }, [selected]);

    const startDrag = useCallback((e) => {
        e?.preventDefault();
        e?.stopPropagation();
        onSelect();
        const origX = box.x;
        const origY = box.y;
        const startX = e?.clientX ?? origX + 10;
        const startY = e?.clientY ?? origY + 10;
        const maxX = Math.max(0, window.innerWidth - box.width);
        const maxY = Math.max(0, window.innerHeight - box.height + MOVE_LIMIT_BOTTOM);
        const el = e?.currentTarget ?? document;
        let hasAPointerCaptured = false;
        if (e?.pointerId >= 0) {
            el.setPointerCapture(e.pointerId);
            hasAPointerCaptured = true;
        }
        const onMove = (ev) => {
            onUpdate(box.id, {
                x: clamp(origX + ev.clientX - startX, -MOVE_LIMIT_LEFT, maxX),
                y: clamp(origY + ev.clientY - startY, -MOVE_LIMIT_TOP, maxY),
            });
        };
        const cleanup = (ev) => {
            document.removeEventListener("touchmove", touchPreventDefaultHandler);
            if (hasAPointerCaptured) {
                el.releasePointerCapture(ev.pointerId);
            }
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', cleanup);
            el.removeEventListener('pointercancel', cleanup);
        };
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', cleanup);
        el.addEventListener('pointercancel', cleanup);
        document.addEventListener("touchmove", touchPreventDefaultHandler, {passive: false});
    }, [box, onSelect, onUpdate]);

    useEffect(() => {
        if (autoDrag) {
            console.log("**** TextStampBox autoDrag useEffect");
            startDrag();
            textareaRef.current.focus();
        }
    }, [autoDrag, startDrag]);

    const startResize = useCallback((e, dir) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const orig = { x: box.x, y: box.y, width: box.width, height: box.height };
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const patch = {};
            if (dir.includes('e')) patch.width = Math.max(MIN_WIDTH, orig.width + dx);
            if (dir.includes('w')) {
                const width = Math.max(MIN_WIDTH, orig.width - dx);
                patch.width = width;
                patch.x = orig.x + (orig.width - width);
            }
            onUpdate(box.id, patch);
        };
        const cleanup = (ev) => {
            el.releasePointerCapture(ev.pointerId);
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', cleanup);
            el.removeEventListener('pointercancel', cleanup);
        };
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', cleanup);
        el.addEventListener('pointercancel', cleanup);
    }, [box, onUpdate]);

    const handleWheel = useCallback((e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        e.stopPropagation();
        onUpdate(box.id, { fontSize: clampFontSize(box.fontSize + (e.deltaY < 0 ? 1 : -1)) });
    }, [box, onUpdate]);

    return (
        <div
            ref={boxRef}
            class={`${styles.box} ${selected ? styles.selected : ''}`}
            style={{
                left: `${box.x}px`,
                top: `${box.y}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
                borderColor: selected ? singleColor : undefined,
            }}
            onClick={stopPropagation}
            onPointerDown={stopPropagation}
            onWheel={handleWheel}
        >
            <div
                class={styles.titlebar}
                style={{ backgroundColor: hexToRgba(singleColor, 0.2) }}
                ref={(el) => {
                    handleRefs.current.push(el);
                }}
                onPointerDown={startDrag}
                onMouseOver={stopPropagation}
            >
                <input
                    class={styles.sizeSlider}
                    type="range"
                    min={MIN_FONT_SIZE}
                    max={MAX_FONT_SIZE}
                    value={box.fontSize}
                    title="Font size"
                    onPointerDown={stopPropagation}
                    onMouseOver={stopPropagation}
                    onInput={(e) => onUpdate(box.id, { fontSize: parseInt(e.currentTarget.value) })}
                />
                <span class={styles.sizeReadout}>{box.fontSize}</span>
                <button
                    class={styles.deleteBtn}
                    title="Delete textarea"
                    onPointerDown={stopPropagation}
                    onMouseOver={stopPropagation}
                    onTouchStart={stopPropagation}
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                >
                    <span dangerouslySetInnerHTML={{ __html: xIcon }} />
                </button>
            </div>
            <textarea
                ref={(el) => {
                    textareaRef.current = el;
                    registerTextarea?.(el);
                }}
                id={`textOverlayTextArea${box.id}`}
                class={styles.textarea}
                value={box.text}
                style={{
                    fontSize: `${box.fontSize}px`,
                    color: singleColor,
                    caretColor: singleColor,
                    '--ts-placeholder-color': singleColor,
                }}
                placeholder="Type here..."
                onInput={(e) => onUpdate(box.id, { text: e.currentTarget.value })}
                onFocus={onSelect}
                onKeyUp={stopPropagation}
                onClick={stopPropagation}
            />
            <div
                class={styles.moveStrip}
                style={{ backgroundColor: hexToRgba(singleColor, 0.2) }}
                ref={(el) => {
                    handleRefs.current.push(el);
                }}
                onPointerDown={startDrag}
                onMouseOver={stopPropagation}
            />
            <div
                class={styles.bottomMoveStrip}
                ref={(el) => {
                    handleRefs.current.push(el);
                }}
                onPointerDown={startDrag}
                onMouseOver={stopPropagation}
            />
            {HANDLE_DIRS.map((dir) => (
                <div
                    key={dir}
                    ref={(el) => {
                        handleRefs.current.push(el);
                    }}
                    class={`${styles.handle} ${styles[`handle${dir.toUpperCase()}`]}`}
                    onPointerDown={(e) => startResize(e, dir)}
                    onMouseOver={stopPropagation}
                />
            ))}
        </div>
    );
};

export const TextStampOverlay = () => {
    const {
        textStampOverlayVisible,
        hideTextStampOverlay,
        textareas,
        selectedId,
        addTextarea,
        removeTextarea,
        updateTextarea,
        select,
        registerTextStampKeyDownHandler,
        autoDrag,
        setAutoDrag,
    } = useTextStampOverlay();
    const { singleColor } = useStampSettings();

    const adjustSelectedFontSize = useCallback((delta) => {
        const target = selectedId != null
            ? textareas.find((b) => b.id === selectedId)
            : textareas[0];
        if (target) {
            updateTextarea(target.id, { fontSize: clampFontSize(target.fontSize + delta) });
        }
    }, [selectedId, textareas, updateTextarea]);

    const textareaRefs = useRef({});

    useEffect(() => {
        return () => {
            console.log("**** setting autoDrag to false");
            setAutoDrag(false);
        }
    }, [autoDrag, setAutoDrag]);

    function getActualLineHeight(el) {
        const savedText = el.value;
        const savedHeight = el.style.height;
        const savedFlex = el.style.flex;

        el.value = "a";
        el.style.height = '0px';
        el.style.flex = "none";
        const height1 = el.scrollHeight;

        el.value += "\na".repeat(10);
        const height2 = el.scrollHeight;

        el.value = savedText;
        el.style.height = savedHeight;
        el.style.flex = savedFlex;
        return (height2 - height1)/10;
    }

    const handleStampText = useCallback(() => {
        textareas.forEach((box) => {
            const el = textareaRefs.current[box.id];
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            const padLeft = parseFloat(cs.paddingLeft);
            const padTop = parseFloat(cs.paddingTop);
            const padRight = parseFloat(cs.paddingRight);

            const atd = StampLib.getAtd();
            if (!atd?.bcanvas) {
                return;
            }

            const canvasRect = atd.bcanvas.getBoundingClientRect();
            const zoomRatio = atd.bcanvas.clientHeight / atd.inkHeight;

            const maxWidth = (rect.width - padLeft - padRight) / zoomRatio;
            const lineHeight = getActualLineHeight(el) / zoomRatio;
            const pos = {
                x: (rect.left + padLeft - canvasRect.left) / zoomRatio,
                y: (rect.top + padTop - canvasRect.top) / zoomRatio,
            };
            const options = {
                color: singleColor
            };
            console.log({
                text: box.text,
                fontSize: box.fontSize,
                zoomRatio: zoomRatio,
                pos: pos,
                width: rect.width - padLeft - padRight,
                lineHeight: lineHeight,
            });
            StampLib.writeMonoText(box.text, pos, box.fontSize, lineHeight, maxWidth, options)
            hideTextStampOverlay();
        });
    }, [textareas]);

    const handleKeyDown = useCallback((e) => {
        if (e.metaKey || e.altKey) return;
        if (e.ctrlKey) {
            if (e.key === '+' || e.key === '=' || e.key === '-') {
                e.preventDefault();
                adjustSelectedFontSize(e.key === '-' ? -1 : 1);
            }
            return;
        }
        if (e.target.nodeName === 'TEXTAREA' || (e.target.nodeName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'color')) {
            if (e.key === 'Escape') {
                e.preventDefault();
                hideTextStampOverlay();
            }
            return;
        }
        switch (e.key) {
            case 'Escape':
                hideTextStampOverlay();
                break;
            case 'Delete':
                if (selectedId != null) {
                    removeTextarea(selectedId);
                }
                break;
        }
    }, [adjustSelectedFontSize, hideTextStampOverlay, removeTextarea, selectedId]);

    useEffect(() => {
        return registerTextStampKeyDownHandler(handleKeyDown);
    }, [registerTextStampKeyDownHandler, handleKeyDown]);

    useEffect(() => {
        if (!textStampOverlayVisible) return;
        const last = textareas[textareas.length - 1];
        const el = last && textareaRefs.current[last.id];
        if (el) {
            el.focus();
            el.select();
        }
    }, [textStampOverlayVisible]);

    return (
        <div
            class={styles.overlay}
            style={{ display: textStampOverlayVisible ? 'block' : 'none' }}
            onAuxClick={(e) => {
                if (e.button === 1) {
                    // middle mouse button
                    e.stopPropagation();
                    handleStampText();
                } else if (e.button === 2) {
                    // right click
                    e.stopPropagation();
                    hideTextStampOverlay();
                }
            }}
        >
            <div class={styles.overlayBtns}>
                <button
                    class={styles.overlayBtn}
                    onMouseOver={stopPropagation}
                    onClick={(e) => { e.stopPropagation(); addTextarea(); }}
                >
                    <span dangerouslySetInnerHTML={{ __html: plusIcon }} />
                    Add text box
                </button>
                <button
                    class={styles.overlayBtn}
                    onMouseOver={stopPropagation}
                    onClick={(e) => { e.stopPropagation(); handleStampText(); }}
                >
                    <span dangerouslySetInnerHTML={{ __html: stampTextIcon }} />
                    Stamp text
                </button>
                <button
                    class={styles.overlayBtn}
                    onMouseOver={stopPropagation}
                    onClick={(e) => { e.stopPropagation(); hideTextStampOverlay(); }}
                >
                    <span dangerouslySetInnerHTML={{ __html: xIcon }} />
                    Cancel
                </button>
            </div>
            {textareas.map((box) => (
                <TextStampBox
                    key={box.id}
                    box={box}
                    selected={box.id === selectedId}
                    singleColor={singleColor}
                    registerTextarea={(el) => { textareaRefs.current[box.id] = el; }}
                    onSelect={() => select(box.id)}
                    onUpdate={updateTextarea}
                    onRemove={() => removeTextarea(box.id)}
                    autoDrag={autoDrag && box.id === textareas[textareas.length - 1].id}
                />
            ))}
        </div>
    );
};
