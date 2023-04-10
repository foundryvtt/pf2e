import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

export class Migration646UpdateInlineLinks extends MigrationBase {
    static override version = 0.646;

    private updateCheckAttributes(markup = ""): string {
        return markup
            .replace(/\bdata-pf2-([a-z]+)-check="\w*"/g, 'data-pf2-check="$1"')
            .replace(/\bdata-pf2-(?:saving-throw|skill-check)\b/g, "data-pf2-check");
    }

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        if (actorData.type === "hazard") {
            const hazardDetails = actorData.system.details;
            hazardDetails.disable = this.updateCheckAttributes(hazardDetails.disable ?? "");
        }
    }

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        const description = itemData.system.description;
        description.value = this.updateCheckAttributes(description.value ?? "");
    }
}
