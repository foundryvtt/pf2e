import { CharacterPF2e } from "@actor";
import { CharacterStrike } from "@actor/character/data.ts";
import { CharacterSkill } from "@actor/character/types.ts";
import { SENSE_ACUITIES, SENSE_TYPES } from "@actor/creature/sense.ts";
import { ActorType } from "@actor/data/index.ts";
import { ActorInitiative } from "@actor/initiative.ts";
import { DiceModifierPF2e, ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { MOVEMENT_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY } from "@actor/values.ts";
import { WeaponPF2e } from "@item";
import { RollNotePF2e } from "@module/notes.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { ErrorPF2e, isObject, setHasElement, sluggify, tupleHasValue } from "@util";
import { CreatureSizeRuleElement } from "../creature-size.ts";
import { ResolvableValueField, RuleElementSource } from "../data.ts";
import { RuleElementOptions, RuleElementPF2e } from "../index.ts";
import { ImmunityRuleElement } from "../iwr/immunity.ts";
import { ResistanceRuleElement } from "../iwr/resistance.ts";
import { WeaknessRuleElement } from "../iwr/weakness.ts";
import { SenseRuleElement } from "../sense.ts";
import { StrikeRuleElement } from "../strike.ts";
import { TempHPRuleElement } from "../temp-hp.ts";
import { BattleFormSource, BattleFormStrike, BattleFormStrikeQuery } from "./types.ts";
import { BattleFormRuleOverrideSchema, BattleFormRuleSchema } from "./schema.ts";
import { RecordField } from "@system/schema-data-fields.ts";

class BattleFormRuleElement extends RuleElementPF2e<BattleFormRuleSchema> {
    /** The label given to modifiers of AC, skills, and strikes */
    modifierLabel: string;

    protected static override validActorTypes: ActorType[] = ["character"];

    static override defineSchema(): BattleFormRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: false, initial: undefined }),
            overrides: new fields.SchemaField(
                {
                    traits: new fields.ArrayField(new fields.StringField()),
                    armorClass: new fields.SchemaField(
                        {
                            modifier: new ResolvableValueField({
                                required: false,
                                nullable: false,
                                initial: 0,
                            }),
                            ignoreCheckPenalty: new fields.BooleanField({
                                required: false,
                                nullable: false,
                                initial: true,
                            }),
                            ignoreSpeedPenalty: new fields.BooleanField({
                                required: false,
                                nullable: false,
                                initial: true,
                            }),
                        },
                        { required: false, initial: undefined }
                    ),
                    tempHP: new ResolvableValueField({ required: false, nullable: true, initial: null }),
                    senses: new RecordField(
                        new fields.StringField({ required: true, blank: false, choices: [...SENSE_TYPES] }),
                        new fields.SchemaField({
                            acuity: new fields.StringField({
                                choices: SENSE_ACUITIES,
                                required: false,
                                blank: false,
                                initial: undefined,
                            }),
                            range: new fields.NumberField({ required: false, nullable: true, initial: undefined }),
                        }),
                        { required: false, initial: undefined }
                    ),
                    size: new fields.StringField({ required: false, blank: false, initial: undefined }),
                    speeds: new fields.ObjectField({ required: false, initial: undefined }),
                    skills: new fields.ObjectField({ required: false, initial: undefined }),
                    strikes: new fields.ObjectField({ required: false }),
                    immunities: new fields.ArrayField(new fields.ObjectField()),
                    weaknesses: new fields.ArrayField(new fields.ObjectField()),
                    resistances: new fields.ArrayField(new fields.ObjectField()),
                },
                { required: true, nullable: false }
            ),
            ownUnarmed: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            canCast: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            canSpeak: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            hasHands: new fields.BooleanField({ required: false, nullable: false, initial: false }),
        };
    }

    constructor(data: BattleFormSource, options: RuleElementOptions) {
        super(data, options);

        this.overrides = this.resolveValue(
            this.value,
            this.overrides
        ) as ModelPropsFromSchema<BattleFormRuleOverrideSchema>;

        this.modifierLabel = this.getReducedLabel();
    }

    static defaultIcons: Record<string, ImageFilePath | undefined> = [
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
        "spikes",
        "stinger",
        "tail",
        "talon",
        "tendril",
        "tentacle",
        "tongue",
        "trunk",
        "tusk",
        "vine",
        "water-spout",
        "wave",
        "wing",
    ].reduce((accumulated: Record<string, ImageFilePath | undefined>, strike) => {
        const path = `systems/pf2e/icons/unarmed-attacks/${strike}.webp` as const;
        return { ...accumulated, [strike]: path };
    }, {});

    override async preCreate({ itemSource, ruleSource }: RuleElementPF2e.PreCreateParams): Promise<void> {
        if (!this.test()) {
            ruleSource.ignored = true;
            return;
        }

        // Pre-clear other rule elements on this item as being compatible with the battle form
        const rules = (itemSource.system?.rules ?? []) as RuleElementSource[];
        for (const rule of rules) {
            if (["DamageDice", "FlatModifier", "Note"].includes(String(rule.key))) {
                const predicate = (rule.predicate ??= []);
                if (Array.isArray(predicate)) predicate.push("battle-form");
            }
        }

        // Look for strikes that are compendium weapon queries and construct using retrieved weapon
        await this.resolveStrikeQueries(ruleSource);
    }

    /** Set temporary hit points */
    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;

        const tempHP = this.overrides.tempHP;
        if (tempHP) {
            new TempHPRuleElement({ key: "TempHP", label: this.label, value: tempHP }, { parent: this.item }).onCreate(
                actorUpdates
            );
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const { actor } = this;
        const { attributes } = actor;
        if (attributes.polymorphed) {
            actor.synthetics.preparationWarnings.add("PF2e System | You are already under a polymorph effect");
            this.ignored = true;
            return;
        }
        attributes.polymorphed = true;
        attributes.battleForm = true;

        this.#setRollOptions();
        this.#prepareSenses();

        for (const trait of this.overrides.traits) {
            const currentTraits = actor.system.traits;
            if (!currentTraits.value.includes(trait)) currentTraits.value.push(trait);
        }

        if (this.overrides.armorClass?.ignoreSpeedPenalty) {
            const speedRollOptions = (actor.rollOptions.speed ??= {});
            speedRollOptions["armor:ignore-speed-penalty"] = true;
        }
    }

    override afterPrepareData(): void {
        if (this.ignored) return;

        this.#prepareAC();
        this.#prepareSize();
        this.#prepareSkills();
        this.#prepareSpeeds();
        this.#prepareStrikes();
        this.#prepareIWR();

        // Initiative is built from skills/perception, so re-initialize just in case
        this.actor.initiative = new ActorInitiative(this.actor);
        this.actor.system.attributes.initiative = this.actor.initiative.getTraceData();
    }

    /** Remove temporary hit points */
    override onDelete(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;

        const tempHP = this.overrides.tempHP;
        if (tempHP) {
            new TempHPRuleElement({ key: "TempHP", label: this.label, value: tempHP }, { parent: this.item }).onDelete(
                actorUpdates
            );
        }
    }

    #setRollOptions(): void {
        const { attributes, rollOptions } = this.actor;
        rollOptions.all["polymorph"] = true;
        rollOptions.all["battle-form"] = true;
        if (this.overrides.armorClass) {
            rollOptions.all["armor:ignore-check-penalty"] = this.overrides.armorClass.ignoreCheckPenalty;
            rollOptions.all["armor:ignore-speed-penalty"] = this.overrides.armorClass.ignoreSpeedPenalty;
            if (this.overrides.armorClass.ignoreSpeedPenalty) {
                const speedRollOptions = (rollOptions.speed ??= {});
                speedRollOptions["armor:ignore-speed-penalty"] = true;
            }
        }

        if (this.overrides.skills) {
            // Inform predicates that this battle form grants a skill modifier
            for (const key of SKILL_ABBREVIATIONS) {
                if (!(key in this.overrides.skills)) continue;
                const longForm = SKILL_DICTIONARY[key];
                rollOptions.all[`battle-form:${longForm}`] = true;
            }
        }

        // Reestablish hands free
        attributes.handsFree = Math.max(
            Object.values(this.overrides.strikes ?? {}).reduce(
                (count, s) => (s.category === "unarmed" ? count : count - 1),
                2
            ),
            0
        );

        for (const num of [0, 1, 2]) {
            if (attributes.handsFree === num) {
                rollOptions.all[`hands-free:${num}`] = true;
            } else {
                delete rollOptions.all[`hands-free:${num}`];
            }
        }
    }

    /** Override the character's AC and ignore speed penalties if necessary */
    #prepareAC(): void {
        const overrides = this.overrides;
        const { actor } = this;
        const { armorClass } = actor;
        const acOverride = Number(this.resolveValue(overrides.armorClass?.modifier, armorClass.value)) || 0;
        if (!acOverride) return;

        this.#suppressModifiers(armorClass);
        const newModifier = (Number(this.resolveValue(overrides.armorClass?.modifier)) || 0) - 10;
        armorClass.modifiers.push(new ModifierPF2e(this.modifierLabel, newModifier, "untyped"));
        this.actor.system.attributes.ac = armorClass.parent.getTraceData();
    }

    /** Add new senses the character doesn't already have */
    #prepareSenses(): void {
        for (const senseType of SENSE_TYPES) {
            const newSense = this.overrides.senses?.[senseType];
            if (!newSense) continue;
            newSense.acuity ??= "precise";
            const ruleData = { key: "Sense", selector: senseType, force: true, ...newSense };
            new SenseRuleElement(ruleData, { parent: this.item }).beforePrepareData();
        }
    }

    /** Adjust the character's size category */
    #prepareSize(): void {
        if (!this.overrides.size) return;
        const ruleData = { key: "CreatureSize", label: this.label, value: this.overrides.size };
        new CreatureSizeRuleElement(ruleData, { parent: this.item }).beforePrepareData();
    }

    /** Add, replace and/or adjust non-land speeds */
    #prepareSpeeds(): void {
        const { attributes } = this.actor;
        const currentSpeeds = attributes.speed;

        for (const movementType of MOVEMENT_TYPES) {
            const speedOverride = this.overrides.speeds?.[movementType];
            if (typeof speedOverride !== "number") continue;

            if (movementType === "land") {
                this.#suppressModifiers(attributes.speed);
                attributes.speed.value = speedOverride;
            } else {
                const { otherSpeeds } = currentSpeeds;
                const label = game.i18n.localize(CONFIG.PF2E.speedTypes[movementType]);
                otherSpeeds.findSplice((s) => s.type === movementType);
                otherSpeeds.push({ type: movementType, label, value: speedOverride });
                const newSpeed = this.actor.prepareSpeed(movementType);
                if (!newSpeed) throw ErrorPF2e("Unexpected failure retrieving movement type");
                this.#suppressModifiers(newSpeed);

                otherSpeeds.findSplice((s) => s.type === movementType);
                otherSpeeds.push(newSpeed);
            }
        }
    }

    #prepareSkills(): void {
        for (const [skillShort, newSkill] of Object.entries(this.overrides.skills ?? {})) {
            if (!setHasElement(SKILL_ABBREVIATIONS, skillShort)) {
                return this.failValidation(`Unrecognized skill abbreviation: ${skillShort}`);
            }
            newSkill.ownIfHigher ??= true;

            const key = SKILL_DICTIONARY[skillShort];
            const currentSkill = this.actor.skills[key];
            const newModifier = Number(this.resolveValue(newSkill.modifier)) || 0;
            if (currentSkill.mod > newModifier && newSkill.ownIfHigher) {
                continue;
            }

            const baseMod = new ModifierPF2e({
                label: this.modifierLabel,
                slug: "battle-form",
                modifier: newModifier,
                type: "untyped",
            });

            this.actor.skills[key] = currentSkill.extend({
                modifiers: [baseMod],
                filter: this.#filterModifier,
            }) as CharacterSkill;
            this.actor.system.skills[skillShort] = mergeObject(
                this.actor.system.skills[skillShort],
                this.actor.skills[key].getTraceData()
            );
        }
    }

    /** Clear out existing strikes and replace them with the form's stipulated ones, if any */
    #prepareStrikes(): void {
        const { synthetics } = this.actor;
        const strikes = this.overrides.strikes ?? {};

        const ruleData = Object.entries(strikes).map(([slug, strikeData]) => ({
            key: "Strike",
            label:
                game.i18n.localize(strikeData.label) ??
                `PF2E.BattleForm.Attack.${sluggify(slug, { camel: "bactrian" })}`,
            slug,
            img: strikeData.img ?? BattleFormRuleElement.defaultIcons[slug] ?? this.item.img,
            category: strikeData.category,
            group: strikeData.group,
            baseItem: strikeData.baseType,
            options: [slug],
            damage: { base: strikeData.damage },
            range: strikeData.range,
            maxRange: strikeData.maxRange,
            traits: strikeData.traits,
            ability: strikeData.ability,
            ownIfHigher: (strikeData.ownIfHigher ??= true),
        }));

        // Repopulate strikes with new WeaponPF2e instances--unless ownUnarmed is true
        if (this.ownUnarmed) {
            for (const [slug, weapon] of synthetics.strikes.entries()) {
                if (weapon.category !== "unarmed") synthetics.strikes.delete(slug);
            }
            this.actor.rollOptions.all["battle-form:own-attack-modifier"] = true;
        } else {
            synthetics.strikes.clear();
            for (const striking of Object.values(synthetics.striking).flat()) {
                const predicate = (striking.predicate ??= new PredicatePF2e());
                predicate.push({ not: "battle-form" });
            }

            for (const datum of ruleData) {
                if (!datum.traits.includes("magical")) datum.traits.push("magical");
                new StrikeRuleElement({ ...datum, battleForm: true }, { parent: this.item }).beforePrepareData();
            }
        }

        this.actor.system.actions = this.actor
            .prepareStrikes({
                includeBasicUnarmed: this.ownUnarmed,
            })
            .filter((a) => (a.slug && a.slug in strikes) || (this.ownUnarmed && a.item.category === "unarmed"));
        const strikeActions = this.actor.system.actions.flatMap((s): CharacterStrike[] => [s, ...s.altUsages]);

        for (const action of strikeActions) {
            const strike = (strikes[action.slug ?? ""] ?? null) as BattleFormStrike | null;

            if (
                !this.ownUnarmed &&
                strike &&
                (Number(this.resolveValue(strike.modifier)) >= action.totalModifier || !strike.ownIfHigher)
            ) {
                // The battle form's static attack-roll modifier is >= the character's unarmed attack modifier:
                // replace inapplicable attack-roll modifiers with the battle form's
                this.#suppressModifiers(action);
                this.#suppressNotes(
                    Object.entries(synthetics.rollNotes).flatMap(([key, note]) => (/\bdamage\b/.test(key) ? note : []))
                );
                const baseModifier = Number(this.resolveValue(strike.modifier)) || 0;
                action.unshift(new ModifierPF2e(this.modifierLabel, baseModifier, "untyped"));
            } else {
                const options = (this.actor.rollOptions["strike-attack-roll"] ??= {});
                options["battle-form:own-attack-modifier"] = true;
                action.calculateTotal(new Set(this.actor.getRollOptions(action.domains)));
            }
        }
    }

    /** Immunity, weakness, and resistance */
    #prepareIWR(): void {
        for (const immunity of this.overrides.immunities) {
            new ImmunityRuleElement({ key: "Immunity", ...immunity }, { parent: this.item }).afterPrepareData();
        }
        for (const weakness of this.overrides.weaknesses) {
            new WeaknessRuleElement(
                { key: "Weakness", ...weakness, override: true },
                { parent: this.item }
            ).afterPrepareData();
        }
        for (const resistance of this.overrides.resistances) {
            new ResistanceRuleElement(
                { key: "Resistance", ...resistance, override: true },
                { parent: this.item }
            ).afterPrepareData();
        }
    }

    /** Disable ineligible check modifiers */
    #suppressModifiers(statistic: { modifiers: readonly ModifierPF2e[] }): void {
        for (const modifier of statistic.modifiers) {
            if (!this.#filterModifier(modifier)) {
                modifier.adjustments.push({ slug: null, predicate: new PredicatePF2e(), suppress: true });
                modifier.ignored = true;
                modifier.enabled = false;
            }
        }
        if (statistic instanceof StatisticModifier) {
            statistic.calculateTotal();
        }
    }

    #filterModifier(modifier: ModifierPF2e) {
        if (modifier.slug === "battle-form") return true;
        if (modifier.type === "ability") return false;
        return ["status", "circumstance"].includes(modifier.type) || modifier.modifier < 0;
    }

    #suppressNotes(notes: RollNotePF2e[]): void {
        for (const note of notes) {
            if (!note.predicate.includes("battle-form")) {
                note.predicate =
                    note.predicate instanceof PredicatePF2e ? note.predicate : new PredicatePF2e(note.predicate);
                note.predicate.push({ not: "battle-form" });
            }
        }
    }

    /** Disable ineligible damage adjustments (modifiers, bonuses, additional damage) */
    override applyDamageExclusion(weapon: WeaponPF2e, modifiers: (DiceModifierPF2e | ModifierPF2e)[]): void {
        if (this.ownUnarmed) return;

        for (const modifier of modifiers) {
            if (modifier.predicate.some((s) => s instanceof Object && "not" in s && s.not === "battle-form")) {
                continue;
            }

            const isNumericBonus = modifier instanceof ModifierPF2e && modifier.modifier >= 0;
            const isAbilityModifier = modifier instanceof ModifierPF2e && modifier.type === "ability";
            const isExtraDice = modifier instanceof DiceModifierPF2e;
            const isStatusOrCircumstance = isNumericBonus && ["status", "circumstance"].includes(modifier.type);
            const isDamageTrait =
                isExtraDice &&
                /^(?:deadly|fatal)-\d?d\d{1,2}$/.test(modifier.slug) &&
                tupleHasValue(this.overrides?.strikes?.[weapon.slug ?? ""]?.traits ?? [], modifier.slug);
            const isBattleFormModifier = !!(
                modifier.predicate.includes("battle-form") ||
                modifier.predicate.some((s) => s instanceof Object && "or" in s && s.or.includes("battle-form")) ||
                isDamageTrait
            );

            if (
                (isNumericBonus || isAbilityModifier || isExtraDice) &&
                !isStatusOrCircumstance &&
                !isBattleFormModifier
            ) {
                modifier.enabled = false;
                modifier.ignored = true;
                modifier.predicate.push({ not: "battle-form" });
            }
        }
    }

    /** Process compendium query and construct full strike object using retrieved weapon */
    private async resolveStrikeQueries(ruleSource: RuleElementSource & { overrides?: unknown }): Promise<void> {
        const value = ruleSource.overrides ? ruleSource.overrides : (ruleSource.value ??= {});
        const hasStrikes = (v: unknown): v is ValueWithStrikes =>
            isObject<{ strikes: unknown }>(v) && isObject<Record<string, unknown>>(v.strikes);

        if (!hasStrikes(value)) return;

        const isStrikeQuery = (maybeQuery: unknown): maybeQuery is BattleFormStrikeQuery => {
            if (!isObject<BattleFormStrikeQuery>(maybeQuery)) return false;
            return typeof maybeQuery.query === "string" && typeof maybeQuery.modifier === "number";
        };

        for (const [slug, strike] of Object.entries(value.strikes)) {
            if (!isStrikeQuery(strike)) continue;

            strike.pack = String(strike.pack ?? "pf2e.equipment-srd");
            strike.ownIfHigher = !!(strike.ownIfHigher ?? true);

            const queryObject = ((): Record<string, unknown> | null => {
                try {
                    const parsed = JSON.parse(String(this.resolveInjectedProperties(strike.query)));
                    if (!isObject<Record<string, unknown>>(parsed) || Array.isArray(parsed)) {
                        throw Error("A strike query must be an NeDB query object");
                    }
                    return parsed;
                } catch (error) {
                    if (error instanceof Error) {
                        this.failValidation(error.message);
                    }
                    ruleSource.ignored = true;
                    return null;
                }
            })();
            if (!queryObject) {
                this.failValidation("Malformed query object");
                break;
            }

            const weapon = (await game.packs.get(strike.pack)?.getDocuments(queryObject))?.[0];
            if (!(weapon instanceof WeaponPF2e)) {
                this.failValidation("Failed to retrieve queried weapon");
                break;
            }

            const resolved: BattleFormStrike = {
                label: weapon.name,
                img: weapon.img,
                ability: weapon.isRanged || weapon.traits.has("finesse") ? "dex" : "str",
                category: weapon.category,
                group: weapon.group,
                baseType: weapon.baseType,
                traits: deepClone(weapon.system.traits.value),
                modifier: strike.modifier,
                damage: deepClone(weapon.system.damage),
                ownIfHigher: strike.ownIfHigher,
            };

            value.strikes[slug] = resolved;
        }
    }
}

interface BattleFormRuleElement
    extends RuleElementPF2e<BattleFormRuleSchema>,
        ModelPropsFromSchema<BattleFormRuleSchema> {
    get actor(): CharacterPF2e;
}

interface ValueWithStrikes {
    strikes: Record<string, unknown>;
}

export { BattleFormRuleElement };
