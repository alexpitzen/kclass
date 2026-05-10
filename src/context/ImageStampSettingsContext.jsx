import { createContext } from 'preact';
import { useContext, useState, useMemo, useCallback } from 'preact/hooks';

const ImageStampSettingsContext = createContext(null);

export const useImageStampSettings = () => {
    const context = useContext(ImageStampSettingsContext);
    if (!context) {
        throw new Error('useImageStampSettings must be used within ImageStampSettingsProvider');
    }
    return context;
};

export const ImageStampSettingsProvider = ({ children }) => {
    const [imageStampSize, setImageStampSize] = useState(25);
    const [stampColorType, setStampColorType] = useState('Unchanged');
    const [rainbowSpeed, setRainbowSpeed] = useState(1);
    const [rainbowFillSpeed, setRainbowFillSpeed] = useState(1);
    const [singleColor, setSingleColor] = useState('#ff2200');
    const [activeStampTab, setActiveStampTab] = useState('');
    const [textStampModeActive, setTextStampModeActive] = useState(false);
    const [textStampText, setTextStampText] = useState('');

    const contextValue = useMemo(() => ({
        imageStampSize,
        setImageStampSize,
        stampColorType,
        setStampColorType,
        rainbowSpeed,
        setRainbowSpeed,
        rainbowFillSpeed,
        setRainbowFillSpeed,
        singleColor,
        setSingleColor,
        activeStampTab,
        setActiveStampTab,
        textStampModeActive,
        setTextStampModeActive,
        textStampText,
        setTextStampText,
    }), [
        imageStampSize,
        stampColorType,
        rainbowSpeed,
        rainbowFillSpeed,
        singleColor,
        activeStampTab,
        textStampModeActive,
        textStampText,
    ]);

    return (
        <ImageStampSettingsContext.Provider value={contextValue}>
            {children}
        </ImageStampSettingsContext.Provider>
    );
};
