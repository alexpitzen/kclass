import { createContext } from 'preact';
import { useContext, useState, useCallback, useRef, useEffect } from 'preact/hooks';
import styles from './HelpOverlay.module.css';

const HelpOverlayContext = createContext(null);

export const useHelpOverlay = () => {
    const context = useContext(HelpOverlayContext);
    if (!context) {
        throw new Error('useHelpOverlay must be used within HelpOverlayProvider');
    }
    return context;
};

const TABS = [
    { id: 'general', label: 'General' },
    { id: 'studentlist', label: 'Student List / Marking List' },
    { id: 'grading', label: 'Grading' },
    { id: 'drawtab', label: 'Draw Tab' },
    { id: 'profile', label: 'Profile' },
    { id: 'studyrecords', label: 'Study Records' },
];

const TAB_CONTENT = {
    general: [
        {
            title: 'Navigation',
            keys: [
                { key: 'j', desc: 'Down' },
                { key: 'k', desc: 'Up' },
                { key: 'J', desc: '(hold) Scroll down' },
                { key: 'K', desc: '(hold) Scroll up' },
                { key: 'g', desc: 'Top' },
                { key: 'G', desc: 'Bottom' },
            ],
        },
        {
            title: 'General',
            keys: [
                { key: '?', desc: 'Show keyboard shortcuts' },
                { key: ['Escape', 'Backspace'], desc: 'Close dialog / exit / cancel' },
                { key: 'Enter', desc: 'Submit / accept dialog' },
            ],
        },
        {
            title: 'Always active',
            keys: [
                { key: ['Alt', 'k'], separator: " + ", desc: 'Toggle keyboard mode' },
                { key: ['Alt', 'c'], separator: " + ", desc: 'Color picker' },
            ],
        }
    ],
    studentlist: [
        {
            title: 'General',
            keys: [
                { key: ['f', '/'], desc: 'Focus search box', separator: " or " },
                { key: 'c', desc: 'Clear search' },
                { key: 'J', desc: '(hold) Scroll down' },
                { key: 'K', desc: '(hold) Scroll up' },
                { key: 'r', desc: 'Refresh' },
                { key: 'Escape', desc: '(in search box) Clear search' },
                { key: '?', desc: 'Show keyboard shortcuts' },
            ],
        },
        {
            title: 'Marking List',
            keys: [
                { key: 'j', desc: 'Focus down' },
                { key: 'k', desc: 'Focus up' },
                { key: 'h', desc: 'Focus left' },
                { key: 'l', desc: 'Focus right' },
                { key: 'Space', desc: 'Toggle checkbox' },
                { key: 'C', desc: 'Clear all checkboxes' },
                { key: 'g', desc: 'Scroll to top of list' },
                { key: 'G', desc: 'Scroll to bottom of list' },
                { key: 'S', desc: 'Go to Student List' },
                { key: 'A', desc: 'Show all subjects' },
                { key: 'M', desc: 'Show math' },
                { key: 'R', desc: 'Show reading' },
                { key: 'Enter', desc: 'Start grading' },
            ],
        },
        {
            title: 'Student List',
            keys: [
                { key: 'M', desc: 'Go to Marking List' },
            ],
        },
    ],
    grading: [
        {
            title: 'Navigation',
            keys: [
                { key: 'j', desc: 'Page down' },
                { key: 'k', desc: 'Page up' },
                { key: 'n', desc: 'Go to next marking page' },
                { key: 'N', desc: 'Go to previous marking page' },
                { key: 'g', desc: 'Go to first page' },
                { key: 'G', desc: 'Go to last page' },
                { key: 'R', desc: 'Go to reading' },
                { key: 'M', desc: 'Go to math' },
                { key: 'S', desc: 'Skip to the next set' },
                { key: 'p', desc: 'Pause marking (when visible)' },
                { key: 'Enter', desc: 'Complete marking (when visible)' },
                { key: 'Backspace', desc: 'Exit grading' },
            ],
        },
        {
            title: 'Display',
            keys: [
                { key: 'J', desc: '(hold) Scroll answer key down' },
                { key: 'K', desc: '(hold) Scroll answer key up' },
                { key: 'H', desc: ['Toggle header view / dropdown', '(Use j/k/Enter to navigate dropdown)'] },
                { key: 's', desc: 'Single page view' },
                { key: 'A', desc: 'Toggle answer display' },
                { key: ['m', 'D'], desc: ['Highlight changes since last grading', "Note: doesn't work on paused sets"] },
                { key: 'b', desc: ['(hold) Show submission before last grading', "Note: doesn't work on paused sets"] },
                { key: ['Alt', 't'], separator: " + ", desc: 'Toggle timestamp display' },
                { key: '?', desc: 'Show keyboard shortcuts' },
            ],
        },
        {
            title: 'Drawing',
            keys: [
                { key: 'd', desc: 'Open draw tab' },
                { key: 't', desc: ['Open draw tab & focus text area', '(tip: press Tab Enter after typing)'] },
                { key: 'p', desc: 'Select pen' },
                { key: 'h', desc: 'Select highlighter / cycle highlighter type' },
                { key: 'e', desc: 'Select eraser' },
                { key: 'u', desc: 'Undo' },
                { key: 'U', desc: 'Undo stamp' },
                { key: 'r', desc: 'Redo' },
                { key: '-', desc: 'Decrease stamp size' },
                { key: ['+', '='], desc: 'Increase stamp size' },
            ],
        },
        {
            title: 'Marking',
            keys: [
                { key: '1-9', desc: 'Click marking box' },
                { key: 'x', desc: 'Match all previous markings' },
                { key: 'X', desc: 'x all' },
                { key: 'c', desc: "Clear x's" },
            ],
        },
        {
            title: 'Replay',
            keys: [
                { key: 'P', desc: 'Start replay / pause replay' },
                { key: 'p', desc: 'Pause / resume replay' },
                { key: 's', desc: 'Stop replay' },
                { key: ['2', '@'], desc: 'Replay at 2x speed' },
                { key: ['8', '*'], desc: 'Replay at 8x speed' },
            ],
        },
    ],
    drawtab: [
        {
            title: 'Draw Tab',
            keys: [
                { key: 't', desc: 'Focus the text area' },
                { key: 'u', desc: 'Set Stamp Color to "Unchanged"' },
                { key: 'r', desc: 'Set Stamp Color to "Rainbow" / "Rainbow Fill"' },
                { key: 'c', desc: 'Set Stamp Color to "Color Picker"' },
                { key: 'p', desc: 'Select pen' },
                { key: 'h', desc: 'Select highlighter / cycle highlighter type' },
                { key: '-', desc: 'Decrease stamp size' },
                { key: ['+', '='], desc: 'Increase stamp size' },
                { key: 'J', desc: '(hold) Scroll stamps down' },
                { key: 'K', desc: '(hold) Scroll stamps up' },
                { key: ['d', 'Escape'], desc: 'Close draw tab' },
                { key: ['Alt', 'c'], separator: " + ", desc: 'Color picker' },
                { key: '?', desc: 'Show keyboard shortcuts' },
            ],
        },
    ],
    profile: [
        {
            title: 'Profile',
            keys: [
                { key: 'R', desc: 'Switch to reading' },
                { key: 'M', desc: 'Switch to math' },
                { key: 'S', desc: 'Go to Study Records' },
                { key: 'J', desc: '(hold) Scroll down' },
                { key: 'K', desc: '(hold) Scroll up' },
                { key: 'H', desc: '(hold) Scroll chart left' },
                { key: 'L', desc: '(hold) Scroll chart right' },
                { key: 'p', desc: 'Toggle progress chart' },
                { key: 'e', desc: 'Edit profile' },
                { key: 'Backspace', desc: 'Go back to Student List' },
                { key: 'Escape', desc: 'Close progress chart' },
                { key: '?', desc: 'Show keyboard shortcuts' },
            ],
        },
    ],
    studyrecords: [
        {
            title: 'Study Records',
            keys: [
                { key: 'R', desc: 'Switch to reading' },
                { key: 'M', desc: 'Switch to math' },
                { key: 'J', desc: '(hold) Scroll score down' },
                { key: 'K', desc: '(hold) Scroll score up' },
                { key: 'G', desc: 'Scroll to bottom' },
                { key: 'Backspace', desc: 'Go back to Student Profile' },
                { key: '?', desc: 'Show keyboard shortcuts' },
            ],
        },
    ],
};

