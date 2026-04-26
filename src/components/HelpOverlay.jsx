import { createContext } from 'preact';
import { useContext, useState, useCallback } from 'preact/hooks';

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
    general: `Navigation:
j: down
k: up
g: top
G: bottom
n: next active page
N: previous active page
S: go to next set
R: switch to reading
M: switch to math
H: header dropdown or show/hide header
p: pause marking (when bottom pause button is visible)
J (hold): scroll answer key down
K (hold): scroll answer key up
s: display one side of page (instead of 2)

Drawing:
d: open the draw tab
t: open the draw tab & focus the text area
p: select pen
h: select highlighter / cycle highlighter type
e: select eraser
u: undo
r: redo
U: undo stamp
-: decrease stamp size
+/=: increase stamp size

General:
escape: close dialog
backspace: exit/cancel
enter: submit/accept dialog`,
    studentlist: `f or /: focus search
c: clear search
C: check all students
g: go to top of list
G: go to bottom of list
J: scroll student list down
K: scroll student list up
j: move down in list
k: move up in list
h: move left in list
l: move right in list
space: toggle checkbox
S: switch to student tab
r: refresh student list
A: show all students
M: show math students
R: show KNA students
enter: submit
escape: close dialog`,
    grading: `j: down
k: up
g: go to first page
G: go to last page
X: x all
x: match previous markings
c: clear x's
backspace: exit/cancel
n: next correction page
N: previous correction page
p: pause marking
P: start replay / pause replay
s: single page mode
u: undo
U: undo stamp
r: redo
2 or @: replay at 2x speed
8 or *: replay at 8x speed
A: toggle answer display
enter: submit
d: open draw tab
t: open draw tab & focus text area
m or D: show what changed since last grading
b (hold): show previous submission
h: select highlighter
e: select eraser
R: switch to reading
M: switch to math
H: header toggle
J: scroll answer key down
K: scroll answer key up
-: decrease stamp size
+/=: increase stamp size
escape: close dialog`,
    drawtab: `t: focus the text area
u: set Stamp Color to "Unchanged"
r: set Stamp Color to "Rainbow" / "Rainbow Fill"
c: set Stamp Color to "Color Picker"
p: select pen
h: select highlighter / cycle highlighter type
-: decrease stamp size
+/=: increase stamp size
J (hold): scroll stamps down
K (hold): scroll stamps up
d: close draw tab
escape: close draw tab`,
    profile: `R: switch to reading
M: switch to math
S: go to set
J: scroll down
K: scroll up
H: scroll chart left
L: scroll chart right
p: toggle progress chart
e: edit
backspace: exit
escape: close
enter: submit`,
    studyrecords: `R: switch to reading
M: switch to math
backspace: exit
J: scroll score down
K: scroll score up
G: scroll to bottom`,
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

export const HelpOverlay = () => {
    const { helpOverlayVisible, helpOverlayActiveTab, hideHelpOverlay, showHelpOverlay, helpTabs } = useHelpOverlay();

    if (!helpOverlayVisible) return null;

    return (
        <div class="help-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <div class="help-overlay-content" style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '20px',
                maxWidth: '600px',
                height: 'calc(100vh - 40px)',
                maxHeight: '800px',
                overflow: 'auto',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}>
                <div class="help-tabs" style={{
                    display: 'flex',
                    borderBottom: '1px solid #ccc',
                    marginBottom: '16px',
                }}>
                    {helpTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => showHelpOverlay(tab.id)}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                background: helpOverlayActiveTab === tab.id ? '#007bff' : 'transparent',
                                color: helpOverlayActiveTab === tab.id ? 'white' : '#333',
                                cursor: 'pointer',
                                borderBottom: helpOverlayActiveTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div class="help-tab-content" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {TAB_CONTENT[helpOverlayActiveTab]}
                </div>
                <button
                    onClick={hideHelpOverlay}
                    style={{
                        marginTop: '16px',
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
};
