import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Update from khakkara to khakkhara */
export class Migration825Khakkhara extends MigrationBase {
    static override version = 0.825;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.img.endsWith("icons/equipment/weapons/khakkara.webp")) {
            source.img = source.img.replace("khakkara.webp", "khakkhara.webp") as ImageFilePath;
        }

        if (source.type === "weapon") {
            const oldId = "khakkara";
            const newId = "khakkhara";

            if ((source.system.baseItem as string) === oldId) {
                source.system.baseItem = newId;
            }

            if (source.system.slug === oldId) {
                source.system.slug = newId;
            }
        } else if (source.type === "feat") {
            const oldLink = "@UUID[Compendium.pf2e.equipment-srd.Khakkara]";
            const newLink = "@UUID[Compendium.pf2e.equipment-srd.Khakkhara]";

            source.system.description.value = source.system.description.value.replace(oldLink, newLink);

            source.system.rules.forEach((rule) => {
                if (
                    rule.key === "ActiveEffectLike" &&
                    "path" in rule &&
                    rule.path === "system.martial.weapon-base-khakkara.rank"
                ) {
                    rule.path = "system.martial.weapon-base-khakkhara.rank";
                }
            });
        }
    }
}
