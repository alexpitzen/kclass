import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { usePageChange } from './usePageChange.js';

export const useHDMode = () => {
    const [enabled, setEnabled] = useState(false);

    const initHD = useCallback(() => {
        const penType = document.querySelector('input[name="penType"]:checked')?.value || 'pen';
        const pencolorbtn = document.querySelector('.pencolorbtn');

        if (penType !== 'eraser' && pencolorbtn) {
            const penSettings = {
                pen: { width: 2, alpha: 255 },
                'thick-highlighter': { width: 25, alpha: 50 },
                'thin-highlighter': { width: 5, alpha: 50 },
            };
            StampLib.setPenSettings({
                color: pencolorbtn.value,
                ...penSettings[penType],
            });
        }

        document.querySelectorAll('.content-scroll-container .content-bg .content-detail').forEach(detail => {
            detail.style.minWidth = '372px';
            detail.style.width = '372px';
        });
        document.querySelectorAll('.worksheet-group').forEach(i => i.style.width = '410px');
        document.querySelectorAll('.worksheet-group-page').forEach(i => i.style.maxWidth = '410px');
        document.querySelectorAll('.ATD0020P-worksheet-container img.worksheet-img').forEach(i => {
            i.style.height = '612px';
            i.style.width = '370px';
        });
        document.querySelectorAll('.ATD0020P-worksheet-container canvas').forEach(i => {
            i.style.height = '612px';
            i.style.width = '370px';
        });
    }, []);

    const makeHD = useCallback(() => {
        if (enabled) StampLib.makeHD();
    }, [enabled]);

    const makeSD = useCallback(() => {
        StampLib.makeSD();
    }, []);

    const { disable } = usePageChange({
        onEnable: initHD,
        onPageEnter: makeHD,
        onPageLeave: makeSD,
        onDisable: makeSD,
    });

    useEffect(() => {
        if (enabled) {
            const appRoot = document.querySelector('app-root');
            if (appRoot && document.querySelector('app-atd0020p')) {
                initHD();
                const selectedPage = document.querySelector('.ATD0020P-worksheet-container.selected');
                if (selectedPage) {
                    makeHD(selectedPage);
                }
            }
        } else {
            disable();
        }
    }, [enabled, initHD, makeHD, makeSD, disable]);

    return [enabled, setEnabled];
};

export const useHDModeExposed = () => {
    const [enabled, setEnabled] = useHDMode();
    
    useEffect(() => {
        window.__hdModeSetEnabled = setEnabled;
        return () => {
            window.__hdModeSetEnabled = null;
        };
    }, [setEnabled]);
    
    return [enabled, setEnabled];
};
