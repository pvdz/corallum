// Asks in the game's own cards instead of the browser's dialogs (confirm, prompt, alert), which
// drop a bright system box over the dark water: a card like the stories', the safe answer
// focused, Escape, Back or a tap beside the card for no.

import { button, el } from './dom.ts';

export type AskOptions = {
  title: string;
  text: string;
  /** The answer that goes ahead. */
  yes: string;
  /** The answer that does not (none: a message with one button). */
  no?: string;
  /** Going ahead loses something: the button is marked, and "no" takes the focus. */
  danger?: boolean;
};

export function createAsk(host: HTMLElement) {
  const box = el('div', 'reader prompt');
  box.hidden = true;
  box.setAttribute('role', 'alertdialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'prompt-title');
  const card = el('div', 'reader-card');
  const title = el('h2');
  title.id = 'prompt-title';
  const text = el('p', 'reader-text');
  text.id = 'prompt-text';
  box.setAttribute('aria-describedby', 'prompt-text');
  const field = el('textarea', 'prompt-field') as HTMLTextAreaElement;
  field.rows = 4;
  field.spellcheck = false;
  const foot = el('div', 'prompt-foot');
  const no = button('plain', '', () => finish(false));
  const yes = button('plain', '', () => finish(true));
  foot.append(no, yes);
  card.append(title, text, field, foot);
  box.append(card);
  host.append(box);

  let resolve: ((v: string | null) => void) | null = null;
  /** What had the focus before the card opened (the button that asked): it gets it back. */
  let before: HTMLElement | null = null;
  function finish(ok: boolean): void {
    if (!resolve) return;
    box.hidden = true;
    const r = resolve;
    resolve = null;
    if (before?.isConnected) before.focus({ preventScroll: true });
    before = null;
    r(ok ? field.value : null);
  }
  box.addEventListener('click', (e) => { if (e.target === box) finish(false); });
  // Caught first, so a story card under this one is not closed by the same key.
  window.addEventListener('keydown', (e) => {
    if (box.hidden || e.key !== 'Escape') return;
    e.stopPropagation();
    finish(false);
  }, { capture: true });

  function open(o: AskOptions, kind: 'ask' | 'input' | 'show', value = ''): Promise<string | null> {
    finish(false);
    before = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    title.textContent = o.title;
    text.textContent = o.text;
    yes.textContent = o.yes;
    yes.className = o.danger ? 'plain danger' : 'plain';
    no.textContent = o.no ?? '';
    no.hidden = !o.no;
    field.hidden = kind === 'ask';
    field.readOnly = kind === 'show';
    field.value = value;
    box.hidden = false;
    if (kind === 'input') field.focus();
    else if (kind === 'show') { field.focus(); field.select(); }
    else (o.danger && o.no ? no : yes).focus({ preventScroll: true });
    return new Promise((r) => { resolve = r; });
  }

  return {
    /** Yes or no. */
    confirm: (o: AskOptions): Promise<boolean> => open(o, 'ask').then((v) => v !== null),
    /** A line of text from the player (null if they say no). */
    input: (o: AskOptions): Promise<string | null> => open(o, 'input'),
    /** Text shown selected, to copy by hand. */
    show: (o: AskOptions, value: string): Promise<void> => open(o, 'show', value).then(() => undefined),
    /** A message with one button. */
    tell: (o: AskOptions): Promise<void> => open(o, 'ask').then(() => undefined),
  };
}

export type Ask = ReturnType<typeof createAsk>;
