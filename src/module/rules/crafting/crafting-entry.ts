import { ItemPF2e } from "@item";
import { CraftingEntrySource } from "@item/data";
import { RuleElementPF2e } from "../rule-element";

export class PF2CraftingEntryRuleElement extends RuleElementPF2e {
    override onCreate(): void {
        const source: PreCreate<CraftingEntrySource> = {
            _id: this.item.id,
            name: this.label,
            type: "craftingEntry",
            data: {
                entrySelector: {
                    value: this.data.selector,
                },
                entryType: {
                    value: this.data.type || "custom",
                },
                itemRestrictions: this.data.predicate || {},
                slots: {
                    prepared: [],
                },
                rules: [],
                source: {
                    value: this.item.id,
                },
            },
        };
        ItemPF2e.create(source, { parent: this.actor });
    }

    override onDelete(): void {
        const target = this.actor.items.find(
            (i) => i.data.type === "craftingEntry" && i.data.data.source.value === this.item.id
        );
        if (target) {
            target.delete();
        }
    }
}

type CraftingEntryType = "alchemical" | "snare" | "scroll" | "custom";

export interface PF2CraftingEntryRuleElement {
    data: RuleElementPF2e["data"] & {
        type?: CraftingEntryType;
        selector?: string;
        resource?: string;
    };
}
