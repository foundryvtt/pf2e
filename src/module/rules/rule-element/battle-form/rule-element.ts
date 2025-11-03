import type { ActorType, CharacterPF2e } from "@actor";
import { CharacterAttack } from "@actor/character/data.ts";
import { SENSE_TYPES } from "@actor/creature/values.ts";
import { ActorInitiative } from "@actor/initiative.ts";
import { DamageDicePF2e, Modifier, StatisticModifier } from "@actor/modifiers.ts";
import { MOVEMENT_TYPES } from "@actor/values.ts";
import { WeaponPF2e } from "@item";
import { RollNotePF2e } from "@module/notes.ts";
import { Predicate } from "@system/predication.ts";
import { RecordField } from "@system/schema-data-fields.ts";
import { LandSpeedStatisticTraceData, SpeedStatistic } from "@system/statistic/speed.ts";
import { objectHasKey, setHasElement, sluggify, tupleHasValue } from "@util";
import * as R from "remeda";
import { RuleElement } from "../base.ts";
import { CreatureSizeRuleElement } from "../creature-size.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSource } from "../data.ts";
import { ItemAlterationRuleElement } from "../item-alteration/rule-element.ts";
import { ImmunityRuleElement } from "../iwr/immunity.ts";
import { ResistanceRuleElement } from "../iwr/resistance.ts";
import { WeaknessRuleElement } from "../iwr/weakness.ts";
import { SenseRuleElement } from "../sense.ts";
import { StrikeRuleElement } from "../strike.ts";
import { TempHPRuleElement } from "../temp-hp.ts";
import { BattleFormRuleSchema } from "./schema.ts";
import { BattleFormStrike, BattleFormStrikeQuery } from "./types.ts";
import { BATTLE_FORM_DEFAULT_ICONS } from "./values.ts";
import fields = foundry.data.fields;

