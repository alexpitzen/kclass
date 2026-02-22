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

function doS() {
    const atd = StampLib.getAtd();
    if (atd?.singlePageMode) {
        atd.doublePageMode();
    } else {
        atd?.singlePageMode();
    }
}

function do2(key) {
    const atd = StampLib.getAtd();
    if (!atd) return;
    atd.setPlaybackSpeed(2);
    if (key === "@") {
        atd.playbackGoToEnd?.();
    }
}

function do8(key) {
    const atd = StampLib.getAtd();
    if (!atd) return;
    atd.setPlaybackSpeed(8);
    if (key === "*") {
        atd.playbackGoToEnd?.();
    }
}

export { getPlaybackControl, doP, doS, do2, do8 };
