import { DOWN, UP, LEFT, RIGHT } from './constants.js';

function doMarkingListHL(direction) {
    const studentList = document.querySelector(".studentList:not(.tabItem)");
    if (!studentList) return;

    const focusedStudent = studentList.querySelector("app-score-list-item .checkbox.kbfocus");
    if (focusedStudent) {
        if (direction === LEFT) return;
        doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item:has(.kbfocus) .studyBarWrap"));
        return;
    }

    const focusedSet = studentList.querySelector(".studyBarWrap.kbfocus");
    if (focusedSet) {
        const subject = getFocusedSetSubject(focusedSet);
        if (direction === RIGHT) {
            if (subject === "KNA") return;
            moveMarkingListSetFocusLeftRight(studentList, focusedSet, subject);
        } else if (direction === LEFT) {
            if (subject === "math") {
                selectStudentCheckboxFromSet(studentList, focusedSet);
            } else {
                if (!moveMarkingListSetFocusLeftRight(studentList, focusedSet, subject)) {
                    selectStudentCheckboxFromSet(studentList, focusedSet);
                }
            }
        }
        return;
    }

    if (studentList.querySelector("app-score-list-header .checkbox.kbfocus")) return;

    if (direction === LEFT) {
        doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .checkbox"));
    } else {
        doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .studyBarWrap"));
    }
}

function selectStudentCheckboxFromSet(studentList, focusedSet) {
    doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item:has(.kbfocus) i.checkbox"));
}

function moveMarkingListSetFocusLeftRight(studentList, focusedSet, subject) {
    const otherSubjectSets = studentList.querySelectorAll(
        `app-score-list-item:has(.kbfocus) .subjectCellWrapColumn:has(.studyBarWrap.${subject === "math" ? "KNA" : "math"}) .studyBarWrap`
    );
    if (!otherSubjectSets.length) return false;

    const sameSubjectSets = studentList.querySelectorAll(
        `app-score-list-item:has(.kbfocus) .subjectCellWrapColumn:has(.studyBarWrap.${subject}) .studyBarWrap`
    );

    const i = Array.from(sameSubjectSets).indexOf(focusedSet);
    doMarkingListFocusAndScroll(studentList, otherSubjectSets[Math.min(i, otherSubjectSets.length - 1)]);
    return true;
}

function doMarkingListJK(direction) {
    const studentList = document.querySelector(".studentList:not(.tabItem)");
    if (!studentList) return;

    const focusedStudent = studentList.querySelector("app-score-list-item .checkbox.kbfocus");
    if (focusedStudent) {
        moveMarkingListCheckboxFocus(studentList, focusedStudent, direction);
        return;
    }

    const focusedSet = studentList.querySelector(".studyBarWrap.kbfocus");
    if (focusedSet) {
        moveMarkingListSetFocusUpDown(studentList, focusedSet, direction);
        return;
    }

    const headerCheckbox = studentList.querySelector("app-score-list-header .checkbox");
    if (headerCheckbox?.classList.contains("kbfocus")) {
        if (direction === DOWN) {
            doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .checkbox"));
        } else {
            const items = studentList.querySelectorAll("app-score-list-item .checkbox");
            doMarkingListFocusAndScroll(studentList, items[items.length - 1]);
        }
        return;
    }

    if (direction === DOWN) {
        doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .checkbox"));
    } else {
        markingListSelectHeaderCheckbox(studentList);
    }
}

function getFocusedSetSubject(focusedSet) {
    const entry = focusedSet.classList.entries().find((a) => a[1] === "math" || a[1] === "KNA");
    return entry?.[1];
}

function moveMarkingListSetFocusUpDown(studentList, focusedSet, direction) {
    const currentStudentSets = Array.from(studentList.querySelectorAll(".subjectCellWrapColumn:has(.kbfocus) .studyBarWrap"));
    const i = currentStudentSets.indexOf(focusedSet);
    const subject = getFocusedSetSubject(focusedSet);

    if (direction === UP && i === 0) {
        const student = getMarkingListStudent(studentList, direction);
        const subjectColumn = getMarkingListStudentSubjectColumn(student, subject);
        const sets = subjectColumn.querySelectorAll(".studyBarWrap");
        doMarkingListFocusAndScroll(studentList, sets[sets.length - 1]);
    } else if (direction === DOWN && i === currentStudentSets.length - 1) {
        const student = getMarkingListStudent(studentList, direction);
        const subjectColumn = getMarkingListStudentSubjectColumn(student, subject);
        doMarkingListFocusAndScroll(studentList, subjectColumn.querySelector(".studyBarWrap"));
    } else {
        doMarkingListFocusAndScroll(studentList, currentStudentSets[i + direction]);
    }
}

function getMarkingListStudent(studentList, direction) {
    const students = Array.from(studentList.querySelectorAll("app-score-list-item"));
    const i = students.indexOf(studentList.querySelector("app-score-list-item:has(.kbfocus)"));
    if (direction === UP && i === 0) {
        return students[students.length - 1];
    } else if (direction === DOWN && i === students.length - 1) {
        return students[0];
    }
    return students[i + direction];
}

function getMarkingListStudentSubjectColumn(student, subject) {
    return (
        student.querySelector(`.subjectCellWrapColumn:has(.studyBarWrap.${subject})`)
        || student.querySelector(".subjectCellWrapColumn:has(.studyBarWrap)")
    );
}

function moveMarkingListCheckboxFocus(studentList, focusedStudent, direction) {
    const items = Array.from(studentList.querySelectorAll("app-score-list-item .checkbox"));
    const i = items.indexOf(focusedStudent);
    if ((direction === UP && i === 0) || (direction === DOWN && i === items.length - 1)) {
        focusedStudent.classList.remove("kbfocus");
        markingListSelectHeaderCheckbox(studentList);
    } else {
        doMarkingListFocusAndScroll(studentList, items[i + direction]);
    }
}

function markingListSelectHeaderCheckbox(studentList) {
    studentList.querySelector("app-score-list-header .checkbox")?.classList.add("kbfocus");
    studentList.scrollTop = 0;
}

function doMarkingListFocusAndScroll(studentList, toFocus) {
    if (!studentList || !toFocus) return;
    studentList.querySelector(".kbfocus")?.classList.remove("kbfocus");
    toFocus.classList.add("kbfocus");
    const firstCheckbox = studentList.querySelector("app-score-list-item .checkbox");
    if (toFocus.classList.contains("checkbox")) {
        studentList.scrollTop = toFocus.offsetTop - firstCheckbox.offsetTop;
    } else {
        toFocus.scrollIntoViewIfNeeded();
        if (studentList.scrollTop > toFocus.offsetTop - firstCheckbox.offsetTop) {
            studentList.scrollTop = toFocus.offsetTop - firstCheckbox.offsetTop;
        }
    }
}

export {
    doMarkingListHL,
    doMarkingListJK,
    moveMarkingListCheckboxFocus,
    markingListSelectHeaderCheckbox,
    doMarkingListFocusAndScroll,
};
