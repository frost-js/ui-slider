import { expect, test } from '#test';

test.describe('Slider accessibility and tooltips', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<button id="outside">Outside</button>' +
                '<div id="host" style="width:360px;margin:40px">' +
                '<label for="slider">Amount</label><input id="slider" value="3"></div>',
            );
        });
    });

    test.describe('input attributes', () => {
        test('inherits initial disabled state', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                $.setProperty(node, 'disabled', true);
                UI.Slider.init(node);
            });

            await expect(page.getByRole('slider')).toBeDisabled();
            await expect(page.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
        });

        for (const { name, markup, expected } of [
            { name: 'explicit label', markup: '<label for="slider">Volume</label><input id="slider">', expected: 'Volume' },
            { name: 'wrapping label', markup: '<label>Volume<input id="slider"></label>', expected: 'Volume' },
            { name: 'aria-label', markup: '<input id="slider" aria-label="Volume">', expected: 'Volume' },
            { name: 'aria-labelledby', markup: '<span id="title">Volume</span><input id="slider" aria-labelledby="title">', expected: 'Volume' },
            { name: 'no label', markup: '<input id="slider">', expected: 'Value' },
        ]) {
            test(`sets the accessible name from ${name}`, async ({ page }) => {
                await page.evaluate((markup) => {
                    $.setHtml($.findOne('#host'), markup);
                    UI.Slider.init($.findOne('#slider'));
                }, markup);

                await expect(page.getByRole('slider')).toHaveAccessibleName(expected);
            });
        }

        test('supports unusual input IDs without changing label IDs', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                $.setProperty(node, 'id', 'amount"value');
                $.setProperty($.findOne('label'), 'htmlFor', $.getProperty(node, 'id'));
                UI.Slider.init(node);
            });

            await expect(page.getByRole('slider')).toHaveAccessibleName('Amount');
            await expect(page.locator('label')).not.toHaveAttribute('id');
        });

        test('copies descriptions and invalid state to the handle', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                $.setAttribute(node, 'aria-describedby', 'help');
                $.setAttribute(node, 'aria-invalid', 'true');
                UI.Slider.init(node, { tooltip: false });
            });

            await expect(page.getByRole('slider')).toHaveAttribute('aria-describedby', 'help');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-invalid', 'true');
        });

        test('preserves help descriptions while showing and hiding the tooltip', async ({ page }) => {
            await page.evaluate(() => {
                $.append('#host', '<p id="help">First help</p><p id="other-help">Second help</p>');
                $.setAttribute('#slider', 'aria-describedby', 'help other-help');
                UI.Slider.init($.findOne('#slider'));
            });

            const handle = page.getByRole('slider');
            await handle.focus();
            await expect(page.getByRole('tooltip')).toBeVisible();
            const tooltipId = await page.getByRole('tooltip').getAttribute('id');
            await expect(handle).toHaveAttribute('aria-describedby', `help other-help ${tooltipId}`);
            await expect(handle).toHaveAccessibleDescription('First help Second help 3');
            await page.evaluate(() => $('#slider').slider('setValue', 5));
            await expect(handle).toHaveAttribute('aria-describedby', `help other-help ${tooltipId}`);
            await page.locator('#outside').focus();
            await expect(page.getByRole('tooltip')).toHaveCount(0);
            await expect(handle).toHaveAttribute('aria-describedby', 'help other-help');
            await expect(handle).toHaveAccessibleDescription('First help Second help');
        });

        for (const tooltip of ['show', 'always']) {
            for (const help of [false, true]) {
                test(`preserves the tooltip reference during native state updates (tooltip=${tooltip}, help=${help})`, async ({ page }) => {
                    await page.evaluate(({ tooltip, help }) => {
                        $.append('#host', '<p id="help">Help text</p><p id="other-help">Updated help</p>');

                        if (help) {
                            $.setAttribute('#slider', 'aria-describedby', 'help');
                        }

                        UI.Slider.init($.findOne('#slider'), { tooltip });
                    }, { tooltip, help });

                    const handle = page.getByRole('slider');
                    await handle.focus();
                    await expect(page.getByRole('tooltip')).toBeVisible();
                    const tooltipId = await page.getByRole('tooltip').getAttribute('id');
                    const description = help ? `help ${tooltipId}` : tooltipId;
                    await expect(handle).toHaveAttribute('aria-describedby', description);

                    await page.evaluate(() => $.setAttribute('#slider', 'aria-invalid', 'true'));
                    await expect(handle).toHaveAttribute('aria-invalid', 'true');
                    await expect(handle).toHaveAttribute('aria-describedby', description);

                    await page.evaluate(() => $.setAttribute('#slider', 'aria-describedby', 'other-help'));
                    await expect(handle).toHaveAttribute('aria-describedby', `other-help ${tooltipId}`);
                    await expect(handle).toHaveAccessibleDescription('Updated help 3');
                    await page.evaluate(() => $.removeAttribute('#slider', 'aria-describedby'));
                    await expect(handle).toHaveAttribute('aria-describedby', tooltipId);
                    await expect(handle).toHaveAccessibleDescription('3');

                    await page.evaluate(() => $('#slider').slider('disable'));
                    await expect(page.getByRole('tooltip')).toHaveCount(0);
                    await expect(handle).not.toHaveAttribute('aria-describedby');
                    await page.locator('#outside').focus();
                    await page.evaluate(() => $('#slider').slider('enable'));
                    await handle.focus();
                    await expect(page.getByRole('tooltip')).toBeVisible();
                    await expect(page.getByRole('tooltip')).not.toHaveAttribute('id', tooltipId);
                    const updatedId = await page.getByRole('tooltip').getAttribute('id');
                    await expect(handle).toHaveAttribute('aria-describedby', updatedId);
                });
            }
        }
    });

    test.describe('tooltip option', () => {
        test('does not create a tooltip when disabled', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { tooltip: false }));
            await page.getByRole('slider').focus();

            await expect(page.getByRole('tooltip')).toHaveCount(0);
        });

        test('shows on focus and hides when focus leaves', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider')));
            await page.getByRole('slider').focus();
            await expect(page.getByRole('tooltip')).toHaveText('3');
            await page.locator('#outside').focus();
            await expect(page.getByRole('tooltip')).toHaveCount(0);
        });

        test('keeps the tooltip visible while focus remains after hover ends', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider')));
            await page.getByRole('slider').hover();
            await page.getByRole('slider').focus();
            await page.mouse.move(0, 0);

            await expect(page.getByRole('tooltip')).toBeVisible();
        });

        test('shows always-visible content after initialization', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { tooltip: 'always' }));

            await expect(page.getByRole('tooltip')).toBeVisible();
            await expect(page.getByRole('tooltip')).toHaveText('3');
            await page.evaluate(() => $('#slider').slider('disable'));
            await expect(page.getByRole('tooltip')).toHaveCount(0);
        });

        test('settles rapid focus changes without stale visibility', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { range: true }).setValue(2, 8));
            await page.getByRole('slider', { name: 'Amount start' }).focus();
            await page.evaluate(() => {
                const handles = $.find('[role="slider"]');
                handles[0].blur();
                handles[1].focus();
            });

            await expect(page.getByRole('tooltip')).toBeVisible();
            await page.locator('#outside').focus();
            await expect(page.getByRole('tooltip')).toHaveCount(0);
        });
    });

    test.describe('tooltipPlacement option', () => {
        test('uses the requested placement', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { tooltip: 'always', tooltipPlacement: 'bottom' }));

            await expect(page.getByRole('tooltip')).toHaveAttribute('data-ui-placement', /bottom/);
        });
    });

    test.describe('valueText option', () => {
        test('formats accessible text and tooltip content', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                tooltip: 'always', valueText: (value) => `Value ${value}`,
            }).setValue(7));

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Value 7');
            await expect(page.getByRole('tooltip')).toHaveText('Value 7');
        });

        test('uses the default for a non-function formatter', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { tooltip: 'always', valueText: 'invalid' }).setValue(7);
            });

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuetext', '7');
            await expect(page.getByRole('tooltip')).toHaveText('7');
        });
    });

    test.describe('rangeText option', () => {
        test('formats the range tooltip', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                range: true, tooltip: 'always', rangeText: (start, end) => `${start} to ${end}`,
            }).setValue(2, 8));

            await expect(page.getByRole('tooltip')).toHaveText('2 to 8');
        });

        test('uses the default for a non-function formatter', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), {
                    range: true, tooltip: 'always', rangeText: null,
                }).setValue(2, 8);
            });

            await expect(page.getByRole('tooltip')).toHaveText('2 - 8');
        });
    });
});
