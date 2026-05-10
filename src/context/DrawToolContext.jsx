import { createContext } from 'preact';
import { useContext, useState, useMemo, useCallback } from 'preact/hooks';

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

    const showDrawTool = useCallback(() => setDrawToolVisible(true), []);
    const hideDrawTool = useCallback(() => setDrawToolVisible(false), []);

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
    }), [
        activeTab,
        drawToolVisible,
        showDrawTool,
        hideDrawTool,
        handleUndo,
        handleClear,
    ]);

    return (
        <DrawToolContext.Provider value={contextValue}>
            {children}
        </DrawToolContext.Provider>
    );
};
