import { CharacterPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { ArmorCategory } from "@item/armor/types.ts";
import { ARMOR_CATEGORIES } from "@item/armor/values.ts";
import { ProficiencyRank } from "@item/base/data/index.ts";
import { WeaponCategory } from "@item/weapon/types.ts";
import { WEAPON_CATEGORIES } from "@item/weapon/values.ts";
import { ZeroToFour } from "@module/data.ts";
import { PredicateField, StrictStringField } from "@system/schema-data-fields.ts";
import { sluggify } from "@util";
import { ResolvableValueField } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";

class MartialProficiencyRuleElement extends RuleElementPF2e<MartialProficiencySchema> {
    protected static override validActorTypes: ActorType[] = ["character"];

    declare slug: string;

    static override defineSchema(): MartialProficiencySchema {
        return {
            ...super.defineSchema(),
            kind: new StrictStringField({
                required: true,
                nullable: false,
                choices: ["attack", "defense"],
                initial: "attack",
            }),
            definition: new PredicateField({ required: true, nullable: false }),
            sameAs: new StrictStringField({
                required: false,
                nullable: false,
                choices: [...WEAPON_CATEGORIES, ...ARMOR_CATEGORIES],
            }),
            maxRank: new StrictStringField({
                required: false,
                nullable: false,
                choices: ["trained", "expert", "master", "legendary"],
            }),
            value: new ResolvableValueField({ required: false, initial: undefined }),
        };
    }

    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super({ priority: 9, ...data }, options);

        this.slug ??= sluggify(this.label);
    }

    override onApplyActiveEffects(): void {
        if (!this.test()) return;

        const rank = Math.clamped(Number(this.resolveValue(this.value)) || 1, 1, 4) as ZeroToFour;
        const key = this.kind === "attack" ? "attacks" : "defenses";
        this.actor.system.proficiencies[key][this.slug] = {
            definition: this.resolveInjectedProperties(this.definition),
            immutable: true,
            label: this.label,
            sameAs: this.sameAs,
            rank,
            maxRank: this.maxRank,
            value: 0,
            breakdown: "",
        };
    }
}

interface MartialProficiencyRuleElement
    extends RuleElementPF2e<MartialProficiencySchema>,
        ModelPropsFromSchema<MartialProficiencySchema> {
    get actor(): CharacterPF2e;
}

type MartialProficiencySchema = RuleElementSchema & {
    /** Whether the proficiency is an attack or defense */
    kind: StrictStringField<"attack" | "defense", "attack" | "defense", true, false, true>;
    /** The criteria for matching qualifying weapons and other attacks */
    definition: PredicateField<true, false, false>;
    /** The attack category to which this proficiency's rank is linked */
    sameAs: StrictStringField<WeaponCategory | ArmorCategory, WeaponCategory | ArmorCategory, false, false, false>;
    /** The maximum rank this proficiency can reach, if any */
    maxRank: StrictStringField<
        Exclude<ProficiencyRank, "untrained">,
        Exclude<ProficiencyRank, "untrained">,
        false,
        false,
        false
    >;
    /** Initially a number indicating rank, changed into a `MartialProficiency` object for overriding as an AE-like */
    value: ResolvableValueField<false, false, false>;
};

export { MartialProficiencyRuleElement };
