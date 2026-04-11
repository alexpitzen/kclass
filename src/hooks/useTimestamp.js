import { useState, useEffect, useCallback } from 'preact/hooks';
import { usePageChange } from './usePageChange.js';
import { getGradingStartTime, getStudyFinishTime } from '../helpers/ng.js';

export const useTimestampDisplay = (enabled) => {
    const [timestamp, setTimestamp] = useState('');
    const [colorClass, setColorClass] = useState('');

    const clearPageTimestamp = useCallback((page) => {
        if (page) page.style.outlineColor = '';
    }, []);

    const updateTimestamp = useCallback((page) => {
        const is = StampLib?.getStudentDrawing();
        if (is) {
            if (is.length === 0) {
                setTimestamp('None');
                setColorClass('red');
                if (page) page.style.outlineColor = 'red';
                return;
            }
            try {
                const lastStroke = new Date(is[is.length - 1].cs[0].t);
                setTimestamp(`Last change:<br>${lastStroke.toLocaleString()}`);

                const activePageEl = document.querySelector('.worksheet-navigator-page.active .text.disabled');
                if (activePageEl) {
                    setColorClass('');
                    if (page) page.style.outlineColor = '';
                    return;
                }

                const lastGraded = getGradingStartTime();
                const submitted = getStudyFinishTime();
                if (lastGraded && submitted) {
                    if (lastGraded > submitted) {
                        setColorClass('');
                        if (page) page.style.outlineColor = '';
                    } else if (lastStroke > lastGraded) {
                        setColorClass('green');
                        if (page) page.style.outlineColor = 'lightgreen';
                    } else {
                        setColorClass('red');
                        if (page) page.style.outlineColor = 'red';
                    }
                } else {
                    setColorClass('');
                    if (page) page.style.outlineColor = '';
                }
            } catch {
                setTimestamp('');
                setColorClass('');
                if (page) page.style.outlineColor = '';
            }
        } else {
            setTimestamp('');
            setColorClass('');
            if (page) page.style.outlineColor = '';
        }
    }, []);

    const onEnable = useCallback(() => {
        if (!enabled) return;
        const activePage = document.querySelector('.ATD0020P-worksheet-container.selected');
        setTimeout(() => updateTimestamp(activePage), 100);
    }, [enabled, updateTimestamp]);

    const onPageEnter = useCallback((page) => {
        if (!enabled) return;
        setTimeout(() => updateTimestamp(page), 100);
    }, [enabled, updateTimestamp]);

    const onPageLeave = useCallback((page) => {
        clearPageTimestamp(page);
    }, [clearPageTimestamp]);

    const onDisable = useCallback((page) => {
        clearPageTimestamp(page);
        setTimestamp('');
        setColorClass('');
    }, [clearPageTimestamp]);

    usePageChange({
        enabled,
        onEnable,
        onPageEnter,
        onPageLeave,
        onDisable,
    });

    return { timestamp, colorClass };
};
