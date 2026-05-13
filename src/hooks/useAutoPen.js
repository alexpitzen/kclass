import { usePageChange } from './usePageChange.js';
import { updateStampLibFromPenSettings } from '../context/PenSettingsContext.jsx';

export const useAutoPen = () => {
    usePageChange({
        enabled: true,
        onPageEnter: () => {
            setTimeout(() => {
                const atd = StampLib.getAtd();
                if (atd?.drawingMode) {
                    updateStampLibFromPenSettings();
                }
            }, 300);
        },
    });
};
