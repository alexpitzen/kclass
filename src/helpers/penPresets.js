import penIcon from '../icons/pen.svg';
import highlighterIcon from '../icons/highlighter.svg';
import thinHighlighterIcon from '../icons/thin-highlighter.svg';
import eraserIcon from '../icons/eraser.svg';

const OLD_TO_NEW_PRESET_MAP = {
    'pen': 'pen',
    'thick-highlighter': 'highlighter',
    'thin-highlighter': 'thin-highlighter',
    'eraser': 'eraser',
};

const NEW_TO_OLD_PRESET_MAP = {
    'pen': 'pen',
    'highlighter': 'thick-highlighter',
    'thin-highlighter': 'thin-highlighter',
    'eraser': 'eraser',
};

export const PEN_PRESETS = {
    'pen': { id: 'pen', label: 'Pen', width: 2, alpha: 1 },
    'highlighter': { id: 'highlighter', label: 'Highlighter', width: 25, alpha: 0.2 },
    'thin-highlighter': { id: 'thin-highlighter', label: 'Thin Highlighter', width: 5, alpha: 0.2 },
    'eraser': { id: 'eraser', label: 'Eraser', width: 24, alpha: 1 },
};

export const PRESET_ICONS = {
    'pen': penIcon,
    'highlighter': highlighterIcon,
    'thin-highlighter': thinHighlighterIcon,
    'eraser': eraserIcon,
};

export const getColoredPenIcon = (presetId, color) => {
    let iconHtml = PRESET_ICONS[presetId] || PRESET_ICONS['pen'];
    if (color && presetId !== 'eraser') {
        iconHtml = iconHtml.replace(/fill="[^"]*"/g, `fill="${color}"`);
    }
    return iconHtml;
};

export const getActivePresetId = (eraserEnabled, penWidth, penAlpha) => {
    if (eraserEnabled) return 'eraser';
    if (penWidth === 2 && penAlpha === 1) return 'pen';
    if (penWidth === 25 && Math.abs(penAlpha - 0.2) < 0.01) return 'highlighter';
    if (penWidth === 5 && Math.abs(penAlpha - 0.2) < 0.01) return 'thin-highlighter';
    return null;
};

export const setStampLibPenSettings = (color, width, alpha) => {
    StampLib.setPenSettings({
        color: color,
        width: width,
        alpha: Math.round(alpha * 255),
    });
};

export const mapOldPresetToNew = (oldPresetId) => {
    return OLD_TO_NEW_PRESET_MAP[oldPresetId] || oldPresetId;
};

export const mapNewPresetToOld = (newPresetId) => {
    return NEW_TO_OLD_PRESET_MAP[newPresetId] || newPresetId;
};
