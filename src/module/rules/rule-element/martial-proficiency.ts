import { CharacterPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { ProficiencyRank } from "@item/data/index.ts";
import { WeaponCategory } from "@item/weapon/types.ts";
import { ZeroToFour } from "@module/data.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";
import type { BooleanField, StringField } from "types/foundry/common/data/fields.d.ts";
import { PredicateField } from "@system/schema-data-fields.ts";
import { ResolvableValueField } from "./data.ts";
import { sluggify } from "@util";

class MartialProficiencyRuleElement extends RuleElementPF2e<MartialProficiencySchema> {
    protected static override validActorTypes: ActorType[] = ["character"];
    override slug: string;

    static override defineSchema(): MartialProficiencySchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            definition: new PredicateField({ required: true, nullable: false }),
            immutable: new fields.BooleanField({ required: false, initial: true }),
            sameAs: new fields.StringField({
                required: false,
                nullable: false,
                choices: ["simple", "martial", "advanced", "unarmed"],
            }),
            maxRank: new fields.StringField({
                required: false,
                nullable: false,
                choices: ["trained", "expert", "master", "legendary"],
            }),
            value: new ResolvableValueField({ required: false, initial: undefined }),
        };
    }

    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super({ ...data, priority: 9 }, options);

        this.slug ??= sluggify(this.label);
    }

    override onApplyActiveEffects(): void {
        if (!this.test()) return;

        const rank = Math.clamped(Number(this.resolveValue(this.value)) || 1, 1, 4) as ZeroToFour;
        this.actor.system.martial[this.slug] = {
            definition: this.resolveInjectedProperties(this.definition),
            immutable: this.immutable,
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
    /** The criteria for matching qualifying weapons and other attacks */
    definition: PredicateField<true, false, false>;
    /** Whether this proficiency's rank can be manually changed */
    immutable: BooleanField<boolean, boolean, false, false, true>;
    /** The attack category to which this proficiency's rank is linked */
    sameAs: StringField<WeaponCategory, WeaponCategory, false, false, false>;
    /** The maximum rank this proficiency can reach, if any */
    maxRank: StringField<
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
