import { RuleElementPF2e, RuleElementSource, RuleElementData, RuleElementSynthetics } from "./";
import { CharacterPF2e } from "@actor";
import { CharacterProficiency, MartialProficiency } from "@actor/character/data";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { ProficiencyRank } from "@item/data";
import { WeaponCategory } from "@item/weapon/data";
import { PROFICIENCY_RANKS, ZeroToFour } from "@module/data";
import { PredicatePF2e, RawPredicate } from "@system/predication";

class MartialProficiencyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: MartialProficiencySource, item: Embedded<ItemPF2e>) {
        super(data, item);
        if (!this.dataIsValid(this.data)) {
            this.failValidation("A martial proficiency must have a slug and definition");
        }
        this.data.immutable = Boolean(data.immutable ?? true);
    }

    private dataIsValid(data: MartialProficiencySource): boolean {
        const validRanks: string[] = PROFICIENCY_RANKS.filter((rank) => rank !== "untrained");
        return (
            typeof data.slug === "string" &&
            data.definition instanceof Object &&
            new PredicatePF2e(data.definition).isValid &&
            ((typeof data.sameAs === "string" && data.sameAs in CONFIG.PF2E.weaponCategories) || !("sameAs" in data)) &&
            ((typeof data.maxRank === "string" && validRanks.includes(data.maxRank)) || !("maxRank" in data))
        );
    }

    /** Add this martial proficiency to the synthetics record */
    override onBeforePrepareData({ martialProficiencies }: RuleElementSynthetics): void {
        if (this.ignored) return;

        // If an AE-like has created this proficiency already by upgrading its rank, get the existing rank
        const existingProficiencies = this.actor.data.data.martial;

        // Run the definition through resolveInjectedProperties
        for (const quantifier of ["all", "any", "not"] as const) {
            const statements = (this.data.definition[quantifier] ??= []);
            for (const statement of statements) {
                if (typeof statement === "string") {
                    statements[statements.indexOf(statement)] = this.resolveInjectedProperties(statement);
                }
            }
        }

        const newProficiency: MartialProficiency = (martialProficiencies[this.data.slug] = {
            definition: new PredicatePF2e(this.data.definition),
            immutable: this.data.immutable ?? true,
            label: this.label,
            rank: Math.max(
                Number(this.data.value) || 1,
                existingProficiencies[this.data.slug]?.rank ?? 0
            ) as ZeroToFour,
            value: 0,
            breakdown: "",
        });

        if (this.data.sameAs) {
            const baseProficiencies = this.actor.data.data.martial;
            const proficiency: CharacterProficiency = baseProficiencies[this.data.sameAs];
            if (!proficiency) {
                return this.failValidation(`Proficiency "${this.data.sameAs}" not found`);
            }
            newProficiency.sameAs = this.data.sameAs;
        }

        if (this.data.maxRank) newProficiency.maxRank = this.data.maxRank;
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
}

export interface MartialProficiencySource extends RuleElementSource {
    definition?: unknown;
    sameAs?: unknown;
    immutable?: unknown;
    maxRank?: unknown;
}

export { MartialProficiencyRuleElement };
