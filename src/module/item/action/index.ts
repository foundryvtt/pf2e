import { ItemPF2e } from "@item/base";
import { ActionData } from "./data";
import { OneToThree } from "@module/data";

export class ActionPF2e extends ItemPF2e {
    static override get schema(): typeof ActionData {
        return ActionData;
    }

    get activationTime() {
        const actionType = this.data.data.actionType.value || "passive";
        if (actionType === "passive") return null;

        return {
            type: actionType,
            value: this.data.data.actions.value,
        };
    }

    override prepareData() {
        const data = super.prepareData();

        /**
         * @todo Fill this out like so or whatever we settle on
         * data.data.playMode.encounter ??= false; // etc.
         **/

        return data;
    }

    override getChatData(this: Embedded<ActionPF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;

        // Feat properties
        const properties = [CONFIG.PF2E.actionTypes[data.actionType.value]].filter((property) => property);
        const traits = this.traitChatData(CONFIG.PF2E.featTraits);
        return this.processChatData(htmlOptions, { ...data, properties, traits });
    }

    protected override async _preUpdate(
        data: DeepPartial<ActionPF2e["data"]["_source"]>,
        options: DocumentModificationContext,
        user: foundry.documents.BaseUser
    ) {
        const actionCount = data.data?.actions;
        if (actionCount) {
            actionCount.value = (Math.clamped(Number(actionCount.value), 0, 3) || null) as OneToThree | null;
        }
        await super._preUpdate(data, options, user);
    }
}

export interface ActionPF2e {
    readonly data: ActionData;
}
