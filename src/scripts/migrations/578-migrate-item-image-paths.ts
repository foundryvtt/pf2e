import { MigrationBase } from './base';

export class Migration578MigrateItemImagePaths extends MigrationBase {
    static version = 0.578;
    async updateItem(item: any, actor?: any) {
        const itemImage = item.img;

        // folder name change
        if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical%20items/alchemical%20elixirs/')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/alchemical%20items/alchemical%20elixirs/',
                'systems/pf2e/icons/equipment/alchemical-items/alchemical-elixirs/',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical%20items/')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/alchemical%20items/',
                'systems/pf2e/icons/equipment/alchemical-items/',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/adventuring%20gear/')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/adventuring%20gear/',
                'systems/pf2e/icons/equipment/adventuring-gear/',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/cursed%20items/')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/cursed%20items/',
                'systems/pf2e/icons/equipment/cursed-items/',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/held%20items/')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/held%20items/',
                'systems/pf2e/icons/equipment/held-items/',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/intelligent%20items/')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/intelligent%20items/',
                'systems/pf2e/icons/equipment/intelligent-items/',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/worn%20items/')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/worn%20items/',
                'systems/pf2e/icons/equipment/worn-items/',
            );
        }

        // consumables subfolder
        else if (
            itemImage?.includes('systems/pf2e/icons/equipment/consumables/') &&
            !itemImage?.includes('systems/pf2e/icons/equipment/consumables/potions/') &&
            itemImage?.includes('potion')
        ) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/consumables/',
                'systems/pf2e/icons/equipment/consumables/potions/',
            );
        } else if (
            itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/') &&
            !itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/alchemical-elixirs/') &&
            itemImage?.includes('elixir')
        ) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/alchemical-items/',
                'systems/pf2e/icons/equipment/alchemical-items/alchemical-elixirs/',
            );
        }

        // specific icon changes
        else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/acid-flask.jpg')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/alchemical-items/acid-flask.jpg',
                'systems/pf2e/icons/equipment/alchemical-items/alchemical-bombs/acid-flask.jpg',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/alchemists-fire.jpg')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/alchemical-items/alchemists-fire.jpg',
                'systems/pf2e/icons/equipment/alchemical-items/alchemical-bombs/alchemists-fire.jpg',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/frost-vial.jpg')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/alchemical-items/frost-vial.jpg',
                'systems/pf2e/icons/equipment/alchemical-items/alchemical-bombs/frost-vial.jpg',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/bombers-eye-elixir.jpg')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/alchemical-items/bombers-eye-elixir.jpg',
                'systems/pf2e/icons/equipment/alchemical-items/alchemical-elixirs/bombers-eye-elixir.jpg',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/antidote.jpg')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/alchemical-items/antidote.jpg',
                'systems/pf2e/icons/equipment/alchemical-items/alchemical-elixirs/antidote.jpg',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/bottled-lightning.jpg')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/alchemical-items/bottled-lightning.jpg',
                'systems/pf2e/icons/equipment/alchemical-items/alchemical-bombs/bottled-lightning.jpg',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/held-items/platinum-pieces.jpg')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/held-items/platinum-pieces.jpg',
                'systems/pf2e/icons/equipment/treasure/currency/platinum-pieces.jpg',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/held-items/gold-pieces.jpg')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/held-items/gold-pieces.jpg',
                'systems/pf2e/icons/equipment/treasure/currency/gold-pieces.jpg',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/held-items/silver-pieces.jpg')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/held-items/silver-pieces.jpg',
                'systems/pf2e/icons/equipment/treasure/currency/silver-pieces.jpg',
            );
        } else if (itemImage?.includes('systems/pf2e/icons/equipment/held-items/copper-pieces.jpg')) {
            item.img = itemImage.replace(
                'systems/pf2e/icons/equipment/held-items/copper-pieces.jpg',
                'systems/pf2e/icons/equipment/treasure/currency/copper-pieces.jpg',
            );
        }
    }
}
