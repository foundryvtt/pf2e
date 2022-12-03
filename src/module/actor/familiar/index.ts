import { CharacterPF2e, CreaturePF2e } from "@actor";
import { CreatureSaves, LabeledSpeed } from "@actor/creature/data";
import { ActorSizePF2e } from "@actor/data/size";
import { applyStackingRules, CheckModifier, ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from "@actor/modifiers";
import { SaveType } from "@actor/types";
import { SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY, SKILL_EXPANDED } from "@actor/values";
import { extractDegreeOfSuccessAdjustments, extractModifiers, extractRollTwice } from "@module/rules/util";
import { CheckPF2e, CheckRoll } from "@system/check";
import { RollParameters } from "@system/rolls";
import { Statistic } from "@system/statistic";
import { FamiliarData, FamiliarSystemData } from "./data";

export class FamiliarPF2e extends CreaturePF2e {
    /** The familiar's master, if selected */
    get master(): CharacterPF2e | null {
        // The Actors world collection needs to be initialized for data preparation
        if (!game.ready || !this.system.master.id) return null;

        const master = game.actors.get(this.system.master.id ?? "");
        if (master instanceof CharacterPF2e) {
            master.familiar ??= this;
            return master;
        }

        return null;
    }

    get masterAbilityModifier(): number | null {
        const master = this.master;
        if (!master) return null;
        this.system.master.ability ||= "cha";
        return master.system.abilities[this.system.master.ability].mod;
    }

    override prepareData({ fromMaster = false } = {}): void {
        super.prepareData();
        if (fromMaster) this.sheet.render(false);
    }

    /** Set base emphemeral data for later updating by derived-data preparation */
    override prepareBaseData() {
        super.prepareBaseData();

        type RawSpeed = { value: number; otherSpeeds: LabeledSpeed[] };
        type PartialSystemData = DeepPartial<FamiliarSystemData> & {
            attributes: { speed: RawSpeed; flanking: {} };
            details: {};
        };

        const systemData: PartialSystemData = this.system;
        systemData.details.alignment = { value: "N" };
        systemData.details.level = { value: 0 };
        systemData.details.alliance = this.hasPlayerOwner ? "party" : "opposition";

        systemData.traits = {
            value: ["minion"],
            senses: [{ type: "lowLightVision", label: CONFIG.PF2E.senses.lowLightVision, value: "" }],
            size: new ActorSizePF2e({ value: "tiny" }),
        };

        systemData.attributes.flanking.canFlank = false;
        systemData.attributes.perception = {};
        systemData.attributes.speed = {
            value: 25,
            label: game.i18n.localize("PF2E.SpeedTypesLand"),
            otherSpeeds: [],
        };

        systemData.skills = {};

        systemData.saves = {
            fortitude: {},
            reflex: {},
            will: {},
        };

        // Fields that need to exist for sheet compatibility so that they can exist pleasantly while doing nothing.
        // They should be automated via specific familiar item types, or added to template.json and manually edited.
        // This requires dev investment and interest aimed at what amounts to feat expensive set dressing (familiars).
        systemData.traits = mergeObject(systemData.traits, {
            dv: [],
            di: [],
            dr: [],
        });
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const master = this.master;

        const systemData = this.system;
        const { attributes, details } = systemData;

        // Apply active effects now that the master (if selected) is ready.
        super.applyActiveEffects();

        // Ensure uniqueness of traits
        systemData.traits.value = [...this.traits].sort();

        // Data preparation ends here unless the familiar has a master
        if (!master) return;

        // The familiar's alliance is the same as its master's
        const level = (details.level.value = master.level);
        this.rollOptions.all[`self:level:${level}`] = true;
        details.alliance = master.system.details.alliance;

        const masterLevel =
            game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel" ? 0 : master.level;

        const masterAbilityModifier = this.masterAbilityModifier!;

        const { synthetics } = this;
        this.stripInvalidModifiers();

        const speeds = (systemData.attributes.speed = this.prepareSpeed("land"));
        speeds.otherSpeeds = (["burrow", "climb", "fly", "swim"] as const).flatMap((m) => this.prepareSpeed(m) ?? []);

        // Hit Points
        {
            const perLevelModifiers = extractModifiers(synthetics, ["hp-per-level"]).map((modifier) => {
                const clone = modifier.clone();
                clone.modifier *= level;
                return clone;
            });

            const modifiers = [
                new ModifierPF2e("PF2E.MasterLevelHP", level * 5, MODIFIER_TYPE.UNTYPED),
                extractModifiers(synthetics, ["hp"]),
                perLevelModifiers,
            ].flat();

            const stat = mergeObject(new StatisticModifier("hp", modifiers), attributes.hp, {
                overwrite: false,
            });
            stat.max = stat.totalModifier;
            stat.value = Math.min(stat.value, stat.max);
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            systemData.attributes.hp = stat;
        }

        // Armor Class
        {
            const source = master.system.attributes.ac.modifiers.filter(
                (modifier) => !["status", "circumstance"].includes(modifier.type)
            );
            const base = 10 + new StatisticModifier("base", source).totalModifier;
            const modifiers = extractModifiers(synthetics, ["ac", "dex-based", "all"]);
            const stat = mergeObject(new StatisticModifier("ac", modifiers), systemData.attributes.ac, {
                overwrite: false,
            });
            stat.value = base + stat.totalModifier;
            stat.breakdown = [game.i18n.format("PF2E.MasterArmorClass", { base })]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                )
                .join(", ");
            systemData.attributes.ac = stat;
        }

        // Saving Throws
        this.saves = SAVE_TYPES.reduce((partialSaves, saveType) => {
            const save = master.saves[saveType];
            const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const source = save.modifiers.filter((modifier) => !["status", "circumstance"].includes(modifier.type));
            const totalMod = applyStackingRules(source);
            const selectors = [saveType, `${save.ability}-based`, "saving-throw", "all"];
            const stat = new Statistic(this, {
                slug: saveType,
                label: saveName,
                domains: selectors,
                modifiers: [new ModifierPF2e(`PF2E.MasterSavingThrow.${saveType}`, totalMod, MODIFIER_TYPE.UNTYPED)],
                check: { type: "saving-throw" },
            });

            return { ...partialSaves, [saveType]: stat };
        }, {} as Record<SaveType, Statistic>);

        this.system.saves = SAVE_TYPES.reduce(
            (partial, saveType) => ({ ...partial, [saveType]: this.saves[saveType].getTraceData() }),
            {} as CreatureSaves
        );

        // Senses
        this.system.traits.senses = this.prepareSenses(this.system.traits.senses, synthetics);

        // Attack
        {
            const domains = ["attack", "attack-roll", "all"];
            const modifiers = [
                new ModifierPF2e("PF2E.MasterLevel", masterLevel, MODIFIER_TYPE.UNTYPED),
                ...extractModifiers(synthetics, domains),
            ];
            const stat = mergeObject(new StatisticModifier("attack", modifiers), {
                roll: async (params: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                    const options = new Set(params.options ?? []);
                    const rollTwice = extractRollTwice(this.synthetics.rollTwice, domains, options);

                    const roll = await CheckPF2e.roll(
                        new CheckModifier("Attack Roll", stat),
                        {
                            actor: this,
                            type: "attack-roll",
                            options,
                            rollTwice,
                            dosAdjustments: extractDegreeOfSuccessAdjustments(synthetics, domains),
                        },
                        params.event,
                        params.callback
                    );

                    for (const rule of this.rules.filter((r) => !r.ignored)) {
                        await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions: options });
                    }

                    return roll;
                },
            });
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            systemData.attack = mergeObject(stat, { value: stat.totalModifier });
        }

        // Perception
        {
            const domains = ["perception", "wis-based", "all"];
            const modifiers = [
                new ModifierPF2e("PF2E.MasterLevel", masterLevel, MODIFIER_TYPE.UNTYPED),
                new ModifierPF2e(
                    `PF2E.MasterAbility.${systemData.master.ability}`,
                    masterAbilityModifier,
                    MODIFIER_TYPE.UNTYPED
                ),
                ...extractModifiers(synthetics, domains),
            ];
            const stat = mergeObject(new StatisticModifier("perception", modifiers), systemData.attributes.perception, {
                overwrite: false,
            });
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");

            stat.roll = async (params: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                const label = game.i18n.localize("PF2E.PerceptionCheck");
                const rollOptions = new Set(params.options ?? []);
                const rollTwice = extractRollTwice(this.synthetics.rollTwice, domains, rollOptions);

                const roll = await CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    {
                        actor: this,
                        type: "perception-check",
                        options: rollOptions,
                        dc: params.dc,
                        rollTwice,
                        dosAdjustments: extractDegreeOfSuccessAdjustments(synthetics, domains),
                    },
                    params.event,
                    params.callback
                );

                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                }

                return roll;
            };
            systemData.attributes.perception = stat;
        }

        // Skills
        for (const shortForm of SKILL_ABBREVIATIONS) {
            const longForm = SKILL_DICTIONARY[shortForm];
            const modifiers = [new ModifierPF2e("PF2E.MasterLevel", masterLevel, MODIFIER_TYPE.UNTYPED)];
            if (["acr", "ste"].includes(shortForm)) {
                modifiers.push(
                    new ModifierPF2e(
                        `PF2E.MasterAbility.${systemData.master.ability}`,
                        masterAbilityModifier,
                        MODIFIER_TYPE.UNTYPED
                    )
                );
            }
            const ability = SKILL_EXPANDED[longForm].ability;
            const domains = [longForm, `${ability}-based`, "skill-check", "all"];
            modifiers.push(...extractModifiers(synthetics, domains));

            const label = CONFIG.PF2E.skills[shortForm] ?? longForm;
            const stat = mergeObject(new StatisticModifier(longForm, modifiers), {
                adjustments: extractDegreeOfSuccessAdjustments(synthetics, domains),
                label,
                ability,
                value: 0,
                roll: async (params: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                    const label = game.i18n.format("PF2E.SkillCheckWithName", {
                        skillName: game.i18n.localize(CONFIG.PF2E.skills[shortForm]),
                    });
                    const rollOptions = new Set(params.options ?? []);
                    const rollTwice = extractRollTwice(this.synthetics.rollTwice, domains, rollOptions);

                    const roll = await CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        { actor: this, type: "skill-check", options: rollOptions, dc: params.dc, rollTwice },
                        params.event,
                        params.callback
                    );

                    for (const rule of this.rules.filter((r) => !r.ignored)) {
                        await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                    }

                    return roll;
                },
            });
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            systemData.skills[shortForm] = stat;
        }

        // Call post-data-preparation RuleElement hooks
        for (const rule of this.rules) {
            try {
                rule.afterPrepareData?.();
            } catch (error) {
                // ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onAfterPrepareData on rule element ${rule}.`, error);
            }
        }
    }

    /** Familiars cannot have item bonuses. Nor do they have ability mods nor proficiency (sans master level) */
    private stripInvalidModifiers() {
        const invalidModifierTypes: string[] = [MODIFIER_TYPE.ABILITY, MODIFIER_TYPE.PROFICIENCY, MODIFIER_TYPE.ITEM];
        for (const key of Object.keys(this.synthetics.statisticsModifiers)) {
            this.synthetics.statisticsModifiers[key] = this.synthetics.statisticsModifiers[key]?.filter((modifier) => {
                const resolvedModifier = modifier();
                return resolvedModifier && !invalidModifierTypes.includes(resolvedModifier.type);
            });
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Remove the master's reference to this familiar */
    protected override _onDelete(options: DocumentModificationContext<this>, userId: string): void {
        if (this.master) this.master.familiar = null;
        super._onDelete(options, userId);
    }
}

export interface FamiliarPF2e {
    readonly data: FamiliarData;
}
