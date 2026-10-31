// Tiny DOM helpers shared by the panel's modules.

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function button(cls: string, text: string, onClick: () => void): HTMLButtonElement {
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
