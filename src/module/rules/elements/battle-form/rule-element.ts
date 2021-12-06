import { CharacterPF2e } from "@actor";
import { SENSE_TYPES } from "@actor/creature/sense";
import { ActorType } from "@actor/data";
import { MOVEMENT_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY } from "@actor/data/values";
import { ItemPF2e } from "@item";
import { WEAPON_CATEGORIES } from "@item/weapon/data";
import { DiceModifierPF2e, ModifierPF2e, RawModifier, StatisticModifier } from "@module/modifiers";
import { RollNotePF2e } from "@module/notes";
import { RuleElementPF2e } from "@module/rules/rule-element";
import { RuleElementData, RuleElementSynthetics } from "@module/rules/rules-data-definitions";
import { PredicatePF2e } from "@system/predication";
import { sluggify } from "@util";
import { CreatureSizeRuleElement } from "../creature-size";
import { ImmunityRuleElement } from "../iwr/immunity";
import { ResistanceRuleElement } from "../iwr/resistance";
import { WeaknessRuleElement } from "../iwr/weakness";
import { SenseRuleElement } from "../sense";
import { StrikeRuleElement } from "../strike";
import { TempHPRuleElement } from "../temphp";
import { BattleFormAC, BattleFormOverrides, BattleFormSource } from "./types";

export class BattleFormRuleElement extends RuleElementPF2e {
    overrides: this["data"]["overrides"];

