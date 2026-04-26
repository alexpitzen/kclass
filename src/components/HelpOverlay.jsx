import { createContext } from 'preact';
import { useContext, useState, useCallback } from 'preact/hooks';
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
    { id: 'studentlist', label: 'Student List' },
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
                { key: 'j', desc: 'down' },
                { key: 'k', desc: 'up' },
                { key: 'g', desc: 'top' },
                { key: 'G', desc: 'bottom' },
                { key: 'n', desc: 'next active page' },
                { key: 'N', desc: 'previous active page' },
                { key: 'S', desc: 'go to next set' },
                { key: 'R', desc: 'switch to reading' },
                { key: 'M', desc: 'switch to math' },
                { key: 'H', desc: 'header dropdown or show/hide header' },
                { key: 'p', desc: 'pause marking (when bottom pause button is visible)' },
                { key: 'J', desc: '(hold) scroll answer key down' },
                { key: 'K', desc: '(hold) scroll answer key up' },
                { key: 's', desc: 'display one side of page (instead of 2)' },
            ],
        },
        {
            title: 'Drawing',
            keys: [
                { key: 'd', desc: 'open the draw tab' },
                { key: 't', desc: 'open the draw tab & focus the text area' },
                { key: 'p', desc: 'select pen' },
                { key: 'h', desc: 'select highlighter / cycle highlighter type' },
                { key: 'e', desc: 'select eraser' },
                { key: 'u', desc: 'undo' },
                { key: 'r', desc: 'redo' },
                { key: 'U', desc: 'undo stamp' },
                { key: '-', desc: 'decrease stamp size' },
                { key: ['+', '='], desc: 'increase stamp size' },
            ],
        },
        {
            title: 'General',
            keys: [
                { key: 'escape', desc: 'close dialog' },
                { key: 'backspace', desc: 'exit/cancel' },
                { key: 'enter', desc: 'submit/accept dialog' },
            ],
        },
    ],
    studentlist: [
        {
            title: 'Student List',
            keys: [
                { key: ['f', '/'], desc: 'focus search' },
                { key: 'c', desc: 'clear search' },
                { key: 'C', desc: 'check all students' },
                { key: 'g', desc: 'go to top of list' },
                { key: 'G', desc: 'go to bottom of list' },
                { key: 'J', desc: 'scroll student list down' },
                { key: 'K', desc: 'scroll student list up' },
                { key: 'j', desc: 'move down in list' },
                { key: 'k', desc: 'move up in list' },
                { key: 'h', desc: 'move left in list' },
                { key: 'l', desc: 'move right in list' },
                { key: 'space', desc: 'toggle checkbox' },
                { key: 'S', desc: 'switch to student tab' },
                { key: 'r', desc: 'refresh student list' },
                { key: 'A', desc: 'show all students' },
                { key: 'M', desc: 'show math students' },
                { key: 'R', desc: 'show KNA students' },
                { key: 'enter', desc: 'submit' },
                { key: 'escape', desc: 'close dialog' },
            ],
        },
    ],
    grading: [
        {
            title: 'Navigation',
            keys: [
                { key: 'j', desc: 'down' },
                { key: 'k', desc: 'up' },
                { key: 'g', desc: 'go to first page' },
                { key: 'G', desc: 'go to last page' },
                { key: 'n', desc: 'next correction page' },
                { key: 'N', desc: 'previous correction page' },
                { key: 'R', desc: 'switch to reading' },
                { key: 'M', desc: 'switch to math' },
                { key: 'H', desc: 'header toggle' },
                { key: 'J', desc: 'scroll answer key down' },
                { key: 'K', desc: 'scroll answer key up' },
            ],
        },
        {
            title: 'Marking',
            keys: [
                { key: 'X', desc: 'x all' },
                { key: 'x', desc: 'match previous markings' },
                { key: 'c', desc: "clear x's" },
                { key: 'A', desc: 'toggle answer display' },
                { key: 'backspace', desc: 'exit/cancel' },
            ],
        },
        {
            title: 'Replay',
            keys: [
                { key: 'P', desc: 'start replay / pause replay' },
                { key: 's', desc: 'stop replay' },
                { key: 'p', desc: 'pause / resume replay' },
                { key: ['2', '@'], desc: 'replay at 2x speed' },
                { key: ['8', '*'], desc: 'replay at 8x speed' },
            ],
        },
        {
            title: 'Drawing',
            keys: [
                { key: 'd', desc: 'open draw tab' },
                { key: 't', desc: 'open draw tab & focus text area' },
                { key: 'u', desc: 'undo' },
                { key: 'U', desc: 'undo stamp' },
                { key: 'r', desc: 'redo' },
                { key: 'h', desc: 'select highlighter' },
                { key: 'e', desc: 'select eraser' },
                { key: '-', desc: 'decrease stamp size' },
                { key: ['+', '='], desc: 'increase stamp size' },
            ],
        },
        {
            title: 'Compare',
            keys: [
                { key: ['m', 'D'], desc: 'show what changed since last grading' },
                { key: 'b', desc: '(hold) show previous submission' },
            ],
        },
    ],
    drawtab: [
        {
            title: 'Draw Tab',
            keys: [
                { key: 't', desc: 'focus the text area' },
                { key: 'u', desc: 'set Stamp Color to "Unchanged"' },
                { key: 'r', desc: 'set Stamp Color to "Rainbow" / "Rainbow Fill"' },
                { key: 'c', desc: 'set Stamp Color to "Color Picker"' },
                { key: 'p', desc: 'select pen' },
                { key: 'h', desc: 'select highlighter / cycle highlighter type' },
                { key: '-', desc: 'decrease stamp size' },
                { key: ['+', '='], desc: 'increase stamp size' },
                { key: 'J', desc: '(hold) scroll stamps down' },
                { key: 'K', desc: '(hold) scroll stamps up' },
                { key: 'd', desc: 'close draw tab' },
                { key: 'escape', desc: 'close draw tab' },
            ],
        },
    ],
    profile: [
        {
            title: 'Profile',
            keys: [
                { key: 'R', desc: 'switch to reading' },
                { key: 'M', desc: 'switch to math' },
                { key: 'S', desc: 'go to set' },
                { key: 'J', desc: 'scroll down' },
                { key: 'K', desc: 'scroll up' },
                { key: 'H', desc: 'scroll chart left' },
                { key: 'L', desc: 'scroll chart right' },
                { key: 'p', desc: 'toggle progress chart' },
                { key: 'e', desc: 'edit' },
                { key: 'backspace', desc: 'exit' },
                { key: 'escape', desc: 'close' },
                { key: 'enter', desc: 'submit' },
            ],
        },
    ],
    studyrecords: [
        {
            title: 'Study Records',
            keys: [
                { key: 'R', desc: 'switch to reading' },
                { key: 'M', desc: 'switch to math' },
                { key: 'backspace', desc: 'exit' },
                { key: 'J', desc: 'scroll score down' },
                { key: 'K', desc: 'scroll score up' },
                { key: 'G', desc: 'scroll to bottom' },
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

const KeyBinding = ({ key: k, desc }) => (
    <div class={styles.keyBinding}>
        {Array.isArray(k) ? (
            <span>
                {k.map((key, index) => (
                    <>
                        <span class={styles.key}>{key}</span>
                        {index < k.length - 1 && " or "}
                    </>
                ))}
            </span>
        ) : (
            <span class={styles.key}>{k}</span>
        )}
        <span class={styles.desc}>{desc}</span>
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

    return (
        <div class={styles.overlay} onClick={hideHelpOverlay}>
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
                </div>
                <div class={styles.sections}>
                    {TAB_CONTENT[helpOverlayActiveTab].map((section, i) => (
                        <Section key={i} {...section} />
                    ))}
                </div>
                <button class={styles.close} onClick={hideHelpOverlay}>
                    Close
                </button>
            </div>
        </div>
    );
};
