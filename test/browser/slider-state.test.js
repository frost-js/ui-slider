import { expect, test } from '#test';
import { dispatchDragEvent } from '../support/input/drag.js';

test.describe('Slider native state synchronization', () => {
    for (const range of [false, true]) {
        test.describe(`range=${range}`, () => {
            test.beforeEach(async ({ page }) => {
                await page.evaluate((range) => {
                    $.setHtml(document.body,
                        '<button id="outside">Outside</button>' +
                        '<form id="form"><fieldset id="fieldset"><div id="host" style="width:360px;margin:40px">' +
                        '<label for="slider">Amount</label>' +
                        `<input id="slider" name="amount" value="${range ? '2,8' : '3'}">` +
                        '</div></fieldset></form>',
                    );
                    window.stateEvents = [];
                    $.addEvent('#slider', 'change.ui.slider slid.ui.slider', (event) => window.stateEvents.push(event.type));
                }, range);
            });

            for (const { property, attribute } of [
                { property: 'disabled', attribute: 'aria-disabled' },
                { property: 'required', attribute: 'aria-required' },
                { property: 'readOnly', attribute: 'aria-readonly' },
            ]) {
                test(`inherits native ${property} and observes changes and removal`, async ({ page }) => {
                    await page.evaluate(({ range, property }) => {
                        const input = $.findOne('#slider');
                        $.setProperty(input, property, true);
                        UI.Slider.init(input, { range, tooltip: false });
                    }, { range, property });
                    const handles = page.getByRole('slider');
                    for (const handle of await handles.all()) {
                        await expect(handle).toHaveAttribute(attribute, 'true');
                    }
                    if (property === 'disabled') {
                        for (const handle of await handles.all()) {
                            await expect(handle).toBeDisabled();
                        }
                    } else if (property === 'readOnly') {
                        await handles.first().focus();
                        await expect(handles.first()).toBeFocused();
                        await handles.first().press('End');
                        await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .5 });
                        await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: .7 });
                        await expect(page.locator('#slider')).toHaveValue(range ? '2,8' : '3');
                    }
                    await page.evaluate((property) => $.setProperty('#slider', property, false), property);
                    for (const handle of await handles.all()) {
                        await expect(handle).toHaveAttribute(attribute, 'false');
                        await expect(handle).toBeEnabled();
                    }
                    expect(await page.evaluate(() => window.stateEvents)).toEqual([]);
                    await handles.first().press('ArrowRight');
                    await expect(page.locator('#slider')).toHaveValue(range ? '3,8' : '4');
                    expect(await page.evaluate(() => window.stateEvents)).toEqual(['change']);
                });
            }

            for (const { attribute, initial, updated } of [
                { attribute: 'aria-describedby', initial: 'hint', updated: 'updated-hint' },
                { attribute: 'aria-errormessage', initial: 'error', updated: 'updated-error' },
                { attribute: 'aria-invalid', initial: 'true', updated: 'false' },
                { attribute: 'aria-required', initial: 'true', updated: 'false' },
            ]) {
                test(`inherits ${attribute} and observes changes and removal`, async ({ page }) => {
                    await page.evaluate(({ range, attribute, initial }) => {
                        const input = $.findOne('#slider');
                        $.setAttribute(input, attribute, initial);
                        UI.Slider.init(input, { range, tooltip: false });
                    }, { range, attribute, initial });
                    const handles = page.getByRole('slider');
                    for (const handle of await handles.all()) {
                        await expect(handle).toHaveAttribute(attribute, initial);
                    }
                    await page.evaluate(({ attribute, updated }) => $.setAttribute('#slider', attribute, updated), { attribute, updated });
                    for (const handle of await handles.all()) {
                        await expect(handle).toHaveAttribute(attribute, updated);
                    }
                    await page.evaluate((attribute) => $.removeAttribute('#slider', attribute), attribute);
                    for (const handle of await handles.all()) {
                        if (attribute === 'aria-required') {
                            await expect(handle).toHaveAttribute(attribute, 'false');
                        } else {
                            await expect(handle).not.toHaveAttribute(attribute);
                        }
                    }
                    await page.evaluate(({ attribute, initial }) => $.setAttribute('#slider', attribute, initial), { attribute, initial });
                    for (const handle of await handles.all()) {
                        await expect(handle).toHaveAttribute(attribute, initial);
                    }
                    await expect(handles.first()).toHaveAccessibleName(range ? 'Amount start' : 'Amount');
                    await expect(page.locator('#slider')).toHaveAttribute('aria-hidden', 'true');
                    await expect(page.locator('#slider')).toHaveValue(range ? '2,8' : '3');
                    expect(await page.evaluate(() => window.stateEvents)).toEqual([]);
                });
            }

            test('preserves explicit aria-required and restores the native fallback', async ({ page }) => {
                await page.evaluate((range) => {
                    $.setAttribute('#slider', 'aria-required', 'false');
                    UI.Slider.init($.findOne('#slider'), { range, tooltip: false });
                    $.setProperty('#slider', 'required', true);
                }, range);
                const handles = page.getByRole('slider');
                for (const handle of await handles.all()) {
                    await expect(handle).toHaveAttribute('aria-required', 'false');
                }
                await page.evaluate(() => $.removeAttribute('#slider', 'aria-required'));
                for (const handle of await handles.all()) {
                    await expect(handle).toHaveAttribute('aria-required', 'true');
                }
                await page.evaluate(() => $.setProperty('#slider', 'required', false));
                for (const handle of await handles.all()) {
                    await expect(handle).toHaveAttribute('aria-required', 'false');
                }
                expect(await page.evaluate(() => window.stateEvents)).toEqual([]);
            });

            for (const { target, property, attribute } of [
                { target: '#slider', property: 'disabled', attribute: 'aria-disabled' },
                { target: '#slider', property: 'readOnly', attribute: 'aria-readonly' },
                { target: '#fieldset', property: 'disabled', attribute: 'aria-disabled' },
            ]) {
                test(`cancels a drag when ${target} becomes ${property} and restores editing afterward`, async ({ page }) => {
                    await page.evaluate((range) => UI.Slider.init($.findOne('#slider'), { range }), range);
                    await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .3 });
                    await page.evaluate(dispatchDragEvent, { type: 'touchmove', fraction: .6 });
                    const handles = page.getByRole('slider');
                    await expect(handles.first()).toHaveAttribute('aria-valuenow', '6');
                    await expect(page.getByRole('tooltip')).toBeVisible();
                    await page.evaluate(({ target, property }) => $.setProperty(target, property, true), { target, property });
                    for (const handle of await handles.all()) {
                        await expect(handle).toHaveAttribute(attribute, 'true');
                    }
                    await expect(handles.first()).toHaveAttribute('aria-valuenow', range ? '2' : '3');
                    await expect(page.locator('#slider')).toHaveValue(range ? '2,8' : '3');
                    await page.locator('#outside').focus();
                    await expect(page.getByRole('tooltip')).toHaveCount(0);
                    await page.evaluate(({ target, property }) => $.setProperty(target, property, false), { target, property });
                    for (const handle of await handles.all()) {
                        await expect(handle).toHaveAttribute(attribute, 'false');
                    }
                    await page.evaluate(dispatchDragEvent, { type: 'touchmove', fraction: .7 });
                    await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: .7 });
                    await expect(page.locator('#slider')).toHaveValue(range ? '2,8' : '3');
                    expect(await page.evaluate(() => window.stateEvents)).toEqual([]);
                    await page.evaluate(dispatchDragEvent, { type: 'touchstart', id: 2, fraction: .3 });
                    await page.evaluate(dispatchDragEvent, { type: 'touchend', id: 2, fraction: .6 });
                    await expect(page.locator('#slider')).toHaveValue(range ? '6,8' : '6');
                    expect(await page.evaluate(() => window.stateEvents)).toEqual(['change', 'slid']);
                });
            }

            for (const phase of ['touchmove', 'touchend']) {
                test(`checks readonly before ${phase} without waiting for the observer`, async ({ page }) => {
                    await page.evaluate((range) => UI.Slider.init($.findOne('#slider'), { range, tooltip: false }), range);
                    await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .3 });
                    await page.evaluate((phase) => {
                        const rect = $.rect('#host .progress.position-relative', { offset: true });
                        $.setProperty('#slider', 'readOnly', true);
                        for (const type of [phase, 'touchend']) {
                            const touch = {
                                identifier: 1,
                                pageX: rect.left + rect.width * .7,
                                pageY: rect.top + rect.height / 2,
                            };
                            $.triggerEvent(window, type, {
                                data: { touches: type === 'touchend' ? [] : [touch], changedTouches: [touch] },
                            });
                        }
                    }, phase);
                    await expect(page.locator('#slider')).toHaveValue(range ? '2,8' : '3');
                    await expect(page.getByRole('slider').first()).toHaveAttribute('aria-valuenow', range ? '2' : '3');
                    expect(await page.evaluate(() => window.stateEvents)).toEqual([]);
                });
            }

            test('allows setters, native events, and reset on a read-only slider', async ({ page }) => {
                await page.evaluate((range) => {
                    const input = $.findOne('#slider');
                    $.setProperty(input, 'readOnly', true);
                    UI.Slider.init(input, { range, tooltip: false }).setValue(4, 7);
                }, range);
                await expect(page.locator('#slider')).toHaveValue(range ? '4,7' : '4');
                await page.evaluate((range) => {
                    $.setValue('#slider', range ? '5,9' : '5');
                    $.findOne('#slider').dispatchEvent(new Event('input', { bubbles: true }));
                }, range);
                await expect(page.getByRole('slider').first()).toHaveAttribute('aria-valuenow', '5');
                await page.evaluate(() => $.findOne('#form').reset());
                await expect(page.locator('#slider')).toHaveValue(range ? '2,8' : '3');
                await expect(page.getByRole('slider').first()).toHaveAttribute('aria-valuenow', range ? '2' : '3');
                for (const handle of await page.getByRole('slider').all()) {
                    await expect(handle).toHaveAttribute('aria-readonly', 'true');
                }
                expect(await page.evaluate(() => window.stateEvents)).toEqual(['change']);
            });

            test('disconnects with queued mutations and leaves a new instance independent', async ({ page }) => {
                const oldHandles = await page.evaluateHandle((range) => {
                    const input = $.findOne('#slider');
                    const component = UI.Slider.init(input, { range, tooltip: false });
                    const handles = $.find('[role="slider"]');
                    $.setProperty(input, { disabled: true, required: true, readOnly: true });
                    $.setAttribute(input, 'aria-invalid', 'true');
                    $.setProperty('#fieldset', 'disabled', true);
                    component.dispose();
                    $.setProperty(input, { disabled: false, required: false, readOnly: false });
                    $.removeAttribute(input, 'aria-invalid');
                    $.setProperty('#fieldset', 'disabled', false);
                    UI.Slider.init(input, { range, tooltip: false });
                    return handles;
                }, range);
                await page.evaluate(() => $.setProperty('#slider', { required: true, readOnly: true }));
                for (const handle of await page.getByRole('slider').all()) {
                    await expect(handle).toHaveAttribute('aria-required', 'true');
                    await expect(handle).toHaveAttribute('aria-readonly', 'true');
                }
                expect(await oldHandles.evaluate((handles) => handles.map((handle) => ({
                    connected: $.getProperty(handle, 'isConnected'),
                    disabled: $.getProperty(handle, 'disabled'),
                    readOnly: $.getAttribute(handle, 'aria-readonly'),
                    required: $.getAttribute(handle, 'aria-required'),
                    invalid: $.getAttribute(handle, 'aria-invalid'),
                })))).toEqual(Array.from({ length: range ? 2 : 1 }, () => ({
                    connected: false, disabled: false, readOnly: 'false', required: 'false', invalid: null,
                })));
                expect(await page.evaluate(() => window.stateEvents)).toEqual([]);
            });
        });
    }

    test('observes nested fieldsets and respects the first legend exemption', async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<fieldset id="outer"><legend><label for="legend-slider">Legend</label>' +
                '<input id="legend-slider" value="3"></legend><legend><input id="second-legend-slider" value="3"></legend>' +
                '<fieldset id="inner"><input id="slider" value="3"></fieldset></fieldset>',
            );
            $('input').slider({ tooltip: false });
        });
        const control = page.locator('#inner [role="slider"]');
        const exempt = page.getByRole('slider', { name: 'Legend' });
        const secondLegend = page.locator('legend').nth(1).getByRole('slider');
        await page.evaluate(() => $.setProperty('#outer', 'disabled', true));
        await expect(control).toHaveAttribute('aria-disabled', 'true');
        await expect(secondLegend).toHaveAttribute('aria-disabled', 'true');
        await expect(exempt).toHaveAttribute('aria-disabled', 'false');
        await expect(exempt).toBeEnabled();
        await exempt.press('ArrowRight');
        await expect(page.locator('#legend-slider')).toHaveValue('4');
        await page.evaluate(() => {
            $.setProperty('#inner', 'disabled', true);
            $.setProperty('#outer', 'disabled', false);
            $('#slider').slider('enable');
        });
        await expect(control).toHaveAttribute('aria-disabled', 'true');
        await expect(secondLegend).toHaveAttribute('aria-disabled', 'false');
        await page.evaluate(() => $.setProperty('#inner', 'disabled', false));
        await expect(control).toHaveAttribute('aria-disabled', 'false');
        await expect(control).toBeEnabled();
        await control.press('ArrowRight');
        await expect(page.locator('#slider')).toHaveValue('4');
    });

    for (const phase of ['focus', 'touchmove', 'touchend', 'keyboard']) {
        test(`honors readonly set by a ${phase} focus handler`, async ({ page }) => {
            await page.evaluate((phase) => {
                $.setHtml(document.body,
                    '<button id="outside">Outside</button><div id="host" style="width:360px;margin:40px">' +
                    '<input id="slider" value="2,8"></div>',
                );
                UI.Slider.init($.findOne('#slider'), { range: true, tooltip: false });
                window.stateEvents = [];
                $.addEvent('#slider', 'change.ui.slider slid.ui.slider', (event) => window.stateEvents.push(event.type));
                const handles = $.find('[role="slider"]');
                handles[phase === 'focus' ? 0 : 1].addEventListener('focus', () => $.setProperty('#slider', 'readOnly', true), { once: true });
            }, phase);
            if (phase === 'keyboard') {
                await page.getByRole('slider').first().press('End');
            } else {
                await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .2 });
                if (phase === 'touchmove') {
                    await page.evaluate(dispatchDragEvent, { type: 'touchmove', fraction: .9 });
                }
                await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: .9 });
            }
            await expect(page.locator('#slider')).toHaveValue('2,8');
            await expect(page.getByRole('slider').first()).toHaveAttribute('aria-valuenow', '2');
            await expect(page.getByRole('slider').last()).toHaveAttribute('aria-valuenow', '8');
            expect(await page.evaluate(() => window.stateEvents)).toEqual([]);
        });
    }
});