export const HelpOverlayProvider = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const showHelpOverlay = useCallback((tab = 'general') => {
        setActiveTab(tab);
        setVisible(true);
    }, []);

    const hideHelpOverlay = useCallback(() => setVisible(false), []);

    const toggleHelpOverlay = useCallback((tab = 'general') => {
        if (visible) {
            setVisible(false);
        } else {
            setActiveTab(tab);
            setVisible(true);
        }
    }, [visible]);

    return (
        <HelpOverlayContext.Provider value={{
            helpOverlayVisible: visible,
            helpOverlayActiveTab: activeTab,
            showHelpOverlay,
            hideHelpOverlay,
            toggleHelpOverlay,
            helpTabs: TABS,
        }}>
            {children}
        </HelpOverlayContext.Provider>
    );
};

const handleKeys = (e, { hideHelpOverlay, helpOverlayActiveTab, helpTabs, showHelpOverlay }) => {
    switch (e.key) {
        case "Enter":
        case "Escape":
        case "Backspace":
        case "?":
            hideHelpOverlay();
            e.preventDefault();
            break;
        case "Tab":
            const direction = e.shiftKey ? -1 : 1;
            const tabIndex = (
                (helpTabs.findIndex(t => t.id == helpOverlayActiveTab) ?? 0) + direction + helpTabs.length
            ) % helpTabs.length;
            showHelpOverlay(helpTabs[tabIndex].id);
            e.preventDefault();
            break;
    }
};

