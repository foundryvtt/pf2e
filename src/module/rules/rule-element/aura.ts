import { AuraColors, AuraEffectData } from "@actor/types";
import { ItemPF2e } from "@item";
import { EffectTrait } from "@item/abstract-effect/data";
import { PredicatePF2e } from "@system/predication";
import { isObject, sluggify } from "@util";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./";
import { UUIDUtils } from "@util/uuid-utils";
import { ActorPF2e } from "@actor";

/** A Pathfinder 2e aura, capable of transmitting effects and with a visual representation on the canvas */
export class AuraRuleElement extends RuleElementPF2e {
    override slug: string;

    /** The radius of the order in feet, or a string that will resolve to one */
    radius: number | string;

    /** References to effects included in this aura */
    effects: AuraREEffectData[];

    /** Associated traits, including ones that determine transmission through walls ("visual", "auditory") */
    traits: EffectTrait[];

    /**
     * Custom border and fill colors for the aura: if omitted, the border color will be black, and the fill color the
     * user's assigned color
     */
    colors: AuraColors | null;

    constructor(source: AuraRuleElementSource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
        source.effects ??= [];
        source.traits ??= [];

        super(source, item, options);

        this.slug ??= this.item.slug ?? sluggify(this.item.name);

        if (this.#isValid(source)) {
            this.radius = source.radius;
            this.effects = deepClone(source.effects ?? []).map((e) => ({
                ...e,
                predicate: new PredicatePF2e(e.predicate ?? []),
            }));
            this.traits = deepClone(source.traits ?? []).filter((t) => t !== "aura");
            this.colors = source.colors ?? null;
        } else {
            this.radius = 0;
            this.effects = [];
            this.traits = [];
            this.colors = null;
        }
    }

    override afterPrepareData(): void {
        if (!this.test()) return;

        const radius = Math.clamped(Number(this.resolveValue(this.radius)), 5, 240);

        if (typeof Number.isInteger(radius) && radius > 0 && radius % 5 === 0) {
            const data = {
                slug: this.slug,
                level: this.item.system.level?.value ?? null,
                radius,
                effects: this.#processEffects(),
                traits: this.traits,
                colors: this.colors,
            };

            // Late validation check of effect UUID
            for (const effect of data.effects) {
                const indexEntry = UUIDUtils.fromUuidSync(effect.uuid);
                if (!(indexEntry && "type" in indexEntry && typeof indexEntry.type === "string")) {
                    this.failValidation(`Unable to resolve effect uuid: ${effect.uuid}`);
                    return;
                }
                if (!["effect", "affliction"].includes(indexEntry.type)) {
                    this.failValidation(`effects transmitted by auras must be of type "effect" or "affliction"`);
                }
            }

            this.actor.auras.set(this.slug, data);
        }
    }

    #isValid(data: AuraRuleElementSource): data is AuraRuleElementData {
        const validations = {
            traits:
                Array.isArray(data.traits) &&
                data.traits.every((t) => t in CONFIG.PF2E.spellTraits || t in CONFIG.PF2E.actionTraits),
            radius: ["number", "string"].includes(typeof data.radius),
            effects: Array.isArray(data.effects) && data.effects.every(this.#isEffectData),
            colors: !("colors" in data) || data.colors === null || this.#isAuraColors(data.colors),
            predicate: !("predicate" in data) || PredicatePF2e.isValid(data.predicate),
        };
        const properties = ["traits", "radius", "effects", "colors"] as const;
        for (const property of properties) {
            if (!validations[property]) {
                this.failValidation(`"${property}" property is invalid.`);
            }
        }

        return properties.every((p) => validations[p]);
    }

    #isAuraColors(colors: unknown): colors is AuraColors {
        return (
            isObject<AuraColors>(colors) &&
            (["border", "fill"] as const).every((p) => {
                const color = colors[p];
                return typeof color === "string" && /#[a-f0-9]{6}/.test(color.toLowerCase());
            })
        );
    }

    #isEffectData(effect: unknown): effect is AuraREEffectData {
        if (!isObject<AuraEffectData>(effect)) return false;
        effect.affects ??= "all";
        effect.removeOnExit ??= Array.isArray(effect.events) ? effect.events.includes("enter") : false;
        effect.save ??= null;
        effect.includesSelf ??= effect.affects !== "enemies";

        return (
            typeof effect.uuid === "string" &&
            (!("level" in effect) || ["string", "number"].includes(typeof effect.level)) &&
            typeof effect.affects === "string" &&
            ["allies", "enemies", "all"].includes(effect.affects) &&
            Array.isArray(effect.events) &&
            effect.events.every((e) => typeof e === "string" && ["enter", "turn-start", "turn-end"].includes(e)) &&
            typeof effect.removeOnExit === "boolean" &&
            typeof effect.includesSelf === "boolean"
        );
    }

    /** Resolve level values on effects */
    #processEffects(): AuraEffectData[] {
        return this.effects.map((e) => ({
            ...e,
            uuid: this.resolveInjectedProperties(e.uuid),
            level: Number(this.resolveValue(e.level)) || null,
        }));
    }
}

interface AuraRuleElementSource extends RuleElementSource {
    radius?: unknown;
    effects?: unknown;
    traits?: unknown;
    colors?: unknown;
}

interface AuraRuleElementData extends RuleElementSource {
    radius: string | number;
    effects?: AuraREEffectData[];
    traits?: EffectTrait[];
    colors?: AuraColors | null;
}

interface AuraREEffectData extends Omit<AuraEffectData, "level"> {
    level?: string | number;
}
