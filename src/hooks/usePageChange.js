import { useEffect, useRef, useCallback } from 'preact/hooks';

export const usePageChange = (options = {}) => {
    const {
        onEnable = () => {},
        onPageEnter = () => {},
        onPageLeave = () => {},
        onDisable = () => {},
        onStartLoading = () => {},
    } = options;

    const loadObserverRef = useRef(null);
    const pageChangeObserverRef = useRef(null);
    const callbacksRef = useRef({ onEnable, onPageEnter, onPageLeave, onDisable, onStartLoading });
    
    // Update refs when callbacks change
    callbacksRef.current = { onEnable, onPageEnter, onPageLeave, onDisable, onStartLoading };

    const setupPageObserver = useCallback(() => {
        if (!pageChangeObserverRef.current) {
            pageChangeObserverRef.current = new MutationObserver((ml) => {
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
        callbacksRef.current.onPageEnter(document.querySelector('.ATD0020P-worksheet-container.selected'));
    }, []);

    useEffect(() => {
        const appRoot = document.querySelector('app-root');
        if (!appRoot) return;

        const { onEnable, onPageEnter, onPageLeave, onStartLoading } = callbacksRef.current;

        loadObserverRef.current = new MutationObserver((mutationList) => {
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
            loadObserverRef.current?.disconnect();
            pageChangeObserverRef.current?.disconnect();
            const activePage = document.querySelector('.ATD0020P-worksheet-container.selected');
            callbacksRef.current.onDisable(activePage);
        };
    }, []); // Empty deps - use refs for callbacks

    const disable = useCallback(() => {
        loadObserverRef.current?.disconnect();
        pageChangeObserverRef.current?.disconnect();
    }, []);

    return { disable };
};
