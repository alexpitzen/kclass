import { createContext } from 'preact';
import { useContext, useState, useCallback } from 'preact/hooks';

const AppContext = createContext(null);

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [drawTabOpen, setDrawTabOpen] = useState(false);
    const [timestampEnabled, setTimestampEnabled] = useState(true);
    const [hdModeEnabled, setHdModeEnabled] = useState(false);
    const [keyboardModeEnabled, setKeyboardModeEnabled] = useState(false);

    const hideDrawTab = useCallback(() => setDrawTabOpen(false), []);
    const showDrawTab = useCallback(() => setDrawTabOpen(true), []);
    const toggleDrawTab = useCallback(() => setDrawTabOpen(prev => !prev), []);

    const value = {
        drawTabOpen,
        setDrawTabOpen,
        hideDrawTab,
        showDrawTab,
        toggleDrawTab,
        timestampEnabled,
        setTimestampEnabled,
        hdModeEnabled,
        setHdModeEnabled,
        keyboardModeEnabled,
        setKeyboardModeEnabled,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
