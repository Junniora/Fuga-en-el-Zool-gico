import { test, expect, type Page } from '@playwright/test';
import { memorySymbols } from '../shared/investigation';

test('memory missions, private sabotage, accumulated clues, voting, themes and reconnection', async ({
  browser,
}) => {
  test.setTimeout(150000);
  const contexts = await Promise.all(
    [
      { width: 1280, height: 1000 },
      { width: 375, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 900 },
    ].map((viewport, i) =>
      browser.newContext({ viewport, colorScheme: i % 2 ? 'dark' : 'light' }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const errors: string[] = [];
  for (const page of pages)
    page.on('pageerror', (error) => errors.push(error.message));
  const names = ['León', 'Animal 1', 'Animal 2', 'Animal 3'];
  async function reveal() {
    await pages[0].getByRole('button', { name: 'Comenzar la fuga' }).click();
    let guard = -1;
    for (let i = 0; i < 4; i++) {
      await expect(pages[i].locator('.secret-reveal')).toBeVisible();
      if (
        (await pages[i].locator('.secret-reveal h2').innerText()).includes(
          'guarda',
        )
      )
        guard = i;
      await expect(
        pages[i].locator('.play-panel .credential-card'),
      ).toContainText(names[i]);
      await pages[i]
        .getByRole('button', { name: 'Entendido. Ocultar mi rol' })
        .click();
    }
    expect(guard).toBeGreaterThanOrEqual(0);
    await expect(
      pages[0].getByRole('button', { name: 'Comenzar actividades' }),
    ).toBeVisible();
    return guard;
  }
  async function symbols(page: Page) {
    return page
      .locator('.memory-sequence li')
      .evaluateAll((nodes) =>
        nodes.map((n) => Number(n.getAttribute('data-symbol'))),
      );
  }
  async function round(
    guard: number,
    failedSabotage: boolean,
    checkReconnect = false,
  ) {
    await pages[0]
      .getByRole('button', { name: 'Comenzar actividades' })
      .click();
    await Promise.all(
      pages.map((p, i) =>
        p
          .getByRole('button', {
            name: i === guard ? 'Intentar sabotear' : 'Comenzar actividad',
            exact: true,
          })
          .click(),
      ),
    );
    await Promise.all(
      pages.map((p) => expect(p.locator('.memory-sequence')).toBeVisible()),
    );
    const answers = await Promise.all(pages.map(symbols));
    expect(answers[guard].length).toBe(6);
    for (let i = 0; i < 4; i++)
      if (i !== guard) expect(answers[i].length).toBe(4);
    if (checkReconnect) {
      await pages[0]
        .getByRole('button', { name: 'Activar modo oscuro' })
        .click();
      expect(await symbols(pages[0])).toEqual(answers[0]);
      await pages[0]
        .getByRole('button', { name: 'Activar modo claro' })
        .click();
      await pages[1].reload();
      await expect(pages[1].locator('.memory-sequence')).toBeVisible();
      expect(await symbols(pages[1])).toEqual(answers[1]);
      await pages[1].screenshot({
        path: 'previews/memory-mobile.png',
        fullPage: true,
      });
    }
    await Promise.all(
      pages.map((p) =>
        expect(
          p.getByRole('heading', { name: 'Reproduce la secuencia' }),
        ).toBeVisible({ timeout: 12000 }),
      ),
    );
    const order = [1, 0, 2, 3];
    for (const i of order) {
      const p = pages[i];
      expect(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const answer = [...answers[i]];
      if (failedSabotage ? i === guard : i !== guard)
        answer[0] = (answer[0] + 1) % memorySymbols.length;
      for (const symbol of answer)
        await p
          .locator('.symbol-buttons')
          .getByRole('button', {
            name: memorySymbols[symbol].label,
            exact: true,
          })
          .click();
      await p.getByRole('button', { name: 'Enviar secuencia' }).click();
      if (checkReconnect && i === 1) {
        await p.reload();
        await expect(
          p.getByText('Tu actividad quedó registrada.'),
        ).toBeVisible();
        const saved = await p.evaluate(() =>
          localStorage.getItem('fuga-session'),
        );
        for (const field of ['sequence', 'role', 'answer', 'activity'])
          expect(saved).not.toContain(field);
      }
    }
    await expect(
      pages[0].getByText(
        failedSabotage ? '✓ MISIÓN SUPERADA' : '× MISIÓN FALLIDA',
      ),
    ).toBeVisible();
    await expect(pages[0].locator('.contribution-card')).toHaveCount(4);
  }
  try {
    await Promise.all(pages.map((p) => p.goto('http://127.0.0.1:5175')));
    for (const p of pages)
      await expect(p.getByText('Conectados', { exact: true })).toBeVisible();
    await pages[0]
      .getByRole('button', { name: 'Crear partida', exact: true })
      .click();
    await pages[0].getByLabel('Tu nombre').fill(names[0]);
    await pages[0].getByRole('button', { name: 'Crear campamento' }).click();
    await expect(pages[0].locator('.room-code')).toBeVisible();
    const roomCode = await pages[0].locator('.room-code').innerText();
    await expect(
      pages[0].getByRole('button', { name: 'Comenzar la fuga' }),
    ).toBeDisabled();
    for (let i = 1; i < 4; i++) {
      await pages[i]
        .getByRole('button', { name: 'Unirme a partida', exact: true })
        .click();
      await pages[i].getByLabel('Tu nombre').fill(names[i]);
      await pages[i].getByLabel('Código de sala').fill(roomCode);
      await pages[i].getByRole('button', { name: 'Entrar a la sala' }).click();
      await expect(pages[i].locator('.room-code')).toHaveText(roomCode);
    }
    const guard = await reveal();
    for (let index = 0; index < 3; index++) {
      await round(guard, true, index === 0);
      for (const p of pages)
        await expect(p.locator('.clue-list li')).toHaveCount(index + 1);
      const candidates = await pages[0]
        .locator('.credential-grid .credential-card:not(.ruled-out)')
        .count();
      if (index === 0) expect(candidates).toBeGreaterThanOrEqual(2);
      if (index === 2) expect(candidates).toBe(1);
      if (index === 1) {
        await pages[0].screenshot({
          path: 'previews/investigation-desktop.png',
          fullPage: true,
        });
        await pages[1].screenshot({
          path: 'previews/investigation-mobile.png',
          fullPage: true,
        });
      }
      await pages[0].getByRole('button', { name: 'Abrir discusión' }).click();
      await pages[0]
        .getByRole('button', {
          name: index === 2 ? 'Ver desenlace' : 'Continuar sin acusar',
        })
        .click();
    }
    for (const p of pages)
      await expect(
        p.getByRole('heading', { name: '¡Los animales ganaron!' }),
      ).toBeVisible();
    await pages[0].getByRole('button', { name: 'Jugar otra vez' }).click();
    await expect(pages[0].locator('.investigation-board')).toHaveCount(0);
    for (const p of pages)
      if (
        await p.getByRole('button', { name: 'Activar modo oscuro' }).isVisible()
      )
        await p.getByRole('button', { name: 'Activar modo oscuro' }).click();
    const newGuard = await reveal();
    await expect(pages[0].locator('.clue-list li')).toHaveCount(0);
    await round(newGuard, false);
    await expect(pages[0].locator('.evidence-result')).toContainText(
      'No se encontraron nuevas pistas',
    );
    await pages[0].getByRole('button', { name: 'Abrir discusión' }).click();
    await pages[0]
      .getByRole('button', { name: 'Acusar a un sospechoso' })
      .click();
    await expect(
      pages[0].getByRole('heading', { name: '¿Quién es el guarda?' }),
    ).toBeVisible();
    await expect(
      pages[0].getByRole('heading', { name: 'Tablero de investigación' }),
    ).toBeVisible();
    await pages[0].screenshot({
      path: 'previews/voting-dark.png',
      fullPage: true,
    });
    for (let i = 0; i < 4; i++) {
      const target = i === newGuard ? (i + 1) % 4 : newGuard;
      await pages[i]
        .locator('.vote-options button')
        .filter({ hasText: names[target] })
        .click();
      await pages[i]
        .getByRole('button', { name: 'Confirmar voto secreto' })
        .click();
    }
    await expect(
      pages[0].getByRole('heading', { name: '¡Encontraron al guarda!' }),
    ).toBeVisible();
    await pages[0]
      .getByRole('button', { name: 'Continuar', exact: true })
      .click();
    for (const p of pages)
      await expect(
        p.getByRole('heading', { name: '¡Los animales ganaron!' }),
      ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
