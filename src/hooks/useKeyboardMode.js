import { useEffect } from 'preact/hooks';
import { DOWN, UP, LEFT, RIGHT } from '../helpers/constants.js';
import { goLastPage, goNextCorrectionPage, goPrevCorrectionPage } from '../helpers/navigation.js';
import { doEnter, doEscape, doBackspace, clearSearch, focusSearch, cycleHighlighter, selectEraser, getPlaybackControl, doP, doS, do2, do8, isPulldownOpen, matchPreviousMarkings, clearMarkboxs, clickReading, clickMath, doKeyboardDefault, showHeader, toggleHeader } from '../helpers/actions.js';
import { doMarkingListJK, doMarkingListHL } from '../helpers/marking.js';
import { scrollStudents, scrollAnswer, scrollDashboard, scrollProgressChart, sideScrollProgressChart, scrollScore, stopScrolling, startScrolling, isProgressChartFloating } from '../helpers/scrolling.js';
import { doDown, doUp } from '../helpers/actions.js';

const keyboardHelp = `Navigation:
j: down
k: up
g: top
G: bottom
n: next active page
N: previous active page
D: go to next set
R: switch to reading
M: switch to math
H: header dropdown or show/hide header
p: pause marking (when bottom pause button is visible)
J (hold): scroll answer key down
K (hold): scroll answer key up
s: display one side of page (instead of 2)

Marking (⇧ means shift):
x: match previous markings or x all
X: x all
c: clear x's
A: toggle answers
alt+t: show timestamp of when the page was last changed. *TIMEZONE IS ASSUMED*. Red means the page hasn't been changed since it was last graded (this can be wrong if the student's timezone is different or their clock is wrong)
P: start replay / pause replay
(during replay):
s: stop replay
p: pause / resume replay
2/⇧2: replay 2x speed
8/⇧8: replay 8x speed

Drawing:
d: open the draw tab
p: select pen
h: select highlighter / cycle highlighter type
e: select eraser
u: undo
r: redo
U: undo stamp
-: decrease stamp size
+/=: increase stamp size

With draw tab open:
t: focus the text area
u: set Stamp Color to "Unchanged"
r: set Stamp Color to "Rainbow" / "Rainbow Fill"
c: set Stamp Color to "Color Picker"
p: select pen
h: select highlighter / cycle highlighter type
-: decrease stamp size
+/= : increase stamp size
J (hold): scroll stamps down
K (hold): scroll stamps up
escape: close draw tab

General:
escape: close dialog
backspace: exit/cancel
enter: submit/accept dialog`;

export const keyboardHelpText = keyboardHelp;

