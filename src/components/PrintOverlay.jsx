import { createContext } from 'preact';
import { useContext, useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import { getStampSize, getSingleColor, getStampColorType, getRainbowSpeed } from './ImageStampTab.jsx';

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
        scale: 0.25,
        stampColorType: "Unchanged",
        rainbowSpeed: 1,
    });

    const showStampPreview = useCallback((stamp, stampDimensions, maxScaleFactor, scale, borderColor, svg, initialPos, stampColorType, rainbowSpeed) => {
        setState({
            visible: true,
            mode: 'stamp',
            stampData: { stamp, maxScaleFactor },
            previewStyle: {
                height: `${stampDimensions.height * scale}px`,
                width: `${stampDimensions.width * scale}px`,
                'border-color': borderColor,
                left: initialPos ? `${initialPos.x}px` : '0px',
                top: initialPos ? `${initialPos.y}px` : '0px',
            },
            previewContent: svg,
            textValue: '',
            color: borderColor,
            scale: scale,
            stampColorType: stampColorType,
            rainbowSpeed: rainbowSpeed,
        });
    }, []);

    const showTextPreview = useCallback((text, writeDimensions, scale, borderColor, initialPos) => {
        setState({
            visible: true,
            mode: 'text',
            stampData: null,
            previewStyle: {
                height: `${writeDimensions.height}px`,
                width: `${writeDimensions.width}px`,
                'border-color': borderColor,
                left: initialPos ? `${initialPos.x}px` : '0px',
                top: initialPos ? `${initialPos.y}px` : '0px',
            },
            previewContent: text,
            textValue: text,
            color: borderColor,
            scale: scale,
            stampColorType: "Unchanged",
            rainbowSpeed: 1,
        });
    }, []);

     const hidePreview = useCallback(() => {
         setState(prev => ({ ...prev, visible: false }));
     }, []);

     const updatePreview = useCallback(() => {
         setState(prev => {
             if (!prev.visible) return prev;

             const currentSize = getStampSize();
             const currentColor = getSingleColor();
             const currentStampColorType = getStampColorType();
             const currentRainbowSpeed = getRainbowSpeed();

             const newPreviewStyle = { ...prev.previewStyle };
             newPreviewStyle['border-color'] = currentColor;

              if (prev.mode === 'stamp' && prev.stampData) {
                  const stampDimensions = prev.stampData.stamp._cachedDimensions || 
                      StampLib.getWriteStampDimensions(prev.stampData.stamp, 1);
                  const currentScale = (currentSize / 100) * prev.stampData.maxScaleFactor;
                  newPreviewStyle.height = `${stampDimensions.height * currentScale}px`;
                  newPreviewStyle.width = `${stampDimensions.width * currentScale}px`;
              } else if (prev.mode === 'text' && prev.textValue) {
                  const writeDimensions = StampLib.getWriteAllDimensions(prev.textValue, currentSize / 100);
                  newPreviewStyle.height = `${writeDimensions.height}px`;
                  newPreviewStyle.width = `${writeDimensions.width}px`;
              }

             return {
                 ...prev,
                 previewStyle: newPreviewStyle,
                 color: currentColor,
                 scale: prev.mode === 'stamp' && prev.stampData 
                     ? (currentSize / 100) * prev.stampData.maxScaleFactor
                     : (currentSize / 100),
                 stampColorType: currentStampColorType,
                 rainbowSpeed: currentRainbowSpeed,
             };
         });
     }, []);

     const contextValue = useMemo(() => ({
         state,
         showStampPreview,
         showTextPreview,
         hidePreview,
         updatePreview,
     }), [state, showStampPreview, showTextPreview, hidePreview, updatePreview]);

    return (
        <PrintOverlayContext.Provider value={contextValue}>
            {children}
        </PrintOverlayContext.Provider>
    );
};

export const PrintOverlay = () => {
    const { state, hidePreview } = usePrintOverlay();
    const { visible, mode, previewStyle, previewContent, stampData, textValue, color, scale, stampColorType, rainbowSpeed } = state;
    const overlayRef = useRef(null);
    const previewRef = useRef(null);

    useEffect(() => {
        if (!visible || !previewRef.current) return;

        if (mode === 'stamp' && stampData) {
            const stampDimensions = stampData.stamp._cachedDimensions || StampLib.getWriteStampDimensions(stampData.stamp, 1);
            previewRef.current.stampDimensions = stampDimensions;
            previewRef.current.maxScaleFactor = stampData.maxScaleFactor;
        } else if (mode === 'text') {
            previewRef.current.textValue = textValue;
        }
    }, [visible, mode, stampData, textValue]);

    useEffect(() => {
        if (!visible) return;

        const overlay = overlayRef.current;
        const preview = previewRef.current;
        if (!overlay || !preview) return;

        const handlePMove = (e) => {
            preview.animate({
                left: `${e.clientX}px`,
                top: `${e.clientY}px`,
            }, { duration: 100, fill: "forwards" });
        };

         const handleClick = (e) => {
             const atd = StampLib.getAtd();
             if (!atd?.bcanvas) {
                 hidePreview();
                 return;
             }

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
             const currentColor = getSingleColor();
             const currentStampColorType = getStampColorType();
             const currentRainbowSpeed = getRainbowSpeed();

             if (mode === 'stamp' && stampData) {
                 const currentSize = getStampSize();
                 const currentScale = (currentSize / 100) * stampData.maxScaleFactor;
                 const options = {
                     color: currentColor,
                     rainbow: currentStampColorType === 'Rainbow' || currentStampColorType === 'Rainbow Fill',
                     rainbowSpeed: currentRainbowSpeed || 1,
                     usePredefinedColor: currentStampColorType === 'Unchanged',
                     rainbowFill: currentStampColorType === 'Rainbow Fill',
                 };
                 StampLib.writeStampAt(stampData.stamp, position, currentScale, options);
             } else if (mode === 'text') {
                 const currentSize = getStampSize();
                 const currentScale = currentSize / 100;
                 StampLib.writeAllAt(textValue, position, currentScale, { color: currentColor });
             }
             hidePreview();
         };

        overlay.addEventListener('pointermove', handlePMove);
        overlay.addEventListener('click', handleClick);

        return () => {
            overlay.removeEventListener('pointermove', handlePMove);
            overlay.removeEventListener('click', handleClick);
        };
    }, [visible, mode, stampData, textValue, color, hidePreview, scale, stampColorType, rainbowSpeed]);

    if (!visible) return null;

    return (
        <div 
            ref={overlayRef} 
            class="printoverlay" 
            style={{ display: 'unset' }}
            onMouseOver={(e) => e.stopPropagation()}
        >
            <div
                ref={previewRef}
                class={mode === 'stamp' ? 'stampPrintPreviewDiv' : 'printPreviewDiv'}
                style={previewStyle}
                dangerouslySetInnerHTML={mode === 'stamp' ? { __html: previewContent } : undefined}
            />
        </div>
    );
};
