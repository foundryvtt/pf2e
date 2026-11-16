import type { ActorSourcePF2e } from "@actor/data/index.ts";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Opt existing linked strikes out of rune and material inheritance when that would double an existing effect. */
export class Migration960NPCAttackLinkFromWeapon extends MigrationBase {
    static override version = 0.96;

    override async updateItem(source: ItemSourcePF2e, actorSource?: ActorSourcePF2e): Promise<void> {
        if (source.type !== "melee" || !actorSource) return;
        const weaponId = source.flags[SYSTEM_ID]?.linkedWeapon;
        const weapon = weaponId ? actorSource.items.find((i) => i._id === weaponId) : null;
        if (weapon?.type !== "weapon") return;
        if (Object.keys(source.system.damageRolls).length > 1 || source.system.rules.length) {
            const flags = (source.flags[SYSTEM_ID] ??= {});
            flags.syncWeaponFeatures = false;
        }
    }
}
