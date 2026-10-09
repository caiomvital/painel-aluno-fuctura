export type PanelTarget = { target: string; id?: string; classId?: string };
export function navigatePanel(target: PanelTarget) {
  window.dispatchEvent(new CustomEvent('panel:navigate', { detail: target }));
}
