import { CreaturePF2e, type CharacterPF2e } from "@actor";
import { CreatureSaves, CreatureSkills, LabeledSpeed } from "@actor/creature/data.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { createEncounterRollOptions, setHitPointsRollOptions } from "@actor/helpers.ts";
import { ModifierPF2e, applyStackingRules } from "@actor/modifiers.ts";
import { SaveType } from "@actor/types.ts";
import { SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY, SKILL_EXPANDED } from "@actor/values.ts";
import { ItemType } from "@item/base/data/index.ts";
import type { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";
import type { RuleElementPF2e } from "@module/rules/index.ts";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { ArmorStatistic, HitPointsStatistic, Statistic } from "@system/statistic/index.ts";
import * as R from "remeda";
import { FamiliarSource, FamiliarSystemData } from "./data.ts";

class FamiliarPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends CreaturePF2e<TParent> {
    /** The familiar's attack statistic, for the rare occasion it must make an attack roll */
    declare attackStatistic: Statistic;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "action"];
    }

    /** The familiar's master, if selected */
    get master(): CharacterPF2e | null {
        // The Actors world collection needs to be initialized for data preparation
        if (!game.ready || !this.system.master.id) return null;

        const master = game.actors.get(this.system.master.id ?? "");
        if (master?.isOfType("character")) {
            master.familiar ??= this;
            return master;
        }

        return null;
    }

    get masterAttributeModifier(): number {
        this.system.master.ability ||= "cha";
        return this.master?.system.abilities[this.system.master.ability].mod ?? 0;
    }

    /** @deprecated for internal use but not rule elements referencing it until a migration is in place. */
    get masterAbilityModifier(): number {
        return this.masterAttributeModifier;
    }

    override get combatant(): CombatantPF2e<EncounterPF2e> | null {
        return this.master?.combatant ?? null;
    }

    /** Re-render the sheet if data preparation is called from the familiar's master */
    override reset({ fromMaster = false } = {}): void {
        super.reset();
        if (fromMaster) this.sheet.render();
    }

    /** Set base emphemeral data for later updating by derived-data preparation */
    override prepareBaseData(): void {
        type PartialSystemData = DeepPartial<FamiliarSystemData> & {
            attributes: { speed: RawSpeed; flanking: {} };
            details: {};
        };
        const systemData: PartialSystemData = this.system;
        systemData.details.level = { value: 0 };
        systemData.traits = {
            value: ["minion"],
            senses: [{ type: "lowLightVision", label: CONFIG.PF2E.senses.lowLightVision, value: "" }],
            size: new ActorSizePF2e({ value: "tiny" }),
        };

        super.prepareBaseData();

        // A familiar "[...] can never benefit from item bonuses." (CRB pg 217)
        const isItemBonus = new PredicatePF2e(["bonus:type:item"]);
        this.synthetics.modifierAdjustments.all.push({
            slug: null,
            test: (options) => isItemBonus.test(options),
            suppress: true,
        });

        type RawSpeed = { value: number; otherSpeeds: LabeledSpeed[] };

        systemData.details.alignment = { value: "N" };

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

        const { master } = this;
        systemData.details.level.value = master?.level ?? 0;
        this.rollOptions.all[`self:level:${this.level}`] = true;
        systemData.details.alliance = master?.alliance ?? "party";

        // Set encounter roll options from the master's perspective
        if (master) {
            this.flags.pf2e.rollOptions.all = mergeObject(
                this.flags.pf2e.rollOptions.all,
                createEncounterRollOptions(master),
            );
        }
    }

    /** Skip rule-element preparation if there is no master */
    protected override prepareRuleElements(): RuleElementPF2e[] {
        return this.master ? super.prepareRuleElements() : [];
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const { master } = this;
        const systemData = this.system;
        const { attributes, traits } = systemData;

        // Ensure uniqueness of traits
        traits.value = [...this.traits].sort();

        const { level, masterAttributeModifier } = this;

        const masterLevel = game.settings.get("pf2e", "proficiencyVariant") ? 0 : level;

        const { synthetics } = this;
        const speeds = (attributes.speed = this.prepareSpeed("land"));
        speeds.otherSpeeds = (["burrow", "climb", "fly", "swim"] as const).flatMap((m) => this.prepareSpeed(m) ?? []);

        // Hit Points
        const hitPoints = new HitPointsStatistic(this, { baseMax: level * 5 });
        this.system.attributes.hp = hitPoints.getTraceData();
        setHitPointsRollOptions(this);

        // Armor Class
        const masterModifier = master
            ? new ModifierPF2e({
                  label: "PF2E.Actor.Familiar.Master.ArmorClass",
                  slug: "base",
                  modifier: master.armorClass.modifiers
                      .filter((m) => m.enabled && !["status", "circumstance"].includes(m.type))
                      .reduce((total, modifier) => total + modifier.value, 0),
              })
            : null;

        const statistic = new ArmorStatistic(this, { modifiers: R.compact([masterModifier]) });
        this.armorClass = statistic.dc;
        systemData.attributes.ac = statistic.getTraceData();

        // Saving Throws
        this.saves = SAVE_TYPES.reduce(
            (partialSaves, saveType) => {
                const save = master?.saves[saveType];
                const source = save?.modifiers.filter((m) => !["status", "circumstance"].includes(m.type)) ?? [];
                const totalMod = applyStackingRules(source);
                const attribute = CONFIG.PF2E.savingThrowDefaultAttributes[saveType];
                const selectors = [saveType, `${attribute}-based`, "saving-throw", "all"];
                const stat = new Statistic(this, {
                    slug: saveType,
                    label: game.i18n.localize(CONFIG.PF2E.saves[saveType]),
                    domains: selectors,
                    modifiers: [new ModifierPF2e(`PF2E.MasterSavingThrow.${saveType}`, totalMod, "untyped")],
                    check: { type: "saving-throw" },
                });

                return { ...partialSaves, [saveType]: stat };
            },
            {} as Record<SaveType, Statistic>,
        );

        this.system.saves = SAVE_TYPES.reduce(
            (partial, saveType) => ({ ...partial, [saveType]: this.saves[saveType].getTraceData() }),
            {} as CreatureSaves,
        );

        // Senses
        traits.senses = this.prepareSenses(this.system.traits.senses, synthetics);

        // Attack
        this.attackStatistic = new Statistic(this, {
            slug: "attack-roll",
            label: "PF2E.Familiar.AttackRoll",
            modifiers: [new ModifierPF2e("PF2E.MasterLevel", masterLevel, "untyped")],
            check: { type: "attack-roll" },
        });

        this.system.attack = this.attackStatistic.getTraceData();

        // Perception
        {
            const domains = ["perception", "wis-based", "all"];
            const modifiers = [
                new ModifierPF2e("PF2E.MasterLevel", masterLevel, "untyped"),
                new ModifierPF2e(`PF2E.MasterAbility.${systemData.master.ability}`, masterAttributeModifier, "untyped"),
            ];
            this.perception = new Statistic(this, {
                slug: "perception",
                label: "PF2E.PerceptionLabel",
                domains,
                modifiers,
                check: { type: "perception-check" },
            });
            systemData.attributes.perception = mergeObject(
                systemData.attributes.perception,
                this.perception.getTraceData({ value: "mod" }),
            );
        }

        // Skills
        this.skills = Array.from(SKILL_ABBREVIATIONS).reduce((builtSkills, shortForm) => {
            const longForm = SKILL_DICTIONARY[shortForm];
            const modifiers = [new ModifierPF2e("PF2E.MasterLevel", masterLevel, "untyped")];
            if (["acr", "ste"].includes(shortForm)) {
                const label = `PF2E.MasterAbility.${systemData.master.ability}`;
                modifiers.push(new ModifierPF2e(label, masterAttributeModifier, "untyped"));
            }

            const attribute = SKILL_EXPANDED[longForm].attribute;
            const domains = [longForm, `${attribute}-based`, "skill-check", "all"];

            const label = CONFIG.PF2E.skills[shortForm] ?? longForm;
            const statistic = new Statistic(this, {
                slug: longForm,
                label,
                attribute,
                domains,
                modifiers,
                lore: false,
                check: { type: "skill-check" },
            });

            builtSkills[longForm] = statistic;
            this.system.skills[shortForm] = statistic.getTraceData();

            return builtSkills;
        }, {} as CreatureSkills);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Remove the master's reference to this familiar */
    protected override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        if (this.master) this.master.familiar = null;
        super._onDelete(options, userId);
    }
}

interface FamiliarPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null>
    extends CreaturePF2e<TParent> {
    readonly _source: FamiliarSource;
    system: FamiliarSystemData;
}

export { FamiliarPF2e };
