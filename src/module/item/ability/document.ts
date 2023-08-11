import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { ActionCost, Frequency } from "@item/data/base.ts";
import { ItemSummaryData } from "@item/data/index.ts";
import { UserPF2e } from "@module/user/index.ts";
import { getActionTypeLabel } from "@util";
import { AbilityItemSource, AbilitySystemData } from "./data.ts";
import { normalizeActionChangeData } from "./helpers.ts";

class AbilityItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
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
        htmlOptions: EnrichHTMLOptions = {}
    ): Promise<ItemSummaryData> {
        const systemData = this.system;
        const actionTypeLabel = getActionTypeLabel(this.actionCost?.type, this.actionCost?.value);
        const properties = [actionTypeLabel ?? []].flat();
        const traits = this.traitChatData(CONFIG.PF2E.featTraits);
        return this.processChatData(htmlOptions, { ...systemData, properties, traits });
    }

    protected override async _preCreate(
        data: PreDocumentId<AbilityItemSource>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
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
        user: UserPF2e
    ): Promise<boolean | void> {
        normalizeActionChangeData(this, changed);
        return super._preUpdate(changed, options, user);
    }
}

interface AbilityItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: AbilityItemSource;
    system: AbilitySystemData;
}

export { AbilityItemPF2e };
