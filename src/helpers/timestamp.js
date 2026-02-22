let timestampUpdater = null;

function timestampBoxNeutral(page) {
    const timestampBox = document.querySelector(".timestampBox");
    if (!timestampBox) return;
    timestampBox.className = "timestampBox";
    if (page) {
        page.style.outlineColor = "";
    }
}

function timestampBoxGreen(page) {
    const timestampBox = document.querySelector(".timestampBox");
    if (!timestampBox) return;
    timestampBox.className = "timestampBox green";
    if (page) {
        page.style.outlineColor = "lightgreen";
    }
}

function timestampBoxRed(page) {
    const timestampBox = document.querySelector(".timestampBox");
    if (!timestampBox) return;
    timestampBox.className = "timestampBox red";
    if (page) {
        page.style.outlineColor = "red";
    }
}

function timestampPageNeutral(page) {
    if (page) {
        page.style.outlineColor = "";
    }
}

function updateTimestamp(activePage) {
    const timestampBox = document.querySelector(".timestampBox");
    if (!timestampBox) return;

    const is = stamp.getStudentDrawing?.();
    if (is) {
        if (is.length === 0) {
            timestampBox.innerHTML = "None";
            timestampBoxRed(activePage);
            return;
        }
        try {
            const lastStroke = new Date(is[is.length - 1].cs[0].t);
            timestampBox.innerHTML = `Last change:<br>${lastStroke.toString()}`;

            if (document.querySelector(".worksheet-navigator-page.active .text.disabled")) {
                timestampBoxNeutral(activePage);
            } else {
                const page = kclass.ng?.context?._contentsManagerService?.paging?._currentPage?.gradingWaitingSet;
                if (page?.GradingStartTime && page?.StudyFinishTime) {
                    const lastGraded = new Date(page.GradingStartTime + "Z");
                    const submitted = new Date(page.StudyFinishTime + "Z");
                    if (lastGraded > submitted) {
                        timestampBoxNeutral(activePage);
                    } else {
                        if (lastStroke > lastGraded) {
                            timestampBoxGreen(activePage);
                        } else {
                            timestampBoxRed(activePage);
                        }
                    }
                } else {
                    timestampBoxNeutral(activePage);
                }
            }
        } catch {
            timestampBox.innerHTML = "";
            timestampBoxNeutral(activePage);
        }
    } else {
        timestampBox.innerHTML = "";
        timestampBoxNeutral(activePage);
    }
}

function enableTimestampDisplay() {
    const timestampBox = document.querySelector(".timestampBox");
    if (!timestampBox) return;
    
    if (timestampUpdater) return;

    timestampUpdater = {
        disable: () => {
            timestampUpdater = null;
        }
    };

    // This would use onPageChange from the main app
    timestampBox.style.display = "unset";
}

function disableTimestampDisplay() {
    const timestampBox = document.querySelector(".timestampBox");
    if (!timestampBox) return;
    
    if (timestampUpdater) {
        timestampUpdater.disable();
        timestampUpdater = null;
    }
    timestampBox.innerHTML = "";
    timestampBox.style.display = "";
}

export {
    timestampUpdater,
    timestampBoxNeutral,
    timestampBoxGreen,
    timestampBoxRed,
    timestampPageNeutral,
    updateTimestamp,
    enableTimestampDisplay,
    disableTimestampDisplay,
};
