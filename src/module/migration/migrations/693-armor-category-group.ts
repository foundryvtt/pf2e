import { ArmorSystemSource } from "@item/armor/data.ts";
import { ArmorCategory, ArmorGroup } from "@item/armor/types.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Normalize armor range to numeric or null, remove ability property, and let's do category and group too! */
export class Migration693ArmorCategoryGroup extends MigrationBase {
    static override version = 0.693;

    private isOldGroupData(group: OldOrNewGroup): group is { value: ArmorGroup | "" | null } {
        return (
            group instanceof Object &&
            "value" in group &&
            (typeof group["value"] === "string" || group["value"] === null)
        );
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== "armor") return;

        const systemData: MaybeOldData = itemSource.system;

        // Category
        systemData.category = (systemData.armorType ? systemData.armorType.value : systemData.category) || "simple";
        if (systemData.armorType) {
            systemData["-=armorType"] = null;
            if (!("game" in globalThis)) delete systemData.armorType;
        }

        // Group
        systemData.group = (this.isOldGroupData(systemData.group) ? systemData.group.value : systemData.group) || null;
    }
}

type OldOrNewGroup = ArmorGroup | null | { value: ArmorGroup | "" | null };
type MaybeOldData = ArmorSystemSource & {
    armorType?: { value: ArmorCategory };
    "-=armorType"?: null;
    group: OldOrNewGroup;
};
