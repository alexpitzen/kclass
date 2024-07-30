function makebtn(className, innerText, fn) {
    let btn = document.createElement("button");
    btn.className = className;
    btn.innerText = innerText;
    btn.style.display = "none";
    document.body.appendChild(btn);
    btn.onclick = fn;
}

// Your code here...
makebtn("headerZindexBtn", "H", () => {
    let header = document.getElementsByClassName("grading-header")[0];
    if (header.classList.contains("z300")) {
        header.classList.remove("z300");
    } else {
        header.classList.add("z300");
    }
});

makebtn("shiftbtn", "↕", () => {
    let container = document.getElementsByClassName("worksheet-container")[0];
    if (container.classList.contains("shiftup")) {
        container.classList.remove("shiftup");
    } else {
        container.classList.add("shiftup");
    }
});

makebtn("xallbtn", "x all", () => {
    document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-box-target").forEach((box) => box.click());
});
