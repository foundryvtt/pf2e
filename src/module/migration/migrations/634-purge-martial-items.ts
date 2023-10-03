import { ActorSourcePF2e } from "@actor/data/index.ts";
import { WeaponSource } from "@item/data/index.ts";
import { WeaponSystemSource } from "@item/weapon/data.ts";
import { WeaponCategory } from "@item/weapon/types.ts";
import { MigrationBase } from "../base.ts";

export class Migration634PurgeMartialItems extends MigrationBase {
    static override version = 0.634;

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        const martialItems = actorData.items.filter((itemData: { type: string }) => itemData.type === "martial");
        const martialIds = martialItems.map((itemData) => itemData._id);
        const martialItemWeapons = actorData.items.filter(
            (itemData): itemData is WeaponSource & { data: MaybeOldWeaponSource } => {
                if (itemData.type !== "weapon") return false;
                const systemData: MaybeOldWeaponSource = itemData.system;
                return martialIds.includes(systemData.weaponType?.value ?? "");
            }
        );

        for (const weaponData of martialItemWeapons) {
            weaponData.data.category = "simple";
        }

        actorData.items = actorData.items.filter((itemData: { type: string }) => itemData.type !== "martial");
    }
}

type MaybeOldWeaponSource = WeaponSystemSource & {
    weaponType?: { value: WeaponCategory };
    category: WeaponCategory;
};
