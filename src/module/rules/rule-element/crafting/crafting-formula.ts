import { RuleElementPF2e, RuleElementData, RuleElementSource } from "../";
import { ActorType } from "@actor/data";
import { CharacterPF2e } from "@actor";
import { ItemPF2e } from "@item";

/**
 * @category RuleElement
 */
class CraftingFormulaRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: CraftingFormulaSource, item: Embedded<ItemPF2e>) {
        if (!(typeof data.uuid === "string" && /^(?:Compendium|Item)\..*[a-z0-9]{16}$/i.test(data.uuid))) {
            console.warn(
                `PF2e System | Crafting formula rule element on ${item.name} (${item.uuid}) has a malformed UUID`
            );
            data.ignored = true;
        }
        super(data, item);
    }

    override onBeforePrepareData(): void {
        if (this.ignored) return;

        this.actor.data.data.crafting.formulas.push({ uuid: this.data.uuid });
    }
}

interface CraftingFormulaRuleElement extends RuleElementPF2e {
    data: CraftingFormulaData;

    get actor(): CharacterPF2e;
}

interface CraftingFormulaData extends RuleElementData {
    uuid: ItemUUID;
}

interface CraftingFormulaSource extends RuleElementSource {
    uuid?: unknown;
}

export { CraftingFormulaRuleElement };
