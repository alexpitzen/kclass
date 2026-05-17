import { createContext } from 'preact';
import { useContext, useState, useCallback, useMemo } from 'preact/hooks';
import { PrintOverlayProvider } from '../components/PrintOverlay.jsx';
import { DiffViewOverlayProvider } from '../components/DiffViewOverlay.jsx';
import { HelpOverlayProvider } from '../components/HelpOverlay.jsx';
import { DrawToolProvider } from './DrawToolContext.jsx';
import { StampSettingsProvider } from './StampSettingsContext.jsx';
import { PenSettingsProvider } from './PenSettingsContext.jsx';

const TimestampContext = createContext(null);
const HDModeContext = createContext(null);
const KeyboardModeContext = createContext(null);

export const useTimestamp = () => useContext(TimestampContext);
export const useHDMode = () => useContext(HDModeContext);
export const useKeyboardMode = () => useContext(KeyboardModeContext);

export const TimestampProvider = ({ children }) => {
    const [timestampEnabled, setTimestampEnabled] = useState(true);
    const contextValue = useMemo(() => ({
        timestampEnabled,
        setTimestampEnabled,
    }), [timestampEnabled]);
    return (
        <TimestampContext.Provider value={contextValue}>
            {children}
        </TimestampContext.Provider>
    );
};

export const HDModeProvider = ({ children }) => {
    const [hdModeEnabled, setHdModeEnabled] = useState(false);
    const contextValue = useMemo(() => ({
        hdModeEnabled,
        setHdModeEnabled,
    }), [hdModeEnabled]);
    return (
        <HDModeContext.Provider value={contextValue}>
            {children}
        </HDModeContext.Provider>
    );
};

export const KeyboardModeProvider = ({ children }) => {
    const [keyboardModeEnabled, setKeyboardModeEnabled] = useState(false);
    const contextValue = useMemo(() => ({
        keyboardModeEnabled,
        setKeyboardModeEnabled,
    }), [keyboardModeEnabled]);
    return (
        <KeyboardModeContext.Provider value={contextValue}>
            {children}
        </KeyboardModeContext.Provider>
    );
};

export const AppProvider = ({ children }) => {
    return (
        <PrintOverlayProvider>
            <DiffViewOverlayProvider>
                <HelpOverlayProvider>
                    <DrawToolProvider>
                        <StampSettingsProvider>
                            <PenSettingsProvider>
                                <TimestampProvider>
                                    <HDModeProvider>
                                        <KeyboardModeProvider>
                                            {children}
                                        </KeyboardModeProvider>
                                    </HDModeProvider>
                                </TimestampProvider>
                            </PenSettingsProvider>
                        </StampSettingsProvider>
                    </DrawToolProvider>
                </HelpOverlayProvider>
            </DiffViewOverlayProvider>
        </PrintOverlayProvider>
    );
};
