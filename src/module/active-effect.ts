import type { ActorPF2e } from "@actor";
import type { DatabaseCreateCallbackOptions } from "@common/abstract/_types.d.mts";
import type { EffectDurationSource, EffectStartSource } from "@common/documents/active-effect.d.mts";
import type { AbstractEffectPF2e, ItemPF2e } from "@item";
import { tupleHasValue } from "@util";
import * as R from "remeda";

export class ActiveEffectPF2e<TParent extends ActorPF2e | ItemPF2e | null> extends ActiveEffect<TParent> {
    /** Create an active effect from an (abstract) effect for use in token effect icons */
    static fromItem<TItem extends ItemPF2e<ActorPF2e>>(effect: AbstractEffectPF2e<ActorPF2e>): ActiveEffectPF2e<TItem> {
        const isCondition = effect.isOfType("condition");
        const durationUnit = tupleHasValue(CONST.ACTIVE_EFFECT_DURATION_UNITS, effect.system.duration.unit)
            ? effect.system.duration.unit
            : null;
        const start: Pick<EffectStartSource, "initiative" | "time"> = {
            initiative: effect.system.start?.initiative ?? null,
            time: effect.system.start?.value ?? game.time.worldTime,
        };
        const duration: EffectDurationSource = {
            units: durationUnit,
            value: durationUnit ? effect.system.duration.value : null,
            expiry: null,
            expired: false,
        };
        return new this(
            {
                name: effect.name,
                img: effect.img,
                type: "base",
                system: {},
                description: effect.system.description.value,
                disabled: isCondition ? !effect.active : false,
                duration,
                start,
                origin: effect.uuid,
                transfer: true,
                statuses: [effect.slug].filter(R.isNonNull),
                showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
                flags: fu.deepClone(effect.flags),
                _stats: fu.deepClone(effect._stats),
            },
            { parent: effect.actor },
        );
    }

    /** Only allow the death overlay effect */
    protected override async _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        return data.statuses?.includes("dead") ? super._preCreate(data, options, user) : false;
    }
}
