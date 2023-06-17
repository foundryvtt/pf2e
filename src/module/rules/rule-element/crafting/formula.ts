import { CharacterPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { RuleElementData, RuleElementOptions, RuleElementPF2e, RuleElementSource } from "../index.ts";

/**
 * @category RuleElement
 */
class CraftingFormulaRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: CraftingFormulaSource, options: RuleElementOptions) {
        super(data, options);

        if (!(typeof data.uuid === "string" && /^(?:Compendium|Item)\..*[a-z0-9]{16}$/i.test(data.uuid))) {
            const { item } = this;
            this.failValidation(`Crafting formula rule element on ${item.name} (${item.uuid}) has a malformed UUID`);
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;
        if (this.actor.system.crafting.formulas.find((f) => f.uuid === this.data.uuid)) return;
        this.actor.system.crafting.formulas.push({ uuid: this.data.uuid });
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
