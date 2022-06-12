import { SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY, SKILL_EXPANDED } from "@actor/data/values";
import { CreaturePF2e, CharacterPF2e } from "@actor";
import { applyStackingRules, CheckModifier, ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from "@actor/modifiers";
import { CheckPF2e, RollParameters } from "@system/rolls";
import { ItemSourcePF2e } from "@item/data";
import { ActiveEffectPF2e } from "@module/active-effect";
import { ItemPF2e } from "@item";
import { FamiliarData, FamiliarSystemData } from "./data";
import { CreatureSaves, LabeledSpeed } from "@actor/creature/data";
import { ActorSizePF2e } from "@actor/data/size";
import { Statistic } from "@system/statistic";
import { SaveType } from "@actor/data";
import { extractModifiers, extractRollTwice } from "@module/rules/util";
import { CheckRoll } from "@system/check/roll";

export class FamiliarPF2e extends CreaturePF2e {
    /** The familiar's master, if selected */
    get master(): CharacterPF2e | null {
        // The Actors world collection needs to be initialized for data preparation
        if (!game.ready || !this.data.data.master.id) return null;

        const master = game.actors.get(this.data.data.master.id ?? "");
        if (master instanceof CharacterPF2e) {
            master.familiar ??= this;
            return master;
        }

        return null;
    }

    override prepareData({ fromMaster = false } = {}): void {
        super.prepareData();
        if (fromMaster) this.sheet.render(false);
    }

    /** Set base emphemeral data for later updating by derived-data preparation */
    override prepareBaseData() {
        super.prepareBaseData();

        type RawSpeed = { value: string; otherSpeeds: LabeledSpeed[] };
        type PartialSystemData = DeepPartial<FamiliarSystemData> & {
            attributes: { speed: RawSpeed; flanking: {} };
            details: {};
        };

        const systemData: PartialSystemData = this.data.data;
        systemData.details.alignment = { value: "N" };
        systemData.details.level = { value: 0 };
        systemData.details.alliance = this.hasPlayerOwner ? "party" : "opposition";

        systemData.traits = {
            senses: [{ type: "lowLightVision", label: "PF2E.SensesLowLightVision", value: "" }],
            size: new ActorSizePF2e({ value: "tiny" }),
            traits: { value: ["minion"], custom: "" },
        };

        systemData.attributes.flanking.canFlank = false;
        systemData.attributes.perception = {};
        systemData.attributes.speed = {
            value: "25",
            label: game.i18n.localize("PF2E.SpeedTypesLand"),
            otherSpeeds: [],
        };

        systemData.skills = {};

        systemData.saves = {
            fortitude: {},
            reflex: {},
            will: {},
        };
    }

    /** Active effects on a familiar require a master, so wait until embedded documents are prepared */
    override applyActiveEffects(): void {
        return;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const master = this.master;

        const systemData = this.data.data;
        const { attributes, details } = systemData;

        // Apply active effects now that the master (if selected) is ready.
        super.applyActiveEffects();

        // Ensure uniqueness of traits
        systemData.traits.traits.value = [...this.traits].sort();

        // Data preparation ends here unless the familiar has a master
        if (!master) return;

        // The familiar's alliance is the same as its master's
        const level = (details.level.value = master.level);
        this.rollOptions.all[`self:level:${level}`] = true;
        details.alliance = master.data.data.details.alliance;

        const masterLevel =
            game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel" ? 0 : master.level;

        systemData.master.ability ||= "cha";
        const spellcastingAbilityModifier = master.data.data.abilities[systemData.master.ability].mod;

        const { synthetics } = this;
        const { statisticsModifiers } = synthetics;
        const modifierTypes: string[] = [MODIFIER_TYPE.ABILITY, MODIFIER_TYPE.PROFICIENCY, MODIFIER_TYPE.ITEM];
        const filterModifier = (modifier: ModifierPF2e) => !modifierTypes.includes(modifier.type);

        attributes.speed = this.prepareSpeed("land");
        const { otherSpeeds } = attributes.speed;
        for (let idx = 0; idx < otherSpeeds.length; idx++) {
            otherSpeeds[idx] = this.prepareSpeed(otherSpeeds[idx].type);
        }

        // Hit Points
        {
            const perLevelModifiers = extractModifiers(statisticsModifiers, ["hp-per-level"])
                .filter(filterModifier)
                .map((modifier) => {
                    const clone = modifier.clone();
                    clone.modifier *= level;
                    return clone;
                });

            const modifiers = [
                new ModifierPF2e("PF2E.MasterLevelHP", level * 5, MODIFIER_TYPE.UNTYPED),
                extractModifiers(statisticsModifiers, ["hp"]).filter(filterModifier),
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
            const source = master.data.data.attributes.ac.modifiers.filter(
                (modifier) => !["status", "circumstance"].includes(modifier.type)
            );
            const base = 10 + new StatisticModifier("base", source).totalModifier;
            const modifiers = extractModifiers(statisticsModifiers, ["ac", "dex-based", "all"]).filter(filterModifier);
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
            const selectors = save.data.domains ?? [];
            const stat = new Statistic(this, {
                slug: saveType,
                label: saveName,
                domains: selectors,
                modifiers: [
                    new ModifierPF2e(`PF2E.MasterSavingThrow.${saveType}`, totalMod, MODIFIER_TYPE.UNTYPED),
                    ...extractModifiers(statisticsModifiers, selectors).filter(filterModifier),
                ],
                check: {
                    type: "saving-throw",
                },
                dc: {},
            });

            return { ...partialSaves, [saveType]: stat };
        }, {} as Record<SaveType, Statistic>);

        this.data.data.saves = SAVE_TYPES.reduce(
            (partial, saveType) => ({ ...partial, [saveType]: this.saves[saveType].getCompatData() }),
            {} as CreatureSaves
        );

        // Senses
        this.data.data.traits.senses = this.prepareSenses(this.data.data.traits.senses, synthetics);

        // Attack
        {
            const selectors = ["attack", "attack-roll", "all"];
            const modifiers = [
                new ModifierPF2e("PF2E.MasterLevel", masterLevel, MODIFIER_TYPE.UNTYPED),
                ...extractModifiers(statisticsModifiers, selectors),
            ];
            const stat = mergeObject(new StatisticModifier("attack", modifiers), {
                roll: async ({ event, options = [], callback }: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                    const rollTwice = extractRollTwice(this.synthetics.rollTwice, selectors, options);

                    const roll = await CheckPF2e.roll(
                        new CheckModifier("Attack Roll", stat),
                        { actor: this, type: "attack-roll", options, rollTwice },
                        event,
                        callback
                    );

                    for (const rule of this.rules.filter((r) => !r.ignored)) {
                        await rule.afterRoll?.({ roll, selectors, domains: selectors, rollOptions: options });
                    }

                    return roll;
                },
            });
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            systemData.attack = stat;
        }

        // Perception
        {
            const selectors = ["perception", "wis-based", "all"];
            const modifiers = [
                new ModifierPF2e("PF2E.MasterLevel", masterLevel, MODIFIER_TYPE.UNTYPED),
                new ModifierPF2e(
                    `PF2E.MasterAbility.${systemData.master.ability}`,
                    spellcastingAbilityModifier,
                    MODIFIER_TYPE.UNTYPED
                ),
                ...extractModifiers(statisticsModifiers, selectors).filter(filterModifier),
            ];
            const stat = mergeObject(new StatisticModifier("perception", modifiers), systemData.attributes.perception, {
                overwrite: false,
            });
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");

            stat.roll = async (args: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                const label = game.i18n.localize("PF2E.PerceptionCheck");
                const rollOptions = args.options ?? [];
                const rollTwice = extractRollTwice(this.synthetics.rollTwice, selectors, rollOptions);

                const roll = await CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: "perception-check", options: rollOptions, dc: args.dc, rollTwice },
                    args.event,
                    args.callback
                );

                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({ roll, selectors, domains: selectors, rollOptions });
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
                        spellcastingAbilityModifier,
                        MODIFIER_TYPE.UNTYPED
                    )
                );
            }
            const ability = SKILL_EXPANDED[longForm].ability;
            const selectors = [longForm, `${ability}-based`, "skill-check", "all"];
            modifiers.push(...extractModifiers(statisticsModifiers, selectors).filter(filterModifier));

            const label = CONFIG.PF2E.skills[shortForm] ?? longForm;
            const stat = mergeObject(new StatisticModifier(longForm, modifiers), {
                label,
                ability,
                value: 0,
                roll: async (args: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                    const label = game.i18n.format("PF2E.SkillCheckWithName", {
                        skillName: game.i18n.localize(CONFIG.PF2E.skills[shortForm]),
                    });
                    const rollOptions = args.options ?? [];
                    const rollTwice = extractRollTwice(this.synthetics.rollTwice, selectors, rollOptions);

                    const roll = await CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        { actor: this, type: "skill-check", options: rollOptions, dc: args.dc, rollTwice },
                        args.event,
                        args.callback
                    );

                    for (const rule of this.rules.filter((r) => !r.ignored)) {
                        await rule.afterRoll?.({ roll, selectors, domains: selectors, rollOptions });
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

    override async createEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        data: PreCreate<foundry.data.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context: DocumentModificationContext = {}
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]> {
        const createData = Array.isArray(data) ? data : [data];
        for (const datum of data) {
            if (!("type" in datum)) continue;
            if (!["condition", "effect"].includes(datum.type ?? "")) {
                ui.notifications.error(game.i18n.localize("PF2E.FamiliarItemTypeError"));
                return [];
            }
        }

        return super.createEmbeddedDocuments(embeddedName, createData, context);
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

    createEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        data: PreCreate<foundry.data.ActiveEffectSource>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: "Item",
        data: PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ItemPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        data: PreCreate<foundry.data.ActiveEffectSource>[] | Partial<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;
}
