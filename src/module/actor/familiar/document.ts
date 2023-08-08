import { CharacterPF2e, CreaturePF2e } from "@actor";
import { CreatureSaves, CreatureSkills, LabeledSpeed } from "@actor/creature/data.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { createEncounterRollOptions } from "@actor/helpers.ts";
import { ModifierPF2e, ModifierType, applyStackingRules } from "@actor/modifiers.ts";
import { SaveType } from "@actor/types.ts";
import { SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY, SKILL_EXPANDED } from "@actor/values.ts";
import { ItemType } from "@item/data/index.ts";
import { RuleElementPF2e } from "@module/rules/index.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { ArmorStatistic } from "@system/statistic/armor-class.ts";
import { HitPointsStatistic } from "@system/statistic/hit-points.ts";
import { Statistic } from "@system/statistic/index.ts";
import { FamiliarSource, FamiliarSystemData } from "./data.ts";

class FamiliarPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends CreaturePF2e<TParent> {
    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "action"];
    }

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
        systemData.traits = {
            value: ["minion"],
            senses: [{ type: "lowLightVision", label: CONFIG.PF2E.senses.lowLightVision, value: "" }],
            size: new ActorSizePF2e({ value: "tiny" }),
        };

        super.prepareBaseData();

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
        systemData.details.level = { value: master?.level ?? 0 };
        this.rollOptions.all[`self:level:${this.level}`] = true;
        systemData.details.alliance = master?.alliance ?? "party";

        // Set encounter roll options from the master's perspective
        if (master) {
            this.flags.pf2e.rollOptions.all = mergeObject(
                this.flags.pf2e.rollOptions.all,
                createEncounterRollOptions(master)
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

        const { level } = this;

        const masterLevel = game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel" ? 0 : level;
        const masterAbilityModifier = this.masterAbilityModifier!;

        const { synthetics } = this;
        this.stripInvalidModifiers();

        const speeds = (attributes.speed = this.prepareSpeed("land"));
        speeds.otherSpeeds = (["burrow", "climb", "fly", "swim"] as const).flatMap((m) => this.prepareSpeed(m) ?? []);

        // Hit Points
        const hitPoints = new HitPointsStatistic(this, { baseMax: level * 5 });
        this.system.attributes.hp = hitPoints.getTraceData();

        // Armor Class
        if (master) {
            const masterModifiers = master.armorClass.modifiers
                .filter((m) => !["status", "circumstance"].includes(m.type))
                .map((m) => m.clone());
            const statistic = new ArmorStatistic(this);
            statistic.dc.modifiers = masterModifiers; // Prevent evaluation of predicates by `Statistic`
            this.armorClass = statistic.dc;
            systemData.attributes.ac = statistic.getTraceData();
        }

        // Saving Throws
        this.saves = SAVE_TYPES.reduce((partialSaves, saveType) => {
            const save = master?.saves[saveType];
            const source = save?.modifiers.filter((m) => !["status", "circumstance"].includes(m.type)) ?? [];
            const totalMod = applyStackingRules(source);
            const ability = CONFIG.PF2E.savingThrowDefaultAbilities[saveType];
            const selectors = [saveType, `${ability}-based`, "saving-throw", "all"];
            const stat = new Statistic(this, {
                slug: saveType,
                label: game.i18n.localize(CONFIG.PF2E.saves[saveType]),
                domains: selectors,
                modifiers: [new ModifierPF2e(`PF2E.MasterSavingThrow.${saveType}`, totalMod, "untyped")],
                check: { type: "saving-throw" },
            });

            return { ...partialSaves, [saveType]: stat };
        }, {} as Record<SaveType, Statistic>);

        this.system.saves = SAVE_TYPES.reduce(
            (partial, saveType) => ({ ...partial, [saveType]: this.saves[saveType].getTraceData() }),
            {} as CreatureSaves
        );

        // Senses
        traits.senses = this.prepareSenses(this.system.traits.senses, synthetics);

        // Attack
        if (master) {
            systemData.attack = new Statistic(this, {
                slug: "attack-roll",
                label: "PF2E.Familiar.AttackRoll",
                modifiers: [new ModifierPF2e("PF2E.MasterLevel", masterLevel, "untyped")],
                domains: ["attack", "attack-roll"],
                check: { type: "attack-roll", domains: ["attack", "attack-roll"] },
            });
        }

        // Perception
        {
            const domains = ["perception", "wis-based", "all"];
            const modifiers = [
                new ModifierPF2e("PF2E.MasterLevel", masterLevel, "untyped"),
                new ModifierPF2e(`PF2E.MasterAbility.${systemData.master.ability}`, masterAbilityModifier, "untyped"),
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
                this.perception.getTraceData({ value: "mod" })
            );
        }

        // Skills
        this.skills = Array.from(SKILL_ABBREVIATIONS).reduce((builtSkills, shortForm) => {
            const longForm = SKILL_DICTIONARY[shortForm];
            const modifiers = [new ModifierPF2e("PF2E.MasterLevel", masterLevel, "untyped")];
            if (["acr", "ste"].includes(shortForm)) {
                const label = `PF2E.MasterAbility.${systemData.master.ability}`;
                modifiers.push(new ModifierPF2e(label, masterAbilityModifier, "untyped"));
            }

            const ability = SKILL_EXPANDED[longForm].ability;
            const domains = [longForm, `${ability}-based`, "skill-check", "all"];

            const label = CONFIG.PF2E.skills[shortForm] ?? longForm;
            const statistic = new Statistic(this, {
                slug: longForm,
                label,
                ability,
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

    /** Familiars cannot have item bonuses. Nor do they have ability mods nor proficiency (sans master level) */
    private stripInvalidModifiers(): void {
        const invalidModifierTypes: ModifierType[] = ["ability", "proficiency", "item"];
        for (const key of Object.keys(this.synthetics.modifiers)) {
            this.synthetics.modifiers[key] = this.synthetics.modifiers[key]?.filter((modifier) => {
                const resolvedModifier = modifier();
                return resolvedModifier && !invalidModifierTypes.includes(resolvedModifier.type);
            });
        }
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
