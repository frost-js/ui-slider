import { expect, test } from '#test';
import { dispatchDragEvent } from '../support/input/drag.js';

test.describe('Slider values', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<button id="outside">Outside</button>' +
                '<div id="host" style="width:360px;margin:40px">' +
                '<label for="slider">Amount</label><input id="slider" value="3"><input id="slider2" value="7"></div>',
            );
        });
    });

    test.describe('min option', () => {
        test('clamps values below the minimum', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { min: 4 }).setValue(-1));

            await expect(page.locator('#slider')).toHaveValue('4');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemin', '4');
        });

        test('clamps the maximum to the minimum for descending bounds', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { min: 20 }));

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemin', '20');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemax', '20');
            await page.getByRole('slider').press('End');
            await expect(page.locator('#slider')).toHaveValue('20');
        });
    });

    test.describe('max option', () => {
        test('keeps the maximum reachable when the step does not divide the interval', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { max: 10, step: 6 }).setValue(20));

            await expect(page.locator('#slider')).toHaveValue('10');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemax', '10');
        });

        for (const scale of ['linear', 'logarithmic']) {
            test(`renders equal bounds without invalid geometry (${scale})`, async ({ page }) => {
                await page.evaluate((scale) => UI.Slider.init($.findOne('#slider'), { min: 5, max: 5, scale }), scale);

                await expect(page.locator('#slider')).toHaveValue('5');
                await expect(page.getByRole('slider')).toHaveCSS('left', '0px');
                await page.getByRole('slider').press('End');
                await expect(page.locator('#slider')).toHaveValue('5');
                await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .5 });
                await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: .8 });
                await expect(page.locator('#slider')).toHaveValue('5');
                await expect(page.getByRole('slider')).toHaveCSS('left', '0px');
            });
        }

        test('falls back to the default for non-finite bounds', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { max: Infinity }));

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemax', '10');
            await page.getByRole('slider').press('End');
            await expect(page.locator('#slider')).toHaveValue('10');
        });

        test('renders overflowing intervals as a fixed-value slider', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                min: -Number.MAX_VALUE, max: Number.MAX_VALUE,
            }));

            await expect(page.getByRole('slider')).toHaveCSS('left', '0px');
            await page.getByRole('slider').press('End');
            expect(await page.evaluate(() => $('#slider').slider('getValue'))).toBe(-Number.MAX_VALUE);
        });
    });

    test.describe('defaultValue option', () => {
        for (const { name, value } of [
            { name: 'empty', value: '' },
            { name: 'invalid text', value: 'invalid' },
            { name: 'null', value: null },
            { name: 'boolean', value: false },
            { name: 'infinity', value: Infinity },
        ]) {
            test(`uses the fallback for ${name}`, async ({ page }) => {
                await page.evaluate((value) => {
                    UI.Slider.init($.findOne('#slider'), { defaultValue: 4 }).setValue(value);
                }, value);

                await expect(page.locator('#slider')).toHaveValue('4');
                await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '4');
            });
        }

        test('falls back to the minimum when defaultValue is invalid', async ({ page }) => {
            await page.evaluate(() => {
                $.setValue($.findOne('#slider'), '');
                UI.Slider.init($.findOne('#slider'), { min: 2, defaultValue: 'invalid' });
            });

            await expect(page.locator('#slider')).toHaveValue('2');
        });
    });

    test.describe('step option', () => {
        for (const { min, max, step, expected } of [
            { min: 0, max: 10, step: 3, expected: '9' },
            { min: .1, max: .4, step: .1, expected: '0.3' },
            { min: .1, max: .8, step: .2, expected: '0.7' },
        ]) {
            test(`moves to the adjacent step below max=${max} with min=${min} and step=${step}`, async ({ page }) => {
                await page.evaluate(({ min, max, step }) => {
                    UI.Slider.init($.findOne('#slider'), { min, max, step });
                }, { min, max, step });
                await page.getByRole('slider').press('End');
                await page.getByRole('slider').press('ArrowLeft');

                await expect(page.locator('#slider')).toHaveValue(expected);
            });
        }

        test('keeps finite values when the step count overflows', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { step: 1e-309 }).setValue(1);
            });

            await expect(page.locator('#slider')).toHaveValue('1');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '1');
            await page.getByRole('slider').press('ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('1');
        });

        test('rounds decimal steps relative to the minimum', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { min: .1, step: .2 }).setValue(.24));

            await expect(page.locator('#slider')).toHaveValue('0.3');
            await page.getByRole('slider').press('ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('0.5');
        });

        test('clamps the result after rounding', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { step: 6 }).setValue(9.5));

            await expect(page.locator('#slider')).toHaveValue('10');
        });

        for (const step of [0, -1, 'invalid', Infinity]) {
            test(`uses the default step for step=${step}`, async ({ page }) => {
                await page.evaluate((step) => UI.Slider.init($.findOne('#slider'), { step }), step);
                await page.getByRole('slider').press('ArrowRight');

                await expect(page.locator('#slider')).toHaveValue('4');
            });
        }
    });

    test.describe('range option', () => {
        test('renders two separately named handles', async ({ page }) => {
            await page.evaluate(() => {
                $.setValue($.findOne('#slider'), '2,8');
                UI.Slider.init($.findOne('#slider'), { range: true });
            });

            await expect(page.getByRole('slider')).toHaveCount(2);
            await expect(page.getByRole('slider', { name: 'Amount start' })).toHaveAttribute('aria-valuenow', '2');
            await expect(page.getByRole('slider', { name: 'Amount end' })).toHaveAttribute('aria-valuenow', '8');
        });

        test('uses defaultValue for a missing endpoint', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { range: true, defaultValue: 1 }).setValue(8));

            await expect(page.locator('#slider')).toHaveValue('1,8');
        });

        for (const { name, key, expected, focused } of [
            { name: 'start', key: 'End', expected: '2,10', focused: 'Amount end' },
            { name: 'end', key: 'Home', expected: '0,8', focused: 'Amount start' },
        ]) {
            test(`hands focus to the other handle when ${name} crosses`, async ({ page }) => {
                await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { range: true }).setValue(2, 8));
                await page.getByRole('slider', { name: `Amount ${name}` }).press(key);

                await expect(page.locator('#slider')).toHaveValue(expected);
                await expect(page.getByRole('slider', { name: focused })).toBeFocused();
            });
        }

        test('selects the closest handle when clicking the track', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { range: true, tooltip: false }).setValue(2, 8));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width * .7, box.y + box.height / 2);

            await expect(page.locator('#slider')).toHaveValue('2,7');
            await expect(page.getByRole('slider', { name: 'Amount end' })).toBeFocused();
        });
    });

    test.describe('rangeSeparator option', () => {
        test('reads and serializes the configured separator', async ({ page }) => {
            await page.evaluate(() => {
                $.setValue($.findOne('#slider'), '2:8');
                UI.Slider.init($.findOne('#slider'), { range: true, rangeSeparator: ':' });
            });
            await page.getByRole('slider', { name: 'Amount end' }).press('ArrowLeft');

            await expect(page.locator('#slider')).toHaveValue('2:7');
        });

        test('uses the default for an empty separator', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { range: true, rangeSeparator: '' }).setValue(2, 8);
            });

            await expect(page.locator('#slider')).toHaveValue('2,8');
            await page.getByRole('slider').last().press('End');
            await expect(page.locator('#slider')).toHaveValue('2,10');
        });
    });

    test.describe('orientation option', () => {
        test('uses horizontal linear behavior for unrecognized modes', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                orientation: 'invalid', scale: 'invalid', tooltip: false,
            }));

            await expect(page.getByRole('slider')).toHaveAttribute('aria-orientation', 'horizontal');
            await page.getByRole('slider').press('ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('4');
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            await expect(page.locator('#slider')).toHaveValue('5');
        });

        for (const orientation of ['horizontal', 'vertical']) {
            test(`exposes ${orientation} orientation`, async ({ page }) => {
                await page.evaluate((orientation) => UI.Slider.init($.findOne('#slider'), { orientation }), orientation);

                await expect(page.getByRole('slider')).toHaveAttribute('aria-orientation', orientation);
            });
        }

        test('maps vertical pointer movement to values', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { orientation: 'vertical', tooltip: false }));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width / 2, box.y + box.height * .8);

            await expect(page.locator('#slider')).toHaveValue('8');
        });
    });

    test.describe('reversed option', () => {
        test('reverses horizontal clicks and arrow keys', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { reversed: true, tooltip: false }));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width * .8, box.y + box.height / 2);

            await expect(page.locator('#slider')).toHaveValue('2');
            await page.getByRole('slider').press('ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('1');
        });
    });

    test.describe('scale option', () => {
        for (const min of [-10, 0, 10]) {
            test(`maps logarithmic midpoints with min=${min}`, async ({ page }) => {
                await page.evaluate((min) => UI.Slider.init($.findOne('#slider'), { min, max: min + 99, scale: 'logarithmic', tooltip: false }), min);
                const box = await page.locator('#host .progress.position-relative').boundingBox();
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

                await expect(page.locator('#slider')).toHaveValue(`${min + 9}`);
                await expect(page.getByRole('slider')).toHaveCSS('left', '180px');
            });
        }

        test('keeps logarithmic endpoints reachable', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { min: 10, max: 100, scale: 'logarithmic', tooltip: false }));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x - 5, box.y + box.height / 2);
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '10');
            await page.mouse.move(box.x + box.width + 5, box.y + box.height / 2);
            await page.mouse.up();
            await expect(page.locator('#slider')).toHaveValue('100');
        });
    });

    test.describe('ticks option', () => {
        test('sorts and deduplicates usable ticks without changing the caller array', async ({ page }) => {
            const ticks = await page.evaluate(() => {
                const ticks = Object.freeze([10, 0, 5, 5, -1, 11, 'invalid']);
                UI.Slider.init($.findOne('#slider'), { ticks });
                return ticks;
            });

            await expect(page.locator('[data-ui-value]')).toHaveCount(3);
            await expect(page.locator('[data-ui-value]').nth(0)).toHaveAttribute('data-ui-value', '0');
            await expect(page.locator('[data-ui-value]').nth(1)).toHaveAttribute('data-ui-value', '5');
            expect(ticks).toEqual([10, 0, 5, 5, -1, 11, 'invalid']);
        });

        for (const { key, expected } of [
            { key: 'Control+ArrowRight', expected: '5' },
            { key: 'Control+ArrowLeft', expected: '0' },
        ]) {
            test(`navigates ticks with ${key}`, async ({ page }) => {
                await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { ticks: [0, 5, 10] }));
                await page.getByRole('slider').press(key);

                await expect(page.locator('#slider')).toHaveValue(expected);
            });
        }

        for (const { key, value } of [
            { key: 'Control+ArrowRight', value: 0 },
            { key: 'Control+ArrowLeft', value: 10 },
        ]) {
            test(`preserves off-step ticks with ${key}`, async ({ page }) => {
                await page.evaluate((value) => {
                    UI.Slider.init($.findOne('#slider'), { ticks: [0, 2.5, 10], step: 1 }).setValue(value);
                }, value);
                await page.getByRole('slider').press(key);

                await expect(page.locator('#slider')).toHaveValue('2.5');
                await page.getByRole('slider').press('ArrowRight');
                await expect(page.locator('#slider')).toHaveValue('3');
            });
        }

        test('reaches the bound after the last off-step tick without snapping back', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { ticks: [9.8], tickSnapBounds: 1 }).setValue(10);
            });
            await page.getByRole('slider').press('Control+ArrowLeft');
            await expect(page.locator('#slider')).toHaveValue('9.8');
            await page.getByRole('slider').press('Control+ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('10');
        });

        test('sets a range endpoint when a tick is clicked', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { range: true, ticks: [0, 2.5, 10] }).setValue(0, 8));
            await page.locator('[data-ui-value="2.5"]').click();

            await expect(page.locator('#slider')).toHaveValue('2.5,8');
        });
    });

    test.describe('tickLabels option', () => {
        test('keeps labels associated with ticks after sorting', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                ticks: [10, 0, 5, 7], tickLabels: ['Ten', 0, 'Five', ''],
            }));

            await expect(page.locator('#host small')).toHaveText(['0', 'Five', 'Ten']);
        });
    });

    test.describe('tickSnapBounds option', () => {
        test('snaps to the zero tick within the configured distance', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { ticks: [0, 5], tickSize: 10, step: .1, tickSnapBounds: .5, tooltip: false }));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width * .04, box.y + box.height / 2);

            await expect(page.locator('#slider')).toHaveValue('0');
        });

        test('restores an off-step committed tick after cancellation', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                ticks: [2.5], tickSnapBounds: .5, step: 1, tooltip: false,
            }));
            await page.locator('[data-ui-value="2.5"]').click();
            await expect(page.locator('#slider')).toHaveValue('2.5');
            await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .8 });
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '8');
            await page.evaluate(dispatchDragEvent, { type: 'touchcancel' });

            await expect(page.locator('#slider')).toHaveValue('2.5');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '2.5');
        });

        test('does not snap outside the configured distance', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { ticks: [0, 5], tickSnapBounds: .5, tooltip: false }));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width * .3, box.y + box.height / 2);

            await expect(page.locator('#slider')).toHaveValue('3');
        });
    });

    test.describe('lockToTicks option', () => {
        test('snaps setters to the nearest tick including zero', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { ticks: [0, 5, 10], lockToTicks: true }).setValue(.2));

            await expect(page.locator('#slider')).toHaveValue('0');
            await page.getByRole('slider').press('ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('5');
            await page.getByRole('slider').press('ArrowLeft');
            await expect(page.locator('#slider')).toHaveValue('0');
        });

        test('uses ordinary steps when there are no usable ticks', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { ticks: [-1, 20], lockToTicks: true }));
            await page.getByRole('slider').press('ArrowRight');

            await expect(page.locator('#slider')).toHaveValue('4');
            await expect(page.locator('[data-ui-value]')).toHaveCount(0);
        });
    });
});
