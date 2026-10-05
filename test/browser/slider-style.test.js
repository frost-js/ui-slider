import { expect, test } from '#test';

test.describe('Slider styles', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<div id="host" style="width:360px;margin:40px">' +
                '<label for="slider">Amount</label><input id="slider" value="2,8"></div>',
            );
        });
    });

    test.describe('layout', () => {
        for (const { orientation, reversed, direction, position, highlightPosition, highlightEdge } of [
            { orientation: 'horizontal', reversed: false, direction: 'ltr', position: '72px', highlightPosition: '72px', highlightEdge: 'left' },
            { orientation: 'horizontal', reversed: false, direction: 'rtl', position: '288px', highlightPosition: '216px', highlightEdge: 'right' },
            { orientation: 'horizontal', reversed: true, direction: 'ltr', position: '288px', highlightPosition: '216px', highlightEdge: 'right' },
            { orientation: 'horizontal', reversed: true, direction: 'rtl', position: '72px', highlightPosition: '72px', highlightEdge: 'left' },
            { orientation: 'vertical', reversed: false, direction: 'ltr', position: '40px', highlightPosition: '40px', highlightEdge: 'top' },
            { orientation: 'vertical', reversed: false, direction: 'rtl', position: '40px', highlightPosition: '40px', highlightEdge: 'top' },
            { orientation: 'vertical', reversed: true, direction: 'ltr', position: '160px', highlightPosition: '120px', highlightEdge: 'bottom' },
            { orientation: 'vertical', reversed: true, direction: 'rtl', position: '160px', highlightPosition: '120px', highlightEdge: 'bottom' },
        ]) {
            test.describe(`${orientation}, reversed=${reversed}, ${direction}`, () => {
                const vertical = orientation === 'vertical';
                const axis = vertical ? 'top' : 'left';
                const dimension = vertical ? 'height' : 'width';

                test.beforeEach(async ({ page }) => {
                    await page.evaluate(({ orientation, reversed, direction }) => {
                        $.setProperty($.findOne('#host'), 'dir', direction);
                        UI.Slider.init($.findOne('#slider'), {
                            orientation, reversed, range: true, ticks: [0, 2, 8, 10],
                            tickLabels: ['Zero', 'Two', 'Eight', 'Ten'], tooltip: false,
                            rangeHighlights: [{ start: 2, end: 4, style: 'bg-danger' }],
                        });
                    }, { orientation, reversed, direction });
                });

                test('aligns handles and ticks on the physical value axis', async ({ page }) => {
                    const start = page.getByRole('slider', { name: 'Amount start' });
                    const tick = page.locator('[data-ui-value="2"]');
                    await expect(start).toHaveCSS(axis, position);
                    await expect(tick).toHaveCSS(axis, position);

                    const handleBounds = await start.boundingBox();
                    const tickBounds = await tick.boundingBox();
                    expect(handleBounds.x + handleBounds.width / 2).toBeCloseTo(tickBounds.x + tickBounds.width / 2, 1);
                    expect(handleBounds.y + handleBounds.height / 2).toBeCloseTo(tickBounds.y + tickBounds.height / 2, 1);
                });

                test('aligns labels with their ticks', async ({ page }) => {
                    const label = page.locator('small', { hasText: 'Two' });
                    await expect(label).toHaveCSS(axis, position);

                    const labelBounds = await label.boundingBox();
                    const tickBounds = await page.locator('[data-ui-value="2"]').boundingBox();
                    expect(vertical ? labelBounds.y + labelBounds.height / 2 : labelBounds.x + labelBounds.width / 2)
                        .toBeCloseTo(vertical ? tickBounds.y + tickBounds.height / 2 : tickBounds.x + tickBounds.width / 2, 0);
                });

                test('positions highlights on the same axis as ticks', async ({ page }) => {
                    const highlight = page.locator('.progress.position-relative > .bg-danger');
                    await expect(highlight).toHaveCSS(axis, highlightPosition);
                    await expect(highlight).toHaveCSS(dimension, vertical ? '40px' : '72px');

                    const highlightBounds = await highlight.boundingBox();
                    const tickBounds = await page.locator('[data-ui-value="2"]').boundingBox();
                    let edge;

                    switch (highlightEdge) {
                        case 'left':
                            edge = highlightBounds.x;
                            break;
                        case 'right':
                            edge = highlightBounds.x + highlightBounds.width;
                            break;
                        case 'top':
                            edge = highlightBounds.y;
                            break;
                        case 'bottom':
                            edge = highlightBounds.y + highlightBounds.height;
                            break;
                    }

                    expect(edge).toBeCloseTo(vertical ?
                        tickBounds.y + tickBounds.height / 2 :
                        tickBounds.x + tickBounds.width / 2, 1);
                });

                test('fills the selected interval between handles', async ({ page }) => {
                    const selection = page.locator('.progress.position-relative > .bg-primary');
                    await expect(selection).toHaveCSS(axis, vertical ? '40px' : '72px');
                    await expect(selection).toHaveCSS(dimension, vertical ? '120px' : '216px');
                    await expect(selection).toHaveCSS('box-shadow', 'none');
                    await expect(selection).toHaveCSS('transition-duration', '0s');
                });
            });
        }
    });

    test.describe('sizing', () => {
        for (const orientation of ['horizontal', 'vertical']) {
            test(`applies track and handle dimensions (${orientation})`, async ({ page }) => {
                await page.evaluate((orientation) => UI.Slider.init($.findOne('#slider'), {
                    orientation, sliderSize: 12, handleSize: 24, handleSizeRatio: .5,
                    verticalHeight: 300, tooltip: false,
                }), orientation);

                const vertical = orientation === 'vertical';
                await expect(page.locator('.progress.position-relative')).toHaveCSS('width', vertical ? '12px' : '360px');
                await expect(page.locator('.progress.position-relative')).toHaveCSS('height', vertical ? '300px' : '12px');
                await expect(page.getByRole('slider')).toHaveCSS('width', vertical ? '24px' : '12px');
                await expect(page.getByRole('slider')).toHaveCSS('height', vertical ? '12px' : '24px');
            });
        }

        test('applies tick dimensions', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { ticks: [5], tickSize: 40 }));

            await expect(page.locator('[data-ui-value="5"]')).toHaveCSS('width', '40px');
            await expect(page.locator('[data-ui-value="5"]')).toHaveCSS('height', '40px');
        });

        for (const orientation of ['horizontal', 'vertical']) {
            test(`uses default dimensions for invalid sizes (${orientation})`, async ({ page }) => {
                await page.evaluate((orientation) => UI.Slider.init($.findOne('#slider'), {
                    orientation, ticks: [5], tooltip: false,
                    sliderSize: 0, handleSize: -1, handleSizeRatio: 'invalid',
                    verticalHeight: Infinity, tickSize: null,
                }), orientation);

                const vertical = orientation === 'vertical';
                await expect(page.locator('.progress.position-relative')).toHaveCSS('width', vertical ? '10px' : '360px');
                await expect(page.locator('.progress.position-relative')).toHaveCSS('height', vertical ? '200px' : '10px');
                await expect(page.getByRole('slider')).toHaveCSS('width', vertical ? '20px' : '15px');
                await expect(page.getByRole('slider')).toHaveCSS('height', vertical ? '15px' : '20px');
                await expect(page.locator('[data-ui-value="5"]')).toHaveCSS('width', '30px');
                await page.getByRole('slider').press('End');
                await expect(page.locator('#slider')).toHaveValue('10');
            });
        }
    });

    for (const { option, value, index } of [
        { option: 'low', value: 'bg-danger', index: 0 },
        { option: 'selection', value: 'bg-success', index: 1 },
        { option: 'high', value: 'bg-warning', index: 2 },
    ]) {
        test.describe(`${option} option`, () => {
            test('applies the interval background class', async ({ page }) => {
                await page.evaluate(({ option, value }) => UI.Slider.init($.findOne('#slider'), {
                    range: true, [option]: value,
                }), { option, value });

                await expect(page.locator('.progress.position-relative > .progress-bar').nth(index)).toHaveClass(new RegExp(value));
            });
        });
    }

    test.describe('rangeHighlights option', () => {
        test('normalizes reversed intervals and clips them to the bounds', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                range: true, ticks: [0, 5, 10], rangeHighlights: [
                    { start: 5, end: -2, style: 'bg-danger' },
                    { start: 8, end: 12, style: 'bg-warning' },
                    { start: 'invalid', end: 4, style: 'bg-success' },
                ],
            }));

            const track = page.locator('.progress.position-relative');
            await expect(track.locator('.bg-danger')).toHaveCSS('left', '0px');
            await expect(track.locator('.bg-danger')).toHaveCSS('width', '180px');
            await expect(track.locator('.bg-warning')).toHaveCSS('left', '288px');
            await expect(track.locator('.bg-warning')).toHaveCSS('width', '72px');
            await expect(track.locator('.bg-success')).toHaveCount(0);
        });

        test('takes precedence over selection styling on ticks', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                range: true, ticks: [0, 5, 10], low: 'bg-info', high: 'bg-warning',
                rangeHighlights: [{ start: 4, end: 6, style: 'bg-danger' }],
            }));

            await expect(page.locator('[data-ui-value="0"]')).toHaveClass(/bg-info/);
            await expect(page.locator('[data-ui-value="5"]')).toHaveClass(/bg-danger/);
            await expect(page.locator('[data-ui-value="10"]')).toHaveClass(/bg-warning/);
            await page.evaluate(() => $('#slider').slider('setValue', 0, 10));
            await expect(page.locator('[data-ui-value="0"]')).toHaveClass(/bg-primary/);
            await expect(page.locator('[data-ui-value="5"]')).toHaveClass(/bg-danger/);
        });
    });

    test.describe('disabledOpacity option', () => {
        test('dims the container and restores opacity on enable', async ({ page }) => {
            await page.evaluate(() => {
                const slider = UI.Slider.init($.findOne('#slider'), { disabledOpacity: .25 });
                slider.disable();
            });

            await expect(page.locator('#host > .position-relative')).toHaveCSS('opacity', '0.25');
            await page.evaluate(() => $('#slider').slider('enable'));
            await expect(page.locator('#host > .position-relative')).toHaveCSS('opacity', '1');
        });

        for (const { value, expected } of [
            { value: -1, expected: '0' },
            { value: 2, expected: '1' },
            { value: 'invalid', expected: '0.5' },
        ]) {
            test(`normalizes disabledOpacity=${value}`, async ({ page }) => {
                await page.evaluate((disabledOpacity) => {
                    UI.Slider.init($.findOne('#slider'), { disabledOpacity }).disable();
                }, value);

                await expect(page.locator('#host > .position-relative')).toHaveCSS('opacity', expected);
            });
        }
    });

    test.describe('focus', () => {
        test('uses the UI focus ring on the active handle', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider')));
            await page.getByRole('slider').focus();

            await expect(page.getByRole('slider')).toBeFocused();
            await expect(page.getByRole('slider')).not.toHaveCSS('box-shadow', 'none');
        });
    });

    test.describe('tooltip positioning', () => {
        for (const orientation of ['horizontal', 'vertical']) {
            test(`positions an initially visible tooltip beside its handle (${orientation})`, async ({ page }) => {
                await page.evaluate((orientation) => {
                    const node = $.findOne('#slider');
                    $.setValue(node, '3');
                    UI.Slider.init(node, { orientation, tooltip: 'always' });
                }, orientation);

                const tooltip = page.locator('body > [role="tooltip"]');
                await expect(tooltip).toBeVisible();
                await expect(tooltip).toHaveText('3');
                const tooltipBounds = await tooltip.boundingBox();
                const handleBounds = await page.getByRole('slider').boundingBox();
                if (orientation === 'vertical') {
                    expect(tooltipBounds.x).toBeGreaterThanOrEqual(handleBounds.x + handleBounds.width);
                    expect(tooltipBounds.y + tooltipBounds.height / 2).toBeCloseTo(handleBounds.y + handleBounds.height / 2, 0);
                } else {
                    expect(tooltipBounds.y + tooltipBounds.height).toBeLessThanOrEqual(handleBounds.y);
                    expect(tooltipBounds.x + tooltipBounds.width / 2).toBeCloseTo(handleBounds.x + handleBounds.width / 2, 0);
                }
            });
        }
    });
});
