import { createContext } from 'preact';
import { useContext, useState, useMemo, useCallback, useEffect } from 'preact/hooks';
import { setStampLibPenSettings } from '../helpers/penPresets.js';
import { getSingleColor } from '../components/ImageStampTab.jsx';

const PenSettingsContext = createContext(null);

const penColorRef = { current: '#ff2200' };
const penWidthRef = { current: 2 };
const penAlphaRef = { current: 1 };
const penModeRef = { current: 'pen' };
const eraserEnabledRef = { current: false };

export const getPenColor = () => penColorRef.current;
export const getPenWidth = () => penWidthRef.current;
export const getPenAlpha = () => penAlphaRef.current;
export const getPenMode = () => penModeRef.current;
export const getEraserEnabled = () => eraserEnabledRef.current;

export const updateStampLibFromPenSettings = () => {
    const color = getSingleColor() || penColorRef.current;
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
    const [penColor, setPenColor] = useState('#ff2200');
    const [penWidth, setPenWidth] = useState(2);
    const [penAlpha, setPenAlpha] = useState(1);
    const [penMode, setPenMode] = useState('pen');
    const [eraserEnabled, setEraserEnabled] = useState(false);

    useEffect(() => {
        penColorRef.current = penColor;
    }, [penColor]);

    useEffect(() => {
        penWidthRef.current = penWidth;
    }, [penWidth]);

    useEffect(() => {
        penAlphaRef.current = penAlpha;
    }, [penAlpha]);

    useEffect(() => {
        penModeRef.current = penMode;
    }, [penMode]);

    useEffect(() => {
        eraserEnabledRef.current = eraserEnabled;
    }, [eraserEnabled]);

    const handleUnlock = useCallback(() => {
        StampLib.unlockPage();
    }, []);

    const contextValue = useMemo(() => ({
        penColor,
        setPenColor,
        penWidth,
        setPenWidth,
        penAlpha,
        setPenAlpha,
        penMode,
        setPenMode,
        eraserEnabled,
        setEraserEnabled,
        handleUnlock,
    }), [penColor, penWidth, penAlpha, penMode, eraserEnabled, handleUnlock]);

    return (
        <PenSettingsContext.Provider value={contextValue}>
            {children}
        </PenSettingsContext.Provider>
    );
};
