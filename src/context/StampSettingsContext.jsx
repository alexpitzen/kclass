import { createContext } from 'preact';
import { useContext, useState, useMemo, useCallback, useEffect } from 'preact/hooks';

const stampSizeRef = { current: 25 };
const singleColorRef = { current: '#ff2200' };
const stampColorTypeRef = { current: 'Unchanged' };
const rainbowSpeedRef = { current: 100 };
const rainbowFillSpeedRef = { current: 20 };
const textStampModeActiveRef = { current: false };
const setTextStampModeActiveFnRef = { current: null };
const setStampSizeFnRef = { current: null };
export const focusTextStampTextareaFnRef = { current: null };

export const activateTextStampMode = () => {
    if (setTextStampModeActiveFnRef.current) {
        setTextStampModeActiveFnRef.current(true);
    } else {
        textStampModeActiveRef.current = true;
    }
    requestAnimationFrame(() => {
        focusTextStampTextareaFnRef.current?.();
    });
};

export const adjustStampSize = (delta) => {
    const currentSize = stampSizeRef.current;
    let newSize = currentSize + delta;
    if (newSize < 10) newSize = 10;
    if (newSize > 100) newSize = 100;
    if (newSize === currentSize) return;

    stampSizeRef.current = newSize;
    if (setStampSizeFnRef.current) {
        setStampSizeFnRef.current(newSize);
    }
};

export const getStampSize = () => stampSizeRef.current;
export const getSingleColor = () => singleColorRef.current;
export const getStampColorType = () => stampColorTypeRef.current;
export const getRainbowSpeed = () => {
    return stampColorTypeRef.current === 'Rainbow'
        ? rainbowSpeedRef.current
        : rainbowFillSpeedRef.current;
};

const StampSettingsContext = createContext(null);

export const useStampSettings = () => {
    const context = useContext(StampSettingsContext);
    if (!context) {
        throw new Error('useStampSettings must be used within StampSettingsProvider');
    }
    return context;
};

export const StampSettingsProvider = ({ children }) => {
    const [stampSize, setStampSizeState] = useState(stampSizeRef.current);
    const [stampColorType, setStampColorTypeState] = useState(stampColorTypeRef.current);
    const [rainbowSpeed, setRainbowSpeedState] = useState(rainbowSpeedRef.current);
    const [rainbowFillSpeed, setRainbowFillSpeedState] = useState(rainbowFillSpeedRef.current);
    const [singleColor, setSingleColorState] = useState(singleColorRef.current);
    const [textStampModeActive, setTextStampModeActiveState] = useState(textStampModeActiveRef.current);

    useEffect(() => {
        stampSizeRef.current = stampSize;
    }, [stampSize]);

    const setStampColorType = useCallback((val) => {
        stampColorTypeRef.current = val;
        setStampColorTypeState(val);
    }, []);

    const setRainbowSpeed = useCallback((val) => {
        rainbowSpeedRef.current = val;
        setRainbowSpeedState(val);
    }, []);

    const setRainbowFillSpeed = useCallback((val) => {
        rainbowFillSpeedRef.current = val;
        setRainbowFillSpeedState(val);
    }, []);

    const setSingleColor = useCallback((val) => {
        singleColorRef.current = val;
        setSingleColorState(val);
    }, []);

    const setTextStampModeActive = useCallback((valOrFn) => {
        const newVal = typeof valOrFn === 'function' ? valOrFn(textStampModeActiveRef.current) : valOrFn;
        textStampModeActiveRef.current = newVal;
        setTextStampModeActiveState(newVal);
    }, []);

    useEffect(() => {
        setTextStampModeActiveFnRef.current = setTextStampModeActive;
        if (textStampModeActiveRef.current && !textStampModeActive) {
            setTextStampModeActive(true);
        }
    }, [setTextStampModeActive, textStampModeActive]);

    useEffect(() => {
        setStampSizeFnRef.current = setStampSizeState;
    }, [setStampSizeState]);

    const contextValue = useMemo(() => ({
        stampSize,
        setStampSize: setStampSizeState,
        stampColorType,
        setStampColorType,
        rainbowSpeed,
        setRainbowSpeed,
        rainbowFillSpeed,
        setRainbowFillSpeed,
        singleColor,
        setSingleColor,
        textStampModeActive,
        setTextStampModeActive,
    }), [
        stampSize, stampColorType, rainbowSpeed, rainbowFillSpeed,
        singleColor, textStampModeActive,
    ]);

    return (
        <StampSettingsContext.Provider value={contextValue}>
            {children}
        </StampSettingsContext.Provider>
    );
};
