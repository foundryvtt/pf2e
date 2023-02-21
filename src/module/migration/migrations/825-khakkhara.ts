import { BaseWeaponType } from "@item/weapon/types";
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
            
            const fixBaseItemAndSlug = ((oldId: string, newId: BaseWeaponType) => {
                const baseItem: string | null = source.system.baseItem;
                if (baseItem === oldId) {
                    source.system.baseItem = newId;
                }
    
                if (source.system.slug === oldId) {
                    source.system.slug = newId;
                }
            });

            fixBaseItemAndSlug("khakkara", "khakkhara");
            fixBaseItemAndSlug("wind-and-fire-wheel", "feng-huo-lun");

        } else if (source.type === "feat") {
            const oldLink = "@UUID[Compendium.pf2e.equipment-srd.Khakkara]";
            const newLink = "@UUID[Compendium.pf2e.equipment-srd.Khakkhara]";

            source.system.description.value = source.system.description.value.replace(oldLink, newLink);

            for (const rule of source.system.rules) {
                if (
                    rule.key === "ActiveEffectLike" &&
                    "path" in rule &&
                    rule.path === "system.martial.weapon-base-khakkara.rank"
                ) {
                    rule.path = "system.martial.weapon-base-khakkhara.rank";
                }
            }
        }
    }
}
