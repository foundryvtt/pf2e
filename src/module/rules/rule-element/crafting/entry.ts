import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions } from "..";
import { CharacterPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { sluggify } from "@util";
import { PredicatePF2e, RawPredicate } from "@system/predication";

/**
 * @category RuleElement
 */
class CraftingEntryRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    private name: string;

    private selector: string;

    constructor(data: CraftingEntryRuleSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        // For the purpose of AE-Like predication, this rule element should set its roll option very early
        this.data.priority = 19;

        this.name = String(data.name || this.data.label);

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

        const craftableItems = new PredicatePF2e(this.data.craftableItems ?? []);

        if (!craftableItems.isValid) {
            this.failValidation("Malformed craftableItems predicate");
        }

        this.actor.system.crafting.entries[this.selector] = {
            selector: selector,
            name: this.name,
            isAlchemical: this.data.isAlchemical,
            isDailyPrep: this.data.isDailyPrep,
            isPrepared: this.data.isPrepared,
            craftableItems: craftableItems,
            maxItemLevel: this.data.maxItemLevel,
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
