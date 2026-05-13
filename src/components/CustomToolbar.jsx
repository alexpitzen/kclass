import { useState, useEffect } from 'preact/hooks';
import { toolbarIcons } from './constants.js';
import { goPrevCorrectionPage, goNextCorrectionPage } from '../helpers/navigation.js';
import { toggleHeader } from '../helpers/actions.js';
import { useTimestampDisplay } from '../hooks/useTimestamp.js';
import { useTimestamp } from '../context/AppContext.jsx';
import { usePenSettings } from '../context/PenSettingsContext.jsx';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import { getActivePresetId, getColoredPenIcon } from '../helpers/penPresets.js';
import settingsIcon from '../icons/settings.svg';

export const CustomToolbar = () => {
    const [shifted, setShifted] = useState(false);
    const { timestampEnabled } = useTimestamp();
    const { timestamp, colorClass } = useTimestampDisplay(timestampEnabled);
    const { activeTab, setActiveTab, drawToolTabs, showDrawTool, hideDrawTool, drawToolVisible } = useDrawTool();
    const { eraserEnabled, penWidth, penAlpha, penColor } = usePenSettings();
    const activePresetId = getActivePresetId(eraserEnabled, penWidth, penAlpha);
    const currentPenIcon = activePresetId
        ? getColoredPenIcon(activePresetId, penColor)
        : getColoredPenIcon('pen', penColor);

    const withBlur = (handler) => (e) => {
        e.currentTarget.blur();
        if (handler) handler(e);
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
                onClick={withBlur(toggleHeader)}
                title="Toggle header bar visibility"
            >H</button>

            <button
                class="shiftbtn"
                onClick={withBlur(toggleShift)}
                onMouseOver={(e) => e.stopPropagation()}
                title="Toggle shifting the page up/down"
                dangerouslySetInnerHTML={{ __html: toolbarIcons.shift }}
            />

            <button
                class="xallbtn"
                onClick={withBlur(handleXAll)}
                title="Click every grading box on the page"
            >x all</button>

            {drawToolTabs?.map((tab) => {
                const icon = tab.id === 'image' ? currentPenIcon : tab.id === 'settings' ? settingsIcon : null;
                return (
                    <button
                        key={tab.id}
                        class="drawtool-tab-btn"
                        onMouseOver={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.currentTarget.blur();
                            handleToolTab(tab.id);
                        }}
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
                 onClick={(e) => {
                     e.currentTarget.blur();
                     goPrevCorrectionPage?.();
                 }}
                onMouseOver={(e) => e.stopPropagation()}
                title="Previous marking page"
                dangerouslySetInnerHTML={{ __html: toolbarIcons.prevPage }}
            />

            <button
                class="mobileDownBtn"
                 onClick={(e) => {
                     e.currentTarget.blur();
                     goNextCorrectionPage?.();
                 }}
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
