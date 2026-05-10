import { useState, useEffect } from 'preact/hooks';
import { penIcons } from './constants.js';
import { toolbarIcons } from './constants.js';
import { goPrevCorrectionPage, goNextCorrectionPage } from '../helpers/navigation.js';
import { updatePenSettings, toggleHeader } from '../helpers/actions.js';
import { useTimestampDisplay } from '../hooks/useTimestamp.js';
import { useTimestamp, useDrawTab } from '../context/AppContext.jsx';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import stampIcon from '../icons/stamp.svg';
import settingsIcon from '../icons/settings.svg';

export const CustomToolbar = () => {
    const [shifted, setShifted] = useState(false);
    const { timestampEnabled } = useTimestamp();
    const { timestamp, colorClass } = useTimestampDisplay(timestampEnabled);
    const { drawTabOpen, setDrawTabOpen, hideDrawTab, showDrawTab, toggleDrawTab } = useDrawTab();
    const { activeTab, setActiveTab, drawToolTabs, showDrawTool, hideDrawTool, drawToolVisible } = useDrawTool();

    useEffect(() => {
        updatePenSettings();
    }, []);

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

    const handleDrawTab = () => {
        const drawtab = document.querySelector('.drawtab');
        if (!drawtab) return;

        const isHidden = drawtab.classList.contains('hidden');

        if (isHidden) {
            showDrawTab();
            const clearBtn = document.querySelector('.clearAll');
            if (clearBtn) {
                clearBtn.focus();
                clearBtn.blur();
            }
            const textarea = drawtab.querySelector('textarea');
            if (textarea) {
                textarea.style.height = '';
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
            updatePenSettings();
        } else {
            hideDrawTab();
        }
    };

    const handleToolTab = (tabId) => {
        if (drawToolVisible && activeTab === tabId) {
            hideDrawTool();
        } else {
            setActiveTab(tabId);
            showDrawTool();
        }
    };

    const handleXAll = () => {
        document.querySelectorAll('.worksheet-container .worksheet-container.selected .mark-box-target')
            .forEach((box) => box.click());
    };

    return (
        <div class="customToolbar" style={{ display: 'none' }}>
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

            {drawToolTabs?.map((tab) => {
                const icon = tab.id === 'image' ? stampIcon : tab.id === 'settings' ? settingsIcon : null;
                return (
                    <button
                        key={tab.id}
                        class="drawtool-tab-btn"
                        onMouseOver={(e) => e.stopPropagation()}
                        onClick={() => handleToolTab(tab.id)}
                        title={tab.label}
                    >
                        {icon ? (
                            <span dangerouslySetInnerHTML={{ __html: icon }} />
                        ) : (
                            tab.label
                        )}
                    </button>
                );
            })}

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