class BattleFormRuleElement extends RuleElement<BattleFormRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character"];

    /** The label given to modifiers of AC, skills, and strikes */
    modifierLabel: string = "invalid";

    static override defineSchema(): BattleFormRuleSchema {
        return {
            ...super.defineSchema(),
            overrides: new fields.SchemaField({
                traits: new fields.ArrayField(new fields.StringField()),
                armorClass: new fields.SchemaField({
                    modifier: new ResolvableValueField({ required: false, nullable: false, initial: 0 }),
                    ignoreCheckPenalty: new fields.BooleanField({ initial: true }),
                    ignoreSpeedPenalty: new fields.BooleanField({ initial: true }),
                    ownIfHigher: new fields.BooleanField(),
                }),
                tempHP: new ResolvableValueField({ required: false, nullable: true, initial: null }),
                senses: new RecordField(
                    new fields.StringField({
                        required: true,
                        blank: false,
                        choices: () => ({
                            ...CONFIG.PF2E.senses,
                            ...R.mapKeys(CONFIG.PF2E.senses, (k) => sluggify(k, { camel: "dromedary" })),
                        }),
                    }),
                    new fields.SchemaField({
                        acuity: new fields.StringField({
                            choices: () => CONFIG.PF2E.senseAcuities,
                            required: false,
                            blank: false,
                            initial: undefined,
                        }),
                        range: new fields.NumberField({
                            required: false,
                            nullable: true,
                            positive: true,
                            integer: true,
                            initial: undefined,
                        }),
                    }),
                    { required: false, initial: () => ({}) },
                ),
                size: new fields.StringField({ required: false, blank: false, initial: undefined }),
                speeds: new fields.ObjectField({ required: false, initial: () => ({}) }),
                skills: new fields.ObjectField({ required: false, initial: () => ({}) }),
                strikes: new fields.ObjectField({ required: false, initial: () => ({}) }),
                immunities: new fields.ArrayField(new fields.ObjectField()),
                weaknesses: new fields.ArrayField(new fields.ObjectField()),
                resistances: new fields.ArrayField(new fields.ObjectField()),
            }),
            brackets: new fields.ArrayField(
                new fields.SchemaField({
                    start: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: true,
                        min: 0,
                        max: 30,
                        initial: 0,
                    }),
                    value: new fields.ObjectField(),
                }),
            ),
            ownUnarmed: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            canCast: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            canSpeak: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            hasHands: new fields.BooleanField({ required: false, nullable: false, initial: false }),
        };
    }

    override async preCreate({ itemSource, ruleSource }: RuleElement.PreCreateParams): Promise<void> {
        if (!this.test()) {
            ruleSource.ignored = true;
            return;
        }

        // Pre-clear other rule elements on this item as being compatible with the battle form
        const rules: (RuleElementSource & { battleForm?: boolean })[] = itemSource.system?.rules ?? [];
        for (const rule of rules) {
            if (["DamageDice", "FlatModifier", "ItemAlteration", "Note"].includes(String(rule.key))) {
                rule.battleForm = true;
            }
        }

        // Look for strikes that are compendium weapon queries and construct using retrieved weapon
        await this.#resolveStrikeQueries(ruleSource);
    }

    /** Set temporary hit points */
    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;

        const tempHP = this.overrides.tempHP;
        if (tempHP) {
            const source = { key: "TempHP", label: this.label, value: tempHP };
            new TempHPRuleElement(source, { parent: this.item }).onCreate(actorUpdates);
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;
        const actor = this.actor;
        const flags = actor.flags;
        if (flags.pf2e.polymorphed) {
            this.ignored = true;
            return;
        }
        flags.pf2e.polymorphed = true;
        flags.pf2e.battleForm = true;
        this.#setRollOptions();
        this.#prepareSenses();
        if (this.ignored) return;

        this.modifierLabel = this.getReducedLabel();
        const bracket = this.brackets.findLast((b) => b.start <= (this.item.system.level?.value ?? 0));
        if (bracket) this.overrides = fu.mergeObject(this.overrides, bracket.value);
        for (const trait of this.overrides.traits) {
            const currentTraits = actor.system.traits;
            if (!currentTraits.value.includes(trait)) currentTraits.value.push(trait);
        }
        if (this.overrides.armorClass.ignoreCheckPenalty) {
            const synthetics = (this.actor.synthetics.modifierAdjustments["skill-check"] ??= []);
            synthetics.push({ slug: "armor-check-penalty", test: () => true, suppress: true });
        }
        if (this.overrides.armorClass.ignoreSpeedPenalty) {
            const synthetics = (this.actor.synthetics.modifierAdjustments["all-speeds"] ??= []);
            synthetics.push({ slug: "armor-speed-penalty", test: () => true, suppress: true });
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
        const actor = this.actor;
        const initiativeData = actor.system.initiative;
        actor.initiative = new ActorInitiative(actor, R.pick(initiativeData, ["statistic", "tiebreakPriority"]));
        actor.system.initiative = actor.initiative.getTraceData();
    }

    /** Remove temporary hit points */
    override onDelete(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;

        const tempHP = this.overrides.tempHP;
        if (tempHP) {
            const source = { key: "TempHP", label: this.label, value: tempHP };
            new TempHPRuleElement(source, { parent: this.item }).onDelete(actorUpdates);
        }
    }

    #setRollOptions(): void {
        const { attributes, rollOptions } = this.actor;
        rollOptions.all["polymorph"] = true;
        rollOptions.all["battle-form"] = true;

        // Inform predicates that this battle form grants a skill modifier
        for (const key of Object.keys(this.overrides.skills)) {
            if (key in CONFIG.PF2E.skills) {
                rollOptions.all[`battle-form:${key}`] = true;
            }
        }

        // Reestablish hands free
        attributes.handsFree = Math.max(
            Object.values(this.overrides.strikes).reduce(
                (count, s) => (s.category === "unarmed" ? count : count - 1),
                2,
            ),
            0,
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
        const { actor, overrides } = this;
        const armorClass = actor.armorClass;
        const acOverride = Number(this.resolveValue(overrides.armorClass.modifier, armorClass.value)) || 0;
        if (!acOverride) return;

        if (overrides.armorClass.ownIfHigher && armorClass.value > acOverride) return;

        this.#suppressModifiers(armorClass);
        const newModifier = (Number(this.resolveValue(overrides.armorClass.modifier)) || 0) - 10;
        armorClass.modifiers.push(new Modifier(this.modifierLabel, newModifier, "untyped"));
        actor.system.attributes.ac = fu.mergeObject(actor.system.attributes.ac, armorClass.parent.getTraceData());
    }

    /** Add new senses the character doesn't already have */
    #prepareSenses(): void {
        for (const [key, data] of Object.entries(this.overrides.senses)) {
            const slug = sluggify(key);
            if (!setHasElement(SENSE_TYPES, slug)) {
                this.failValidation(`senses: ${slug} is not a valid choice`);
                return;
            }
            const ruleData = { key: "Sense", selector: slug, force: true, ...data };
            new SenseRuleElement(ruleData, { parent: this.item }).beforePrepareData();
        }
    }

    /** Adjust the character's size category */
    #prepareSize(): void {
        if (!this.overrides.size) return;
        const ruleData = { key: "CreatureSize", label: this.label, value: this.overrides.size };
        new CreatureSizeRuleElement(ruleData, { parent: this.item }).beforePrepareData();
    }

    #prepareSkills(): void {
        const actor = this.actor;
        for (const [key, newSkill] of Object.entries(this.overrides.skills)) {
            if (!objectHasKey(actor.skills, key)) {
                return this.failValidation(`Unrecognized skill: ${key}`);
            }
            newSkill.ownIfHigher ??= true;

            const currentSkill = actor.skills[key];
            const newModifier = Number(this.resolveValue(newSkill.modifier)) || 0;
            if (currentSkill.mod > newModifier && newSkill.ownIfHigher) {
                continue;
            }

            const baseMod = new Modifier({
                label: this.modifierLabel,
                slug: "battle-form",
                modifier: newModifier,
                type: "untyped",
            });

            actor.skills[key] = currentSkill.extend({ modifiers: [baseMod], filter: this.#filterModifier });
            actor.system.skills[key] = fu.mergeObject(actor.system.skills[key], actor.skills[key].getTraceData());
        }
    }

    /** Clear out existing strikes and replace them with the form's stipulated ones, if any */
    #prepareStrikes(): void {
        const actor = this.actor;
        const synthetics = actor.synthetics;
        const strikes = this.overrides.strikes;
        for (const strike of Object.values(strikes)) {
            strike.ownIfHigher ??= true;
            strike.damage.modifier = Number(this.resolveValue(strike.damage.modifier)) || 0;
        }

        const ruleData = Object.entries(strikes).map(([slug, strikeData]) => ({
            key: "Strike",
            label:
                game.i18n.localize(strikeData.label) ??
                `PF2E.BattleForm.Attack.${sluggify(slug, { camel: "bactrian" })}`,
            slug,
            predicate: strikeData.predicate ?? [],
            img: strikeData.img ?? BATTLE_FORM_DEFAULT_ICONS[slug] ?? this.item.img,
            category: strikeData.category,
            group: strikeData.group,
            baseItem: strikeData.baseType,
            options: [slug],
            damage: { base: strikeData.damage },
            range: strikeData.range,
            traits: strikeData.traits ?? [],
            ability: strikeData.ability,
            battleForm: true,
        }));

        // Repopulate strikes with new WeaponPF2e instances--unless ownUnarmed is true
        const strikeAndItemAlterationRules = actor.rules.filter(
            (r): r is ItemAlterationRuleElement | StrikeRuleElement => ["ItemAlteration", "Strike"].includes(r.key),
        );
        if (this.ownUnarmed) {
            const strikeRules = strikeAndItemAlterationRules.filter((r): r is StrikeRuleElement => r.key === "Strike");
            for (const rule of strikeRules) {
                if (rule.category !== "unarmed") rule.ignored = true;
            }
            actor.rollOptions.all["battle-form:own-attack-modifier"] = true;
        } else {
            for (const rule of strikeAndItemAlterationRules) {
                if (!rule.battleForm && (rule.key === "Strike" || ("type" in rule && rule.type === "weapon"))) {
                    rule.ignored = true;
                }
            }
            for (const striking of Object.values(synthetics.striking).flat()) {
                const predicate = (striking.predicate ??= new Predicate());
                predicate.push({ not: "battle-form" });
            }

            for (const datum of ruleData) {
                if (!datum.traits.includes("magical")) datum.traits.push("magical");
                new StrikeRuleElement(datum, { parent: this.item }).beforePrepareData();
            }
        }

        actor.system.actions = actor
            .prepareAttacks({ includeBasicUnarmed: this.ownUnarmed })
            .filter((a) => a.item.flags.pf2e.battleForm || (this.ownUnarmed && a.item.category === "unarmed"));
        const strikeActions = actor.system.actions.flatMap((s): CharacterAttack[] => [s, ...s.altUsages]);

        for (const action of strikeActions) {
            const strike = strikes[action.slug ?? ""];
            if (!strike || action.type !== "strike") continue;
            const addend = action.modifiers
                .filter((m) => m.enabled && this.#filterModifier(m))
                .reduce((sum, m) => sum + m.modifier, 0);
            const formModifier = Number(this.resolveValue(strike.modifier)) + addend;
            if (!this.ownUnarmed && (formModifier >= action.totalModifier || !strike.ownIfHigher)) {
                // The battle form's static attack-roll modifier is >= the character's unarmed attack modifier:
                // replace inapplicable attack-roll modifiers with the battle form's
                this.#suppressModifiers(action);
                this.#suppressNotes(
                    Object.entries(synthetics.rollNotes).flatMap(([key, note]) => (/\bdamage\b/.test(key) ? note : [])),
                );
                const baseModifier = Number(this.resolveValue(strike.modifier)) || 0;
                action.unshift(new Modifier(this.modifierLabel, baseModifier, "untyped"));
            } else {
                const options = (actor.rollOptions["strike-attack-roll"] ??= {});
                options["battle-form:own-attack-modifier"] = true;
                action.calculateTotal(new Set(actor.getRollOptions(action.domains)));
            }
        }
    }

    /** Immunity, weakness, and resistance */
    #prepareIWR(): void {
        for (const immunity of this.overrides.immunities) {
            new ImmunityRuleElement({ key: "Immunity", ...immunity }, { parent: this.item }).afterPrepareData();
        }
        for (const weakness of this.overrides.weaknesses) {
            const args = { key: "Weakness", ...weakness, override: true };
            new WeaknessRuleElement(args, { parent: this.item }).afterPrepareData();
        }
        for (const resistance of this.overrides.resistances) {
            const args = { key: "Resistance", ...resistance, override: true };
            new ResistanceRuleElement(args, { parent: this.item }).afterPrepareData();
        }
    }

    /** Add, replace and/or adjust non-land speeds */
    #prepareSpeeds(): void {
        const actor = this.actor;
        for (const type of MOVEMENT_TYPES) {
            const speedOverride = this.resolveValue(this.overrides.speeds[type], null);
            if (typeof speedOverride !== "number") continue;
            actor.synthetics.movementTypes[type] = [];
            const statistic = new SpeedStatistic(actor, { type, base: speedOverride });
            this.#suppressModifiers(statistic);
            const traceData = statistic.getTraceData() as LandSpeedStatisticTraceData;
            actor.system.movement.speeds[type] = traceData;
        }
    }

    /** Disable ineligible check modifiers */
    #suppressModifiers(statistic: { modifiers: readonly Modifier[] }): void {
        for (const modifier of statistic.modifiers) {
            if (!this.#filterModifier(modifier)) {
                modifier.adjustments.push({ slug: null, test: () => true, suppress: true });
                modifier.ignored = true;
                modifier.enabled = false;
            }
        }
        if (statistic instanceof StatisticModifier) {
            statistic.calculateTotal();
        }
    }

    #filterModifier(modifier: Modifier) {
        if (modifier.slug === "battle-form") return true;
        if (modifier.type === "ability") return false;
        return ["status", "circumstance"].includes(modifier.type) || modifier.modifier < 0;
    }

    #suppressNotes(notes: RollNotePF2e[]): void {
        for (const note of notes) {
            if (!note.predicate.includes("battle-form")) {
                note.predicate = note.predicate instanceof Predicate ? note.predicate : new Predicate(note.predicate);
                note.predicate.push({ not: "battle-form" });
            }
        }
    }

    /** Disable ineligible damage adjustments (modifiers, bonuses, additional damage) */
    override applyDamageExclusion(weapon: WeaponPF2e, modifiers: (DamageDicePF2e | Modifier)[]): void {
        if (this.ownUnarmed) return;

        for (const modifier of modifiers) {
            if (modifier.predicate.some((s) => R.isPlainObject(s) && "not" in s && s.not === "battle-form")) {
                continue;
            }

            const isNumericBonus = modifier instanceof Modifier && modifier.modifier >= 0;
            const isAbilityModifier = modifier instanceof Modifier && modifier.type === "ability";
            const isExtraDice = modifier instanceof DamageDicePF2e;
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
    async #resolveStrikeQueries(
        ruleSource: RuleElementSource & { value?: JSONValue; overrides?: JSONValue },
    ): Promise<void> {
        const value = ruleSource.overrides ? ruleSource.overrides : (ruleSource.value ??= {});
        const hasStrikes = (v: unknown): v is ValueWithStrikes => R.isPlainObject(v) && R.isPlainObject(v.strikes);

        if (!hasStrikes(value)) return;

        const isStrikeQuery = (maybeQuery: unknown): maybeQuery is BattleFormStrikeQuery => {
            if (!R.isPlainObject(maybeQuery)) return false;
            return typeof maybeQuery.query === "string" && typeof maybeQuery.modifier === "number";
        };

        for (const [slug, strike] of Object.entries(value.strikes)) {
            if (!isStrikeQuery(strike)) continue;

            strike.pack = String(strike.pack ?? "pf2e.equipment-srd");
            strike.ownIfHigher = !!(strike.ownIfHigher ?? true);

            const queryObject = ((): Record<string, unknown> | null => {
                try {
                    const parsed = JSON.parse(String(this.resolveInjectedProperties(strike.query)));
                    if (!R.isPlainObject(parsed) || Array.isArray(parsed)) {
                        throw Error("A strike query must be an NeDB query object");
                    }
                    return parsed;
                } catch (error) {
                    if (error instanceof Error) this.failValidation(error.message);
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
                traits: fu.deepClone(weapon.system.traits.value),
                modifier: strike.modifier,
                damage: fu.deepClone(weapon.system.damage),
                ownIfHigher: strike.ownIfHigher,
            };

            value.strikes[slug] = resolved;
        }
    }
}

interface BattleFormRuleElement
    extends RuleElement<BattleFormRuleSchema>,
        ModelPropsFromRESchema<BattleFormRuleSchema> {
    get actor(): CharacterPF2e;
}

interface ValueWithStrikes {
    strikes: Record<string, unknown>;
}

export { BattleFormRuleElement };
