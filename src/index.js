import { initComponent } from '@fr0st/ui';
import { _events, _eventsRange, _eventsTooltip } from './prototype/events.js';
import { _checkRangeValue, _checkTicks, _clampValue, _createTooltip, _getPercent, _getValue, _moveHandle, _refreshDisabled, _setValue, _setValueRange, _updatePercent, _updatePercentRange, _updateTicks } from './prototype/helpers.js';
import { _render, _renderBar, _renderHandle, _renderRangeHighlights, _renderTicks } from './prototype/render.js';
import Slider from './slider.js';

// Slider default options
Slider.defaults = {
    min: 0,
    max: 10,
    defaultValue: 0,
    orientation: 'horizontal',
    scale: 'linear',
    valueText: (value) => value,
    rangeText: (start, end) => `${start} - ${end}`,
    tickSize: 30,
    handleSize: 20,
    handleSizeRatio: .75,
    sliderSize: 10,
    verticalHeight: 200,
    step: 1,
    tooltip: 'show',
    tooltipPlacement: null,
    low: null,
    selection: 'bg-primary',
    high: null,
    ticks: [],
    tickLabels: [],
    tickSnapBounds: 0,
    lockToTicks: false,
    rangeHighlights: [],
    range: false,
    rangeSeparator: ',',
    reversed: false,
    disabledOpacity: .5,
};

// Slider classes
Slider.classes = {
    container: 'position-relative my-2',
    handle: 'bg-body-tertiary border rounded focus-ring position-absolute translate-middle z-2',
    hide: 'visually-hidden',
    slider: 'progress position-relative',
    sliderBar: 'progress-bar position-absolute',
    tick: 'progress rounded-circle position-absolute translate-middle',
    tickFilled: 'progress-bar z-1',
    tickLabel: 'position-absolute p-1',
};

// Slider prototype
const proto = Slider.prototype;

proto._checkRangeValue = _checkRangeValue;
proto._checkTicks = _checkTicks;
proto._clampValue = _clampValue;
proto._createTooltip = _createTooltip;
proto._events = _events;
proto._eventsRange = _eventsRange;
proto._eventsTooltip = _eventsTooltip;
proto._getPercent = _getPercent;
proto._getValue = _getValue;
proto._moveHandle = _moveHandle;
proto._refreshDisabled = _refreshDisabled;
proto._render = _render;
proto._renderBar = _renderBar;
proto._renderHandle = _renderHandle;
proto._renderRangeHighlights = _renderRangeHighlights;
proto._renderTicks = _renderTicks;
proto._setValue = _setValue;
proto._setValueRange = _setValueRange;
proto._updatePercent = _updatePercent;
proto._updatePercentRange = _updatePercentRange;
proto._updateTicks = _updateTicks;

// Slider init
initComponent('slider', Slider);

export default Slider;
