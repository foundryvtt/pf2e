import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication";
import { AELikeRuleElement, AELikeData, AELikeSource } from "./ae-like";

class AdjustModifierRuleElement extends AELikeRuleElement {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    constructor(data: AdjustModifierSource, item: Embedded<ItemPF2e>) {
        super({ ...data, phase: "beforeDerived", priority: 90 }, item);
        this.data.slug ??= null;
        this.data.predicate = new PredicatePF2e(this.data.predicate);
        this.validateData();
    }

    get selectors(): string[] {
        return this.data.selectors;
    }

    get slug(): string | null {
        return this.data.slug;
    }

    protected override validateData(): void {
        const tests = {
            selector:
                Array.isArray(this.selectors) &&
                this.selectors.length > 0 &&
                this.selectors.every((s) => typeof s === "string"),
            slug: typeof this.slug === "string" || this.slug === null,
            mode: AdjustModifierRuleElement.CHANGE_MODES.includes(String(this.mode)),
            value: ["string", "number"].includes(typeof this.value),
        };

        for (const [key, result] of Object.entries(tests)) {
            if (!result) this.warn(key);
        }
    }

    /** Instead of applying the change directly to a property path, defer it to a synthetic */
    override applyAELike(): void {
        if (this.ignored) return;

        const change = this.resolveValue();
        if (typeof change !== "number") return this.failValidation("value does not resolve to a number");

        const adjustment = {
            slug: this.slug,
            predicate: this.predicate,
            getNewValue: (current: number) => this.getNewValue(current, change),
        };

        for (const selector of this.selectors) {
            const adjustments = (this.actor.synthetics.modifierAdjustments[selector] ??= []);
            adjustments.push(adjustment);
        }
    }
}

interface AdjustModifierRuleElement extends AELikeRuleElement {
    data: AdjustModifierData;
}

interface AdjustModifierSource extends Exclude<AELikeSource, "path"> {
    selectors?: unknown;
}

interface AdjustModifierData extends Exclude<AELikeData, "path"> {
    predicate: PredicatePF2e;
    selectors: string[];
    slug: string | null;
}

export { AdjustModifierRuleElement };
