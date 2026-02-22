import { useState, useEffect, useCallback } from 'preact/hooks';
import { keyindexmap, keyindexdisplay } from '../helpers/constants.js';

export const useMarkboxKeys = (enabled) => {
    const [markboxMap, setMarkboxMap] = useState({});

    const addMarkboxKeys = useCallback((page) => {
        if (!page) return;
        const boxparent = page.querySelector('.mark-boxs');
        if (!boxparent) return;

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
    }, []);

    const removeMarkboxKeys = useCallback((page) => {
        if (!page) return;
        const boxparent = page.querySelector('.mark-boxs');
        boxparent?.querySelectorAll('.markboxkey').forEach(el => el.remove());
        setMarkboxMap({});
    }, []);

    useEffect(() => {
        if (!enabled) return;
        
        window.__addMarkboxKeys = addMarkboxKeys;
        window.__removeMarkboxKeys = removeMarkboxKeys;

        return () => {
            delete window.__addMarkboxKeys;
            delete window.__removeMarkboxKeys;
        };
    }, [enabled, addMarkboxKeys, removeMarkboxKeys]);

    return { markboxMap };
};
