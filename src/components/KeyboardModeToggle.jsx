import { useState } from 'preact/hooks';
import { useKeyboardMode, keyboardHelpText } from '../hooks/useKeyboardMode.js';

export const KeyboardModeToggle = ({ drawTabRef }) => {
    const [enabled, setEnabled] = useState(false);
    useKeyboardMode(enabled, drawTabRef);

    return (
        <div class="toggle">
            <input
                type="checkbox"
                id="kbbtn"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                title={keyboardHelpText}
            />
            <label for="kbbtn" title={keyboardHelpText}>Keyboard mode</label>
        </div>
    );
};
