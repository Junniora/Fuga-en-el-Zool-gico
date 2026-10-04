import { test, expect, type Page } from '@playwright/test';

async function expectTheme(page: Page, theme: 'light' | 'dark') {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(
    page.getByRole('button', {
      name: theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro',
    }),
  ).toBeVisible();
}

test('system theme is followed until a manual choice, then persists across reloads and tabs', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expectTheme(page, 'dark');
  expect(
    await page.evaluate(() => localStorage.getItem('fuga-theme')),
  ).toBeNull();
  await page.emulateMedia({ colorScheme: 'light' });
  await expectTheme(page, 'light');
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await expectTheme(page, 'dark');
  await page.reload();
  await expectTheme(page, 'dark');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  await expectTheme(page, 'dark');
  const otherTab = await context.newPage();
  await otherTab.goto('/');
  await expectTheme(otherTab, 'dark');
  await otherTab.getByRole('button', { name: 'Activar modo claro' }).click();
  await expectTheme(page, 'light');
  await expectTheme(otherTab, 'light');
  await page.reload();
  await expectTheme(page, 'light');
});

test('theme works without browser storage and respects reduced motion', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage unavailable', 'SecurityError');
      },
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await expectTheme(page, 'dark');
  await page.getByRole('button', { name: 'Activar modo claro' }).click();
  await expectTheme(page, 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectTheme(page, 'light');
  expect(
    await page
      .locator('.theme-toggle')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe('0s');
  expect(errors).toEqual([]);
});

for (const width of [375, 768, 1280]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`credits, forms and modal are readable at ${width}px in ${theme} theme`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto('/');
      await expectTheme(page, theme);
      await page.getByRole('button', { name: /Conoce al equipo/ }).click();
      await expect(
        page.getByRole('heading', { name: 'Fuga en el Zoológico' }),
      ).toBeFocused();
      await expect(page.getByText('Equipo #3', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('heading', {
          name: 'Universidad Autónoma de Nuevo León',
        }),
      ).toBeVisible();
      await expect(
        page.getByText('Facultad de Ingeniería Mecánica y Eléctrica'),
      ).toBeVisible();
      await expect(
        page.getByText('María Cristina Cantú Rodríguez'),
      ).toBeVisible();
      await expect(
        page.getByText('Pensamiento Creativo', { exact: true }),
      ).toBeVisible();
      await expect(page.getByText('008', { exact: true })).toBeVisible();
      await expect(page.locator('.team-member-card')).toHaveCount(4);
      for (const [name, id, career] of [
        ['Estefany Garza Mora', '2047821', 'ITS'],
        ['Samuel Álvarez Rodríguez', '2040316', 'IMC'],
        ['Ángel Ricardo Álvarez García', '2041139', 'ITS'],
        ['Emiliano Arturo Esquivel Álvarez', '2049063', 'ITS'],
      ]) {
        const card = page
          .getByRole('article')
          .filter({ has: page.getByRole('heading', { name }) });
        await expect(card).toContainText(id);
        await expect(card).toContainText(career);
      }
      await expect(page.locator('main')).not.toContainText(/modalidad/i);
      const columns = await page
        .locator('.team-grid')
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
        );
      expect(columns).toBe(width < 768 ? 1 : 2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `previews/credits-${theme}-${width}.png`,
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Volver al Home' }).click();
      await expect(
        page.getByRole('button', { name: /Conoce al equipo/ }),
      ).toBeFocused();
      await page.getByRole('button', { name: 'Cómo jugar' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCSS(
        'color',
        theme === 'dark' ? 'rgb(242, 240, 223)' : 'rgb(33, 61, 48)',
      );
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', { name: 'Unirme a partida', exact: true })
        .click();
      await page.getByLabel('Tu nombre').fill('Explorador');
      await page.getByLabel('Código de sala').fill('XXXXX');
      await expect(
        page.getByRole('button', { name: 'Entrar a la sala' }),
      ).toBeEnabled();
      await page.getByRole('button', { name: 'Entrar a la sala' }).click();
      await expect(page.getByRole('alert')).toContainText('La sala no existe');
      await page.getByLabel('Código de sala').focus();
      expect(
        await page
          .getByLabel('Código de sala')
          .evaluate((el) => getComputedStyle(el).outlineStyle),
      ).toBe('solid');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const contrast = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        const luminance = (token: string) => {
          const hex = styles.getPropertyValue(token).trim().slice(1);
          const rgb = [0, 2, 4]
            .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
            .map((v) =>
              v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
            );
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        return [
          ['--text-primary', '--bg-primary'],
          ['--text-secondary', '--surface'],
          ['--text-muted', '--surface'],
          ['--text-muted', '--field-bg'],
          ['--button-text', '--button-bg'],
          ['--card-text', '--card-bg'],
          ['--danger', '--danger-bg'],
          ['--success', '--success-bg'],
          ['--wood', '--wood-bg'],
          ['--accent', '--surface-soft'],
        ].map(([foreground, background]) => {
          const a = luminance(foreground),
            b = luminance(background);
          return {
            foreground,
            background,
            ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          };
        });
      });
      for (const pair of contrast)
        expect(
          pair.ratio,
          `${pair.foreground} on ${pair.background}`,
        ).toBeGreaterThanOrEqual(4.5);
    });
  }
}
