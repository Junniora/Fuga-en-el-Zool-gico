import { test, expect } from '@playwright/test';
test('four separate browsers play all missions with a refresh and responsive layouts', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 360, height: 800 },
    ].map((viewport) => browser.newContext({ viewport })),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const errors: string[] = [];
  for (const page of pages)
    page.on('pageerror', (err) => errors.push(err.message));
  try {
    await Promise.all(pages.map((p) => p.goto('http://127.0.0.1:5175')));
    for (const p of pages)
      await expect(p.getByText('Conectados', { exact: true })).toBeVisible();
    await pages[0].screenshot({
      path: 'previews/home-desktop.png',
      fullPage: true,
    });
    await pages[1].screenshot({
      path: 'previews/home-mobile.png',
      fullPage: true,
    });
    await pages[0].getByRole('button', { name: 'Cómo jugar' }).click();
    await expect(pages[0].getByRole('dialog')).toBeVisible();
    await pages[0].keyboard.press('Escape');
    await expect(pages[0].getByRole('dialog')).toHaveCount(0);
    await pages[0]
      .getByRole('button', { name: 'Crear partida', exact: true })
      .click();
    await pages[0].getByLabel('Tu nombre').fill('León');
    await pages[0].getByRole('button', { name: 'Crear campamento' }).click();
    await expect(pages[0].locator('.room-code')).toBeVisible();
    const code = await pages[0].locator('.room-code').innerText();
    await expect(
      pages[0].getByRole('button', { name: 'Comenzar la fuga' }),
    ).toBeDisabled();
    for (let i = 1; i < 4; i++) {
      await pages[i]
        .getByRole('button', { name: 'Unirme a partida', exact: true })
        .click();
      await pages[i].getByLabel('Tu nombre').fill(`Animal ${i}`);
      await pages[i].getByLabel('Código de sala').fill(code);
      await pages[i].getByRole('button', { name: 'Entrar a la sala' }).click();
      await expect(pages[i].locator('.room-code')).toHaveText(code);
    }
    await expect(pages[0].locator('.player')).toHaveCount(4);
    await pages[0].getByRole('button', { name: 'Comenzar la fuga' }).click();
    let guards = 0;
    for (const p of pages) {
      await expect(p.locator('.secret-reveal')).toBeVisible();
      if ((await p.locator('.secret-reveal h2').innerText()).includes('guarda'))
        guards++;
      await p
        .getByRole('button', { name: 'Entendido. Ocultar mi rol' })
        .click();
    }
    expect(guards).toBe(1);
    for (let round = 0; round < 4; round++) {
      for (const p of pages) {
        await expect(p.locator('.playing-card').first()).toBeVisible();
        expect(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await p.locator('.playing-card').filter({ hasText: '+3' }).click();
        await p.getByRole('button', { name: 'Jugar carta en secreto' }).click();
        if (round === 0 && p === pages[1]) {
          await p.reload();
          await expect(
            p.getByText('Tu carta está sobre la mesa.'),
          ).toBeVisible();
          const stored = await p.evaluate(() =>
            localStorage.getItem('fuga-session'),
          );
          expect(stored).not.toContain('role');
          expect(stored).not.toContain('cards');
          await p.screenshot({
            path: 'previews/game-mobile.png',
            fullPage: true,
          });
        }
      }
      await expect(pages[0].getByText('✓ MISIÓN SUPERADA')).toBeVisible();
      await pages[0].getByRole('button', { name: 'Abrir discusión' }).click();
      await pages[0]
        .getByRole('button', {
          name: round === 3 ? 'Ver desenlace' : 'Continuar sin acusar',
        })
        .click();
    }
    for (const p of pages)
      await expect(
        p.getByRole('heading', { name: '¡Los animales ganaron!' }),
      ).toBeVisible();
    await pages[0].getByRole('button', { name: 'Jugar otra vez' }).click();
    for (const p of pages)
      await expect(
        p.getByRole('heading', { name: 'El plan empieza contigo.' }),
      ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
