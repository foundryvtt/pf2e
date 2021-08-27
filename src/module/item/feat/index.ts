import { CharacterPF2e } from "@actor";
import { ItemPF2e } from "../index";
import { FeatData, FeatType } from "./data";
import { OneToThree } from "@module/data";

export class FeatPF2e extends ItemPF2e {
    static override get schema(): typeof FeatData {
        return FeatData;
    }

    get featType(): { value: FeatType; label: string } {
        return {
            value: this.data.data.featType.value,
            label: game.i18n.localize(CONFIG.PF2E.featTypes[this.data.data.featType.value]),
        };
    }

    prepareActorData(this: Embedded<FeatPF2e>) {
        if (!(this.actor instanceof CharacterPF2e)) {
            console.error("Only a character can have a class");
            return;
        }

        const grants = this.data.data.grants;
        const resources = this.actor.data.data.resources;
        if (grants.focus?.value) {
            if (!resources.focus) {
                resources.focus = { value: grants.focus.value, max: grants.focus.value };
            } else {
                resources.focus.max += grants.focus.value;
            }
        }
    }

    override getChatData(this: Embedded<FeatPF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const properties = [
            `Level ${data.level.value || 0}`,
            data.actionType.value ? CONFIG.PF2E.actionTypes[data.actionType.value] : null,
        ].filter((p) => p);
        const traits = this.traitChatData(CONFIG.PF2E.featTraits);
        return this.processChatData(htmlOptions, { ...data, properties, traits });
    }

    protected override async _preUpdate(
        data: DeepPartial<FeatPF2e["data"]["_source"]>,
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

export interface FeatPF2e {
    readonly data: FeatData;
}
