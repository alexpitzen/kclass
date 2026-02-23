import { usePageChange } from './usePageChange.js';

export const useAutoPen = () => {
    usePageChange({
        enabled: true,
        onPageEnter: () => {
            setTimeout(() => {
                const atd = StampLib.getAtd();
                if (atd?.drawingMode) {
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
                }
            }, 300);
        },
    });
};
