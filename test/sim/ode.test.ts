import { test } from 'node:test';
import assert from 'node:assert/strict';
import { equilibrium, logistic, relax } from '../../src/game/sim/ode.ts';

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test('relax: one big step equals many small steps', () => {
  let x = 3;
  for (let i = 0; i < 10_000; i++) x = relax(x, 5, 0.02, 0.1);
  close(x, relax(3, 5, 0.02, 1000));
});

test('relax saturates: a week and a month offline are the same', () => {
  const week = relax(0, 7, 0.01, 7 * 86400);
  const month = relax(0, 7, 0.01, 30 * 86400);
  close(week, equilibrium(7, 0.01));
  close(month, week);
});

test('logistic: composition and cap', () => {
  let x = 1;
  for (let i = 0; i < 1000; i++) x = logistic(x, 100, 0.05, 0.5);
  close(x, logistic(1, 100, 0.05, 500));
  close(logistic(1, 100, 0.05, 1e6), 100);
});
