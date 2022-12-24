import { RuleElementPF2e, RuleElementData, RuleElementOptions } from "../";
import { BattleFormAC, BattleFormOverrides, BattleFormSource, BattleFormStrike, BattleFormStrikeQuery } from "./types";
import { CreatureSizeRuleElement } from "../creature-size";
import { ImmunityRuleElement } from "../iwr/immunity";
import { ResistanceRuleElement } from "../iwr/resistance";
import { WeaknessRuleElement } from "../iwr/weakness";
import { SenseRuleElement } from "../sense";
import { StrikeRuleElement } from "../strike";
import { TempHPRuleElement } from "../temp-hp";
import { CharacterPF2e } from "@actor";
import { SENSE_TYPES } from "@actor/creature/sense";
import { ActorType } from "@actor/data";
import { MOVEMENT_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY } from "@actor/values";
import { ItemPF2e, WeaponPF2e } from "@item";
import { DiceModifierPF2e, ModifierPF2e, StatisticModifier } from "@actor/modifiers";
import { RollNotePF2e } from "@module/notes";
import { PredicatePF2e } from "@system/predication";
import { ErrorPF2e, isObject, sluggify, tupleHasValue } from "@util";
import { RuleElementSource } from "../data";
import { CharacterStrike } from "@actor/character/data";

export class BattleFormRuleElement extends RuleElementPF2e {
    overrides: this["data"]["overrides"];

    /** The label given to modifiers of AC, skills, and strikes */
    modifierLabel: string;

