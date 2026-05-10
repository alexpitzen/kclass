import { createContext } from 'preact';
import { useContext, useState, useMemo, useCallback } from 'preact/hooks';

const PenSettingsContext = createContext(null);

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
