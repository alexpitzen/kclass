import { render } from 'preact';
import { CustomToolbar } from './components/CustomToolbar.jsx';
import { DrawTab } from './components/DrawTab.jsx';
import { PrintOverlayProvider, PrintOverlay, usePrintOverlay } from './components/PrintOverlay.jsx';
import { KeyboardModeToggle } from './components/KeyboardModeToggle.jsx';
import { LoginAssistantsList, RefreshButton } from './components/Misc.jsx';
import { useHDModeExposed } from './hooks/useHDMode.js';
import { useAutoPen } from './hooks/useAutoPen.js';
import { useMarkboxKeys } from './hooks/useMarkboxKeys.js';

const PageChangeManager = ({ keyboardEnabled }) => {
    useHDModeExposed();
    useAutoPen();
    useMarkboxKeys(keyboardEnabled);
    return null;
};

// Wrapper component that exposes print overlay to globals
const PrintOverlayWrapper = () => {
    const printOverlay = usePrintOverlay();
    
    useEffect(() => {
        window.__showStampPreview = (stamp, dims, maxScale, scale, color, svg) => {
            printOverlay.showStampPreview(stamp, dims, maxScale, scale, color, svg);
        };
        window.__showTextPreview = (text, dims, scale, color) => {
            printOverlay.showTextPreview(text, dims, scale, color);
        };
        window.__hidePrintPreview = () => {
            printOverlay.hidePreview();
        };
        
        return () => {
            delete window.__showStampPreview;
            delete window.__showTextPreview;
            delete window.__hidePrintPreview;
        };
    }, [printOverlay]);
    
    return <PrintOverlay />;
};

// DrawTab ref for keyboard handler
const drawTabRef = { current: null };

// Mount components
const toolbarContainer = document.createElement('div');
toolbarContainer.id = 'custom-toolbar-container';
document.body.appendChild(toolbarContainer);
render(<CustomToolbar />, toolbarContainer);

const drawtabContainer = document.createElement('div');
drawtabContainer.id = 'drawtab-container';
document.body.appendChild(drawtabContainer);
render(<DrawTab ref={(el) => { drawTabRef.current = el; }} />, drawtabContainer);

const keyboardContainer = document.createElement('div');
keyboardContainer.id = 'keyboard-container';
document.body.appendChild(keyboardContainer);
render(<KeyboardModeToggle drawTabRef={drawTabRef} />, keyboardContainer);

const pageChangeContainer = document.createElement('div');
pageChangeContainer.id = 'page-change-container';
document.body.appendChild(pageChangeContainer);
render(<PageChangeManager keyboardEnabled={false} />, pageChangeContainer);

const miscContainer = document.createElement('div');
miscContainer.id = 'misc-container';
document.body.appendChild(miscContainer);
render(<><LoginAssistantsList /><RefreshButton /></>, miscContainer);

// Wrap PrintOverlay in provider
const appContainer = document.createElement('div');
appContainer.id = 'app-container';
document.body.appendChild(appContainer);
render(
    <PrintOverlayProvider>
        <PrintOverlayWrapper />
    </PrintOverlayProvider>,
    appContainer
);

// Initialize Angular context
function getngc() {
    const ngc = document.querySelector("app-root")?.__ngContext__;
    if (!ngc) {
        setTimeout(getngc, 1000);
        return;
    }
    for (let i = ngc.length; i >= 0; i--) {
        if (ngc[i]?.context) {
            window.kclass = window.kclass || {};
            window.kclass.ng = ngc[i];
            break;
        }
    }
}
getngc();
