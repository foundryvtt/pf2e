import { ItemPF2e } from "@item/base";
import { ActionCheckData, ActionData } from "./data";
import { OneToThree } from "@module/data";
import { UserPF2e } from "@module/user";
import { ActionCost } from "@item/data/base";
import { SaveType, SAVE_TYPES } from "@actor/data";

export class ActionPF2e extends ItemPF2e {
    static override get schema(): typeof ActionData {
        return ActionData;
    }

    get actionCost(): ActionCost | null {
        const actionType = this.data.data.actionType.value || "passive";
        if (actionType === "passive") return null;

        return {
            type: actionType,
            value: this.data.data.actions.value,
        };
    }

    checks?: Record<SaveType, ActionCheckData>;

    override prepareData() {
        const data = super.prepareData();

        /**
         * @todo Fill this out like so or whatever we settle on
         * data.data.playMode.encounter ??= false; // etc.
         **/

        return data;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        if (!this.isOwned) {
            // Owned items are prepared in their owners' prepareDerivedData method as not all actor data is availabe at this point
            const checks: Partial<Record<SaveType, ActionCheckData>> = {};
            for (const saveType of SAVE_TYPES) {
                const base = this.data.data.checks[saveType]?.value ?? 0;
                checks[saveType] = {
                    base,
                    value: base,
                    breakdown: game.i18n.localize("PF2E.BaseModifier"),
                };
            }
            this.checks = checks as Record<SaveType, ActionCheckData>;
        }
    }

    override getChatData(this: Embedded<ActionPF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;

        // Feat properties
        const properties = [CONFIG.PF2E.actionTypes[data.actionType.value]].filter((property) => property);
        const traits = this.traitChatData(CONFIG.PF2E.featTraits);
        return this.processChatData(htmlOptions, { ...data, properties, traits });
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        const actionCount = changed.data?.actions;
        if (actionCount) {
            actionCount.value = (Math.clamped(Number(actionCount.value), 0, 3) || null) as OneToThree | null;
        }
        await super._preUpdate(changed, options, user);
    }
}

export interface ActionPF2e {
    readonly data: ActionData;
}