    /** Whether the actor uses its own unarmed attacks while in battle form */
    ownUnarmed: boolean;

    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: BattleFormSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        data.value ??= {};
        data.overrides ??= {};
        super(data, item, options);
        this.initialize(this.data);
        this.overrides = this.resolveValue(this.data.value, this.data.overrides) as this["data"]["overrides"];
        this.modifierLabel = this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "");
        this.ownUnarmed = this.data.ownUnarmed;
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
            return this.failValidation("Battle Form rule element failed to validate");
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
    }

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
            new TempHPRuleElement({ key: "TempHP", label: this.data.label, value: tempHP }, this.item).onCreate(
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

        this.setRollOptions();
        this.prepareSenses();

        for (const trait of this.overrides.traits) {
            const currentTraits = actor.system.traits;
            if (!currentTraits.value.includes(trait)) currentTraits.value.push(trait);
        }

        if (this.overrides.armorClass.ignoreSpeedPenalty) {
            const speedRollOptions = (actor.rollOptions.speed ??= {});
            speedRollOptions["armor:ignore-speed-penalty"] = true;
        }
    }

    override afterPrepareData(): void {
        if (this.ignored) return;

        this.prepareAC();
        this.prepareSize();
        this.prepareSkills();
        this.prepareSpeeds();
        this.prepareStrikes();
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
        const { attributes, rollOptions } = this.actor;
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
    private prepareAC(): void {
        const overrides = this.overrides;
        const armorClass = this.actor.system.attributes.ac;
        const acOverride = Number(this.resolveValue(overrides.armorClass.modifier, armorClass.totalModifier)) || 0;
        if (!acOverride) return;

        this.suppressModifiers(armorClass);
        const newModifier = Number(this.resolveValue(overrides.armorClass.modifier)) || 0;
        armorClass.unshift(new ModifierPF2e(this.modifierLabel, newModifier, "untyped"));
        armorClass.value = armorClass.totalModifier;
    }

    /** Add new senses the character doesn't already have */
    private prepareSenses(): void {
        for (const senseType of SENSE_TYPES) {
            const newSense = this.overrides.senses[senseType];
            if (!newSense) continue;
            newSense.acuity ??= "precise";
            const ruleData = { key: "Sense", selector: senseType, force: true, ...newSense };
            new SenseRuleElement(ruleData, this.item).beforePrepareData();
        }
    }

    /** Adjust the character's size category */
    private prepareSize(): void {
        if (!this.overrides.size) return;
        const ruleData = { key: "CreatureSize", label: this.label, value: this.overrides.size };
        new CreatureSizeRuleElement(ruleData, this.item).beforePrepareData();
    }

    /** Add, replace and/or adjust non-land speeds */
    private prepareSpeeds(): void {
        const { attributes } = this.actor;
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
                                const speedName = game.i18n.localize(modifier.slug);
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
                    value: speedOverride,
                });
                const newSpeed = this.actor.prepareSpeed(movementType);
                if (!newSpeed) throw ErrorPF2e("Unexpected failure retrieving movement type");
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

            const currentSkill = this.actor.system.skills[key];
            const newModifier = Number(this.resolveValue(newSkill.modifier)) || 0;
            if (currentSkill.totalModifier > newModifier && newSkill.ownIfHigher) {
                continue;
            }

            this.suppressModifiers(currentSkill);
            currentSkill.unshift(new ModifierPF2e(this.modifierLabel, newModifier, "untyped"));
            currentSkill.value = currentSkill.totalModifier;
        }
    }

    /** Clear out existing strikes and replace them with the form's stipulated ones, if any */
    private prepareStrikes(): void {
        const { synthetics } = this.actor;

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
                new StrikeRuleElement(datum, this.item).beforePrepareData();
            }
        }

        this.actor.system.actions = this.actor
            .prepareStrikes({
                includeBasicUnarmed: this.ownUnarmed,
            })
            .filter(
                (a) =>
                    (a.slug && a.slug in this.overrides.strikes) || (this.ownUnarmed && a.item.category === "unarmed")
            );
        const strikeActions = this.actor.system.actions.flatMap((s): CharacterStrike[] => [s, ...s.altUsages]);

        for (const action of strikeActions) {
            const strike = (this.overrides.strikes[action.slug ?? ""] ?? null) as BattleFormStrike | null;

            if (!this.ownUnarmed && strike && (strike.modifier >= action.totalModifier || !strike.ownIfHigher)) {
                // The battle form's static attack-roll modifier is >= the character's unarmed attack modifier:
                // replace inapplicable attack-roll modifiers with the battle form's
                this.suppressModifiers(action);
                this.suppressNotes(
                    Object.entries(synthetics.rollNotes).flatMap(([key, note]) => (/\bdamage\b/.test(key) ? note : []))
                );
                const baseModifier = Number(this.resolveValue(strike.modifier)) || 0;
                action.unshift(new ModifierPF2e(this.modifierLabel, baseModifier, "untyped"));

                // Also replace the label
                const title = game.i18n.localize("PF2E.RuleElement.Strike");
                const sign = action.totalModifier < 0 ? "" : "+";
                action.variants[0].label = `${title} ${sign}${action.totalModifier}`;
            } else {
                const options = (this.actor.rollOptions["strike-attack-roll"] ??= {});
                options["battle-form:own-attack-modifier"] = true;
            }
        }
    }

    /** Immunity, weakness, and resistance */
    private prepareIWR(): void {
        for (const immunity of this.overrides.immunities) {
            new ImmunityRuleElement({ key: "Immunity", ...immunity }, this.item).beforePrepareData();
        }
        for (const weakness of this.overrides.weaknesses) {
            new WeaknessRuleElement({ key: "Weakness", ...weakness, override: true }, this.item).beforePrepareData();
        }
        for (const resistance of this.overrides.resistances) {
            new ResistanceRuleElement(
                { key: "Resistance", ...resistance, override: true },
                this.item
            ).beforePrepareData();
        }
    }

    /** Disable ineligible check modifiers */
    private suppressModifiers(statistic: StatisticModifier): void {
        for (const modifier of statistic.modifiers) {
            if (
                (!["status", "circumstance"].includes(modifier.type) && modifier.modifier >= 0) ||
                modifier.type === "ability"
            ) {
                modifier.adjustments.push({ slug: null, predicate: new PredicatePF2e(), suppress: true });
                modifier.ignored = true;
            }
        }
        statistic.calculateTotal();
    }

    private suppressNotes(notes: RollNotePF2e[]): void {
        for (const note of notes) {
            if (!note.predicate.includes("battle-form")) {
                note.predicate =
                    note.predicate instanceof PredicatePF2e ? note.predicate : new PredicatePF2e(note.predicate);
                note.predicate.push({ not: "battle-form" });
            }
        }
    }

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
                tupleHasValue(this.overrides.strikes[weapon.slug ?? ""]?.traits ?? [], modifier.slug);
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

interface ValueWithStrikes {
    strikes: Record<string, unknown>;
}
