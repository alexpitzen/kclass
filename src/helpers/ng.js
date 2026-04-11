function getGradingPage() {
    return window.kclass?.ng?.context?._contentsManagerService?.paging?._currentPage?.gradingWaitingSet;
}

function getGradingStartTime() {
    let gradingPage = getGradingPage();
    if (gradingPage?.GradingStartTime) {
        return new Date(gradingPage.GradingStartTime + 'Z');
    }
    return null;
}

function getStudyFinishTime() {
    let gradingPage = getGradingPage();
    if (gradingPage?.StudyFinishTime) {
        return new Date(gradingPage.StudyFinishTime + 'Z');
    }
    return null;
}

export {
    getGradingStartTime,
    getStudyFinishTime,
};
