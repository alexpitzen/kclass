import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { CustomToolbar } from './components/CustomToolbar.jsx';
import { DrawTab } from './components/DrawTab.jsx';
import { PrintOverlayProvider, PrintOverlay, usePrintOverlay } from './components/PrintOverlay.jsx';
import { LoginAssistantsList, RefreshButton } from './components/Misc.jsx';
import { useHDModeExposed } from './hooks/useHDMode.js';
import { useAutoPen } from './hooks/useAutoPen.js';
import { useMarkboxKeys } from './hooks/useMarkboxKeys.js';

const PageChangeManager = ({ keyboardEnabled }) => {
    useHDModeExposed();
    useAutoPen();
    useMarkboxKeys();
    return null;
};

// Wrapper component that exposes print overlay to globals
const PrintOverlayWrapper = () => {
    const printOverlay = usePrintOverlay();

    useEffect(() => {
        window.__showStampPreview = (stamp, dims, maxScale, scale, color, svg, pos) => {
            printOverlay.showStampPreview(stamp, dims, maxScale, scale, color, svg, pos);
        };
        window.__showTextPreview = (text, dims, scale, color, pos) => {
            printOverlay.showTextPreview(text, dims, scale, color, pos);
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

// Main App component that wraps all others
const App = () => {
    return (
        <>
            <CustomToolbar />
            <DrawTab />
            <PageChangeManager keyboardEnabled={false} />
            <LoginAssistantsList />
            <RefreshButton />
            <PrintOverlayWrapper />
        </>
    );
};

// Mount all components under one provider
const appContainer = document.createElement('div');
appContainer.id = 'app-container';
document.body.appendChild(appContainer);

render(
    <PrintOverlayProvider>
        <App />
    </PrintOverlayProvider>,
    appContainer
);

// Cache stamp dimensions once at startup
const initStampDimensions = () => {
    const stamps = window.StampLib?.stamps;
    if (!stamps) {
        setTimeout(initStampDimensions, 1000);
        return;
    }
    for (const category in stamps) {
        for (const stamp of stamps[category]) {
            if (!stamp._cachedDimensions) {
                stamp._cachedDimensions = StampLib.getWriteStampDimensions(stamp, 1);
            }
        }
    }
};
initStampDimensions();

// Disable pinch zoom disabler
function findPinchDisabler() {
    for (let listener of document.eventListeners("touchstart")) {
        if (listener.toString().indexOf("disable pinch zoom") > -1) {
            return listener;
        }
    }
    return null;
}

let pinchDisablerDisabler = setInterval(() => {
    let pinchDisabler = findPinchDisabler();
    if (pinchDisabler) {
        document.removeEventListener("touchstart", pinchDisabler);
        clearInterval(pinchDisablerDisabler);
        const meta = document.querySelector("meta[content*='user-scalable']");
        if (meta) {
            meta.content = "width=410px, initial-scale=1";
        }
    }
}, 1000);

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
