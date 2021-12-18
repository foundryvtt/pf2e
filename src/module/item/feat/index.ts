import { ItemPF2e } from "../index";
import { FeatData, FeatTrait, FeatType } from "./data";
import { OneToThree } from "@module/data";
import { UserPF2e } from "@module/user";

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

    get level(): number {
        return this.data.data.level.value;
    }

    get traits(): Set<FeatTrait> {
        return new Set(this.data.data.traits.value);
    }

    get actionCost() {
        const actionType = this.data.data.actionType.value || "passive";
        if (actionType === "passive") return null;

        return {
            type: actionType,
            value: this.data.data.actions.value,
        };
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

    /** Generate a list of strings for use in predication */
    override getItemRollOptions(prefix = "feat"): string[] {
        prefix =
            prefix === "feat" && ["classfeature", "ancestryfeature"].includes(this.featType.value) ? "feature" : prefix;
        return super.getItemRollOptions(prefix);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

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

export interface FeatPF2e {
    readonly data: FeatData;
}
