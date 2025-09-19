import { ActorPF2e } from "@actor";
import { InitiativeData } from "@actor/data/base.ts";
import { Immunity } from "@actor/data/iwr.ts";
import { setHitPointsRollOptions, strikeFromMeleeItem } from "@actor/helpers.ts";
import { ActorInitiative } from "@actor/initiative.ts";
import { Modifier } from "@actor/modifiers.ts";
import { SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { ConditionPF2e } from "@item";
import { ItemType } from "@item/base/data/index.ts";
import { Rarity } from "@module/data.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { DamageType } from "@system/damage/index.ts";
import { ArmorStatistic, Statistic } from "@system/statistic/index.ts";
import { isObject, objectHasKey } from "@util";
import * as R from "remeda";
import { HazardSource, HazardSystemData } from "./data.ts";

class HazardPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    declare skills: Record<"stealth", Statistic<this>>;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "action", "melee"];
    }

    get rarity(): Rarity {
        return this.system.traits.rarity;
    }

    get isComplex(): boolean {
        return this.system.details.isComplex;
    }

    override get hardness(): number {
        return Math.abs(this.system.attributes.hardness);
    }

    get hasDefenses(): boolean {
        return !!(this.hitPoints?.max || this.attributes.ac.value);
    }

    /** Minimal check since the disabled status of a hazard isn't logged */
    override get canAttack(): boolean {
        return this.itemTypes.melee.length > 0;
    }

    override get emitsSound(): boolean {
        const { emitsSound } = this.system.attributes;
        return !this.isDead && typeof emitsSound === "boolean"
            ? emitsSound
            : !!game.combats.active?.started && game.combats.active.combatants.some((c) => c.actor === this);
    }

    override isAffectedBy(effect: DamageType | ConditionPF2e): boolean {
        // Hazards without hit points are unaffected by damage
        const damageType = objectHasKey(CONFIG.PF2E.damageTypes, effect)
            ? effect
            : isObject(effect)
              ? (effect.system.persistent?.damageType ?? null)
              : null;

        if (!this.system.attributes.hasHealth && damageType) {
            return false;
        }

        // Some hazard are implicitly subject to vitality or void damage despite being neither living nor undead:
        // use a weakness or resistance as an indication
        const { weaknesses, resistances } = this.system.attributes;
        if (damageType && ["vitality", "void"].includes(damageType)) {
            return weaknesses.some((w) => w.type === damageType) || resistances.some((r) => r.type === damageType);
        }

        return super.isAffectedBy(effect);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const { attributes, details } = this.system;
        attributes.hp.negativeHealing = false;
        attributes.hp.brokenThreshold = Math.floor(attributes.hp.max / 2);
        attributes.hasHealth = attributes.hp.max > 0;
        // Hazards have object immunities (CRB p. 273): can be overridden by Immunity rule element
        if (!attributes.immunities.some((i) => i.type === "object-immunities")) {
            attributes.immunities.unshift(new Immunity({ type: "object-immunities", source: "TYPES.Actor.hazard" }));
        }

        if (this.isComplex) {
            // Ensure stealth value is numeric and set baseline initiative data
            attributes.stealth.value ??= 0;
            const withPartialInitiative: { initiative?: Partial<InitiativeData> } = this.system;
            withPartialInitiative.initiative = {
                statistic: "stealth",
                tiebreakPriority: this.hasPlayerOwner ? 2 : 1,
            };
        }

        details.alliance = null;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        this.prepareSynthetics();
        setHitPointsRollOptions(this);

        // Stealth, which is the only skill hazards have
        const system = this.system;
        this.skills = {
            stealth: new Statistic(this, {
                slug: "stealth",
                label: CONFIG.PF2E.skills.stealth.label,
                domains: ["stealth", `dex-based`, "skill-check", `dex-skill-check`, "all"],
                modifiers: [
                    new Modifier({
                        label: "PF2E.ModifierTitle",
                        slug: "base",
                        type: "untyped",
                        modifier: system.attributes.stealth.value ?? 0,
                    }),
                ],
                check: { type: "skill-check" },
            }),
        };
        const stealthSource = this._source.system.attributes.stealth;
        this.system.attributes.stealth = fu.mergeObject(this.skills.stealth.getTraceData(), {
            details: stealthSource.details.trim(),
        });
        if (stealthSource.value === null) {
            const traceData = this.system.attributes.stealth;
            traceData.value = traceData.dc = traceData.totalModifier = null;
        }

        // Initiative
        if (system.initiative) {
            this.initiative = new ActorInitiative(this, R.pick(system.initiative, ["statistic", "tiebreakPriority"]));
            system.initiative = this.initiative.getTraceData();
        }

        // Armor Class
        if (this.hasDefenses) {
            const baseModifier = new Modifier({
                slug: "base",
                label: "PF2E.BaseModifier",
                modifier: system.attributes.ac.value - 10,
            });
            const statistic = new ArmorStatistic(this, { rank: 1, modifiers: [baseModifier] });
            this.armorClass = statistic.dc;
            system.attributes.ac = statistic.getTraceData();
        }

        this.saves = this.prepareSaves();
        this.system.actions = this.itemTypes.melee.map((m) => strikeFromMeleeItem(m));
    }

    /**
     * Some hazards have an implicit immunity exception to certain damage types despite having object immunities: use a
     * weakness or resistance as indication.
     */
    override prepareData(): void {
        super.prepareData();

        const weaknessesAndResistances = new Set(
            [
                this.system.attributes.weaknesses.map((w) => w.type),
                this.system.attributes.resistances.map((r) => r.type),
            ].flat(),
        );
        const objectImmunities = this.system.attributes.immunities.find((i) => i.type === "object-immunities");
        for (const wrType of ["bleed", "mental", "poison", "spirit"] as const) {
            if (weaknessesAndResistances.has(wrType)) {
                objectImmunities?.exceptions.push(wrType);
            }
        }
    }

    private prepareSaves(): { [K in SaveType]?: Statistic } {
        const system = this.system;

        // Saving Throws
        return SAVE_TYPES.reduce((saves: { [K in SaveType]?: Statistic }, saveType) => {
            const save = system.saves[saveType];
            const label = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const base = save.value;

            // Saving Throws with a value of 0 are not usable by the hazard
            // Later on we'll need to explicitly check for null, since 0 is supposed to be valid
            if (!base) return saves;

            const statistic = new Statistic(this, {
                slug: saveType,
                label,
                attribute: CONFIG.PF2E.savingThrowDefaultAttributes[saveType],
                domains: [saveType, "saving-throw"],
                modifiers: [
                    new Modifier({
                        slug: "base",
                        label: "PF2E.ModifierTitle",
                        modifier: base,
                    }),
                ],
                check: { type: "saving-throw" },
            });

            this.system.saves[saveType] = fu.mergeObject(save, statistic.getTraceData());
            saves[saveType] = statistic;

            return saves;
        }, {});
    }
}

interface HazardPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: HazardSource;
    system: HazardSystemData;

    saves: { [K in SaveType]?: Statistic };
}

export { HazardPF2e };
