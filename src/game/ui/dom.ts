// Tiny DOM helpers shared by the panel's modules.

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function button(cls: string, text: string, onClick: (e: MouseEvent) => void): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

let quiet = false;
/**
 * The panel redraws its words every frame, and nearly all of them come out as they were: about
 * 190 of 200 text writes and every `hidden` write repeat the current value. A repeated write
 * still swaps the text node (or touches the attribute) and costs style and layout, so these two
 * setters skip a write that changes nothing: text only when the element holds a single text node
 * with exactly that text, `hidden` when it already has that value. Measured headless on a phone
 * viewport: layout 1.6 → 0.24 ms and style 0.5 → 0.2 ms a frame. Installed once, by the panel.
 */
export function quietRepeatedWrites(): void {
  if (quiet) return;
  quiet = true;
  const text = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  if (text?.get && text.set) {
    const { get, set } = text;
    Object.defineProperty(Node.prototype, 'textContent', {
      configurable: true, enumerable: text.enumerable, get,
      set(this: Node, v: string | null) {
        const f = this.firstChild;
        if (f && f === this.lastChild && f.nodeType === Node.TEXT_NODE && (f as Text).data === String(v ?? '')) return;
        set.call(this, v);
      },
    });
  }
  const hidden = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden');
  if (hidden?.get && hidden.set) {
    const { get, set } = hidden;
    Object.defineProperty(HTMLElement.prototype, 'hidden', {
      configurable: true, enumerable: hidden.enumerable, get,
      set(this: HTMLElement, v: boolean | 'until-found') {
        if (get.call(this) === v) return;
        set.call(this, v);
      },
    });
  }
}

/**
 * While a card is open over the game (a story, the away summary, the ending), Tab and Shift+Tab
 * go round that card's own controls instead of wandering into the panel behind it.
 */
export function keepFocusInCards(selector: string): void {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const open = [...document.querySelectorAll<HTMLElement>(selector)].filter((x) => !x.hidden);
    const card = open.at(-1);
    if (!card) return;
    const items = [...card.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((x) => !(x as HTMLButtonElement).disabled && x.offsetParent !== null);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i < 0 || i === items.length - 1 ? 0 : i + 1);
    e.preventDefault();
    items[next]!.focus();
  });
}
