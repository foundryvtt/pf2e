import type { ActorSourcePF2e } from "@actor/data/index.ts";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

export class Migration943UpdateSpeedPath extends MigrationBase {
    static override version = 0.943;

    /** Delete legacy speed object from most (likely player-character) actors. */
    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "npc") return;
        const attributes: (object & { speed?: unknown; "-=speed"?: null }) | undefined = source.system.attributes;
        if (R.isPlainObject(attributes) && "speed" in attributes && R.isPlainObject(attributes.speed)) {
            attributes["-=speed"] = null;
        }
    }

    /** Update path to land base or derived speed in rule elements. */
    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const landSpeedPath = "system.movement.speeds.land";
        source.system.rules = recursiveReplaceString(source.system.rules, (s) =>
            s
                .replace(/\bsystem.attributes\.speed\.total\b/g, `${landSpeedPath}.value`)
                .replace(/\bsystem.attributes\.speed\.value\b/g, `${landSpeedPath}.base`)
                .replace(/\battributes\.speed\.total\b/g, `${landSpeedPath}.value`)
                .replace(/\battributes\.speed\.value\b/g, `${landSpeedPath}.base`),
        );
    }
}
