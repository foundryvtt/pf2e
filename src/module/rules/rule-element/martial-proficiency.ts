import type { ActorType, CharacterPF2e } from "@actor";
import { ArmorCategory } from "@item/armor/types.ts";
import { ARMOR_CATEGORIES } from "@item/armor/values.ts";
import { ProficiencyRank } from "@item/base/data/index.ts";
import { WeaponCategory } from "@item/weapon/types.ts";
import { WEAPON_CATEGORIES } from "@item/weapon/values.ts";
import { OneToFour } from "@module/data.ts";
import { PredicateField } from "@system/schema-data-fields.ts";
import { sluggify } from "@util";
import { RuleElement, RuleElementOptions } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;

class MartialProficiencyRuleElement extends RuleElement<MartialProficiencySchema> {
    protected static override validActorTypes: ActorType[] = ["character"];

    declare slug: string;

    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super({ priority: 9, ...data }, options);
        if (this.invalid) return;

        this.slug ??= sluggify(this.label);
    }

    static override defineSchema(): MartialProficiencySchema {
        return {
            ...super.defineSchema(),
            kind: new fields.StringField({
                required: true,
                nullable: false,
                choices: ["attack", "defense"],
                initial: "attack",
            }),
            definition: new PredicateField({ required: true, nullable: false }),
            sameAs: new fields.StringField({
                required: false,
                nullable: false,
                choices: [...WEAPON_CATEGORIES, ...ARMOR_CATEGORIES],
            }),
            maxRank: new fields.StringField({
                required: false,
                nullable: false,
                choices: ["trained", "expert", "master", "legendary"],
            }),
            value: new ResolvableValueField({ required: false, initial: undefined }),
            visible: new fields.BooleanField({ required: false, nullable: false, initial: true }),
        };
    }

    override onApplyActiveEffects(): void {
        if (!this.test()) return;

        const rank = Math.clamp(Number(this.resolveValue(this.value)) || 1, 1, 4) as OneToFour;
        const key = this.kind === "attack" ? "attacks" : "defenses";
        this.actor.system.proficiencies[key][this.slug] = {
            definition: this.resolveInjectedProperties(this.definition),
            label: this.label,
            sameAs: this.sameAs,
            rank,
            maxRank: this.maxRank,
            value: 0,
            breakdown: "",
            visible: this.visible,
        };
    }
}

interface MartialProficiencyRuleElement
    extends RuleElement<MartialProficiencySchema>,
        ModelPropsFromRESchema<MartialProficiencySchema> {
    get actor(): CharacterPF2e;
}

type MartialProficiencySchema = RuleElementSchema & {
    /** Whether the proficiency is an attack or defense */
    kind: fields.StringField<"attack" | "defense", "attack" | "defense", true, false, true>;
    /** The criteria for matching qualifying weapons and other attacks */
    definition: PredicateField<true, false, false>;
    /** The attack category to which this proficiency's rank is linked */
    sameAs: fields.StringField<WeaponCategory | ArmorCategory, WeaponCategory | ArmorCategory, false, false, false>;
    /** The maximum rank this proficiency can reach, if any */
    maxRank: fields.StringField<
        Exclude<ProficiencyRank, "untrained">,
        Exclude<ProficiencyRank, "untrained">,
        false,
        false,
        false
    >;
    /** Initially a number indicating rank, changed into a `MartialProficiency` object for overriding as an AE-like */
    value: ResolvableValueField<false, false, false>;
    /** Whether this proficiency is visible on the character sheet */
    visible: fields.BooleanField<boolean, boolean, false, false, true>;
};

export { MartialProficiencyRuleElement };
