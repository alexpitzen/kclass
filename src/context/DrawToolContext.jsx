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
    { id: 'settings', label: 'Settings' },
];

export const DrawToolProvider = ({ children }) => {
    const [activeTab, setActiveTab] = useState('image');
    const [drawToolVisible, setDrawToolVisible] = useState(false);
    const keyDownHandlersRef = useRef({});

    const showDrawTool = useCallback(() => {
        setDrawToolVisible(true);
        updateStampLibFromPenSettings();
    }, []);
    const hideDrawTool = useCallback(() => setDrawToolVisible(false), []);

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
        handleUndo,
        handleClear,
        registerKeyDownHandler,
        callKeyDownHandler,
    }), [
        activeTab,
        drawToolVisible,
        showDrawTool,
        hideDrawTool,
        handleUndo,
        handleClear,
        registerKeyDownHandler,
        callKeyDownHandler,
    ]);

    return (
        <DrawToolContext.Provider value={contextValue}>
            {children}
        </DrawToolContext.Provider>
    );
};
