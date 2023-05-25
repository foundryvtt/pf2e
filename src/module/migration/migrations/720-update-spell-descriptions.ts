import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { SpellPF2e } from "@item";
import { UUIDUtils } from "@util/uuid.ts";
import { setHasElement } from "@util";

/** Update the descriptions of several spells with new effect items */
export class Migration720UpdateSpellDescriptions extends MigrationBase {
    static override version = 0.72;

    private spellUUIDs: Set<CompendiumUUID> = new Set([
        "Compendium.pf2e.spells-srd.GoKkejPj5yWJPIPK", // Adaptive Ablation
        "Compendium.pf2e.spells-srd.1b55SgYTV65JvmQd", // Blessing of Defiance
        "Compendium.pf2e.spells-srd.b515AZlB0sridKSq", // Calm Emotions
        "Compendium.pf2e.spells-srd.NBSBFHxBm88qxQUy", // Chromatic Armor
        "Compendium.pf2e.spells-srd.9TauMFkIsmvKJNzZ", // Elemental Absorption
        "Compendium.pf2e.spells-srd.LoBjvguamA12iyW0", // Energy Absorption
        "Compendium.pf2e.spells-srd.IWUe32Y5k2QFd7YQ", // Gravity Weapon
        "Compendium.pf2e.spells-srd.WBmvzNDfpwka3qT4", // Light
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
