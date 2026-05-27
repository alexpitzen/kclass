import { useEffect } from 'preact/hooks';
import { DOWN, UP, LEFT, RIGHT } from '../helpers/constants.js';
import { goLastPage, goNextCorrectionPage, goPrevCorrectionPage } from '../helpers/navigation.js';
import { doEnter, doEscape, doBackspace, clearSearch, focusSearch, selectEraser, getPlaybackControl, doP, doS, do2, do8, isPulldownOpen, matchPreviousMarkings, clearMarkboxs, clickReading, clickMath, doKeyboardDefault, showHeader, toggleHeader, doDown, doUp, xAll } from '../helpers/actions.js';
import { doMarkingListJK, doMarkingListHL } from '../helpers/marking.js';
import { scrollStudentList, scrollStudents, scrollAnswer, scrollDashboard, scrollProgressChart, sideScrollProgressChart, scrollScore, stopScrolling, startScrolling, isProgressChartFloating } from '../helpers/scrolling.js';
import { useTimestamp } from '../context/AppContext.jsx';
import { usePenSettings } from '../context/PenSettingsContext.jsx';
import { useDrawTool } from '../context/DrawToolContext.jsx';
import { activateTextStampMode, adjustStampSize, getSingleColor } from '../context/StampSettingsContext.jsx';
import { PEN_PRESETS, getActivePresetId, setStampLibPenSettings } from '../helpers/penPresets.js';
import { usePrintOverlay } from '../components/PrintOverlay.jsx';
import { useDiffViewOverlay } from '../components/DiffViewOverlay.jsx';
import { useHelpOverlay } from '../components/HelpOverlay.jsx';

const handleMarkingListKey = (e, fns) => {
    if (e.repeat) return;
    switch (e.key) {
        case "f":
        case "/":
            focusSearch?.(e);
            break;
        case "?":
            fns.showHelpOverlay("studentlist");
            break;
        case "c":
            clearSearch?.();
            break;
        case "C":
            document.querySelectorAll(".studentRow .checkbox.checked").forEach(c => c.click());
            break;
        case "g":
            document.querySelector(".studentList:not(.tabItem)")?.scrollTo(0, 0);
            break;
        case "G":
            const sl1 = document.querySelector(".studentList:not(.tabItem)");
            sl1?.scrollTo(0, sl1.scrollHeight - sl1.clientHeight);
            break;
        case "J": scrollStudents?.(DOWN); break;
        case "K": scrollStudents?.(UP); break;
        case "j": doMarkingListJK?.(DOWN); break;
        case "k": doMarkingListJK?.(UP); break;
        case "h": doMarkingListHL?.(LEFT); break;
        case "l": doMarkingListHL?.(RIGHT); break;
        case " ":
            document.querySelector(".studentList .checkbox.kbfocus")?.click();
            e.preventDefault();
            break;
        case "S": document.querySelector(".studentList.tabItem")?.click(); break;
        case "r": document.querySelector(".studentListUpdateButton")?.click(); break;
        case "A": document.querySelector("app-student-list-filter-capsule .all")?.click(); break;
        case "M": document.querySelector("app-student-list-filter-capsule .math")?.click(); break;
        case "R": document.querySelector("app-student-list-filter-capsule .KNA")?.click(); break;
        case "Enter":
            doEnter?.();
            break;
        case "Escape": doEscape?.(e, fns); break;
    }
};

const handleStudentListKey = (e, fns) => {
    if (e.repeat) return;
    switch (e.key) {
        case "f":
        case "/":
            focusSearch?.(e);
            break;
        case "?":
            fns.showHelpOverlay("studentlist");
            break;
        case "c": clearSearch?.(); break;
        case "M": document.querySelector(".markingList.tabItem")?.click(); break;
        case "J": scrollStudentList?.(DOWN); break;
        case "K": scrollStudentList?.(UP); break;
        case "r": document.querySelector(".studentListUpdateButton")?.click(); break;
    }
};

