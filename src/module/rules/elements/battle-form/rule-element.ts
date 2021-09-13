import { CharacterPF2e } from "@actor";
import { ActorType, CharacterData } from "@actor/data";
import { MOVEMENT_TYPES, SENSE_TYPES, SKILL_ABBREVIATIONS } from "@actor/data/values";
import { ItemPF2e } from "@item";
import { WEAPON_CATEGORIES } from "@item/weapon/data";
import { DiceModifierPF2e, ModifierPF2e, RawModifier, StatisticModifier } from "@module/modifiers";
import { RuleElementPF2e } from "@module/rules/rule-element";
import { RuleElementData, RuleElementSynthetics } from "@module/rules/rules-data-definitions";
import { CreatureSizeRuleElement } from "../creature-size";
import { SenseRuleElement } from "../sense";
import { StrikeRuleElement } from "../strike";
import { TempHPRuleElement } from "../temphp";
import { BattleFormAC, BattleFormOverrides, BattleFormSource } from "./types";

export class BattleFormRuleElement extends RuleElementPF2e {
    overrides: this["data"]["overrides"];

    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: BattleFormSource, item: Embedded<ItemPF2e>) {
        super(data, item);
        this.initialize(data);
        this.overrides = this.resolveValue(this.data.value, this.data.overrides);
    }

    static defaultIcons: Record<string, ImagePath | undefined> = [
        "antler",
        "beak",
        "claw",
        "fangs",
        "fist",
        "foot",
        "foreleg",
        "gust",
        "horn",
        "jaws",
        "mandibles",
        "pincer",
        "pseudopod",
        "stinger",
        "tail",
        "talon",
        "tendril",
        "tentacle",
        "tongue",
        "wave",
        "wing",
    ].reduce((accumulated: Record<string, ImagePath | undefined>, strike) => {
        const path = `systems/pf2e/icons/unarmed-attacks/${strike}.webp` as const;
        return { ...accumulated, [strike]: path };
    }, {});

    /** Fill in base override data */
    private initialize(data: BattleFormSource): void {
        if (this.ignored) return;

        const dataIsValid = data.overrides instanceof Object && data.value instanceof Object;
        if (!dataIsValid) {
            console.warn("PF2e System | Battle Form rule element failed to validate");
            this.ignored = true;
            return;
        }

        const overrides = (data.overrides ??= {});
        overrides.tempHP ??= null;
        overrides.traits ??= [];
        overrides.senses ??= {};
        overrides.size ??= null;
        overrides.skills ??= {};
        overrides.speeds ??= {};
        overrides.canCast ??= false;
        overrides.canSpeak ??= false;
        overrides.dismissable ??= true;
        overrides.hasHands ??= false;
        overrides.ownModifier ??= {};

        const armorClass = (overrides.armorClass ??= {});
        armorClass.modifier ??= 0;
        armorClass.ownModifierBonus ??= null;
        armorClass.ignoreCheckPenalty ??= false;
        armorClass.ignoreSpeedReduction ??= false;

        const strikes = (overrides.strikes ??= {});
        for (const [key, strikeData] of Object.entries(strikes)) {
            strikeData.label = game.i18n.localize(strikeData.label);
            strikeData.img ??= BattleFormRuleElement.defaultIcons[key] ?? this.item.img;
        }
    }

    /** Set temporary hit points */
    onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;

        const tempHP = this.overrides.tempHP;
        if (tempHP) {
            new TempHPRuleElement({ key: "TempHP", label: this.data.label, value: tempHP }, this.item).onCreate(
                actorUpdates
            );
        }
    }

    /** Add any new traits and remove the armor check penalty if this battle form ignores it */
    onBeforePrepareData(): void {
        if (this.ignored) return;

        const { rollOptions } = this.actor.data.flags.pf2e;
        if (rollOptions.all["polymorph"]) {
            console.warn("PF2e System | You are already under the effect of a polymorph effect");
            this.ignored = true;
            return;
        }
        rollOptions.all["polymorph"] = true;
        rollOptions.all["battle-form"] = true;
        rollOptions.all["armor:ignore-speed-penalty"] ??= this.overrides.armorClass.ignoreSpeedReduction;

        for (const trait of this.overrides.traits) {
            const currentTraits = this.actor.data.data.traits.traits;
            if (!currentTraits.value.includes(trait)) currentTraits.value.push(trait);
        }

        if (this.overrides.armorClass.ignoreCheckPenalty) {
            this.actor.data.flags.pf2e.rollOptions.all["armor:ignore-check-penalty"] = true;
        }
        if (this.overrides.armorClass.ignoreSpeedReduction) {
            const speedRollOptions = (this.actor.data.flags.pf2e.rollOptions.speed ??= {});
            speedRollOptions["armor:ignore-speed-penalty"] = true;
        }
    }

    onAfterPrepareData(_actorData: CharacterData, synthetics: RuleElementSynthetics): void {
        if (this.ignored) return;

        this.prepareAC();
        this.prepareSenses();
        this.prepareSize();
        this.prepareSkills();
        this.prepareSpeeds(synthetics);
        this.prepareStrikes(synthetics);
    }

    /** Remove temporary hit points */
    onDelete(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;

        const tempHP = this.overrides.tempHP;
        if (tempHP) {
            new TempHPRuleElement({ key: "TempHP", label: this.data.label, value: tempHP }, this.item).onDelete(
                actorUpdates
            );
        }
    }

    /** Override the character's AC and ignore speed penalties if necessary */
    private prepareAC(): void {
        const overrides = this.overrides;
        const armorClass = this.actor.data.data.attributes.ac;
        const acOverride: number = this.resolveValue(overrides.armorClass.modifier, armorClass.totalModifier) ?? 0;
        if (!acOverride) return;

        if (!overrides.ownModifier.armorClass || acOverride >= armorClass.totalModifier) {
            this.suppressModifiers(armorClass);
            const newModifier: number = this.resolveValue(overrides.armorClass.modifier);
            armorClass.unshift(new ModifierPF2e(this.data.label, newModifier, "untyped"));
            armorClass.value = armorClass.totalModifier;
        } else if (
            overrides.ownModifier.armorClass &&
            armorClass.totalModifier > acOverride &&
            overrides.armorClass.ownModifierBonus
        ) {
            // If one is granted, add a bonus for using the character's own modifier
            armorClass.push(new ModifierPF2e(this.data.label, overrides.armorClass.ownModifierBonus, "status"));
        }
    }

    /** Add new senses the character doesn't already have */
    private prepareSenses(): void {
        for (const senseType of SENSE_TYPES) {
            const newSense = this.overrides.senses[senseType];
            if (!newSense) continue;
            newSense.acuity ??= "precise";
            const label = game.i18n.localize(CONFIG.PF2E.senses[senseType]);
            const ruleData = { key: "Sense", label, selector: senseType, ...newSense };
            new SenseRuleElement(ruleData, this.item).onBeforePrepareData();
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
                                const modifierLabel = game.i18n.localize(modifier.name);
                                const sign = modifier.modifier < 0 ? "" : "+";
                                const value = modifier.modifier;
                                return `${modifierLabel} ${sign}${value}`;
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
            if (currentSkill.totalModifier > newSkill.modifier && this.overrides.ownModifier.skills) {
                continue;
            }
            const newModifier: number = this.resolveValue(newSkill.modifier);

            this.suppressModifiers(currentSkill);
            currentSkill.unshift(new ModifierPF2e(this.data.label, newModifier, "untyped"));
            currentSkill.value = currentSkill.totalModifier;
        }
    }

    /** Clear out existing strikes and replace them with the form's stipulated ones, if any */
    private prepareStrikes(synthetics: RuleElementSynthetics): void {
        const ruleData = Object.entries(this.overrides.strikes).map(([slug, strikeData]) => ({
            key: "Strike",
            label: strikeData.label ?? `PF2E.BattleForm.Attack.${slug.titleCase()}`,
            slug,
            img: strikeData.img,
            ability: strikeData.ability,
            category: strikeData.category,
            group: strikeData.group,
            options: [slug],
            damage: { base: strikeData.damage },
            range: "melee",
            traits: strikeData.traits,
        }));

        // Repopulate strikes with new WeaponPF2e instances
        synthetics.strikes.length = 0;

        for (const datum of ruleData) {
            if (!datum.traits.includes("magical")) datum.traits.push("magical");
            new StrikeRuleElement(datum, this.item).onBeforePrepareData(this.actor.data, synthetics);
        }
        this.actor.data.data.actions = synthetics.strikes.map((weapon) =>
            this.actor.prepareStrike(weapon, { categories: [...WEAPON_CATEGORIES], synthetics })
        );
        for (const action of this.actor.data.data.actions) {
            const strike = this.overrides.strikes[action.slug!];
            if (strike.modifier >= action.totalModifier || !this.overrides.ownModifier.strikes) {
                // The battle form's static attack-roll modifier is >= the character's unarmed attack modifier:
                // replace inapplicable attack-roll modifiers with the battle form's
                this.suppressModifiers(action);
                const baseModifier: number = this.resolveValue(strike.modifier);
                action.unshift(
                    new ModifierPF2e(this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, ""), baseModifier, "untyped")
                );

                // Also replace the label
                const title = game.i18n.localize("PF2E.RuleElement.Strike");
                const sign = action.totalModifier < 0 ? "" : "+";
                action.variants[0].label = `${title} ${sign}${action.totalModifier}`;
            }
        }
    }

    /** Disable ineligible check modifiers */
    private suppressModifiers(statistic: StatisticModifier): void {
        for (const modifier of statistic.modifiers) {
            if (modifier.ignored) continue;
            if (!["status", "circumstance"].includes(modifier.type) && modifier.modifier >= 0) {
                modifier.predicate?.not?.push("battle-form");
                modifier.ignored = true;
            }
        }
        statistic.applyStackingRules();
    }

    applyDamageExclusion(modifiers: RawModifier[]): void {
        for (const modifier of modifiers) {
            if (modifier.predicate?.not?.includes("battle-form")) continue;

            const isNumericBonus = modifier instanceof ModifierPF2e && modifier.modifier > 0;
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

export interface BattleFormData extends RuleElementData, Omit<BattleFormSource, "ignored" | "predicate" | "priority"> {
    label: "BattleForm";
    overrides: Required<BattleFormOverrides> & {
        armorClass: Required<BattleFormAC>;
    };
}
