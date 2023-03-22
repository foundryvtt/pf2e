import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions } from "..";
import { ActorPF2e, CharacterPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { sluggify } from "@util";
import { PredicatePF2e, RawPredicate } from "@system/predication";

/**
 * @category RuleElement
 */
class CraftingEntryRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    private selector: string;

    constructor(data: CraftingEntryRuleSource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
        super({ maxItemLevel: 1, priority: 19, ...data }, item, options);

        if (data.selector && typeof data.selector === "string") {
            this.selector = data.selector;
        } else {
            this.failValidation("Required selector not found");
            this.selector = "";
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);

        const craftableItems = this.data.craftableItems ?? [];
        if (!PredicatePF2e.isValid(craftableItems)) {
            return this.failValidation("Malformed craftableItems predicate");
        }

        this.actor.system.crafting.entries[this.selector] = {
            selector: selector,
            name: this.label,
            isAlchemical: this.data.isAlchemical,
            isDailyPrep: this.data.isDailyPrep,
            isPrepared: this.data.isPrepared,
            craftableItems,
            maxItemLevel: Number(this.resolveValue(this.data.maxItemLevel)),
            maxSlots: this.data.maxSlots,
            parentItem: this.item.id,
            preparedFormulaData: this.data.preparedFormulas,
        };

        // Set a roll option to cue any subsequent max-item-level-increasing `ActiveEffectLike`s
        const option = sluggify(this.selector);
        this.actor.rollOptions.all[`crafting:entry:${option}`] = true;
    }
}

interface CraftingEntryRuleElement extends RuleElementPF2e {
    data: CraftingEntryRuleData;

    get actor(): CharacterPF2e;
}

interface CraftingEntryRuleData extends RuleElementData {
    isAlchemical?: boolean;
    isDailyPrep?: boolean;
    isPrepared?: boolean;
    maxItemLevel?: number;
    maxSlots?: number;
    craftableItems?: RawPredicate;
    preparedFormulas?: PreparedFormulaData[];
}

interface CraftingEntryRuleSource extends RuleElementSource {
    selector?: unknown;
    name?: unknown;
    isAlchemical?: unknown;
    isDailyPrep?: unknown;
    isPrepared?: unknown;
    maxItemLevel?: unknown;
    maxSlots?: unknown;
    craftableItems?: unknown;
    preparedFormulas?: unknown;
}

interface PreparedFormulaData {
    itemUUID: string;
    quantity?: number;
    expended?: boolean;
    isSignatureItem?: boolean;
}

export { CraftingEntryRuleData, CraftingEntryRuleElement, CraftingEntryRuleSource };