const handleGradingKey = (e, fns) => {
    if (e.repeat && !["u", "r"].includes(e.key)) return;
    switch (e.key) {
        case "j": doDown?.(); break;
        case "k": doUp?.(); break;
        case "g": document.querySelectorAll(".worksheet-navigator-page span:not(.disabled)")[0]?.click(); break;
        case "G": goLastPage?.(); break;
        case "?":
            fns.showHelpOverlay("grading");
            break;
        case "X": 
            xAll();
            break;
        case "x": matchPreviousMarkings?.(); break;
        case "c": clearMarkboxs?.(); break;
        case "Backspace": doBackspace?.(); break;
        case "n": goNextCorrectionPage?.(); break;
        case "N": goPrevCorrectionPage?.(); break;
        case "p": {
            const breakScoringButton = document.querySelector("#BreakScoringButton");
            if (breakScoringButton) {
                breakScoringButton.click();
                break;
            }
            const playbackControl = getPlaybackControl?.();
            if (playbackControl) {
                playbackControl.querySelector(".play,.pause")?.click();
                break;
            }
            fns.setEraserEnabled(false);
            fns.setPenMode('pen');
            fns.setPenWidth(PEN_PRESETS['pen'].width);
            fns.setPenAlpha(PEN_PRESETS['pen'].alpha);
            const currentColor = getSingleColor();
            setStampLibPenSettings(currentColor, PEN_PRESETS['pen'].width, PEN_PRESETS['pen'].alpha);
            break;
        }
        case "P": {
            const playbackControl = getPlaybackControl?.();
            if (playbackControl) {
                playbackControl.querySelector(".play,.pause")?.click();
                return;
            } else {
                StampLib.expandToolbar();
                document.querySelector(".grading-toolbar-box .grading-toolbar .play")?.click();
                StampLib.collapseToolbar();
            }
            break;
        }
        case "s": doS?.(); break;
        case "u":
        {
            const atd = StampLib.getAtd();
            if (atd) {
                atd.undoInk();
                atd.penUpFunc(atd); // updates the models in angular
            }
            break;
        }
        case "U": StampLib.undoLastWriteAll?.(); break;
        case "r":
        {
            const atd = StampLib.getAtd();
            if (atd) {
                atd.redoInk();
                atd.penUpFunc(atd); // updates the models in angular
            }
            break;
        }
        case "2":
        case "@":
            do2?.(e.key);
            break;
        case "8":
        case "*":
            do8?.(e.key);
            break;
        case "A": document.querySelector("#AnswerDisplayButton")?.click(); break;
        case "Enter": doEnter?.(); break;
        case "Escape": doEscape(e, fns); break;
        case "d":
            e.preventDefault();
            fns.setActiveTab('image');
            fns.showDrawTool();
            break;
        case "S": document.querySelector(".other-worksheet-button")?.click(); break;
        case "m":
        case "D":
            fns.showDiffViewOverlay();
            break;
        case "b":
            fns.showBeforeViewOverlay();
            break;
        case "t":
            fns.setActiveTab('image');
            fns.showDrawTool();
            activateTextStampMode();
            e.preventDefault();
            break;
        case "h": {
            const currentPresetId = getActivePresetId(fns.eraserEnabled, fns.penWidth, fns.penAlpha);
            let targetPresetId;
            if (currentPresetId === 'highlighter') {
                targetPresetId = 'thin-highlighter';
            } else if (currentPresetId === 'thin-highlighter') {
                targetPresetId = 'highlighter';
            } else {
                targetPresetId = 'highlighter';
            }
            fns.setEraserEnabled(false);
            fns.setPenMode('pen');
            fns.setPenWidth(PEN_PRESETS[targetPresetId].width);
            fns.setPenAlpha(PEN_PRESETS[targetPresetId].alpha);
            const hColor = getSingleColor();
            setStampLibPenSettings(hColor, PEN_PRESETS[targetPresetId].width, PEN_PRESETS[targetPresetId].alpha);
            break;
        }
        case "e": {
            selectEraser?.();
            fns.setEraserEnabled(true);
            fns.setPenMode('eraser');
            fns.setPenWidth(PEN_PRESETS['eraser'].width);
            fns.setPenAlpha(PEN_PRESETS['eraser'].alpha);
            break;
        }
        case "R": clickReading?.(); break;
        case "M": clickMath?.(); break;
        case "H": {
            const wasPulldownOpen = isPulldownOpen?.();
            const pulldownExists = !!document.querySelector("#studentInfoPullDown.student-info-btn");
            document.querySelector("#studentInfoPullDown")?.click();
            document.querySelector("#studentInfoPullDown")?.blur();
            document.querySelectorAll("#customPulldown > .kbfocus").forEach(p => p.classList.remove("kbfocus"));
            if (pulldownExists) {
                if (!wasPulldownOpen) {
                    document.querySelector("#customPulldown > .option-select")?.classList.add("kbfocus");
                    showHeader(true);
                } else {
                    showHeader(false);
                }
            } else {
                toggleHeader();
            }
            break;
        }
        case "J": scrollAnswer?.(DOWN); break;
        case "K": scrollAnswer?.(UP); break;
        case "-":
        case "+":
        case "=": {
            doKeyboardDefault?.(e.key);
            break;
        }
        default: doKeyboardDefault?.(e.key); break;
    }
};

