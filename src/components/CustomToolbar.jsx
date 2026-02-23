import { useState, useEffect } from 'preact/hooks';
import { penIcons } from './constants.js';
import { toolbarIcons } from './constants.js';
import { goPrevCorrectionPage, goNextCorrectionPage } from '../helpers/navigation.js';
import { updatePenSettings } from '../helpers/actions.js';
import { useTimestampDisplay } from '../hooks/useTimestamp.js';
import { useApp } from '../context/AppContext.jsx';

export const CustomToolbar = () => {
    const [headerVisible, setHeaderVisible] = useState(true);
    const [shifted, setShifted] = useState(false);
    const { timestampEnabled, setTimestampEnabled } = useApp();
    const { timestamp, colorClass } = useTimestampDisplay(timestampEnabled);

    useEffect(() => {
        updatePenSettings();
    }, []);

    const toggleHeader = () => {
        const header = document.querySelector('.grading-header');
        if (!header) return;
        const isVisible = header.classList.contains('z300');
        if (isVisible) {
            header.classList.remove('z300');
        } else {
            header.classList.add('z300');
        }
        setHeaderVisible(!isVisible);
    };

    const toggleShift = () => {
        const container = document.querySelector('.worksheet-container');
        if (!container) return;
        if (shifted) {
            container.classList.remove('shiftup');
        } else {
            container.classList.add('shiftup');
        }
        setShifted(!shifted);
    };

    const togglePenToolbar = () => {
        const gradingToolbarBox = document.querySelector('.grading-toolbar-box');
        if (!gradingToolbarBox) return;
        if (gradingToolbarBox.classList.contains('close')) {
            gradingToolbarBox.querySelector('.toolbar-item')?.click();
        } else {
            StampLib.collapseToolbar();
        }
    };

    const handleDrawTab = () => {
        const drawtab = document.querySelector('.drawtab');
        if (!drawtab) return;
        
        const isHidden = drawtab.classList.contains('hidden');
        
        if (isHidden) {
            // Use Preact state to show
            window.__showDrawTab?.();
            const clearBtn = document.querySelector('.clearAll');
            if (clearBtn) {
                clearBtn.focus();
                clearBtn.blur();
            }
            // Update textarea size and pen settings
            const textarea = drawtab.querySelector('textarea');
            if (textarea) {
                textarea.style.height = '';
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
            updatePenSettings();
        } else {
            // Use Preact state to hide
            window.__hideDrawTab?.();
        }
    };

    const handleXAll = () => {
        document.querySelectorAll('.worksheet-container .worksheet-container.selected .mark-box-target')
            .forEach((box) => box.click());
    };

    return (
        <div class="customToolbar" style={{ display: 'none' }}>
            <button
                class="hoverToolbarBtn"
                onClick={togglePenToolbar}
                onMouseOver={(e) => e.stopPropagation()}
                title="Toggle pen toolbar visibility"
                dangerouslySetInnerHTML={{ __html: toolbarIcons.togglePen }}
            />

            <button
                class="headerZindexBtn"
                onClick={toggleHeader}
                title="Toggle header bar visibility"
            >H</button>

            <button
                class="shiftbtn"
                onClick={toggleShift}
                onMouseOver={(e) => e.stopPropagation()}
                title="Toggle shifting the page up/down"
                dangerouslySetInnerHTML={{ __html: toolbarIcons.shift }}
            />

            <button
                class="xallbtn"
                onClick={handleXAll}
                title="Click every grading box on the page"
            >x all</button>

            <button
                class="drawbtn"
                onClick={handleDrawTab}
                onMouseOver={(e) => e.stopPropagation()}
                title="Show the draw tab"
                accessKey="d"
                dangerouslySetInnerHTML={{ __html: penIcons.pen }}
            />

            <button
                class="mobileUpBtn"
                onClick={() => goPrevCorrectionPage?.()}
                onMouseOver={(e) => e.stopPropagation()}
                title="Previous marking page"
                dangerouslySetInnerHTML={{ __html: toolbarIcons.prevPage }}
            />

            <button
                class="mobileDownBtn"
                onClick={() => goNextCorrectionPage?.()}
                onMouseOver={(e) => e.stopPropagation()}
                title="Next marking page"
                dangerouslySetInnerHTML={{ __html: toolbarIcons.nextPage }}
            />

            {timestampEnabled && (
                <div
                    class={`timestampBox ${colorClass}`}
                    dangerouslySetInnerHTML={{ __html: timestamp }}
                />
            )}
        </div>
    );
};
