import { useEffect, useRef } from 'preact/hooks';

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
    const enabledRef = useRef(false);

    useEffect(() => {
        enabledRef.current = true;

        const appRoot = document.querySelector('app-root');
        if (!appRoot) return;

        loadObserverRef.current = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                if (mutation.target.nodeName === 'LOADING-SPINNER') {
                    if (mutation.removedNodes.length) {
                        if (!document.querySelector('app-atd0020p')) return;
                        onEnable();
                        
                        if (!pageChangeObserverRef.current) {
                            pageChangeObserverRef.current = new MutationObserver((ml) => {
                                for (const m of ml) {
                                    if (m.target.classList.contains('selected')) {
                                        onPageEnter(m.target);
                                    } else {
                                        onPageLeave(m.target);
                                    }
                                }
                            });
                        }
                        
                        pageChangeObserverRef.current.disconnect();
                        document.querySelectorAll('.ATD0020P-worksheet-container').forEach(page => {
                            pageChangeObserverRef.current.observe(page, { attributeFilter: ['class'] });
                        });
                        onPageEnter(document.querySelector('.ATD0020P-worksheet-container.selected'));
                    } else {
                        onStartLoading();
                    }
                    break;
                }
            }
        });

        loadObserverRef.current.observe(appRoot, { childList: true, subtree: true });

        if (document.querySelector('app-atd0020p')) {
            onEnable();
        }

        return () => {
            enabledRef.current = false;
            loadObserverRef.current?.disconnect();
            pageChangeObserverRef.current?.disconnect();
            const activePage = document.querySelector('.ATD0020P-worksheet-container.selected');
            onDisable(activePage);
        };
    }, [onEnable, onPageEnter, onPageLeave, onDisable, onStartLoading]);

    return {
        disable: () => {
            enabledRef.current = false;
            loadObserverRef.current?.disconnect();
            pageChangeObserverRef.current?.disconnect();
        },
    };
};