const handleStudentProfileKey = (e, fns) => {
    if (e.repeat) return;
    switch (e.key) {
        case "R":
            if (!document.querySelector("loading-spinner div")) {
                document.querySelector(".btn-close")?.click();
                clickReading?.();
            }
            break;
        case "M":
            if (!document.querySelector("loading-spinner div")) {
                document.querySelector(".btn-close")?.click();
                clickMath?.();
            }
            break;
        case "S": document.querySelector(".dashboard-set-left .btn-primary")?.click(); break;
        case "J":
            if (isProgressChartFloating()) {
                scrollProgressChart?.(DOWN);
            } else {
                scrollDashboard?.(DOWN);
            }
            break;
        case "K":
            if (isProgressChartFloating()) {
                scrollProgressChart?.(UP);
            } else {
                scrollDashboard?.(UP);
            }
            break;
        case "H": sideScrollProgressChart?.(LEFT); break;
        case "L": sideScrollProgressChart?.(RIGHT); break;
        case "p": document.querySelector(".dashboard-progress-chart .finally > .icon")?.click(); break;
        case "e": Array.from(document.querySelectorAll(".dashboard-menu-right .options-btn")).find(b => b.innerHTML?.trim() === "Edit")?.click(); break;
        case "Backspace": doBackspace?.(); break;
        case "Escape": doEscape?.(e, fns); break;
        case "Enter": doEnter?.(); break;
        case "?":
            fns.showHelpOverlay("profile");
            break;
    }
};

const handleStudyRecordsKey = (e, fns) => {
    if (e.repeat) return;
    switch (e.key) {
        case "R": clickReading?.(); break;
        case "M": clickMath?.(); break;
        case "Backspace": doBackspace?.(); break;
        case "J": scrollScore?.(DOWN); break;
        case "K": scrollScore?.(UP); break;
        case "G":
            const scoreGrid = document.querySelector(".score-grid-all");
            scoreGrid?.scrollIntoView();
            scoreGrid?.scroll(0, scoreGrid?.scrollHeight);
            break;
        case "?":
            fns.showHelpOverlay("studyrecords");
            break;
    }
};

