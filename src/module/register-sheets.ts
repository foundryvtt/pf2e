import { ItemSheetPF2e } from '@item/sheet/base';
import { KitSheetPF2e } from '@item/sheet/kit';
import { AncestrySheetPF2e } from '@item/sheet/ancestry';
import { BackgroundSheetPF2e } from '@item/sheet/background';
import { ClassSheetPF2e } from '@item/sheet/class';
import { PF2EItem } from '@item/item';

export function registerSheets() {
    Items.unregisterSheet('core', ItemSheet);
    Items.registerSheet<PF2EItem>('pf2e', ItemSheetPF2e, {
        types: [
            'weapon',
            'melee',
            'armor',
            'equipment',
            'consumable',
            'treasure',
            'lore',
            'martial',
            'spell',
            'spellcastingEntry',
            'feat',
            'action',
            'backpack',
            'condition',
            'effect',
        ],
        makeDefault: true,
    });
    Items.registerSheet('pf2e', KitSheetPF2e, { types: ['kit'], makeDefault: true });
    Items.registerSheet('pf2e', AncestrySheetPF2e, { types: ['ancestry'], makeDefault: true });
    Items.registerSheet('pf2e', BackgroundSheetPF2e, { types: ['background'], makeDefault: true });
    Items.registerSheet('pf2e', ClassSheetPF2e, { types: ['class'], makeDefault: true });
}
