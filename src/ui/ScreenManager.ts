const MAIN_SCREENS = ['screen-boot', 'screen-menu', 'screen-select', 'screen-hub'];

function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing #${id}`);
  return e;
}

export class ScreenManager {
  /** Shows one of the mutually-exclusive full-page screens, hiding the rest. */
  showMain(id: string): void {
    for (const s of MAIN_SCREENS) el(s).hidden = s !== id;
  }

  show(id: string): void {
    el(id).hidden = false;
  }

  hide(id: string): void {
    el(id).hidden = true;
  }

  isHidden(id: string): boolean {
    return Boolean(el(id).hidden);
  }
}
