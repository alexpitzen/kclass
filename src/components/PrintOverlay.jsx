import { createContext } from 'preact';
import { useContext, useState, useEffect, useRef } from 'preact/hooks';

const PrintOverlayContext = createContext(null);

export const usePrintOverlay = () => {
    const context = useContext(PrintOverlayContext);
    if (!context) {
        throw new Error('usePrintOverlay must be used within PrintOverlayProvider');
    }
    return context;
};

export const PrintOverlayProvider = ({ children }) => {
    const [state, setState] = useState({
        visible: false,
        mode: null,
        previewStyle: {},
        previewContent: null,
        stampData: null,
        textValue: '',
        color: '#ff2200',
    });

    const showStampPreview = (stamp, stampDimensions, maxScaleFactor, scale, borderColor, svg) => {
        setState({
            visible: true,
            mode: 'stamp',
            stampData: { stamp, maxScaleFactor },
            previewStyle: {
                height: `${stampDimensions.height * scale}px`,
                width: `${stampDimensions.width * scale}px`,
                'border-color': borderColor,
            },
            previewContent: svg,
            textValue: '',
            color: borderColor,
        });
    };

    const showTextPreview = (text, writeDimensions, scale, borderColor) => {
        setState({
            visible: true,
            mode: 'text',
            stampData: null,
            previewStyle: {
                height: `${writeDimensions.height}px`,
                width: `${writeDimensions.width}px`,
                'border-color': borderColor,
            },
            previewContent: text,
            textValue: text,
            color: borderColor,
        });
    };

    const hidePreview = () => {
        setState(prev => ({ ...prev, visible: false }));
    };

    return (
        <PrintOverlayContext.Provider value={{ state, showStampPreview, showTextPreview, hidePreview }}>
            {children}
        </PrintOverlayContext.Provider>
    );
};

export const PrintOverlay = () => {
    const { state, hidePreview } = usePrintOverlay();
    const { visible, mode, previewStyle, previewContent, stampData, textValue, color } = state;
    const overlayRef = useRef(null);

    useEffect(() => {
        if (!visible) return;

        const overlay = overlayRef.current;
        if (!overlay) return;

        const handlePMove = (e) => {
            setState(prev => ({
                ...prev,
                previewStyle: { ...prev.previewStyle, left: `${e.clientX}px`, top: `${e.clientY}px` }
            }));
        };

        const handleClick = (e) => {
            const atd = StampLib.getAtd();
            if (!atd?.bcanvas) return;

            const canvasRect = atd.bcanvas.getBoundingClientRect();
            const zoomRatio = atd.bcanvas.clientHeight / atd.inkHeight;

            let x = e.clientX, y = e.clientY;
            if (e.clientX < canvasRect.left && e.clientX > canvasRect.left - 10) x = canvasRect.left;
            if (e.clientY < canvasRect.top && e.clientY > canvasRect.top - 10) y = canvasRect.top;

            if (x < canvasRect.left || y < canvasRect.top || x > canvasRect.right || y > canvasRect.bottom) {
                hidePreview();
                return;
            }

            const position = { x: (x - canvasRect.left) / zoomRatio, y: (y - canvasRect.top) / zoomRatio };

            if (mode === 'stamp' && stampData) {
                const scale = (parseInt(document.querySelector('.sizeslider')?.value || 25) / 100) * stampData.maxScaleFactor;
                const stampColorType = document.querySelector('select#stampColorType')?.value || 'Unchanged';
                const options = {
                    color,
                    rainbow: stampColorType === 'Rainbow' || stampColorType === 'Rainbow Fill',
                    rainbowSpeed: parseFloat(document.querySelector('.rainbowspeed')?.value || 1),
                    usePredefinedColor: stampColorType === 'Unchanged',
                    rainbowFill: stampColorType === 'Rainbow Fill',
                };
                StampLib.writeStampAt(stampData.stamp, position, scale, options);
            } else if (mode === 'text') {
                const scale = parseInt(document.querySelector('.sizeslider')?.value || 25) / 100;
                StampLib.writeAllAt(textValue, position, scale, { color });
            }
            hidePreview();
        };

        overlay.addEventListener('pointermove', handlePMove);
        overlay.addEventListener('click', handleClick);

        return () => {
            overlay.removeEventListener('pointermove', handlePMove);
            overlay.removeEventListener('click', handleClick);
        };
    }, [visible, mode, stampData, textValue, color, hidePreview]);

    if (!visible) return null;

    return (
        <div 
            ref={overlayRef} 
            class="printoverlay" 
            style={{ display: 'unset' }}
            onMouseOver={(e) => e.stopPropagation()}
        >
            <div
                class={mode === 'stamp' ? 'stampPrintPreviewDiv' : 'printPreviewDiv'}
                style={previewStyle}
                dangerouslySetInnerHTML={{ __html: mode === 'stamp' ? previewContent : undefined }}
            >
                {mode === 'text' ? previewContent : null}
            </div>
        </div>
    );
};
