import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions } from "..";
import { CharacterPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { PhysicalItemTrait } from "@item/physical/data";
import { CraftingEntryData } from "@actor/character/crafting/entry";
import { sluggify } from "@util";

/**
 * @category RuleElement
 */
class CraftingEntryRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    name: string;

    selector: string;

    constructor(data: CraftingEntryRuleSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        // For the purpose of AE-Like predication, this rule element should set its roll option very early
        this.data.priority = 5;

        this.name = String(data.name || this.data.label);

        if (data.selector && typeof data.selector === "string") {
            this.selector = data.selector;
        } else {
            this.failValidation("Required selector not found");
            this.selector = "";
        }
    }

    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (!this.test()) return;

        const selector = String(this.resolveValue(this.selector));

        const data: CraftingEntryData = {
            actorPreparedFormulas: [],
            selector: selector,
            name: this.name,
            isAlchemical: this.data.isAlchemical,
            isDailyPrep: this.data.isDailyPrep,
            isPrepared: this.data.isPrepared,
            requiredTraits: this.data.requiredTraits,
            maxItemLevel: this.data.maxItemLevel,
            maxSlots: this.data.maxSlots,
        };

        actorUpdates[`data.crafting.entries.${selector}`] = data;
    }

    /** Set a roll option to cue any subsequent max-item-level-increasing `ActiveEffectLike`s */
    override onApplyActiveEffects(): void {
        if (!this.test()) return;

        if (!this.actor.data.data.crafting.entries[this.selector]) return;

        const option = sluggify(this.selector);
        this.actor.rollOptions.all[`crafting:entry:${option}`] = true;
    }

    override onDelete(actorUpdates: Record<string, unknown>): void {
        actorUpdates[`data.crafting.entries.-=${this.selector}`] = null;
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
    requiredTraits?: PhysicalItemTrait[][];
    maxItemLevel?: number;
    maxSlots?: number;
}

interface CraftingEntryRuleSource extends RuleElementSource {
    name?: unknown;
    isAlchemical?: unknown;
    isDailyPrep?: unknown;
    isPrepared?: unknown;
    requiredTraits?: PhysicalItemTrait[][];
    maxItemLevel?: unknown;
    maxSlots?: unknown;
}

export { CraftingEntryRuleElement };
