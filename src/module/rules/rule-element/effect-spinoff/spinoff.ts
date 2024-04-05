import type { ActorPF2e } from "@actor";
import type { TraitViewData } from "@actor/data/base.ts";
import { EffectPF2e, type PhysicalItemPF2e } from "@item";
import type { EffectTrait } from "@item/abstract-effect/types.ts";
import type { EffectSource } from "@item/effect/data.ts";
import type { PhysicalItemTrait } from "@item/physical/types.ts";
import { getActionGlyph, traitSlugToObject } from "@util";
import type { EffectSpinoffRuleElement } from "./rule-element.ts";

class EffectSpinoff {
    item: PhysicalItemPF2e<ActorPF2e>;

    slug: string;

    label: string;

    img: ImageFilePath;

    activation: SpinoffActivationData | null;

    description: { value: string; markdown: boolean };

    constructor(rule: EffectSpinoffRuleElement) {
        this.item = rule.item;
        this.label = rule.label;
        this.img = this.item.img;
        this.slug = rule.slug;
        this.description = {
            value: rule.description ?? this.item.description,
            markdown: !!rule.description,
        };

        const unit = rule.activation?.time.unit ?? "";
        if (rule.activation?.time && ["actions", "reaction"].includes(rule.activation.time.unit)) {
            const glyph = unit === "reaction" ? "R" : getActionGlyph(rule.activation.time.value);
            const activationTraits = rule.activation.traits;
            this.activation = {
                label: rule.activation.label,
                glyph,
                details: rule.activation.details,
                get traits(): TraitViewData[] {
                    return activationTraits.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits)) ?? [];
                },
            };
        } else {
            this.activation = null;
        }
    }

    createEffect(): EffectSource {
        const composingRules = this.item.rules
            .filter((r) => r.spinoff === this.slug && !r.invalid)
            .map((r) => r.toObject());

        const item = this.item;
        const actor = item.actor;
        const traits = item.system.traits.value.filter(
            (t): t is PhysicalItemTrait & EffectTrait => t in EffectPF2e.validTraits,
        );

        const source: PreCreate<EffectSource> = {
            type: "effect",
            name: this.label,
            img: this.img,
            system: {
                slug: this.slug,
                rules: composingRules,
                description: this.description,
                traits: { value: traits },
                context: {
                    origin: {
                        actor: actor.uuid,
                        token: actor.getActiveTokens(true, true).at(0)?.uuid ?? null,
                        item: item.uuid,
                        spellcasting: null,
                        rollOptions: item.getOriginData().rollOptions,
                    },
                    target: null,
                    roll: null,
                },
            },
        };

        return new EffectPF2e(source).toObject();
    }
}

interface SpinoffActivationData {
    label: string | null;
    glyph: string;
    traits: TraitViewData[];
    details: string | null;
}

export { EffectSpinoff };
