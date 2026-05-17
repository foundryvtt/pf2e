import { ItemSourcePF2e, SpellSource } from "@item/base/data/index.ts";
import { SpellSystemSource } from "@item/spell/data.ts";
import type { OneToTen } from "@module/data.ts";
import { MigrationBase } from "../base.ts";

/** Push back embedded spell property one object-nesting level */
export class Migration772V10EmbeddedSpellData extends MigrationBase {
    static override version = 0.772;

    override async preUpdateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "consumable" && source.system.spell) {
            const embeddedSpell: MaybeWithOldProps = source.system.spell;
            if (embeddedSpell.data?.data) {
                source.system.spell = embeddedSpell.data;
                source.system.spell.system = embeddedSpell.data.data;
                source.system.spell.system.location.heightenedLevel =
                    (Math.clamp(
                        Number(embeddedSpell.data.heightenedLevel) || source.system.spell.system.level.value,
                        1,
                        10,
                    ) as OneToTen) || undefined;
                embeddedSpell.data["-=data"] = null;
                delete embeddedSpell.data.data;
            } else if (embeddedSpell.data?.system) {
                source.system.spell = embeddedSpell.data;
                source.system.spell.system.location.heightenedLevel =
                    (Math.clamp(
                        Number(embeddedSpell.data.heightenedLevel) || source.system.spell.system.level.value,
                        1,
                        10,
                    ) as OneToTen) || undefined;
            } else if (embeddedSpell.data === null) {
                source.system.spell = null;
            }
        }
    }
}

type MaybeWithOldProps = SpellSource & {
    data?: (SpellSource & { data?: SpellSystemSource; heightenedLevel?: number; "-=data"?: null }) | null;
    "-=data"?: null;
};
