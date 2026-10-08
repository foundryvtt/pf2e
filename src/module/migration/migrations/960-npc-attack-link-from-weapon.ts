import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Opt existing generated strikes with extra damage instances out of linked-weapon rune and material inheritance. */
export class Migration960NPCAttackLinkFromWeapon extends MigrationBase {
    static override version = 0.96;

    override async updateItem(source: ItemSourcePF2e, actorSource?: ActorSourcePF2e): Promise<void> {
        if (source.type !== "melee" || !actorSource) return;

        const flags = (source.flags[SYSTEM_ID] ??= {});
        const linkedId = flags.linkedWeapon;
        if (typeof linkedId !== "string" || !linkedId) return;

        if (actorSource.items.every((item) => item.type !== "weapon" || item._id !== linkedId)) return;

        const damageRolls = source.system.damageRolls;
        if (!R.isPlainObject(damageRolls) || Object.keys(damageRolls).length < 2) return;

        flags.syncWeaponProperties = false;
    }
}
