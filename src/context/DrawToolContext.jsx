import { createContext } from 'preact';
import { useContext, useState, useCallback } from 'preact/hooks';

const DrawToolContext = createContext(null);

export const useDrawTool = () => {
    const context = useContext(DrawToolContext);
    if (!context) {
        throw new Error('useDrawTool must be used within DrawToolProvider');
    }
    return context;
};

const TAB_IDS = [
    { id: 'image', label: 'Image Stamps' },
    { id: 'text', label: 'Text Stamp' },
    { id: 'settings', label: 'Settings' },
];

export const DrawToolProvider = ({ children }) => {
    const [activeTab, setActiveTab] = useState('image');
    const [drawToolVisible, setDrawToolVisible] = useState(false);

    const [stampSize, setStampSize] = useState(25);
    const [stampColorType, setStampColorType] = useState('Unchanged');
    const [rainbowSpeed, setRainbowSpeed] = useState(1);
    const [rainbowFillSpeed, setRainbowFillSpeed] = useState(1);
    const [singleColor, setSingleColor] = useState('#ff2200');

    const [textStampColor, setTextStampColor] = useState('#ff2200');
    const [textStampText, setTextStampText] = useState('');

    const [penColor, setPenColor] = useState('#ff2200');
    const [penWidth, setPenWidth] = useState(2);
    const [penAlpha, setPenAlpha] = useState(1);
    const [penMode, setPenMode] = useState('pen');
    const [eraserEnabled, setEraserEnabled] = useState(false);

    const showDrawTool = useCallback(() => setDrawToolVisible(true), []);
    const hideDrawTool = useCallback(() => setDrawToolVisible(false), []);

    const handleUndo = useCallback(() => {
        StampLib.undoLastWriteAll();
    }, []);

    const handleClear = useCallback(() => {
        StampLib.clearPage();
    }, []);

    const handleUnlock = useCallback(() => {
        StampLib.unlockPage();
    }, []);

    return (
        <DrawToolContext.Provider value={{
            activeTab,
            setActiveTab,
            drawToolTabs: TAB_IDS,
            drawToolVisible,
            showDrawTool,
            hideDrawTool,

            stampSize,
            setStampSize,
            stampColorType,
            setStampColorType,
            rainbowSpeed,
            setRainbowSpeed,
            rainbowFillSpeed,
            setRainbowFillSpeed,
            singleColor,
            setSingleColor,

            textStampColor,
            setTextStampColor,
            textStampText,
            setTextStampText,

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

            handleUndo,
            handleClear,
            handleUnlock,
        }}>
            {children}
        </DrawToolContext.Provider>
    );
};