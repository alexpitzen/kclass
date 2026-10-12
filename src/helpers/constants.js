const DOWN = 1;
const UP = -1;
const RIGHT = 1;
const LEFT = -1;

const keyindexmap = ["0", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "=", "_", "+"];
const keyindexdisplay = {
    "!": "⇧1", "@": "⇧2", "#": "⇧3", "$": "⇧4", "%": "⇧5", "^": "⇧6", "&": "⇧7", "*": "⇧8",
    "(": "⇧9", ")": "⇧0", "_": "⇧-", "+": "⇧=",
};

const isAndroid = /[Aa]ndroid/.test(navigator.userAgent);

const isMobile = isAndroid;

export {
    DOWN,
    UP,
    RIGHT,
    LEFT,
    keyindexmap,
    keyindexdisplay,
    isMobile,
};
