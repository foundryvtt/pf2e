import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions } from ".";
import { CharacterPF2e } from "@actor";
import { MartialProficiency } from "@actor/character/data";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { ProficiencyRank } from "@item/data";
import { WeaponCategory } from "@item/weapon/data";
import { PROFICIENCY_RANKS, ZeroToFour } from "@module/data";
import { PredicatePF2e, RawPredicate } from "@system/predication";

class MartialProficiencyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: MartialProficiencySource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        data.priority = 9;
        data.immutable = Boolean(data.immutable ?? true);
        data.value ??= 1;

        super(data, item, options);
    }

    private validateData(): void {
        const validRanks: string[] = PROFICIENCY_RANKS.filter((rank) => rank !== "untrained");
        const { data } = this;
        if (
            !(
                typeof data.slug === "string" &&
                data.definition instanceof Object &&
                new PredicatePF2e(data.definition).isValid &&
                ((typeof data.sameAs === "string" && data.sameAs in CONFIG.PF2E.weaponCategories) ||
                    !("sameAs" in data)) &&
                ((typeof data.maxRank === "string" && validRanks.includes(data.maxRank)) || !("maxRank" in data))
            )
        ) {
            this.failValidation("A martial proficiency must have a slug and definition");
        }
    }

    override onApplyActiveEffects(): void {
        this.validateData();
        if (this.ignored) return;

        if (this.data.predicate && !this.data.predicate.test(this.actor.getRollOptions())) {
            return;
        }

        this.actor.data.data.martial[this.data.slug] = this.createValue();
    }

    /** Set this martial proficiency as an AELike value  */
    private createValue(): MartialProficiency {
        // Run the definition through resolveInjectedProperties
        for (const quantifier of ["all", "any", "not"] as const) {
            const statements = (this.data.definition[quantifier] ??= []);
            for (const statement of statements) {
                if (typeof statement === "string") {
                    statements[statements.indexOf(statement)] = this.resolveInjectedProperties(statement);
                }
            }
        }

        const rank = Math.clamped(Number(this.resolveValue()), 1, 4) as ZeroToFour;
        const proficiency: MartialProficiency = {
            definition: new PredicatePF2e(this.data.definition),
            immutable: this.data.immutable ?? true,
            label: this.label,
            rank,
            value: 0,
            breakdown: "",
        };
        if (this.data.sameAs) proficiency.sameAs = this.data.sameAs;
        if (this.data.maxRank) proficiency.maxRank = this.data.maxRank;

        return proficiency;
    }
}

interface MartialProficiencyRuleElement extends RuleElementPF2e {
    data: MartialProficiencyData;

    get actor(): CharacterPF2e;
}

interface MartialProficiencyData extends RuleElementData {
    key: "MartialProficiency";
    /** The key to be used for this proficiency in `CharacterPF2e#data#data#martial` */
    slug: string;
    /** The criteria for matching qualifying weapons and other attacks */
    definition: RawPredicate;
    /** Whether this proficiency's rank can be manually changed */
    immutable: boolean;
    /** The attack category to which this proficiency's rank is linked */
    sameAs: WeaponCategory;
    /** The maximum rank this proficiency can reach, if any */
    maxRank?: Exclude<ProficiencyRank, "untrained">;
    /** Initially a number indicating rank, changed into a `MartialProficiency` object for overriding as an AE-like */
    value: number | MartialProficiency;
}

export interface MartialProficiencySource extends RuleElementSource {
    definition?: unknown;
    sameAs?: unknown;
    immutable?: unknown;
    maxRank?: unknown;
}

export { MartialProficiencyRuleElement };
