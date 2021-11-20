import { SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY, SKILL_EXPANDED } from "@actor/data/values";
import { CharacterPF2e, NPCPF2e } from "@actor/index";
import { CheckModifier, ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from "@module/modifiers";
import { CheckPF2e, RollParameters } from "@system/rolls";
import { CreaturePF2e } from "../creature";
import { ItemSourcePF2e } from "@item/data";
import { ActiveEffectPF2e } from "@module/active-effect";
import { ItemPF2e } from "@item/base";
import { FamiliarData, FamiliarSystemData } from "./data";
import { LabeledSpeed } from "@actor/creature/data";
import { ActorSizePF2e } from "@actor/data/size";

export class FamiliarPF2e extends CreaturePF2e {
    static override get schema(): typeof FamiliarData {
        return FamiliarData;
    }

    /** The familiar's master, if selected */
    get master(): CharacterPF2e | NPCPF2e | null {
        const actor = game.actors?.get(this.data.data.master.id ?? "");
        if (actor instanceof CharacterPF2e || actor instanceof NPCPF2e) {
            return actor;
        }
        return null;
    }

    /** Set base emphemeral data for later updating by derived-data preparation */
    override prepareBaseData() {
        super.prepareBaseData();

        type RawSpeed = { value: string; otherSpeeds: LabeledSpeed[] };
        const systemData: DeepPartial<FamiliarSystemData> & { attributes: { speed: RawSpeed }; details: {} } =
            this.data.data;
        systemData.details.alignment = { value: "N" };
        systemData.details.level = { value: 0 };
        systemData.traits = {
            senses: [{ type: "lowLightVision", label: "PF2E.SensesLowLightVision", value: "" }],
            size: new ActorSizePF2e({ value: "tiny" }),
            traits: { value: ["minion"], custom: "" },
        };

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
        this.data.data.details.level.value = master?.level ?? 0;

        // Apply active effects now that the master (if selected) is ready.
        super.applyActiveEffects();

        const data = this.data.data;
        const rules = this.rules.filter((rule) => !rule.ignored);

        // Ensure uniqueness of traits
        data.traits.traits.value = [...this.traits].sort();

        if (master) {
            data.master.ability ||= "cha";
            const spellcastingAbilityModifier = master.data.data.abilities[data.master.ability].mod;

            const synthetics = this.prepareCustomModifiers(rules);
            const { statisticsModifiers } = synthetics;
            const modifierTypes: string[] = [MODIFIER_TYPE.ABILITY, MODIFIER_TYPE.PROFICIENCY, MODIFIER_TYPE.ITEM];
            const filterModifier = (modifier: ModifierPF2e) => !modifierTypes.includes(modifier.type);

            const { attributes } = data;
            attributes.speed = this.prepareSpeed("land", synthetics);
            const { otherSpeeds } = data.attributes.speed;
            for (let idx = 0; idx < otherSpeeds.length; idx++) {
                otherSpeeds[idx] = this.prepareSpeed(otherSpeeds[idx].type, synthetics);
            }

            // Hit Points
            {
                const perLevelModifiers = statisticsModifiers["hp-per-level"]
                    ?.filter(filterModifier)
                    .map((modifier) => {
                        const clone = modifier.clone();
                        clone.modifier *= this.level;
                        return clone;
                    });

                const modifiers = [
                    new ModifierPF2e("PF2E.MasterLevelHP", this.level * 5, MODIFIER_TYPE.UNTYPED),
                    statisticsModifiers.hp?.filter(filterModifier).map((m) => m.clone()) ?? [],
                    perLevelModifiers ?? [],
                ].flat();

                const stat = mergeObject(new StatisticModifier("hp", modifiers), attributes.hp, {
                    overwrite: false,
                });
                stat.max = stat.totalModifier;
                stat.value = Math.min(stat.value, stat.max);
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    .join(", ");
                data.attributes.hp = stat;
            }

            // Armor Class
            {
                const source = master.data.data.attributes.ac.modifiers.filter(
                    (modifier) => !["status", "circumstance"].includes(modifier.type)
                );
                const base = 10 + new StatisticModifier("base", source).totalModifier;
                const modifiers: ModifierPF2e[] = [];
                ["ac", "dex-based", "all"].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filterModifier)
                        .map((m) => m.clone())
                        .forEach((m) => modifiers.push(m))
                );
                const stat = mergeObject(new StatisticModifier("ac", modifiers), data.attributes.ac, {
                    overwrite: false,
                });
                stat.value = base + stat.totalModifier;
                stat.breakdown = [game.i18n.format("PF2E.MasterArmorClass", { base })]
                    .concat(
                        stat.modifiers
                            .filter((m) => m.enabled)
                            .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    )
                    .join(", ");
                data.attributes.ac = stat;
            }

            // Saving Throws
            for (const saveName of SAVE_TYPES) {
                const save = master.data.data.saves[saveName];
                const source = save.modifiers.filter(
                    (modifier: ModifierPF2e) => !["status", "circumstance"].includes(modifier.type)
                );
                const modifiers = [
                    new ModifierPF2e(
                        `PF2E.MasterSavingThrow.${saveName}`,
                        new StatisticModifier("base", source).totalModifier,
                        MODIFIER_TYPE.UNTYPED
                    ),
                ];
                const ability = save.ability;
                [save.name, `${ability}-based`, "saving-throw", "all"].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filterModifier)
                        .map((m) => m.clone())
                        .forEach((m) => modifiers.push(m))
                );
                const stat = mergeObject(new StatisticModifier(CONFIG.PF2E.saves[saveName], modifiers), {
                    roll: (args: RollParameters) => {
                        const label = game.i18n.format("PF2E.SavingThrowWithName", {
                            saveName: game.i18n.localize(CONFIG.PF2E.saves[saveName]),
                        });
                        CheckPF2e.roll(
                            new CheckModifier(label, stat),
                            { actor: this, type: "saving-throw", dc: args.dc, options: args.options },
                            args.event,
                            args.callback
                        );
                    },
                    value: 0,
                });
                stat.value = stat.totalModifier;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    .join(", ");
                data.saves[saveName] = stat;
            }

            // Senses
            this.data.data.traits.senses = this.prepareSenses(this.data.data.traits.senses, synthetics);

            // Attack
            {
                const modifiers = [
                    new ModifierPF2e("PF2E.MasterLevel", data.details.level.value, MODIFIER_TYPE.UNTYPED),
                ];
                ["attack", "mundane-attack", "attack-roll", "all"].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filterModifier)
                        .map((m) => m.clone())
                        .forEach((m) => modifiers.push(m))
                );
                const stat = mergeObject(new StatisticModifier("attack", modifiers), {
                    roll: ({ event, options = [], callback }: RollParameters) => {
                        CheckPF2e.roll(
                            new CheckModifier("Attack Roll", stat),
                            { actor: this, type: "attack-roll", options },
                            event,
                            callback
                        );
                    },
                });
                stat.value = stat.totalModifier;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    .join(", ");
                data.attack = stat;
            }

            // Perception
            {
                const modifiers = [
                    new ModifierPF2e("PF2E.MasterLevel", data.details.level.value, MODIFIER_TYPE.UNTYPED),
                    new ModifierPF2e(
                        `PF2E.MasterAbility.${data.master.ability}`,
                        spellcastingAbilityModifier,
                        MODIFIER_TYPE.UNTYPED
                    ),
                ];
                ["perception", "wis-based", "all"].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filterModifier)
                        .map((m) => m.clone())
                        .forEach((m) => modifiers.push(m))
                );
                const stat = mergeObject(new StatisticModifier("perception", modifiers), data.attributes.perception, {
                    overwrite: false,
                });
                stat.value = stat.totalModifier;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    .join(", ");
                stat.roll = (args: RollParameters) => {
                    const label = game.i18n.localize("PF2E.PerceptionCheck");
                    CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        { actor: this, type: "perception-check", options: args.options ?? [], dc: args.dc },
                        args.event,
                        args.callback
                    );
                };
                data.attributes.perception = stat;
            }

            // skills
            for (const shortForm of SKILL_ABBREVIATIONS) {
                const longForm = SKILL_DICTIONARY[shortForm];
                const modifiers = [
                    new ModifierPF2e("PF2E.MasterLevel", data.details.level.value, MODIFIER_TYPE.UNTYPED),
                ];
                if (["acr", "ste"].includes(shortForm)) {
                    modifiers.push(
                        new ModifierPF2e(
                            `PF2E.MasterAbility.${data.master.ability}`,
                            spellcastingAbilityModifier,
                            MODIFIER_TYPE.UNTYPED
                        )
                    );
                }
                const ability = SKILL_EXPANDED[longForm].ability;
                [longForm, `${ability}-based`, "skill-check", "all"].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filterModifier)
                        .map((m) => m.clone())
                        .forEach((m) => modifiers.push(m))
                );
                const label = CONFIG.PF2E.skills[shortForm] ?? longForm;
                const stat = mergeObject(new StatisticModifier(label, modifiers), {
                    ability,
                    value: 0,
                    roll: (args: RollParameters) => {
                        const label = game.i18n.format("PF2E.SkillCheckWithName", {
                            skillName: game.i18n.localize(CONFIG.PF2E.skills[shortForm]),
                        });
                        CheckPF2e.roll(
                            new CheckModifier(label, stat),
                            { actor: this, type: "skill-check", options: args.options ?? [], dc: args.dc },
                            args.event,
                            args.callback
                        );
                    },
                });
                stat.value = stat.totalModifier;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    .join(", ");
                data.skills[shortForm] = stat;
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
