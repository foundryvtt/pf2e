import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { ErrorPF2e } from "@util";
import { MigrationBase } from "../base.ts";

/** Normalize weapon range to numeric or null, remove ability property, and let's do category and group too! */
export class Migration692CraftingEntryFeatReplacement extends MigrationBase {
    static override version = 0.692;
    override requiresFlush = true;

    private slugToPromise = new Map<string, Promise<ClientDocument | null>>([
        ["advanced-alchemy", fromUuid("Compendium.pf2e.classfeatures.Pe0zmIqyTBc2Td0I")],
        ["field-discovery-bomber", fromUuid("Compendium.pf2e.classfeatures.8QAFgy9U8PxEa7Dw")],
        ["field-discovery-chirurgeon", fromUuid("Compendium.pf2e.classfeatures.qC0Iz6SlG2i9gv6g")],
        ["field-discovery-mutagenist", fromUuid("Compendium.pf2e.classfeatures.V4Jt7eDnJBLv5bDj")],
        ["field-discovery-toxicologist", fromUuid("Compendium.pf2e.classfeatures.6zo2PJGYoig7nFpR")],
        ["infused-reagents", fromUuid("Compendium.pf2e.classfeatures.wySB9VHOW1v3TX1L")],
        ["alchemist-dedication", fromUuid("Compendium.pf2e.feats-srd.CJMkxlxHiHZQYDCz")],
        ["deeper-dabbler", fromUuid("Compendium.pf2e.feats-srd.PTXZ2C3AV8tZf0iX")],
        ["efficient-alchemy-paragon", fromUuid("Compendium.pf2e.feats-srd.2FBZ0apnmZ7b61ct")],
        ["expert-alchemy", fromUuid("Compendium.pf2e.feats-srd.soHLtpMM9h3AE7PD")],
        ["expert-fireworks-crafter", fromUuid("Compendium.pf2e.feats-srd.dDFQJem5K9Jzxgda")],
        ["expert-herbalism", fromUuid("Compendium.pf2e.feats-srd.owJorCBZmUi5lIV0")],
        ["expert-poisoner", fromUuid("Compendium.pf2e.feats-srd.VruIzuysxw4tY6rk")],
        ["firework-technician-dedication", fromUuid("Compendium.pf2e.feats-srd.MVbNnjqQOK9d8Ki3")],
        ["gadget-specialist", fromUuid("Compendium.pf2e.feats-srd.DQN7YC7s7T0pL6Aa")],
        ["herbalist-dedication", fromUuid("Compendium.pf2e.feats-srd.5CRt5Dy9eLv5LpRF")],
        ["master-alchemy", fromUuid("Compendium.pf2e.feats-srd.f6k9lIrIS4SfnCnG")],
        ["munitions-crafter", fromUuid("Compendium.pf2e.feats-srd.lFVqejlf52cdYrZy")],
        ["munitions-machinist", fromUuid("Compendium.pf2e.feats-srd.lh3STEvbGnP7jVMr")],
        ["plentiful-snares", fromUuid("Compendium.pf2e.feats-srd.wGaxWwJhIXbMJft1")],
        ["poisoner-dedication", fromUuid("Compendium.pf2e.feats-srd.y7DDs03GtDnmhxFp")],
        ["snare-genius", fromUuid("Compendium.pf2e.feats-srd.8DIzXO1YpsU3DpJw")],
        ["snare-specialist", fromUuid("Compendium.pf2e.feats-srd.0haS0qXR9xTYKoTG")],
        ["snarecrafter-dedication", fromUuid("Compendium.pf2e.feats-srd.4MUbwilvb9dI0X59")],
        ["talisman-dabbler-dedication", fromUuid("Compendium.pf2e.feats-srd.1t5479E6bdvFs4E7")],
        ["ubiquitous-gadgets", fromUuid("Compendium.pf2e.feats-srd.ny0nfGTDUE4p8TtO")],
        ["ubiquitous-snares", fromUuid("Compendium.pf2e.feats-srd.bX2WI5k0afqPpCfm")],
    ]);

    private replaceItem({ items, current, replacement }: ReplaceItemArgs): void {
        if (!(replacement instanceof ItemPF2e)) throw ErrorPF2e("Unexpected error retrieving compendium item");
        const newSource = replacement.toObject();
        if (current.type === "feat" && newSource.type === "feat") {
            newSource.system.location = current.system.location;
        }
        items.splice(items.indexOf(current), 1, newSource);
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type === "character") {
            this.slugToPromise.forEach(async (promise, slug) => {
                const current = actorSource.items.find(
                    (itemSource) => itemSource.type === "feat" && itemSource.system.slug === slug
                );
                if (current)
                    this.replaceItem({
                        items: actorSource.items,
                        current: current,
                        replacement: await promise,
                    });
            });
        }
    }
}

interface ReplaceItemArgs {
    items: ItemSourcePF2e[];
    current: ItemSourcePF2e;
    replacement: ClientDocument | null;
}
