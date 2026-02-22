import { DOWN, UP, LEFT, RIGHT } from './constants.js';
import { penIcons, penSettings } from '../components/constants.js';

export function updatePenSettings() {
    const penType = document.querySelector("input[name=penType]:checked")?.value || "pen";
    const pencolorbtn = document.querySelector(".pencolorbtn");
    if (penType !== "eraser") {
        StampLib.setPenSettings({
            color: pencolorbtn?.value,
            ...penSettings[penType]
        });
    }
    const drawbtn = document.querySelector(".drawbtn");
    if (drawbtn) {
        drawbtn.innerHTML = penIcons[penType];
        if (pencolorbtn) {
            drawbtn.style.fill = pencolorbtn.value;
        }
    }
}

function clickReading() {
    document.querySelector(".btn-subject.border-radius-right:not(.btn-subject-disabled)")?.click();
}

function clickMath() {
    document.querySelector(".btn-subject.border-radius-left:not(.btn-subject-disabled)")?.click();
}

function doBackspace() {
    (
        document.querySelector(".btn-dialog-cancel")
        || document.querySelector(".close-btn")
        || document.querySelector(".btn-close")
        || document.querySelector("app-page-back-button")
    )?.click();
}

function doEnter() {
    const mainBtn = (
        document.querySelector("#EndScoringButton")
        || document.querySelector(".btn-dialog-navy")
        || document.querySelector(".bottomSheet.open .scoreBtn")
    );
    if (mainBtn) {
        mainBtn.click();
        return;
    }
    const studentPulldownKbfocus = document.querySelector("#customPulldown:not([hidden]) > .kbfocus");
    if (studentPulldownKbfocus) {
        studentPulldownKbfocus.dispatchEvent(
            new MouseEvent("mousedown"),
            {
                button: 0,
                bubbles: true,
            },
        );
        showHeader(false);
        return;
    }
    const focusedSet = document.querySelector(".studyBarWrap.kbfocus");
    if (focusedSet) {
        focusedSet.querySelector(".barWrap")?.click();
    }
}

function isPulldownOpen() {
    return document.querySelector("#customPulldown")?.checkVisibility() ?? false;
}

function showHeader(show) {
    const header = document.querySelector(".grading-header");
    if (!header) return;
    if (!show && header.classList.contains("z300")) {
        header.classList.remove("z300");
    } else if (show && !header.classList.contains("z300")) {
        header.classList.add("z300");
    }
}

function doEscape(e) {
    let escapable = (
        document.querySelector(".btn-dialog-cancel")
        || document.querySelector(".end-scoring-area")
        || document.querySelector(".playback-control .close")
        || document.querySelector(".btn-close")
        || document.querySelector(".close-btn")
    );
    if (escapable) {
        escapable.click();
        return;
    }
    if (isPulldownOpen()) {
        document.querySelector("#studentInfoPullDown")?.click();
        document.querySelector("#studentInfoPullDown")?.blur();
        document.querySelectorAll("#customPulldown > .kbfocus").forEach((p) => {
            p.classList.remove("kbfocus");
        });
        showHeader(false);
        return;
    }
    const drawtab = document.querySelector(".drawtab");
    if (drawtab?.checkVisibility()) {
        drawtab.classList.add("hidden");
        return;
    }
    if (e.target.classList.contains("search-input")) {
        clearSearch();
        e.target.parentElement.querySelector(".search-btn")?.focus();
    }

    document.querySelector(".studentList .kbfocus")?.classList.remove("kbfocus");
}

function clearSearch() {
    const searchInput = document.querySelector("input.search-input");
    if (!searchInput) return;
    searchInput.value = "";
    searchInput.setAttribute("value", "");
    searchInput.dispatchEvent(new Event("input"), {});
    document.querySelector(".search-bar .search-btn")?.click();
    document.querySelector(".studentList .kbfocus")?.classList.remove("kbfocus");
}

