import { ActorType } from "@actor/data";
import { CharacterPF2e } from "@actor";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementData } from "../rules-data-definitions";

/**
 * @category RuleElement
 */
export class CraftingFormulaRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    override onBeforePrepareData() {
        const actor = this.actor;
        if (actor instanceof CharacterPF2e) {
            actor.craftingFormulas.push({
                description: this.data.description ?? this.item.description,
                img: this.data.img ?? this.item.img,
                level: this.data.level ?? 0,
                name: this.data.name ?? this.item.name,
                price: this.data.price ?? "-",
                uuid: this.data.uuid,
            });
        } else {
            console.warn(`PF2E | Malformed crafting formula data in CraftingFormula rule element on item:`, this.item);
        }
    }
}

export interface CraftingFormulaRuleElement {
    data: RuleElementData & {
        description?: string;
        img?: ImagePath;
        level?: number;
        name?: string;
        price?: string;
        uuid: ItemUUID;
    };
}
