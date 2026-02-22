import { useState } from 'preact/hooks';
import { toolbarIcons } from './constants.js';
import { goPrevCorrectionPage, goNextCorrectionPage } from '../helpers/navigation.js';

export const CustomToolbar = () => {
    const [headerVisible, setHeaderVisible] = useState(true);
    const [shifted, setShifted] = useState(false);

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

    const handleXAll = () => {
        document.querySelectorAll('.worksheet-container .worksheet-container.selected .mark-box-target')
            .forEach((box) => box.click());
    };

    return (
        <div class="customToolbar" style={{ display: 'none' }}>
            <button
                class="hoverToolbarBtn"
                onClick={togglePenToolbar}
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
                title="Toggle shifting the page up/down"
                dangerouslySetInnerHTML={{ __html: toolbarIcons.shift }}
            />

            <button
                class="xallbtn"
                onClick={handleXAll}
                title="Click every grading box on the page"
            >x all</button>

            <button
                class="mobileUpBtn"
                onClick={() => goPrevCorrectionPage?.()}
                title="Previous marking page"
                dangerouslySetInnerHTML={{ __html: toolbarIcons.prevPage }}
            />

            <button
                class="mobileDownBtn"
                onClick={() => goNextCorrectionPage?.()}
                title="Next marking page"
                dangerouslySetInnerHTML={{ __html: toolbarIcons.nextPage }}
            />
        </div>
    );
};
