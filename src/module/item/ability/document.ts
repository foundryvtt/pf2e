import type { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { ActionCost, Frequency, RawItemChatData } from "@item/base/data/index.ts";
import { RangeData } from "@item/types.ts";
import type { UserPF2e } from "@module/user/index.ts";
import { AbilitySource, AbilitySystemData } from "./data.ts";
import { normalizeActionChangeData, processSanctification } from "./helpers.ts";
import { ActionTrait } from "./types.ts";

class AbilityItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    range: RangeData | null = null;

    static override get validTraits(): Record<ActionTrait, string> {
        return CONFIG.PF2E.actionTraits;
    }

    get traits(): Set<ActionTrait> {
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
        return this.system.frequency ?? null;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Initialize frequency uses if not set
        if (this.actor && this.system.frequency) {
            this.system.frequency.value ??= this.system.frequency.max;
        }

        this.system.selfEffect ??= null;
        // Self effects are only usable with actions
        if (this.system.actionType.value === "passive") {
            this.system.selfEffect = null;
        }
    }

    override onPrepareSynthetics(this: AbilityItemPF2e<ActorPF2e>): void {
        processSanctification(this);
    }

    override getRollOptions(prefix = this.type): string[] {
        const options = super.getRollOptions(prefix);
        if (this.frequency || this.system.deathNote) {
            options.push(`${prefix}:frequency:limited`);
        }
        return options;
    }

    override async getChatData(
        this: AbilityItemPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
    ): Promise<RawItemChatData> {
        return this.processChatData(htmlOptions, {
            ...this.system,
            traits: this.traitChatData(CONFIG.PF2E.featTraits),
        });
    }

    protected override async _preCreate(
        data: this["_source"],
        options: DocumentModificationContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        // In case this was copied from an actor, clear any active frequency value
        if (!this.parent) {
            if (this._source.system.frequency) {
                this.updateSource({ "system.frequency.-=value": null });
            }
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (typeof changed.system?.category === "string") {
            changed.system.category ||= null;
        }
        normalizeActionChangeData(this, changed);

        return super._preUpdate(changed, options, user);
    }
}

interface AbilityItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: AbilitySource;
    system: AbilitySystemData;
}

export { AbilityItemPF2e };
