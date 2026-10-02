const $ = globalThis.fQuery;
const { Slider } = globalThis.UI;
const themeKey = 'frostui-slider-demo-theme';

const setTheme = (theme) => {
    if (theme === 'system') {
        $(document.documentElement).removeAttribute('data-ui-theme');
    } else {
        $(document.documentElement).setAttribute('data-ui-theme', theme);
    }

    $('[data-demo-theme]').setValue(theme);
};

const logEvent = (message, className = 'text-body-secondary') => {
    const log = $.findOne('#event-log');
    const entry = $.create('div', {
        class: ['small', 'font-monospace', 'py-2', 'border-bottom', className],
        text: message,
    });

    $.append(log, entry);

    while ($.children(log).length > 50) {
        $.remove($.child(log)[0]);
    }

    $.setScrollY(log, $.height(log, { boxSize: $.SCROLL_BOX }));
};

$.ready(() => {
    let storedTheme;

    try {
        storedTheme = localStorage.getItem(themeKey);
    } catch {
        // The demo remains usable when browser storage is unavailable.
    }

    const requestedTheme = new URLSearchParams(location.search).get('theme');
    const initialTheme = requestedTheme || storedTheme;
    setTheme(['light', 'dark'].includes(initialTheme) ? initialTheme : 'system');

    $('[data-demo-theme]').addEvent('change', (event) => {
        const theme = $.getValue(event.currentTarget);
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

    $('#clear-log').addEvent('click', () => {
        $('#event-log').empty();
    });

    /** Refreshes the committed-value readouts. */
    const refreshValues = () => {
        for (const output of $.find('[data-demo-value-for]')) {
            $.setText(output, $.getValue($.findOneById($.getDataset(output, 'demoValueFor'))));
        }
    };

    $('[data-ui-toggle="slider"]').addEvent('change.ui.slider', refreshValues);
    for (const name of ['slide', 'sliding', 'change', 'slid']) {
        $.addEvent('#methods-slider', `${name}.ui.slider`, (event) => {
            const detail = name === 'sliding' || name === 'slid' ?
                `; value=${JSON.stringify(event.detail)}` : '';
            logEvent(`${name}.ui.slider${detail}; input="${$.getValue(event.currentTarget)}"`);
        });
    }

    for (const node of $.find('[data-ui-toggle="slider"]')) {
        let options = {};
        switch ($.getProperty(node, 'id')) {
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
        const method = $.getDataset(event.currentTarget, 'demoMethod');
        const node = $.findOne('#methods-slider');
        const instance = method === 'dispose' ? $.getData(node, 'slider') : Slider.init(node);
        const output = $.findOne('#method-output');

        switch (method) {
            case 'init':
                $.setText(output, 'Initialized.');
                break;
            case 'dispose':
                if (instance) {
                    instance.dispose();
                    $.setText(output, 'Disposed; the original input is restored.');
                } else {
                    $.setText(output, 'Already disposed.');
                }
                break;
            case 'disable':
                instance.disable();
                $.setText(output, 'Disabled.');
                break;
            case 'enable':
                instance.enable();
                $.setText(output, 'Enabled.');
                break;
            case 'getValue':
                $.setText(output, `Current value: ${JSON.stringify(instance.getValue())}`);
                break;
            case 'setValue': {
                const start = $.getProperty($.findOne('#method-start'), 'valueAsNumber');
                const end = $.getProperty($.findOne('#method-end'), 'valueAsNumber');
                if (!Number.isFinite(start) || !Number.isFinite(end)) {
                    $.setText(output, 'Enter both numeric endpoints.');
                    break;
                }
                instance.setValue(start, end);
                $.setText(output, `Value set to ${JSON.stringify(instance.getValue())}.`);
                break;
            }
        }
        refreshValues();
    });

    $('#disable-fields').addEvent('change', (event) => {
        $.setProperty($.findOne('#form-fields'), 'disabled', $.getProperty(event.currentTarget, 'checked'));
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
            $.setProperty($.findOne('#form-fields'), 'disabled', $.getProperty($.findOne('#disable-fields'), 'checked'));
            refreshValues();
            $.setText('#form-output', 'Defaults restored: volume=60; window=20:80.');
        }, 0);
    });
});