    /** The label given to modifiers of AC, skills, and strikes */
    modifierLabel: string;

    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: BattleFormSource, item: Embedded<ItemPF2e>) {
        super(data, item);
        this.initialize(this.data);
        this.overrides = this.resolveValue(this.data.value ?? {}, this.data.overrides);
        this.modifierLabel = this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "");
    }

    static defaultIcons: Record<string, ImagePath | undefined> = [
        "antler",
        "beak",
        "body",
        "bone-shard",
        "branch",
        "claw",
        "cube-face",
        "fangs",
        "fire-mote",
        "fist",
        "foot",
        "foreleg",
        "gust",
        "horn",
        "jaws",
        "lighting-lash",
        "mandibles",
        "piercing-hymn",
        "pincer",
        "pseudopod",
        "rock",
        "stinger",
        "tail",
        "talon",
        "tendril",
        "tentacle",
        "tongue",
        "vine",
        "water-spout",
        "wave",
        "wing",
    ].reduce((accumulated: Record<string, ImagePath | undefined>, strike) => {
        const path = `systems/pf2e/icons/unarmed-attacks/${strike}.webp` as const;
        return { ...accumulated, [strike]: path };
    }, {});

    /** Fill in base override data */
    private initialize(data: BattleFormSource): void {
        if (this.ignored) return;

        const { value } = data;
        const dataIsValid = data.overrides instanceof Object && (value instanceof Object || value === undefined);
        if (!dataIsValid) {
            console.warn("PF2e System | Battle Form rule element failed to validate");
            this.ignored = true;
            return;
        }

        data.canCast ??= false;
        data.canSpeak ??= false;
        data.hasHands ??= false;
        data.ownUnarmed ??= false;

        const overrides = (data.overrides ??= {});
        overrides.tempHP ??= null;
        overrides.traits ??= [];
        overrides.senses ??= {};
        overrides.size ??= null;
        overrides.speeds ??= {};
        overrides.armorClass = mergeObject(
            { modifier: 0, ignoreCheckPenalty: true, ignoreSpeedPenalty: true },
            overrides.armorClass ?? {}
        );

        const skills = (overrides.skills ??= {});
        for (const skillData of Object.values(skills)) {
            skillData.ownIfHigher ??= true;
        }

        const strikes = (overrides.strikes ??= {});
        for (const [key, strikeData] of Object.entries(strikes)) {
            strikeData.label = game.i18n.localize(strikeData.label);
            strikeData.img ??= BattleFormRuleElement.defaultIcons[key] ?? this.item.img;
            strikeData.ownIfHigher ??= true;
        }

        overrides.immunities ??= [];
        overrides.weaknesses ??= [];
        overrides.resistances ??= [];

        // Disable Automatic Bonus Progression
        this.actor.data.flags.pf2e.disableABP = true;
    }

    /** Set temporary hit points */
    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;

        const tempHP = this.overrides.tempHP;
        if (tempHP) {
            new TempHPRuleElement({ key: "TempHP", label: this.data.label, value: tempHP }, this.item).onCreate(
                actorUpdates
            );
        }
    }

    override onBeforePrepareData(synthetics: RuleElementSynthetics): void {
        if (this.ignored) return;

        const { rollOptions } = this.actor;
        if (rollOptions.all["polymorph"]) {
            console.warn("PF2e System | You are already under the effect of a polymorph effect");
            this.ignored = true;
            return;
        }
        this.setRollOptions();
        this.prepareSenses(synthetics);

        for (const trait of this.overrides.traits) {
            const currentTraits = this.actor.data.data.traits.traits;
            if (!currentTraits.value.includes(trait)) currentTraits.value.push(trait);
        }

        if (this.overrides.armorClass.ignoreSpeedPenalty) {
            const speedRollOptions = (this.actor.rollOptions.speed ??= {});
            speedRollOptions["armor:ignore-speed-penalty"] = true;
        }
    }

    override onAfterPrepareData(synthetics: RuleElementSynthetics): void {
        if (this.ignored) return;

        this.prepareAC();
        this.prepareSize();
        this.prepareSkills();
        this.prepareSpeeds(synthetics);
        this.prepareStrikes(synthetics);
        this.prepareIWR();
    }

    /** Remove temporary hit points */
    override onDelete(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;

        const tempHP = this.overrides.tempHP;
        if (tempHP) {
            new TempHPRuleElement({ key: "TempHP", label: this.data.label, value: tempHP }, this.item).onDelete(
                actorUpdates
            );
        }
    }

    private setRollOptions(): void {
        const { rollOptions } = this.actor;
        rollOptions.all["polymorph"] = true;
        rollOptions.all["battle-form"] = true;
        rollOptions.all["armor:ignore-check-penalty"] = this.overrides.armorClass.ignoreCheckPenalty;
        rollOptions.all["armor:ignore-speed-penalty"] = this.overrides.armorClass.ignoreSpeedPenalty;
        if (this.overrides.armorClass.ignoreSpeedPenalty) {
            const speedRollOptions = (rollOptions.speed ??= {});
            speedRollOptions["armor:ignore-speed-penalty"] = true;
        }
        // Inform predicates that this battle form grants a skill modifier
        for (const key of SKILL_ABBREVIATIONS) {
            if (!(key in this.overrides.skills)) continue;
            const longForm = SKILL_DICTIONARY[key];
            rollOptions.all[`battle-form:${longForm}`] = true;
        }
    }

    /** Override the character's AC and ignore speed penalties if necessary */
    private prepareAC(): void {
        const overrides = this.overrides;
        const armorClass = this.actor.data.data.attributes.ac;
        const acOverride: number = this.resolveValue(overrides.armorClass.modifier, armorClass.totalModifier) ?? 0;
        if (!acOverride) return;

        this.suppressModifiers(armorClass);
        const newModifier: number = this.resolveValue(overrides.armorClass.modifier);
        armorClass.unshift(new ModifierPF2e(this.modifierLabel, newModifier, "untyped"));
        armorClass.value = armorClass.totalModifier;
    }

    /** Add new senses the character doesn't already have */
    private prepareSenses(synthetics: RuleElementSynthetics): void {
        for (const senseType of SENSE_TYPES) {
            const newSense = this.overrides.senses[senseType];
            if (!newSense) continue;
            newSense.acuity ??= "precise";
            const ruleData = { key: "Sense", selector: senseType, force: true, ...newSense };
            new SenseRuleElement(ruleData, this.item).onBeforePrepareData(synthetics);
        }
    }

    /** Adjust the character's size category */
    private prepareSize(): void {
        if (!this.overrides.size) return;
        const ruleData = { key: "CreatureSize", label: this.label, value: this.overrides.size };
        new CreatureSizeRuleElement(ruleData, this.item).onBeforePrepareData();
    }

    /** Add, replace and/or adjust non-land speeds */
    private prepareSpeeds(synthetics: RuleElementSynthetics): void {
        const { attributes } = this.actor.data.data;
        const currentSpeeds = attributes.speed;

        for (const movementType of MOVEMENT_TYPES) {
            const speedOverride = this.overrides.speeds[movementType];
            if (typeof speedOverride !== "number") continue;

            if (movementType === "land") {
                const landSpeed = attributes.speed;
                this.suppressModifiers(attributes.speed);
                attributes.speed.totalModifier = landSpeed.total = speedOverride + landSpeed.totalModifier;
                const label = game.i18n.format("PF2E.SpeedBaseLabel", {
                    type: game.i18n.localize("PF2E.SpeedTypesLand"),
                });
                attributes.speed.breakdown = [`${label} ${speedOverride}`]
                    .concat(
                        landSpeed.modifiers
                            .filter((m) => m.enabled)
                            .map((modifier) => {
                                const speedName = game.i18n.localize(modifier.name);
                                const sign = modifier.modifier < 0 ? "" : "+";
                                const value = modifier.modifier;
                                return `${speedName} ${sign}${value}`;
                            })
                    )
                    .join(", ");
            } else {
                const { otherSpeeds } = currentSpeeds;
                const label = game.i18n.localize(CONFIG.PF2E.speedTypes[movementType]);
                otherSpeeds.findSplice((speed) => speed.type === movementType);
                otherSpeeds.push({
                    type: movementType,
                    label,
                    value: String(speedOverride),
                });
                const newSpeed = this.actor.prepareSpeed(movementType, synthetics);
                this.suppressModifiers(newSpeed);
                newSpeed.totalModifier = newSpeed.total = speedOverride + newSpeed.totalModifier;
                newSpeed.breakdown = [`${label} ${speedOverride}`]
                    .concat(
                        newSpeed.modifiers
                            .filter((modifier) => modifier.enabled)
                            .map((modifier) => {
                                const sign = modifier.modifier < 0 ? "" : "+";
                                const value = modifier.modifier;
                                return `${this.modifierLabel} ${sign}${value}`;
                            })
                    )
                    .join(", ");

                otherSpeeds.findSplice((speed) => speed.type === movementType);
                otherSpeeds.push(newSpeed);
            }
        }
    }

    private prepareSkills(): void {
        for (const key of SKILL_ABBREVIATIONS) {
            const newSkill = this.overrides.skills[key];
            if (!newSkill) continue;

            const currentSkill = this.actor.data.data.skills[key];
            if (currentSkill.totalModifier > newSkill.modifier && newSkill.ownIfHigher) {
                continue;
            }
            const newModifier: number = this.resolveValue(newSkill.modifier);

            this.suppressModifiers(currentSkill);
            currentSkill.unshift(new ModifierPF2e(this.modifierLabel, newModifier, "untyped"));
            currentSkill.value = currentSkill.totalModifier;
        }
    }

    /** Clear out existing strikes and replace them with the form's stipulated ones, if any */
    private prepareStrikes(synthetics: RuleElementSynthetics): void {
        const ruleData = Object.entries(this.overrides.strikes).map(([slug, strikeData]) => ({
            key: "Strike",
            label: strikeData.label ?? `PF2E.BattleForm.Attack.${sluggify(slug, { camel: "bactrian" })}`,
            slug,
            img: strikeData.img,
            category: strikeData.category,
            group: strikeData.group,
            baseItem: strikeData.baseType,
            options: [slug],
            damage: { base: strikeData.damage },
            range: null,
            traits: strikeData.traits,
        }));

        // Repopulate strikes with new WeaponPF2e instances--unless ownUnarmed is true
        if (this.data.ownUnarmed) {
            synthetics.strikes = synthetics.strikes.filter((weapon) => weapon.category === "unarmed");
            this.actor.rollOptions.all["battle-form:own-attack-modifier"] = true;
        } else {
            synthetics.strikes.length = 0;
            for (const striking of Object.values(synthetics.striking).flat()) {
                const predicate = (striking.predicate ??= new PredicatePF2e());
                predicate.not.push("battle-form");
            }
        }

        for (const datum of ruleData) {
            if (!datum.traits.includes("magical")) datum.traits.push("magical");
            new StrikeRuleElement(datum, this.item).onBeforePrepareData(synthetics);
        }
        this.actor.data.data.actions = this.data.ownUnarmed
            ? this.actor.data.data.actions.filter((action) => action.traits.some((trait) => trait.name === "unarmed"))
            : synthetics.strikes.map((weapon) =>
                  this.actor.prepareStrike(weapon, { categories: [...WEAPON_CATEGORIES], synthetics })
              );
        for (const action of this.actor.data.data.actions) {
            const strike = this.overrides.strikes[action.slug!];
            if (!this.data.ownUnarmed && (strike.modifier >= action.totalModifier || !strike.ownIfHigher)) {
                // The battle form's static attack-roll modifier is >= the character's unarmed attack modifier:
                // replace inapplicable attack-roll modifiers with the battle form's
                this.suppressModifiers(action);
                this.suppressNotes(
                    Object.entries(synthetics.rollNotes).flatMap(([key, note]) => (/\bdamage\b/.test(key) ? note : []))
                );
                const baseModifier: number = this.resolveValue(strike.modifier);
                action.unshift(new ModifierPF2e(this.modifierLabel, baseModifier, "untyped"));

                // Also replace the label
                const title = game.i18n.localize("PF2E.RuleElement.Strike");
                const sign = action.totalModifier < 0 ? "" : "+";
                action.variants[0].label = `${title} ${sign}${action.totalModifier}`;
            } else {
                this.actor.rollOptions.all["battle-form:own-attack-modifier"] = true;
            }
        }
    }

    /** Immunity, weakness, and resistance */
    private prepareIWR(): void {
        for (const immunity of this.overrides.immunities) {
            new ImmunityRuleElement({ key: "Immunity", ...immunity }, this.item).onBeforePrepareData();
        }
        for (const weakness of this.overrides.weaknesses) {
            new WeaknessRuleElement({ key: "Weakness", ...weakness, override: true }, this.item).onBeforePrepareData();
        }
        for (const resistance of this.overrides.resistances) {
            new ResistanceRuleElement(
                { key: "Resistance", ...resistance, override: true },
                this.item
            ).onBeforePrepareData();
        }
    }

    /** Disable ineligible check modifiers */
    private suppressModifiers(statistic: StatisticModifier): void {
        for (const modifier of statistic.modifiers) {
            if (modifier.ignored) continue;
            if (
                (!["status", "circumstance"].includes(modifier.type) && modifier.modifier >= 0) ||
                modifier.type === "ability"
            ) {
                modifier.predicate.not.push("battle-form");
                modifier.ignored = true;
            }
        }
        statistic.applyStackingRules();
    }

    private suppressNotes(notes: RollNotePF2e[]): void {
        for (const note of notes) {
            if (!note.predicate?.all?.includes("battle-form")) {
                note.predicate =
                    note.predicate instanceof PredicatePF2e ? note.predicate : new PredicatePF2e(note.predicate);
                note.predicate.not.push("battle-form");
            }
        }
    }

    override applyDamageExclusion(modifiers: RawModifier[]): void {
        if (this.data.ownUnarmed) return;
        for (const modifier of modifiers) {
            if (modifier.predicate?.not?.includes("battle-form")) continue;

            const isNumericBonus = modifier instanceof ModifierPF2e && modifier.modifier >= 0;
            const isExtraDice = modifier instanceof DiceModifierPF2e;
            const isStatusOrCircumstance = ["status", "circumstance"].includes(modifier.type ?? "untyped");
            const isBattleFormModifier = !!(
                modifier.predicate?.any?.includes("battle-form") || modifier.predicate?.all?.includes("battle-form")
            );

            if ((isNumericBonus || isExtraDice) && !isStatusOrCircumstance && !isBattleFormModifier) {
                modifier.predicate.not.push("battle-form");
            }
        }
    }
}

export interface BattleFormRuleElement extends RuleElementPF2e {
    get actor(): CharacterPF2e;
    data: BattleFormData;
}

type PickedProperties = "overrides" | "canCast" | "canSpeak" | "hasHands" | "ownUnarmed";
type RequiredBattleFormSource = Required<Pick<BattleFormSource, PickedProperties>>;
interface BattleFormData extends RuleElementData, RequiredBattleFormSource {
    key: "BattleForm";
    overrides: Required<BattleFormOverrides> & {
        armorClass: Required<BattleFormAC>;
    };
}
