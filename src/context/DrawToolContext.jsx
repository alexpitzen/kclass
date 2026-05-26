import { createContext } from 'preact';
import { useContext, useState, useMemo, useRef, useCallback } from 'preact/hooks';
import { updateStampLibFromPenSettings } from '../context/PenSettingsContext.jsx';

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
];

export const DrawToolProvider = ({ children }) => {
    const [activeTab, setActiveTab] = useState('image');
    const [drawToolVisible, setDrawToolVisible] = useState(false);
    const [penOverlayVisible, setPenOverlayVisible] = useState(false);
    const [textModeOnOpen, setTextModeOnOpen] = useState(false);
    const keyDownHandlersRef = useRef({});
    const penOverlayKeyDownRef = useRef(null);

    const showDrawTool = useCallback(() => {
        setDrawToolVisible(true);
        updateStampLibFromPenSettings();
    }, []);
    const hideDrawTool = useCallback(() => setDrawToolVisible(false), []);
    const showPenOverlay = useCallback(() => {
        setPenOverlayVisible(true);
        updateStampLibFromPenSettings();
    }, []);
    const hidePenOverlay = useCallback(() => setPenOverlayVisible(false), []);
    const requestTextMode = useCallback(() => setTextModeOnOpen(true), []);
    const consumeTextMode = useCallback(() => setTextModeOnOpen(false), []);

    const registerKeyDownHandler = useCallback((tabType, handler) => {
        keyDownHandlersRef.current[tabType] = handler;
        return () => {
            delete keyDownHandlersRef.current[tabType];
        };
    }, []);

    const callKeyDownHandler = useCallback((e) => {
        const handler = keyDownHandlersRef.current[activeTab];
        handler?.(e);
    }, [activeTab]);

    const registerPenOverlayKeyDownHandler = useCallback((handler) => {
        penOverlayKeyDownRef.current = handler;
        return () => {
            penOverlayKeyDownRef.current = null;
        };
    }, []);

    const callPenOverlayKeyDownHandler = useCallback((e) => {
        penOverlayKeyDownRef.current?.(e);
    }, []);

    const handleUndo = useCallback(() => {
        StampLib.undoLastWriteAll();
    }, []);

    const handleClear = useCallback(() => {
        StampLib.clearPage();
    }, []);

    const contextValue = useMemo(() => ({
        activeTab,
        setActiveTab,
        drawToolTabs: TAB_IDS,
        drawToolVisible,
        showDrawTool,
        hideDrawTool,
        penOverlayVisible,
        showPenOverlay,
        hidePenOverlay,
        textModeOnOpen,
        requestTextMode,
        consumeTextMode,
        handleUndo,
        handleClear,
        registerKeyDownHandler,
        callKeyDownHandler,
        registerPenOverlayKeyDownHandler,
        callPenOverlayKeyDownHandler,
    }), [
        activeTab,
        drawToolVisible,
        showDrawTool,
        hideDrawTool,
        penOverlayVisible,
        showPenOverlay,
        hidePenOverlay,
        textModeOnOpen,
        requestTextMode,
        consumeTextMode,
        handleUndo,
        handleClear,
        registerKeyDownHandler,
        callKeyDownHandler,
        registerPenOverlayKeyDownHandler,
        callPenOverlayKeyDownHandler,
    ]);

    return (
        <DrawToolContext.Provider value={contextValue}>
            {children}
        </DrawToolContext.Provider>
    );
};
