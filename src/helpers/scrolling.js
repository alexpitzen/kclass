import { DOWN, UP, LEFT, RIGHT } from './constants.js';

let pageScrolling = false;
let pageSideScrolling = false;
let pageScrollingDirection = null;
let pageScrollingItem = null;
let pageScrollingStartPos = 0;
let pageScrollingStartTime = undefined;

function scrollStudents(direction) {
    startScrolling(direction, ".studentList:not(.tabItem)");
}

function scrollAnswer(direction) {
    startScrolling(direction, ".content-answer-content.image");
}

function scrollDashboard(direction) {
    startScrolling(direction, ".dashboard");
}

function scrollProgressChart(direction) {
    startScrolling(direction, ".dashboard-progress-chart .chart");
}

function sideScrollProgressChart(direction) {
    startSideScrolling(direction, ".dashboard-progress-chart .plan-footer");
}

function scrollScore(direction) {
    startScrolling(direction, ".score-grid-all");
}

function startScrolling(direction, item) {
    pageScrolling = true;
    pageSideScrolling = false;
    pageScrollingDirection = direction;
    pageScrollingItem = document.querySelector(item);
    pageScrollingStartPos = pageScrollingItem?.scrollTop || 0;
    pageScrollingStartTime = undefined;
    window.__scrollingState = { pageScrollingDirection, pageSideScrolling };
    if (pageScrollingItem) {
        requestAnimationFrame(scrollPage);
    }
}

function startSideScrolling(direction, item) {
    pageScrolling = true;
    pageSideScrolling = true;
    pageScrollingDirection = direction;
    pageScrollingItem = document.querySelector(item);
    pageScrollingStartPos = pageScrollingItem?.scrollLeft || 0;
    pageScrollingStartTime = undefined;
    window.__scrollingState = { pageScrollingDirection, pageSideScrolling };
    if (pageScrollingItem) {
        requestAnimationFrame(scrollPage);
    }
}

function scrollPage(timestamp) {
    if (!pageScrolling || !pageScrollingItem) return;
    if (pageScrollingStartTime === undefined) {
        pageScrollingStartTime = timestamp;
    }
    if (pageSideScrolling) {
        pageScrollingItem.scrollTo({
            left: pageScrollingStartPos + 1.5 * pageScrollingDirection * (timestamp - pageScrollingStartTime),
            behavior: "instant"
        });
    } else {
        pageScrollingItem.scrollTo({
            top: pageScrollingStartPos + 1.5 * pageScrollingDirection * (timestamp - pageScrollingStartTime),
            behavior: "instant"
        });
    }
    requestAnimationFrame(scrollPage);
}

function stopScrolling() {
    pageScrolling = false;
    window.__scrollingState = null;
}

function pointerScroll(parent, draggable) {
    let dragging = false;
    let startY = 0;
    let scrollStart = 0;
    let dragged = 0;
    const dragStart = (ev) => {
        dragging = true;
        startY = ev.clientY;
        scrollStart = parent.scrollTop;
        dragged = 0;
    };
    const dragEnd = (ev) => {
        dragging = false;
        if (draggable.hasPointerCapture(ev.pointerId)) {
            draggable.releasePointerCapture(ev.pointerId);
        }
    };
    const drag = (ev) => {
        if (dragging) {
            dragged++;
            parent.scrollTop = scrollStart - (ev.clientY - startY);
            if (dragged == 40) {
                draggable.setPointerCapture(ev.pointerId);
            }
        }
    }

    draggable.addEventListener("pointerdown", dragStart);
    draggable.addEventListener("pointerup", dragEnd);
    draggable.addEventListener("pointermove", drag);
}

export {
    scrollStudents,
    scrollAnswer,
    scrollDashboard,
    scrollProgressChart,
    sideScrollProgressChart,
    scrollScore,
    startScrolling,
    startSideScrolling,
    stopScrolling,
    pointerScroll,
    pageScrolling,
    pageScrollingDirection,
    pageSideScrolling,
};
