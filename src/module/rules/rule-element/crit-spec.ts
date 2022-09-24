import { ActorType } from "@actor/data";
import { ItemPF2e, WeaponPF2e } from "@item";
import { RollNotePF2e } from "@module/notes";
import { PredicatePF2e } from "@system/predication";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from ".";

/** Substitute a pre-determined result for a check's D20 roll */
class CritSpecRuleElement extends RuleElementPF2e {
    static override validActorTypes: ActorType[] = ["character"];

    /** Whether this critical specialization note substitutes for the standard one of a given weapon group */
    private alternate: boolean;

    /** Alternative note text: if not provided, the standard one for a given weapon group is used */
    private text: string | null;

    constructor(data: CritSpecSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        data.predicate ??= [];
        super(data, item, options);

        data.text ??= null;
        data.alternate ??= false;
        if (this.isValid(data)) {
            this.alternate = data.alternate;
            this.text = data.text;
        } else {
            this.alternate = false;
            this.text = null;
        }
    }

    private isValid(data: CritSpecSource): data is CritSpecData {
        const validations = {
            predicate: PredicatePF2e.isValid(data.predicate),
            alternate: typeof data.alternate === "boolean",
            text: data.text === null || (typeof data.text === "string" && data.text.trim().length > 0),
        };
        const properties = ["predicate", "alternate", "text"] as const;
        for (const property of properties) {
            if (!validations[property]) {
                this.failValidation(`${property} is invalid.`);
            }
        }

        if (data.alternate && !data.text) {
            this.failValidation("An alternate critical specialization must include substitute text");
            return false;
        }

        return properties.every((p) => validations[p]);
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const critSpecs = this.actor.synthetics.criticalSpecalizations;
        const synthetic = (weapon: WeaponPF2e, options: Set<string>): RollNotePF2e | null => {
            const predicate = this.resolveInjectedProperties(this.predicate);
            if (!predicate.test(options)) return null;

            const text = this.text ? this.resolveInjectedProperties(this.text.trim()) : null;
            if (!weapon.group && !text) return null;

            return new RollNotePF2e({
                selector: "strike-damage",
                title: "PF2E.Actor.Creature.CriticalSpecialization",
                text: text ?? `PF2E.Item.Weapon.CriticalSpecialization.${weapon.group}`,
                outcome: ["criticalSuccess"],
            });
        };
        critSpecs[this.alternate ? "alternate" : "standard"].push(synthetic);
    }
}

interface CritSpecSource extends RuleElementSource {
    alternate?: unknown;
    text?: unknown;
}

interface CritSpecData extends CritSpecSource {
    alternate: boolean;
    text: string | null;
}

export { CritSpecRuleElement };