function cycleHighlighter() {
    if (document.querySelector("input[name=penType]:checked")?.value === "thick-highlighter") {
        document.querySelector("input[name=penType][value=thin-highlighter]")?.click();
    } else {
        document.querySelector("input[name=penType][value=thick-highlighter]")?.click();
    }
}

function selectEraser() {
    StampLib.expandToolbar();
    document.querySelector(".grading-toolbar-box .grading-toolbar .eraser")?.click();
    StampLib.collapseToolbar();
    document.querySelector("input[name=penType][value=eraser]")?.click();
}

function getPlaybackControl() {
    return document.querySelector(".playback-control");
}

function doP() {
    const breakScoringButton = document.querySelector("#BreakScoringButton");
    if (breakScoringButton) {
        breakScoringButton.click();
        return;
    }
    const playbackControl = getPlaybackControl();
    if (playbackControl) {
        playbackControl.querySelector(".play,.pause")?.click();
        return;
    }
    document.querySelector("input[name=penType][value=pen]")?.click();
    updatePenSettings();
}

function doDown() {
    if (isPulldownOpen()) {
        const kbfocus = (
            document.querySelector("#customPulldown .option.kbfocus")
            || document.querySelector("#customPulldown > .option-select")
        );
        const options = Array.from(document.querySelectorAll("#customPulldown > .option"));
        const i = options.indexOf(kbfocus);
        if (options[i + 1]) {
            kbfocus.classList.remove("kbfocus");
            options[i + 1].classList.add("kbfocus");
            options[i + 1].scrollIntoViewIfNeeded();
        }
        return;
    }
    document.querySelector("button.pager-button.down")?.click();
}

function doUp() {
    if (isPulldownOpen()) {
        const kbfocus = (
            document.querySelector("#customPulldown .option.kbfocus")
            || document.querySelector("#customPulldown > .option-select")
        );
        const options = Array.from(document.querySelectorAll("#customPulldown > .option"));
        const i = options.indexOf(kbfocus);
        if (options[i - 1]) {
            kbfocus.classList.remove("kbfocus");
            options[i - 1].classList.add("kbfocus");
            options[i - 1].scrollIntoViewIfNeeded();
        }
        return;
    }
    document.querySelector("button.pager-button.up")?.click();
}

function doS() {
    const playbackControl = getPlaybackControl();
    if (playbackControl) {
        playbackControl.querySelector(".stop")?.click();
        return;
    }
    document.querySelector("button#OneSideDisplayButton")?.click();
}

function do2(key) {
    const atd = StampLib.getAtd();
    if (!atd) return;
    if (key === "@") {
        atd.setPlaybackSpeed(2);
    } else {
        atd.setPlaybackSpeed(2);
        atd.playbackGoToEnd();
    }
}

function do8(key) {
    const atd = StampLib.getAtd();
    if (!atd) return;
    if (key === "*") {
        atd.setPlaybackSpeed(8);
    } else {
        atd.setPlaybackSpeed(8);
        atd.playbackGoToEnd();
    }
}

function doKeyboardDefault(key) {
    const worksheet = document.querySelector(".ATD0020P-worksheet-container.selected");
    if (!worksheet) return;
    const markboxMap = window.__markboxMap || {};
    worksheet.querySelectorAll(".mark-box")[markboxMap[key]]?.click();
}

function matchPreviousMarkings() {
    document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-box-target").forEach((box) => box.click());
}

function clearMarkboxs() {
    for (let i = 0; i < 2; i++) {
        document.querySelectorAll(
            ".worksheet-container .worksheet-container.selected .mark-boxs .mark-box"
        ).forEach((markbox) => {
            if (!markbox.querySelector(`.default`)) {
                markbox.click();
            }
        });
    }
}

export {
    clickReading,
    clickMath,
    doBackspace,
    doEnter,
    isPulldownOpen,
    showHeader,
    doEscape,
    clearSearch,
    cycleHighlighter,
    selectEraser,
    getPlaybackControl,
    doP,
    doDown,
    doUp,
    doS,
    do2,
    do8,
    doKeyboardDefault,
    matchPreviousMarkings,
    clearMarkboxs,
};
