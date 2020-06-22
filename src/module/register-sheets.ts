import { ItemSheetPF2e } from './item/sheet';

export function registerSheets() {
    Items.unregisterSheet('core', ItemSheet);
    Items.registerSheet('pf2e', ItemSheetPF2e, { makeDefault: true });    
}
