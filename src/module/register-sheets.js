import { ItemSheetPF2e } from './item/sheet.js';

export function registerSheets() {
    Items.unregisterSheet('core', ItemSheet);
    Items.registerSheet('pf2e', ItemSheetPF2e, { makeDefault: true });    
}
