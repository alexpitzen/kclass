import { useEffect, useRef, useCallback } from 'preact/hooks';

export const usePageChange = (options = {}) => {
    const {
        enabled = true,
        onEnable = () => {},
        onPageEnter = () => {},
        onPageLeave = () => {},
        onDisable = () => {},
        onStartLoading = () => {},
    } = options;

    const loadObserverRef = useRef(null);
    const pageChangeObserverRef = useRef(null);
    const callbacksRef = useRef({ onEnable, onPageEnter, onPageLeave, onDisable, onStartLoading });
    const enabledRef = useRef(enabled);

    // Update refs when callbacks change
    callbacksRef.current = { onEnable, onPageEnter, onPageLeave, onDisable, onStartLoading };
    enabledRef.current = enabled;

    const setupPageObserver = useCallback(() => {
        if (!pageChangeObserverRef.current) {
            pageChangeObserverRef.current = new MutationObserver((ml) => {
                if (!enabledRef.current) return;
                for (const m of ml) {
                    if (m.target.classList.contains('selected')) {
                        callbacksRef.current.onPageEnter(m.target);
                    } else {
                        callbacksRef.current.onPageLeave(m.target);
                    }
                }
            });
        }

        pageChangeObserverRef.current.disconnect();
        document.querySelectorAll('.ATD0020P-worksheet-container').forEach(page => {
            pageChangeObserverRef.current.observe(page, { attributeFilter: ['class'] });
        });
        if (enabledRef.current) {
            callbacksRef.current.onPageEnter(document.querySelector('.ATD0020P-worksheet-container.selected'));
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            loadObserverRef.current?.disconnect();
            pageChangeObserverRef.current?.disconnect();
            const activePage = document.querySelector('.ATD0020P-worksheet-container.selected');
            callbacksRef.current.onDisable(activePage);
            return;
        }

        const appRoot = document.querySelector('app-root');
        if (!appRoot) return;

        loadObserverRef.current = new MutationObserver((mutationList) => {
            if (!enabledRef.current) return;
            for (const mutation of mutationList) {
                if (mutation.target.nodeName === 'LOADING-SPINNER') {
                    if (mutation.removedNodes.length) {
                        if (!document.querySelector('app-atd0020p')) return;
                        callbacksRef.current.onEnable();
                        setupPageObserver();
                    } else {
                        callbacksRef.current.onStartLoading();
                    }
                    break;
                }
            }
        });

        loadObserverRef.current.observe(appRoot, { childList: true, subtree: true });

        if (document.querySelector('app-atd0020p')) {
            callbacksRef.current.onEnable();
            setupPageObserver();
        }

        return () => {
            console.log("****** calling usePageChange return value")
            loadObserverRef.current?.disconnect();
            pageChangeObserverRef.current?.disconnect();
            const activePage = document.querySelector('.ATD0020P-worksheet-container.selected');
            callbacksRef.current.onDisable(activePage);
        };
    }, [enabled, setupPageObserver]);

    const disable = useCallback(() => {
        console.log("****** calling usePageChange disable")
        loadObserverRef.current?.disconnect();
        pageChangeObserverRef.current?.disconnect();
    }, []);

    return { disable };
};
