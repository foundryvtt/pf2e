import { CharacterPF2e } from "@actor";
import { MartialProficiency } from "@actor/character/data";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { ProficiencyRank } from "@item/data";
import { WeaponCategory } from "@item/weapon/data";
import { PROFICIENCY_RANKS, ZeroToFour } from "@module/data";
import { PredicatePF2e, RawPredicate } from "@system/predication";
import { AELikeRuleElement, AELikeRuleElementData, AELikeRuleElementSource } from "./ae-like";

class MartialProficiencyRuleElement extends AELikeRuleElement {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: MartialProficiencySource, item: Embedded<ItemPF2e>) {
        data.mode = "override";
        data.priority = 9;
        data.path = `data.martial.${data.slug}`;
        data.value = Number(data.value) || 1;
        super(data, item);
        if (!this.dataIsValid(this.data)) {
            this.failValidation("A martial proficiency must have a slug and definition");
        }

        this.data.immutable = Boolean(data.immutable ?? true);
        this.data.value = this.createValue();
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

        const proficiency: MartialProficiency = {
            definition: new PredicatePF2e(this.data.definition),
            immutable: this.data.immutable ?? true,
            label: this.label,
            rank: (Number(this.data.value) || 1) as ZeroToFour,
            value: 0,
            breakdown: "",
        };
        if (this.data.sameAs) proficiency.sameAs = this.data.sameAs;
        if (this.data.maxRank) proficiency.maxRank = this.data.maxRank;

        return proficiency;
    }
}

interface MartialProficiencyRuleElement extends AELikeRuleElement {
    data: MartialProficiencyData;

    get actor(): CharacterPF2e;
}

interface MartialProficiencyData extends AELikeRuleElementData {
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

export interface MartialProficiencySource extends AELikeRuleElementSource {
    definition?: unknown;
    sameAs?: unknown;
    immutable?: unknown;
    maxRank?: unknown;
}

export { MartialProficiencyRuleElement };
