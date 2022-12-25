import { AuraEffectData, AuraPart } from "@actor/types";
import { ItemPF2e } from "@item";
import { ItemTrait } from "@item/data/base";
import { PredicatePF2e } from "@system/predication";
import { isObject, sluggify } from "@util";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./";

/** A Pathfinder 2e aura, capable of transmitting effects and with a visual representation on the canvas */
export class AuraRuleElement extends RuleElementPF2e {
    override slug: string;

    /** The radius of the order in feet, or a string that will resolve to one */
    radius: number | string;

    /** References to effects included in this aura */
    effects: AuraREEffectData[];

    /** Associated traits, including ones that determine transmission through walls ("visual", "auditory") */
    traits: ItemTrait[];

    /**
     * Custom border for the aura: if omitted, the border color will be black, and the border alpha will be 0.75.
     */
    border: AuraPart | null;
    /**
     * Custom fill for the aura: if omitted, the fill color will be the user's assigned color, and the fill alpha will be 0.
     */
    fill: AuraPart | null;

    constructor(data: AuraRuleElementSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        data.effects ??= [];
        data.traits ??= [];
        data.border ??= null;
        data.fill ??= null;
        this.slug = typeof data.slug === "string" ? sluggify(data.slug) : this.item.slug ?? sluggify(this.item.name);

        if (this.#isValid(data)) {
            this.radius = data.radius;
            this.effects = deepClone(data.effects);
            this.traits = deepClone(data.traits);
            this.border = data.border;
            this.fill = data.fill;
        } else {
            this.radius = 0;
            this.effects = [];
            this.traits = [];
            this.border = null;
            this.fill = null;
        }
    }

    override afterPrepareData(): void {
        if (!this.test()) return;

        const radius = Math.clamped(Number(this.resolveValue(this.radius)), 5, 240);

        if (typeof Number.isInteger(radius) && radius > 0 && radius % 5 === 0) {
            const data = {
                slug: this.slug,
                radius,
                effects: this.#processEffects(),
                traits: this.traits,
                border: this.border,
                fill: this.fill,
            };
            this.actor.auras.set(this.slug, data);
        }
    }

    #isValid(data: AuraRuleElementSource): data is AuraRuleElementData {
        const validations = {
            predicate: PredicatePF2e.isValid(data.predicate ?? []),
            radius: ["number", "string"].includes(typeof data.radius),
            effects: Array.isArray(data.effects) && data.effects.every(this.#isEffectData),
            border: data.border === null || this.#isAuraPart(data.border),
            fill: data.fill === null || this.#isAuraPart(data.fill),
        };
        const properties = ["predicate", "radius", "effects", "border", "fill"] as const;
        for (const property of properties) {
            if (!validations[property]) {
                this.failValidation(`"${property}" property is invalid.`);
            }
        }

        return properties.every((p) => validations[p]);
    }

    #isAuraPart(part: unknown): part is AuraPart {
        if (!isObject<AuraPart>(part)) {
            return false;
        }
        const color = part.color;
        const alpha = part.alpha;
        return (
            color !== undefined &&
            /#[a-f0-9]{6}/.test(color.toLowerCase()) &&
            alpha !== undefined &&
            alpha >= 0 &&
            alpha <= 1
        );
    }

    #isEffectData(effect: unknown): effect is AuraREEffectData {
        if (!isObject<AuraEffectData>(effect)) return false;
        effect.affects ??= "all";
        effect.removeOnExit ??= Array.isArray(effect.events) ? effect.events.includes("enter") : false;
        effect.save ??= null;

        return (
            typeof effect.uuid === "string" &&
            (!("level" in effect) || ["string", "number"].includes(typeof effect.level)) &&
            typeof effect.affects === "string" &&
            ["allies", "enemies", "all"].includes(effect.affects) &&
            Array.isArray(effect.events) &&
            effect.events.every((e) => typeof e === "string" && ["enter", "turn-start", "turn-end"].includes(e)) &&
            typeof effect.removeOnExit === "boolean"
        );
    }

    /** Resolve level values on effects */
    #processEffects(): AuraEffectData[] {
        return this.effects.map((e) => ({ ...e, level: Number(this.resolveValue(e.level)) || null }));
    }
}

interface AuraRuleElementSource extends RuleElementSource {
    radius?: unknown;
    effects?: unknown;
    traits?: unknown;
    border?: unknown;
    fill?: unknown;
}

interface AuraRuleElementData extends RuleElementSource {
    radius: string | number;
    effects: AuraREEffectData[];
    traits: ItemTrait[];
    border: AuraPart | null;
    fill: AuraPart | null;
}

interface AuraREEffectData extends Omit<AuraEffectData, "level"> {
    level?: string | number;
}
