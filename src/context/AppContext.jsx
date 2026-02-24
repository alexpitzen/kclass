import { createContext } from 'preact';
import { useContext, useState, useCallback } from 'preact/hooks';

const DrawTabContext = createContext(null);
const TimestampContext = createContext(null);
const HDModeContext = createContext(null);
const KeyboardModeContext = createContext(null);

export const useDrawTab = () => useContext(DrawTabContext);
export const useTimestamp = () => useContext(TimestampContext);
export const useHDMode = () => useContext(HDModeContext);
export const useKeyboardMode = () => useContext(KeyboardModeContext);

export const DrawTabProvider = ({ children }) => {
    const [drawTabOpen, setDrawTabOpen] = useState(false);
    const hideDrawTab = useCallback(() => setDrawTabOpen(false), []);
    const showDrawTab = useCallback(() => setDrawTabOpen(true), []);
    const toggleDrawTab = useCallback(() => setDrawTabOpen(prev => !prev), []);

    return (
        <DrawTabContext.Provider value={{ drawTabOpen, setDrawTabOpen, hideDrawTab, showDrawTab, toggleDrawTab }}>
            {children}
        </DrawTabContext.Provider>
    );
};

export const TimestampProvider = ({ children }) => {
    const [timestampEnabled, setTimestampEnabled] = useState(true);
    return (
        <TimestampContext.Provider value={{ timestampEnabled, setTimestampEnabled }}>
            {children}
        </TimestampContext.Provider>
    );
};

export const HDModeProvider = ({ children }) => {
    const [hdModeEnabled, setHdModeEnabled] = useState(false);
    return (
        <HDModeContext.Provider value={{ hdModeEnabled, setHdModeEnabled }}>
            {children}
        </HDModeContext.Provider>
    );
};

export const KeyboardModeProvider = ({ children }) => {
    const [keyboardModeEnabled, setKeyboardModeEnabled] = useState(false);
    return (
        <KeyboardModeContext.Provider value={{ keyboardModeEnabled, setKeyboardModeEnabled }}>
            {children}
        </KeyboardModeContext.Provider>
    );
};

// Legacy combined provider for backwards compatibility
export const AppProvider = ({ children }) => {
    return (
        <DrawTabProvider>
            <TimestampProvider>
                <HDModeProvider>
                    <KeyboardModeProvider>
                        {children}
                    </KeyboardModeProvider>
                </HDModeProvider>
            </TimestampProvider>
        </DrawTabProvider>
    );
};
