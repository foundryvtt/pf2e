import { ItemPF2e } from "@item/base.ts";
import { ActionItemSource, ActionSystemData } from "./data.ts";
import { UserPF2e } from "@module/user/index.ts";
import { ActionCost, Frequency } from "@item/data/base.ts";
import { ItemSummaryData } from "@item/data/index.ts";
import { getActionTypeLabel } from "@util";
import { ActorPF2e } from "@actor";

class ActionItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
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

    override async getChatData(
        this: ActionItemPF2e<ActorPF2e>,
        htmlOptions: EnrichHTMLOptions = {}
    ): Promise<ItemSummaryData> {
        const systemData = this.system;
        const actionTypeLabel = getActionTypeLabel(this.actionCost?.type, this.actionCost?.value);
        const properties = [actionTypeLabel ?? []].flat();
        const traits = this.traitChatData(CONFIG.PF2E.featTraits);
        return this.processChatData(htmlOptions, { ...systemData, properties, traits });
    }

    protected override async _preCreate(
        data: PreDocumentId<ActionItemSource>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
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
    ): Promise<void> {
        // Normalize action data
        if (changed.system && ("actionType" in changed.system || "actions" in changed.system)) {
            const actionType = changed.system?.actionType?.value ?? this.system.actionType.value;
            const actionCount = Number(changed.system?.actions?.value ?? this.system.actions.value);
            changed.system = mergeObject(changed.system, {
                actionType: { value: actionType },
                actions: { value: actionType !== "action" ? null : Math.clamped(actionCount, 1, 3) },
            });
        }

        await super._preUpdate(changed, options, user);
    }
}

interface ActionItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: ActionItemSource;
    system: ActionSystemData;
}

export { ActionItemPF2e };
