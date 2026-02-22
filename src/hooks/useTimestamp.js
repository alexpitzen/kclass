import { useState, useEffect, useCallback } from 'preact/hooks';
import { usePageChange } from './usePageChange.js';

export const useTimestampDisplay = (enabled) => {
    const [timestamp, setTimestamp] = useState('');
    const [colorClass, setColorClass] = useState('');
    const [activePage, setActivePage] = useState(null);

    const clearPageTimestamp = useCallback((page) => {
        if (page) page.style.outlineColor = '';
    }, []);

    const updateTimestamp = useCallback((page) => {
        setActivePage(page);
        const is = stamp?.getStudentDrawing();
        if (is) {
            if (is.length === 0) {
                setTimestamp('None');
                setColorClass('red');
                if (page) page.style.outlineColor = 'red';
                return;
            }
            try {
                const lastStroke = new Date(is[is.length - 1].cs[0].t);
                setTimestamp(`Last change:<br>${lastStroke.toString()}`);

                const activePageEl = document.querySelector('.worksheet-navigator-page.active .text.disabled');
                if (activePageEl) {
                    setColorClass('');
                    if (page) page.style.outlineColor = '';
                    return;
                }

                const gradingPage = window.kclass?.ng?.context?._contentsManagerService?.paging?._currentPage?.gradingWaitingSet;
                if (gradingPage?.GradingStartTime && gradingPage?.StudyFinishTime) {
                    const lastGraded = new Date(gradingPage.GradingStartTime + 'Z');
                    const submitted = new Date(gradingPage.StudyFinishTime + 'Z');
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
    }, [enabled]);

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
        onEnable,
        onPageEnter,
        onPageLeave,
        onDisable,
    });

    useEffect(() => {
        if (!enabled) {
            setTimestamp('');
            setColorClass('');
            clearPageTimestamp(activePage);
            return;
        }

        window.__timestampUpdater = { updateTimestamp };
        return () => {
            delete window.__timestampUpdater;
        };
    }, [enabled, updateTimestamp, activePage, clearPageTimestamp]);

    return { timestamp, colorClass };
};

export const enableTimestampDisplay = () => {
    window.__timestampEnabled = true;
};

export const disableTimestampDisplay = () => {
    window.__timestampEnabled = false;
};
