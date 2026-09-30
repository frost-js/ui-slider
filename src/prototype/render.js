import $ from '@fr0st/query';

/**
 * Render the slider.
 */
export function _render() {
    this._container = $.create('div', {
        class: this.constructor.classes.container,
        attributes: {
            role: 'none',
        },
    });

    this._renderTicks();

    this._slider = $.create('div', {
        class: this.constructor.classes.slider,
    });
    $.append(this._container, this._slider);

    if (this._options.orientation === 'vertical') {
        $.setStyle(this._slider, {
            width: `${this._options.sliderSize}px`,
            height: `${this._options.verticalHeight}px`,
        });
    } else {
        $.setStyle(this._slider, {
            width: '100%',
            height: `${this._options.sliderSize}px`,
        });
    }

    if (this._options.range) {
        this._barLow = this._renderBar(this._options.low);
        $.append(this._slider, this._barLow);
    }

    this._barSelection = this._renderBar(this._options.selection);
    $.append(this._slider, this._barSelection);

    this._barHigh = this._renderBar(this._options.high);
    $.append(this._slider, this._barHigh);

    this._renderRangeHighlights();

    if (this._options.range) {
        this._handleStart = this._renderHandle();
        $.append(this._container, this._handleStart);

        this._handleEnd = this._renderHandle();
        $.append(this._container, this._handleEnd);
    } else {
        this._handle = this._renderHandle();
        $.append(this._container, this._handle);
    }

    if (this._options.tooltip) {
        if (this._options.range) {
            this._tooltip = this._createTooltip(this._barSelection, (this._options.handleSize - this._options.sliderSize) / 2);
        } else {
            this._tooltip = this._createTooltip(this._handle);
        }
    }

    // hide the input node
    $.addClass(this._node, this.constructor.classes.hide);
    $.setAttribute(this._node, { tabindex: -1 });

    $.before(this._node, this._container);
};

/**
 * Render a progress bar.
 * @param {string} [style] The background style.
 * @returns {HTMLElement} The progress bar.
 */
export function _renderBar(style) {
    const bar = $.create('div', {
        class: this.constructor.classes.sliderBar,
        style: {
            backgroundColor: 'transparent',
            transition: 'none',
        },
    });

    if (style) {
        $.addClass(bar, style);
    }

    let sizeStyle;
    let offsetStyle;
    if (this._options.orientation === 'vertical') {
        sizeStyle = 'width';
        offsetStyle = this._options.reversed ? 'bottom' : 'top';
    } else {
        sizeStyle = 'height';
        offsetStyle = this._options.reversed ? 'right' : 'left';
    }

    $.setStyle(bar, {
        [sizeStyle]: '100%',
        [offsetStyle]: '0',
    });

    return bar;
};

/**
 * Render a handle.
 * @returns {HTMLElement} The handle.
 */
export function _renderHandle() {
    const handle = $.create('button', {
        class: this.constructor.classes.handle,
        attributes: {
            'type': 'button',
            'role': 'slider',
            'aria-valuemin': this._options.min,
            'aria-valuemax': this._options.max,
            'aria-valuenow': '',
            'aria-valuetext': '',
            'aria-required': $.getProperty(this._node, 'required'),
        },
    });

    if (this._label) {
        const labelId = $.getAttribute(this._label, 'id');
        $.setAttribute(handle, { 'aria-labelledby': labelId });
    }

    if (this._options.orientation === 'vertical') {
        $.setStyle(handle, {
            width: `${this._options.handleSize}px`,
            height: `${this._options.handleSize * this._options.handleSizeRatio}px`,
            left: `${this._options.sliderSize / 2}px`,
        });
    } else {
        $.setStyle(handle, {
            width: `${this._options.handleSize * this._options.handleSizeRatio}px`,
            height: `${this._options.handleSize}px`,
            top: `${this._options.sliderSize / 2}px`,
        });
    }

    return handle;
};

/**
 * Render highlight ranges.
 */
export function _renderRangeHighlights() {
    for (const range of this._options.rangeHighlights) {
        const highlightBar = this._renderBar(range.style);

        const startPercent = this._getPercent(range.start);
        const endPercent = this._getPercent(range.end);
        const percent = endPercent - startPercent;

        if (this._options.orientation === 'vertical') {
            $.setStyle(highlightBar, {
                height: `${percent}%`,
                top: `${startPercent}`,
            });
        } else {
            $.setStyle(highlightBar, {
                width: `${percent}%`,
                left: `${startPercent}%`,
            });
        }

        $.append(this._slider, highlightBar);
    }
};

/**
 * Render slider ticks.
 */
export function _renderTicks() {
    this._tickContainer = $.create('div');
    this._ticks = [];

    for (const [index, value] of this._options.ticks.entries()) {
        const tickContainer = $.create('div');

        const tick = $.create('div', {
            dataset: {
                uiValue: value,
            },
        });

        let percent = this._getPercent(value);

        if (this._options.reversed) {
            percent = 100 - percent;
        }

        $.setStyle(tick, {
            width: `${this._options.tickSize}px`,
            height: `${this._options.tickSize}px`,
        });

        if (this._options.orientation === 'vertical') {
            $.setStyle(tick, {
                bottom: `${percent}%`,
                left: '50%',
            });
        } else {
            $.setStyle(tick, {
                top: '50%',
                left: `${percent}%`,
            });
        }

        $.append(tickContainer, tick);

        if (this._options.tickLabels && this._options.tickLabels[index]) {
            const tickLabel = $.create('small', {
                text: this._options.tickLabels[index],
                class: this.constructor.classes.tickLabel,
            });

            if (this._options.orientation === 'vertical') {
                $.setStyle(tickLabel, {
                    top: `${percent}%`,
                    left: `${this._options.tickSize / 2}px`,
                    transform: 'translateY(-50%)',
                });
            } else {
                $.setStyle(tickLabel, {
                    top: `${this._options.tickSize / 2}px`,
                    left: `${percent}%`,
                    transform: 'translateX(-50%)',
                });
            }

            $.append(tickContainer, tickLabel);
        }

        $.append(this._tickContainer, tickContainer);

        this._ticks.push(tick);
    }

    $.append(this._container, this._tickContainer);
};