const KeyBinding = ({ key: k, desc, separator }) => (
    <div class={styles.keyBinding}>
        <span>
            {Array.isArray(k) ? (
                <>
                    {k.map((key, index) => (
                        <>
                            <span class={styles.key}>{key}</span>
                            {index < k.length - 1 && (separator ?? " / ")}
                        </>
                    ))}
                </>
            ) : (
                <span class={styles.key}>{k}</span>
            )}
        </span>
        {Array.isArray(desc) ? (
            <span>
                {desc.map((d, index) => (
                    <>
                        <span class={styles.desc}>{d}</span>
                        {index < desc.length - 1 && <br />}
                    </>
                ))}
            </span>
        ) : (
            <span class={styles.desc}>{desc}</span>
        )}
    </div>
);

const Section = ({ title, keys }) => (
    <div class={styles.section}>
        <div class={styles.sectionTitle}>{title}</div>
        {keys.map((k, i) => <KeyBinding key={i} {...k} />)}
    </div>
);

export const HelpOverlay = () => {
    const { helpOverlayVisible, helpOverlayActiveTab, hideHelpOverlay, showHelpOverlay, helpTabs } = useHelpOverlay();

    if (!helpOverlayVisible) return null;

    const focusRef = useRef(null);

    useEffect(() => {
        focusRef.current?.focus();
    });

    return (
        <div class={styles.overlay} tabindex="1" onClick={hideHelpOverlay} onKeyDown={e => handleKeys(e, { helpOverlayActiveTab, hideHelpOverlay, helpTabs, showHelpOverlay })} ref={focusRef}>
            <div class={styles.content} onClick={e => e.stopPropagation()}>
                <div class={styles.tabs}>
                    {helpTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => showHelpOverlay(tab.id)}
                            class={`${styles.tab} ${helpOverlayActiveTab === tab.id ? styles.tabActive : ''}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                    <button class={styles.close} onClick={hideHelpOverlay}>X</button>
                </div>
                <div class={styles.sections}>
                    {TAB_CONTENT[helpOverlayActiveTab].map((section, i) => (
                        <Section key={i} {...section} />
                    ))}
                </div>
            </div>
        </div>
    );
};
