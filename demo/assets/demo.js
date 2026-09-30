const $ = globalThis.fQuery;
const { Slider } = globalThis.UI;
const themeKey = 'frostui-slider-demo-theme';

/**
 * Applies the chosen document theme and updates the selector.
 * @param {string} theme The theme name.
 */
const setTheme = (theme) => {
    if (theme === 'system') {
        document.documentElement.removeAttribute('data-ui-theme');
    } else {
        document.documentElement.setAttribute('data-ui-theme', theme);
    }
    $('[data-demo-theme]').setValue(theme);
};

/** Refreshes the committed-value readouts. */
const refreshValues = () => {
    for (const output of document.querySelectorAll('[data-demo-value-for]')) {
        output.textContent = document.getElementById(output.dataset.demoValueFor).value;
    }
};

$.ready(() => {
    let storedTheme;
    try {
        storedTheme = localStorage.getItem(themeKey);
    } catch {
        // The demo remains usable when browser storage is unavailable.
    }
    setTheme(['light', 'dark'].includes(storedTheme) ? storedTheme : 'system');

    $('[data-demo-theme]').addEvent('change', (event) => {
        const theme = event.currentTarget.value;
        setTheme(theme);
        try {
            if (theme === 'system') {
                localStorage.removeItem(themeKey);
            } else {
                localStorage.setItem(themeKey, theme);
            }
        } catch {
            // Theme selection still applies for the current page.
        }
    });

    $('[data-ui-toggle="slider"]').addEvent('change.ui.slider', refreshValues);
    for (const name of ['slide', 'sliding', 'change', 'slid']) {
        $.addEvent('#methods-slider', `${name}.ui.slider`, (event) => {
            const log = document.querySelector('#event-log');
            const detail = name === 'sliding' || name === 'slid' ?
                `; value=${JSON.stringify(event.detail)}` : '';
            const entry = `${name}.ui.slider${detail}; input="${event.currentTarget.value}"`;
            const lines = log.textContent ? log.textContent.split('\n') : [];
            log.textContent = [...lines.slice(-99), entry].join('\n');
            log.scrollTop = log.scrollHeight;
        });
    }

    for (const node of document.querySelectorAll('[data-ui-toggle="slider"]')) {
        let options = {};
        switch (node.id) {
            case 'formatted':
                options = { valueText: (value) => `${value}%` };
                break;
            case 'formatted-range':
                options = {
                    valueText: (value) => `$${value}`,
                    rangeText: (start, end) => `$${start} – $${end}`,
                };
                break;
            case 'negative':
                options = { valueText: (value) => `${value} °C` };
                break;
        }
        Slider.init(node, options);
    }
    refreshValues();

    $('[data-demo-method]').addEvent('click', (event) => {
        const method = event.currentTarget.dataset.demoMethod;
        const node = document.querySelector('#methods-slider');
        const instance = method === 'dispose' ? $.getData(node, 'slider') : Slider.init(node);
        const output = document.querySelector('#method-output');

        switch (method) {
            case 'init':
                output.textContent = 'Initialized.';
                break;
            case 'dispose':
                if (instance) {
                    instance.dispose();
                    output.textContent = 'Disposed; the original input is restored.';
                } else {
                    output.textContent = 'Already disposed.';
                }
                break;
            case 'disable':
                instance.disable();
                output.textContent = 'Disabled.';
                break;
            case 'enable':
                instance.enable();
                output.textContent = 'Enabled.';
                break;
            case 'getValue':
                output.textContent = `Current value: ${JSON.stringify(instance.getValue())}`;
                break;
            case 'setValue': {
                const start = document.querySelector('#method-start').valueAsNumber;
                const end = document.querySelector('#method-end').valueAsNumber;
                if (!Number.isFinite(start) || !Number.isFinite(end)) {
                    output.textContent = 'Enter both numeric endpoints.';
                    break;
                }
                instance.setValue(start, end);
                output.textContent = `Value set to ${JSON.stringify(instance.getValue())}.`;
                break;
            }
        }
        refreshValues();
    });

    $('#clear-log').addEvent('click', () => $.setText('#event-log', ''));
    $('#disable-fields').addEvent('change', (event) => {
        document.querySelector('#form-fields').disabled = event.currentTarget.checked;
    });
    $('#slider-form').addEvent('submit', (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        $.setText('#form-output', data.has('volume') ?
            `Submitted volume=${data.get('volume')}; window=${data.get('window')}.` :
            'No preferences submitted: the fields are disabled.');
    });
    $('#slider-form').addEvent('reset', () => {
        setTimeout(() => {
            document.querySelector('#form-fields').disabled = document.querySelector('#disable-fields').checked;
            refreshValues();
            $.setText('#form-output', 'Defaults restored: volume=60; window=20:80.');
        }, 0);
    });
});