export const useKeyboardMode = (enabled) => {
    const { setTimestampEnabled } = useTimestamp();
    const { drawToolVisible, callKeyDownHandler, showDrawTool, hideDrawTool, setActiveTab, penOverlayVisible, callPenOverlayKeyDownHandler } = useDrawTool();
    const { penWidth, setPenWidth, penAlpha, setPenAlpha, penMode, setPenMode, eraserEnabled, setEraserEnabled } = usePenSettings();
    const { hidePreview, updatePreview, state: printOverlayState } = usePrintOverlay();
    const { diffViewOverlayVisible, showDiffViewOverlay, hideDiffViewOverlay, showBeforeViewOverlay, hideBeforeViewOverlay } = useDiffViewOverlay();
    const { helpOverlayVisible, helpOverlayActiveTab, hideHelpOverlay, showHelpOverlay, helpTabs } = useHelpOverlay();
    const fns = {
        setTimestampEnabled,
        diffViewOverlayVisible,
        showDiffViewOverlay,
        hideDiffViewOverlay,
        showBeforeViewOverlay,
        hideBeforeViewOverlay,
        helpOverlayVisible,
        helpOverlayActiveTab,
        hideHelpOverlay,
        showHelpOverlay,
        helpTabs,
        showDrawTool,
        setActiveTab,
        hidePreview,
        penWidth,
        setPenWidth,
        penAlpha,
        setPenAlpha,
        penMode,
        setPenMode,
        eraserEnabled,
        setEraserEnabled,
    };
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e) => {
            if (e.altKey && !e.ctrlKey && !e.metaKey) {
                if (e.key === "d") {
                    if (drawToolVisible) {
                        hideDrawTool();
                    } else {
                        setActiveTab('image');
                        showDrawTool();
                    }
                } else if (e.key === "t") {
                    setTimestampEnabled((prev) => !prev);
                }
                return;
            }

            if (penOverlayVisible) {
                callPenOverlayKeyDownHandler(e);
                return;
            }

            if (drawToolVisible) {
                callKeyDownHandler(e);
                return;
            }

            // Fall back to normal grading handling for page navigation & opening ImageStampTab
            if (printOverlayState.visible && !["g", "G", "n", "N", "j", "k", "J", "K", "d"].includes(e.key)) {
                // Special cases for print overlay
                switch (e.key) {
                    case "-":
                        adjustStampSize(-1);
                        updatePreview();
                        e.preventDefault();
                        break;
                    case "+":
                    case "=":
                        adjustStampSize(1);
                        updatePreview();
                        e.preventDefault();
                        break;
                    case "Backspace":
                    case "Escape":
                        hidePreview();
                        e.preventDefault();
                        break;
                }
                return;
            }

            if ((e.target.nodeName === "INPUT" && e.target.type !== "checkbox") || e.target.nodeName === "TEXTAREA") {
                if (e.key === "Escape") {
                    doEscape(e, fns);
                } else if (e.key === "Enter" && e.target.classList.contains("search-input")) {
                    const searchBtn = e.target.parentElement?.querySelector(".search-btn");
                    if (searchBtn) {
                        e.preventDefault();
                        searchBtn.click();
                        e.target.blur();
                        if (document.querySelector(".markingList.tabActive")) {
                            if (!document.querySelector(".studentList .kbfocus")) {
                                doMarkingListJK?.(DOWN);
                            }
                        }
                    }
                }
                return;
            }

            if (e.altKey || e.ctrlKey || e.metaKey) return;


            const markingList = document.querySelector(".markingList.tabActive");
            const studentList = document.querySelector(".studentList.tabActive");
            const worksheet = document.querySelector(".ATD0020P-worksheet-container.selected");
            const studentProfile = document.querySelector(".student-profile");
            const studyRecords = document.querySelector(".ATD0010P-root");

            if (markingList) {
                handleMarkingListKey(e, fns);
            } else if (studentList) {
                handleStudentListKey(e, fns);
            } else if (worksheet) {
                handleGradingKey(e, fns);
            } else if (studentProfile) {
                handleStudentProfileKey(e, fns);
            } else if (studyRecords) {
                handleStudyRecordsKey(e, fns);
            }
        };

        const handleKeyUp = (e) => {
            const { pageSideScrolling, pageScrollingDirection } = window.__scrollingState || {};
            switch(e.key) {
                case "J":
                case "j":
                    if (!pageSideScrolling && pageScrollingDirection == DOWN) {
                        stopScrolling?.();
                    }
                    break;
                case "K":
                case "k":
                    if (!pageSideScrolling && pageScrollingDirection == UP) {
                        stopScrolling?.();
                    }
                    break;
                case "H":
                case "h":
                    if (pageSideScrolling && pageScrollingDirection == LEFT) {
                        stopScrolling?.();
                    }
                    break;
                case "L":
                case "l":
                    if (pageSideScrolling && pageScrollingDirection == RIGHT) {
                        stopScrolling?.();
                    }
                    break;
                case "b":
                    hideBeforeViewOverlay();
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keyup", handleKeyUp);
        };
    }, [enabled, helpOverlayVisible, helpOverlayActiveTab, drawToolVisible, showDrawTool, hideDrawTool, setActiveTab, printOverlayState.visible, hidePreview, penWidth, penAlpha, eraserEnabled, penOverlayVisible]);
};
