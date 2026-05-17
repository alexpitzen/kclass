import { createContext } from 'preact';
import { useContext, useState, useMemo, useCallback, useEffect } from 'preact/hooks';
import { setStampLibPenSettings } from '../helpers/penPresets.js';
import { getSingleColor } from '../context/StampSettingsContext.jsx';

const PenSettingsContext = createContext(null);

const penWidthRef = { current: 2 };
const penAlphaRef = { current: 1 };
const penModeRef = { current: 'pen' };
const eraserEnabledRef = { current: false };

export const getPenWidth = () => penWidthRef.current;
export const getPenAlpha = () => penAlphaRef.current;
export const getPenMode = () => penModeRef.current;
export const getEraserEnabled = () => eraserEnabledRef.current;

export const updateStampLibFromPenSettings = () => {
    const color = getSingleColor();
    const width = penWidthRef.current;
    const alpha = penAlphaRef.current;
    const eraserEnabled = eraserEnabledRef.current;

    if (!eraserEnabled) {
        setStampLibPenSettings(color, width, alpha);
    }
};

export const usePenSettings = () => {
    const context = useContext(PenSettingsContext);
    if (!context) {
        throw new Error('usePenSettings must be used within PenSettingsProvider');
    }
    return context;
};

export const PenSettingsProvider = ({ children }) => {
    const [penWidth, setPenWidth] = useState(penWidthRef.current);
    const [penAlpha, setPenAlpha] = useState(penAlphaRef.current);
    const [penMode, setPenMode] = useState(penModeRef.current);
    const [eraserEnabled, setEraserEnabled] = useState(eraserEnabledRef.current);

    useEffect(() => {
        penWidthRef.current = penWidth;
        penAlphaRef.current = penAlpha;
        penModeRef.current = penMode;
        eraserEnabledRef.current = eraserEnabled;
    }, [penWidth, penAlpha, penMode, eraserEnabled]);

    const handleUnlock = useCallback(() => {
        StampLib.unlockPage();
    }, []);

    const contextValue = useMemo(() => ({
        penWidth,
        setPenWidth,
        penAlpha,
        setPenAlpha,
        penMode,
        setPenMode,
        eraserEnabled,
        setEraserEnabled,
        handleUnlock,
    }), [penWidth, penAlpha, penMode, eraserEnabled, handleUnlock]);

    return (
        <PenSettingsContext.Provider value={contextValue}>
            {children}
        </PenSettingsContext.Provider>
    );
};
