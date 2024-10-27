import type { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import type { ActionCost, Frequency, RawItemChatData } from "@item/base/data/index.ts";
import type { RangeData } from "@item/types.ts";
import type { UserPF2e } from "@module/user/index.ts";
import { sluggify } from "@util";
import type { AbilitySource, AbilitySystemData } from "./data.ts";
import { getActionCostRollOptions, normalizeActionChangeData, processSanctification } from "./helpers.ts";
import type { AbilityTrait } from "./types.ts";

class AbilityItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    declare range?: RangeData | null;

    declare isMelee?: boolean;

    static override get validTraits(): Record<AbilityTrait, string> {
        return CONFIG.PF2E.actionTraits;
    }

    get traits(): Set<AbilityTrait> {
        return new Set(this.system.traits.value);
    }

    get actionCost(): ActionCost | null {
        const actionType = this.system.actionType.value || "passive";
        if (actionType === "passive") return null;

        return {
            type: actionType,
            value: this.system.actions.value,
        };
    }

    get frequency(): Frequency | null {
        return this.system.frequency;
    }

    override prepareActorData(): void {
        const actor = this.actor;
        if (actor?.isOfType("familiar") && this.system.category === "familiar") {
            const slug = this.slug ?? sluggify(this.name);
            actor.rollOptions.all[`self:ability:${slug}`] = true;
        }
    }

    override onPrepareSynthetics(this: AbilityItemPF2e<ActorPF2e>): void {
        processSanctification(this);
    }

    override getRollOptions(prefix = this.type, options?: { includeGranter?: boolean }): string[] {
        const rollOptions = super.getRollOptions(prefix, options);
        if (this.frequency || this.system.deathNote) {
            rollOptions.push(`${prefix}:frequency:limited`);
        }

        rollOptions.push(...getActionCostRollOptions(prefix, this));
        return rollOptions;
    }

    override async getChatData(
        this: AbilityItemPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
    ): Promise<RawItemChatData> {
        return this.processChatData(htmlOptions, {
            ...this.system,
            traits: this.traitChatData(),
        });
    }

    protected override async _preCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        // In case this was copied from an actor, clear any active frequency value
        if (!this.parent) {
            if (this._source.system.frequency) {
                this.updateSource({ "system.frequency.-=value": null });
            }
        }

        return super._preCreate(data, operation, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        normalizeActionChangeData(this, changed);
        return super._preUpdate(changed, operation, user);
    }
}

interface AbilityItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: AbilitySource;
    system: AbilitySystemData;
}

export { AbilityItemPF2e };
