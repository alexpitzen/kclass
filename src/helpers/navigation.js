function goLastPage() {
    const pages = document.querySelectorAll(".worksheet-navigator-page");
    pages[pages.length - 1]?.click();
}

function goNextCorrectionPage() {
    const cur = document.querySelector(".worksheet-navigator-page.active");
    const pages = Array.from(document.querySelectorAll(".worksheet-navigator-page"));
    const i = pages.indexOf(cur);
    for (let j = i + 1; j < pages.length; j++) {
        if (pages[j].querySelector("span:not(.disabled)")) {
            pages[j].click();
            return;
        }
    }
    document.querySelector(".navigator-header-top button.grading-btn")?.click();
}

function goPrevCorrectionPage() {
    const cur = document.querySelector(".worksheet-navigator-page.active");
    const pages = Array.from(document.querySelectorAll(".worksheet-navigator-page"));
    const i = pages.indexOf(cur);
    for (let j = i - 1; j >= 0; j--) {
        if (pages[j].querySelector("span:not(.disabled)")) {
            pages[j].click();
            break;
        }
    }
}

export { goLastPage, goNextCorrectionPage, goPrevCorrectionPage };
