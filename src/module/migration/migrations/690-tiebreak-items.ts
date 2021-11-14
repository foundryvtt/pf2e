import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Add AE-likes to certain items that give the owner a higher tiebreak priority */
export class Migration690InitiativeTiebreakItems extends MigrationBase {
    /** Nice */
    static override version = 0.69;

    /** Feats and equipment with a tie-breaking feature */
    private itemSlugs = ["ambush-awareness", "elven-instincts", "pilgrims-token"];

    /** Sets the tiebreak priority for the item owner from 2 (PCs) to 0 */
    private rule = {
        key: "ActiveEffectLike",
        path: "data.attributes.initiative.tiebreakPriority",
        mode: "override",
        value: 0,
    };

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (
            this.itemSlugs.includes(itemSource.data.slug ?? "") &&
            !itemSource.data.rules.some((rule) => rule.key === "ActiveEffectLike") &&
            // Add the RE to the Pilgrim's Token physical item rather than the feat
            !(itemSource.data.slug === "pilgrims-token" && itemSource.type !== "equipment")
        ) {
            itemSource.data.rules.push(this.rule);
        }
    }
}
