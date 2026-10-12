import { Resistance } from "@actor/data/iwr.ts";
import type { ActorType } from "@actor/types.ts";
import type { ArmorCategory } from "@item/armor/types.ts";
import type { ArmorPF2e } from "@item/armor/document.ts";
import { tupleHasValue } from "@util";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleValue } from "./data.ts";
import fields = foundry.data.fields;

/** Apply standard armor specialization resistance based on worn armor group and category. */
class ArmorSpecializationRuleElement extends RuleElement<ArmorSpecializationRuleSchema> {
    static override validActorTypes: ActorType[] = ["character", "npc"];

    static override defineSchema(): ArmorSpecializationRuleSchema {
        const categories = ["light", "medium", "heavy"] as const;
        return {
            ...super.defineSchema(),
            categories: new fields.ArrayField(
                new fields.StringField({
                    required: true,
                    nullable: false,
                    choices: categories,
                    initial: undefined,
                }),
                { required: true, nullable: false, min: 1, initial: ["medium", "heavy"] },
            ),
            minProficiencyRank: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                min: 0,
                max: 4,
                initial: 2,
            }),
            // for feats like Hellknight Preferment, that increase default resistance
            bonus: new ResolvableValueField({ required: true, nullable: false, initial: 0 }),
        };
    }

    override afterPrepareData(): void {
        if (!this.test()) return;

        const armor = this.#getWornArmor();
        if (!armor?.group) return;

        const category = armor.category;
        if (!tupleHasValue(this.categories, category)) return;
        if (!this.#meetsProficiency(category)) return;

        const entry = CONFIG.PF2E.armorSpecialization[armor.group]?.[category];
        if (!entry) return;

        const bonus = Math.floor(Number(this.resolveValue(this.bonus, 0, { resolvables: { armor } })));
        const potency = this.#getPotencyBonus(armor);
        const value = entry.value + potency + bonus;
        if (value <= 0) return;

        const types = Array.isArray(entry.type) ? entry.type : [entry.type];
        const label = this.label || "PF2E.Actor.Creature.ArmorSpecialization";
        this.actor.system.attributes.resistances.push(
            ...types.map(
                (type): Resistance =>
                    new Resistance({
                        type,
                        value,
                        source: label,
                    }),
            ),
        );

        this.actor.flags[SYSTEM_ID].rollOptions.all["armor-specialization"] = true;
    }

    #getWornArmor(): ArmorPF2e | null {
        const { actor } = this;
        if (actor.isOfType("character")) return actor.wornArmor;
        if (actor.isOfType("npc")) {
            const equipped = actor.itemTypes.armor.find((a) => a.isEquipped);
            return equipped ?? null;
        }
        return null;
    }

    #meetsProficiency(category: ArmorCategory): boolean {
        if (this.minProficiencyRank <= 0) return true;
        if (!this.actor.isOfType("character")) return true;
        const rank = this.actor.system.proficiencies.defenses[category]?.rank ?? 0;
        return rank >= this.minProficiencyRank;
    }

    #getPotencyBonus(armor: ArmorPF2e): number {
        const formula = SYSTEM_ID === "sf2e" ? "@armor.system.traits.config.resilient" : "@armor.system.runes.potency";
        return Math.floor(Number(this.resolveValue(formula, 0, { resolvables: { armor } })));
    }
}

interface ArmorSpecializationRuleElement
    extends RuleElement<ArmorSpecializationRuleSchema>, ModelPropsFromRESchema<ArmorSpecializationRuleSchema> {
    bonus: RuleValue;
}

type ArmorSpecializationRuleSchema = RuleElementSchema & {
    categories: fields.ArrayField<
        fields.StringField<"light" | "medium" | "heavy", "light" | "medium" | "heavy", true, false, false>
    >;
    minProficiencyRank: fields.NumberField<number, number, true, false, true>;
    bonus: ResolvableValueField<true, false, true>;
};

export { ArmorSpecializationRuleElement };
