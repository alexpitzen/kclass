import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { keyindexmap, keyindexdisplay } from '../helpers/constants.js';
import { usePageChange } from './usePageChange.js';

export const useMarkboxKeys = () => {
    const [markboxMap, setMarkboxMap] = useState({});
    const [enabled, setEnabled] = useState(false);
    const enabledRef = useRef(false);
    enabledRef.current = enabled;

    const addMarkboxKeys = useCallback((page) => {
        if (!page) return;
        const boxparent = page.querySelector('.mark-boxs');
        if (!boxparent) return;

        // Remove existing keys first (in case page was revisited)
        boxparent.querySelectorAll('.markboxkey').forEach(el => el.remove());

        const parentWidth = boxparent.offsetWidth;
        const newMap = {};

        page.querySelectorAll('.mark-box').forEach((box, index) => {
            let key = index + 1;
            if (key > 9) {
                key = keyindexmap[key - 10];
            } else {
                key = String(key);
            }

            const markboxkey = document.createElement('div');
            if (box.offsetLeft >= 3) {
                markboxkey.style.right = `${parentWidth - box.offsetLeft - 4}px`;
                markboxkey.style.top = `${box.offsetTop + 4}px`;
            } else {
                markboxkey.style.left = '0px';
                markboxkey.style.top = `${box.offsetTop - 7}px`;
            }
            markboxkey.className = 'markboxkey';
            markboxkey.textContent = keyindexdisplay[key] ?? key;
            newMap[key] = index;
            boxparent.appendChild(markboxkey);
        });

        setMarkboxMap(newMap);
        window.__markboxMap = newMap;
    }, []);

    const removeMarkboxKeys = useCallback((page) => {
        if (!page) return;
        const boxparent = page.querySelector('.mark-boxs');
        boxparent?.querySelectorAll('.markboxkey').forEach(el => el.remove());
        // Don't clear markboxMap - let addMarkboxKeys handle it
    }, []);

    const onPageEnter = useCallback((page) => {
        if (enabledRef.current) {
            addMarkboxKeys(page);
        }
    }, [addMarkboxKeys]);

    const onPageLeave = useCallback((page) => {
        removeMarkboxKeys(page);
    }, [removeMarkboxKeys]);

    const onDisable = useCallback((page) => {
        removeMarkboxKeys(page);
    }, [removeMarkboxKeys]);

    usePageChange({
        enabled: enabledRef.current,
        onEnable: () => {},
        onPageEnter,
        onPageLeave,
        onDisable,
    });

    // Set up globals immediately (not dependent on state)
    useEffect(() => {
        window.__addMarkboxKeys = addMarkboxKeys;
        window.__removeMarkboxKeys = removeMarkboxKeys;
        window.__setMarkboxKeysEnabled = setEnabled;

        return () => {
            delete window.__addMarkboxKeys;
            delete window.__removeMarkboxKeys;
            delete window.__setMarkboxKeysEnabled;
        };
    }, [addMarkboxKeys, removeMarkboxKeys, setEnabled]);

    return { markboxMap };
};