export const useKeyboardMode = (enabled, drawTabOpen, toggleDrawTab) => {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e) => {
            if (e.repeat && ["j", "J", "k", "K", "l", "L", "h", "H"].includes(e.key)) return;
            if (e.target.nodeName === "INPUT" || e.target.nodeName === "TEXTAREA") {
                if (e.key === "Escape") {
                    doEscape?.(e);
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

            if (e.altKey && !e.ctrlKey && !e.metaKey) {
                if (e.key === "d") {
                    toggleDrawTab?.();
                } else if (e.key === "t") {
                    window.__setTimestampEnabled?.((prev) => !prev);
                }
                return;
            }

            if (e.altKey || e.ctrlKey || e.metaKey) return;

            if (drawTabOpen) {
                const drawtab = document.querySelector('.drawtab');
                switch (e.key) {
                    case "d":
                    case "Escape":
                        window.__hideDrawTab?.();
                        break;
                    case "-":
                    case "+":
                    case "=":
                        const slider = drawtab?.querySelector(".sizeslider");
                        if (slider) {
                            e.key === "-" ? slider.value-- : slider.value++;
                            slider.dispatchEvent(new Event("input"));
                        }
                        break;
                    case "J":
                    case "K":
                        startScrolling?.(e.key === "J" ? DOWN : UP, ".drawtab");
                        break;
                    case "h":
                        cycleHighlighter?.();
                        break;
                    case "p":
                        document.querySelector("input[name=penType][value=pen]")?.click();
                        break;
                    case "r":
                    case "u":
                    case "c": {
                        const select = drawtab?.querySelector("select#stampColorType");
                        if (select) {
                            if (e.key === "r") select.value = select.value === "Rainbow Fill" ? "Rainbow" : "Rainbow Fill";
                            else if (e.key === "u") select.value = "Unchanged";
                            else if (e.key === "c") select.value = "Color Picker";
                            select.dispatchEvent(new Event("change"));
                        }
                        break;
                    }
                    case "t":
                        const textarea = drawtab?.querySelector("textarea");
                        if (textarea) {
                            textarea.focus();
                            textarea.select();
                            e.preventDefault();
                        }
                        break;
                }
                return;
            }

            const markingList = document.querySelector(".markingList.tabActive");
            const studentList = document.querySelector(".studentList.tabActive");
            const worksheet = document.querySelector(".ATD0020P-worksheet-container.selected");
            const studentProfile = document.querySelector(".student-profile");
            const studyRecords = document.querySelector(".ATD0010P-root");

            if (markingList) {
                switch (e.key) {
                    case "f":
                    case "/":
                        focusSearch?.(e);
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
                    case "Escape": doEscape?.(e); break;
                }
            } else if (studentList) {
                switch (e.key) {
                    case "f":
                    case "/":
                        focusSearch?.(e);
                        break;
                    case "c": clearSearch?.(); break;
                    case "M": document.querySelector(".markingList.tabItem")?.click(); break;
                    case "J": scrollStudents?.(DOWN); break;
                    case "K": scrollStudents?.(UP); break;
                    case "r": document.querySelector(".studentListUpdateButton")?.click(); break;
                }
            } else if (worksheet) {
                switch (e.key) {
                    case "j": doDown?.(); break;
                    case "k": doUp?.(); break;
                    case "g": document.querySelectorAll(".worksheet-navigator-page span:not(.disabled)")[0]?.click(); break;
                    case "G": goLastPage?.(); break;
                    case "X": 
                        const xallbtn = document.querySelector(".xallbtn");
                        xallbtn?.click();
                        xallbtn?.blur();
                        break;
                    case "x": matchPreviousMarkings?.(); break;
                    case "c": clearMarkboxs?.(); break;
                    case "Backspace": doBackspace?.(); break;
                    case "n": goNextCorrectionPage?.(); break;
                    case "N": goPrevCorrectionPage?.(); break;
                    case "p": doP?.(); break;
                    case "P":
                        const playback = getPlaybackControl?.();
                        if (playback) {
                            playback.querySelector(".play,.pause")?.click();
                            return;
                        } else {
                            StampLib.expandToolbar();
                            document.querySelector(".grading-toolbar-box .grading-toolbar .play")?.click();
                            StampLib.collapseToolbar();
                        }
                        break;
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
                    case "@": do2?.(e.key); break;
                    case "8":
                    case "*": do8?.(e.key); break;
                    case "A": document.querySelector("#AnswerDisplayButton")?.click(); break;
                    case "Enter": doEnter?.(); break;
                    case "Escape": doEscape?.(e); break;
                    case "d":
                        e.preventDefault();
                        window.__showDrawTab?.();
                        break;
                    case "D": document.querySelector(".other-worksheet-button")?.click(); break;
                    case "h": cycleHighlighter?.(); break;
                    case "e": selectEraser?.(); break;
                    case "R": clickReading?.(); break;
                    case "M": clickMath?.(); break;
                    case "H":
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
                    case "J": scrollAnswer?.(DOWN); break;
                    case "K": scrollAnswer?.(UP); break;
                    case "-":
                    case "+":
                    case "=":
                        const drawtab2 = document.querySelector('.drawtab');
                        const printoverlay = document.querySelector('.printoverlay');
                        const slider2 = (drawtab2?.checkVisibility() || printoverlay?.checkVisibility())
                            ? drawtab2?.querySelector(".sizeslider")
                            : null;
                        if (slider2) {
                            e.key === "-" ? slider2.value-- : slider2.value++;
                            slider2.dispatchEvent(new Event("input"));
                        } else {
                            doKeyboardDefault?.(e.key);
                        }
                        break;
                    default: doKeyboardDefault?.(e.key); break;
                }
            } else if (studentProfile) {
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
                    case "Escape": doEscape?.(e); break;
                    case "Enter": doEnter?.(); break;
                }
            } else if (studyRecords) {
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
                }
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
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keyup", handleKeyUp);
        };
    }, [enabled, drawTabOpen, toggleDrawTab]);
};
