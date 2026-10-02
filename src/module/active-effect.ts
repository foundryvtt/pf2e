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

    static override applyChange(
        targetDoc: Actor | Item | TokenDocument,
        change: fd.ActiveEffectChangeData,
        options?: { replacementData?: object; modifyTarget?: boolean },
    ): Record<string, unknown> {
        if (targetDoc.documentName !== "Token") return super.applyChange(targetDoc, change, options);
        // Modify or hold back token changes
        switch (change.key) {
            case "detectionModes.basicSight":
            case "detectionModes.lightPerception": {
                // Upstream does not handle changing null to Infinity outside of normal data preparation.
                if (Number(game.release.version) >= 14.369 || !R.isPlainObject(change.value)) break;
                const range = Number(change.value.range ?? Infinity);
                const value = { enabled: change.value.enabled, range };
                if (options?.modifyTarget) fu.setProperty(targetDoc, change.key, value);
                return { [change.key]: value };
            }
            case "detectionModes.hearing": {
                if (Number(game.release.version) >= 14.369 || !R.isPlainObject(change.value)) break;
                const range = Number(targetDoc.parent?.flags[SYSTEM_ID]?.hearingRange ?? Infinity);
                const value = { enabled: change.value.enabled, range };
                if (options?.modifyTarget) fu.setProperty(targetDoc, change.key, value);
                return { [change.key]: value };
            }
            case "sight.range": {
                if (Number(game.release.version) >= 14.369) break;
                const value = Number(change.value ?? Infinity);
                if (options?.modifyTarget) fu.setProperty(targetDoc, change.key, value);
                return { [change.key]: value };
            }
            case "width":
            case "height":
            case "depth":
                if (!targetDoc.flags[SYSTEM_ID]?.linkToActorSize) return {};
                break;
            case "texture.scaleX":
            case "texture.scaleY":
                if (!targetDoc.flags[SYSTEM_ID]?.autoscale) return {};
                break;
        }
        return super.applyChange(targetDoc, change, options);
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
