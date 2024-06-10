import { SpellPF2e } from "@item";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { setHasElement } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import { MigrationBase } from "../base.ts";

/** Update the descriptions of several spells with new effect items */
export class Migration720UpdateSpellDescriptions extends MigrationBase {
    static override version = 0.72;

    private spellUUIDs: Set<CompendiumUUID> = new Set([
        "Compendium.pf2e.spells-srd.Item.GoKkejPj5yWJPIPK", // Adaptive Ablation
        "Compendium.pf2e.spells-srd.Item.1b55SgYTV65JvmQd", // Blessing of Defiance
        "Compendium.pf2e.spells-srd.Item.b515AZlB0sridKSq", // Calm Emotions
        "Compendium.pf2e.spells-srd.Item.NBSBFHxBm88qxQUy", // Chromatic Armor
        "Compendium.pf2e.spells-srd.Item.9TauMFkIsmvKJNzZ", // Elemental Absorption
        "Compendium.pf2e.spells-srd.Item.LoBjvguamA12iyW0", // Energy Absorption
        "Compendium.pf2e.spells-srd.Item.IWUe32Y5k2QFd7YQ", // Gravity Weapon
        "Compendium.pf2e.spells-srd.Item.WBmvzNDfpwka3qT4", // Light
    ]);

    private spells = UUIDUtils.fromUUIDs([...this.spellUUIDs]);

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!(source.type === "spell" && setHasElement(this.spellUUIDs, source.flags.core?.sourceId))) {
            return;
        }

        const spells: unknown[] = await this.spells;
        const spell = spells.find((s): s is SpellPF2e => s instanceof SpellPF2e && s.slug === source.system.slug);

        if (spell) source.system.description.value = spell.description;
    }
}
