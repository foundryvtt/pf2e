import { CreaturePF2e } from "@actor";
import { Abilities } from "@actor/creature/data";
import { SIZE_TO_REACH } from "@actor/creature/values";
import { strikeFromMeleeItem } from "@actor/helpers";
import { CheckModifier, ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from "@actor/modifiers";
import { SaveType } from "@actor/types";
import { SAVE_TYPES, SKILL_DICTIONARY, SKILL_EXPANDED, SKILL_LONG_FORMS } from "@actor/values";
import { ItemPF2e, MeleePF2e } from "@item";
import { ItemType } from "@item/data";
import { RollNotePF2e } from "@module/notes";
import { identifyCreature } from "@module/recall-knowledge";
import {
    extractDegreeOfSuccessAdjustments,
    extractModifierAdjustments,
    extractModifiers,
    extractNotes,
    extractRollTwice,
} from "@module/rules/util";
import { CheckPF2e, CheckRoll, CheckRollContext } from "@system/check";
import { LocalizePF2e } from "@system/localize";
import { PredicatePF2e } from "@system/predication";
import { RollParameters } from "@system/rolls";
import { Statistic } from "@system/statistic";
import { objectHasKey, sluggify } from "@util";
import { NPCData, NPCFlags, NPCSource } from "./data";
import { NPCSheetPF2e } from "./sheet";
import { VariantCloneParams } from "./types";

class NPCPF2e extends CreaturePF2e {
    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "physical", "spellcastingEntry", "spell", "action", "melee", "lore"];
    }

    /** This NPC's ability scores */
    get abilities(): Abilities {
        return deepClone(this.system.abilities);
    }

    get description(): string {
        return this.system.details.publicNotes;
    }

    /** Does this NPC have the Elite adjustment? */
    get isElite(): boolean {
        return this.attributes.adjustment === "elite";
    }

    /** Does this NPC have the Weak adjustment? */
    get isWeak(): boolean {
        return this.attributes.adjustment === "weak";
    }

    /** Users with limited permission can loot a dead NPC */
    override canUserModify(user: User, action: UserAction): boolean {
        if (action === "update" && this.isLootable) {
            return this.permission >= CONST.DOCUMENT_PERMISSION_LEVELS.LIMITED;
        }
        return super.canUserModify(user, action);
    }

    /** A user can see a synthetic NPC in the actor directory only if they have at least Observer permission */
    override get visible(): boolean {
        return !this.isToken && this.prototypeToken.actorLink
            ? super.visible
            : this.permission >= CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER;
    }

    get isLootable(): boolean {
        const npcsAreLootable = game.settings.get("pf2e", "automation.lootableNPCs");
        return this.isDead && (npcsAreLootable || this.flags.pf2e.lootable);
    }

    /** Grant all users at least limited permission on dead NPCs */
    override get permission(): PermissionLevel {
        if (game.user.isGM || !this.isLootable) {
            return super.permission;
        }
        return Math.max(super.permission, 1) as PermissionLevel;
    }

    /** Grant players limited permission on dead NPCs */
    override testUserPermission(
        user: User,
        permission: DocumentPermission | DocumentPermissionNumber,
        options?: { exact?: boolean }
    ) {
        // Temporary measure until a lootable view of the legacy sheet is ready
        if (game.user.isGM || !this.isLootable) {
            return super.testUserPermission(user, permission, options);
        }
        if ([1, "LIMITED"].includes(permission) && !options) {
            return this.permission >= CONST.DOCUMENT_PERMISSION_LEVELS.LIMITED;
        }
        return super.testUserPermission(user, permission, options);
    }

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.flags.pf2e.lootable ??= false;

        const systemData = this.system;
        systemData.actions = [];
        for (const key of SAVE_TYPES) {
            systemData.saves[key].ability = CONFIG.PF2E.savingThrowDefaultAbilities[key];
        }

        const { attributes, details } = systemData;
        attributes.perception.ability = "wis";
        attributes.reach = {
            general: SIZE_TO_REACH[this.size],
            manipulate: SIZE_TO_REACH[this.size],
        };

        if (details.alliance === undefined) {
            details.alliance = this.hasPlayerOwner ? "party" : "opposition";
        }

        const proficiencyWithoutLevel = game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
        details.identification = identifyCreature(this, { proficiencyWithoutLevel });

        // Exclude troops from being flankable
        this.system.attributes.flanking.flankable = !systemData.traits.value.includes("troop");
    }

    /** The NPC level needs to be known before the rest of the weak/elite adjustments */
    override prepareEmbeddedDocuments(): void {
        const { level } = this.system.details;

        const baseLevel = level.value;
        level.value = this.isElite ? baseLevel + 1 : this.isWeak ? baseLevel - 1 : baseLevel;
        level.base = baseLevel;

        this.rollOptions.all[`self:level:${level.value}`] = true;

        super.prepareEmbeddedDocuments();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        const { system } = this;

        // Extract as separate variables for easier use in this method.
        const { synthetics } = this;
        const { modifierAdjustments, statisticsModifiers, strikes, rollNotes } = synthetics;
        const itemTypes = this.itemTypes;
        const baseLevel = this.system.details.level.base;

        if (this.isElite) {
            modifierAdjustments.all.push({
                slug: "base",
                getNewValue: (base: number) => base + 2,
                predicate: new PredicatePF2e(),
            });
            statisticsModifiers.hp = statisticsModifiers.hp ?? [];
            statisticsModifiers.hp.push(
                () =>
                    new ModifierPF2e(
                        "PF2E.NPC.Adjustment.EliteLabel",
                        this.getHpAdjustment(baseLevel, "elite"),
                        MODIFIER_TYPE.UNTYPED
                    )
            );
        } else if (this.isWeak) {
            modifierAdjustments.all.push({
                slug: "base",
                getNewValue: (base: number) => base - 2,
                predicate: new PredicatePF2e(),
            });
            statisticsModifiers.hp = statisticsModifiers.hp ?? [];
            statisticsModifiers.hp.push(
                () =>
                    new ModifierPF2e(
                        "PF2E.NPC.Adjustment.WeakLabel",
                        this.getHpAdjustment(baseLevel, "weak") * -1,
                        MODIFIER_TYPE.UNTYPED
                    )
            );
        }
        system.details.level.base = baseLevel;

        // Compute 10+mod ability scores from ability modifiers
        for (const ability of Object.values(this.system.abilities)) {
            ability.mod = Number(ability.mod) || 0;
            ability.value = ability.mod * 2 + 10;
        }

        // Hit Points
        {
            const base = system.attributes.hp.max;
            const modifiers: ModifierPF2e[] = [
                extractModifiers(this.synthetics, ["hp"], { test: this.getRollOptions(["hp"]) }),
                extractModifiers(this.synthetics, ["hp-per-level"], {
                    test: this.getRollOptions(["hp-per-level"]),
                }).map((modifier) => {
                    modifier.modifier *= this.level;
                    return modifier;
                }),
            ].flat();

            const hpData = deepClone(system.attributes.hp);
            const stat = mergeObject(new StatisticModifier("hp", modifiers), hpData, { overwrite: false });

            stat.base = base;
            stat.max = stat.max + stat.totalModifier;
            stat.value = Math.min(stat.value, stat.max); // Make sure the current HP isn't higher than the max HP
            stat.breakdown = [
                game.i18n.format("PF2E.MaxHitPointsBaseLabel", { base }),
                ...stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`),
            ].join(", ");

            system.attributes.hp = stat;

            // Set a roll option for HP percentage
            const percentRemaining = Math.floor((stat.value / stat.max) * 100);
            this.rollOptions.all[`hp-remaining:${stat.value}`] = true;
            this.rollOptions.all[`hp-percent:${percentRemaining}`] = true;
        }

        // Speeds
        const speeds = (system.attributes.speed = this.prepareSpeed("land"));
        speeds.otherSpeeds = (["burrow", "climb", "fly", "swim"] as const).flatMap((m) => this.prepareSpeed(m) ?? []);

        // Armor Class
        {
            const base = system.attributes.ac.value;
            const domains = ["ac", "dex-based", "all"];
            const modifiers = [
                new ModifierPF2e({
                    slug: "base",
                    label: "PF2E.ModifierTitle",
                    modifier: base,
                    adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                }),
                this.getShieldBonus() ?? [],
                extractModifiers(this.synthetics, domains),
            ].flat();

            const rollOptions = this.getRollOptions(domains);
            const stat = mergeObject(new StatisticModifier("ac", modifiers, rollOptions), system.attributes.ac, {
                overwrite: false,
            });
            stat.base = base;
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => {
                    if (m.slug === "base") {
                        return `10 + ${m.modifier - 10} ${m.label}`;
                    } else {
                        const sign = m.modifier < 0 ? "" : "+";
                        return `${m.label} ${sign}${m.modifier}`;
                    }
                })
                .join(", ");

            system.attributes.ac = stat;
        }

        this.prepareSaves();

        // Perception
        {
            const domains = ["perception", "wis-based", "all"];
            const base = system.attributes.perception.value;
            const modifiers = [
                new ModifierPF2e({
                    slug: "base",
                    label: "PF2E.ModifierTitle",
                    modifier: base,
                    adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                }),
                ...extractModifiers(this.synthetics, domains),
            ];

            const stat = mergeObject(
                new StatisticModifier("perception", modifiers, this.getRollOptions(domains)),
                system.attributes.perception,
                { overwrite: false }
            );
            stat.base = base;
            stat.notes = extractNotes(rollNotes, domains);
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
                        options: new Set(params.options ?? []),
                        dc: params.dc,
                        rollTwice,
                        notes: stat.notes,
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

            system.attributes.perception = stat;
        }

        // default all skills to untrained
        system.skills = {};
        for (const skill of SKILL_LONG_FORMS) {
            const { ability, shortform } = SKILL_EXPANDED[skill];
            const domains = [skill, `${ability}-based`, "skill-check", `${ability}-skill-check`, "all"];
            const modifiers = [
                new ModifierPF2e({
                    slug: "base",
                    label: "PF2E.ModifierTitle",
                    modifier: system.abilities[ability].mod,
                    adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                }),
                ...extractModifiers(this.synthetics, domains),
            ];
            const notes = extractNotes(rollNotes, domains);
            const name = game.i18n.localize(`PF2E.Skill${SKILL_DICTIONARY[shortform].capitalize()}`);

            const stat = mergeObject(
                new StatisticModifier(skill, modifiers, this.getRollOptions(domains)),
                {
                    ability,
                    expanded: skill,
                    label: name,
                    value: 0,
                    visible: false,
                    roll: async (params: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                        console.warn(
                            `Rolling skill checks via actor.system.skills.${shortform}.roll() is deprecated, use actor.skills.${skill}.check.roll() instead`
                        );
                        const label = game.i18n.format("PF2E.SkillCheckWithName", { skillName: name });
                        const rollOptions = new Set(params.options ?? []);
                        const rollTwice = extractRollTwice(this.synthetics.rollTwice, domains, rollOptions);
                        const context = {
                            actor: this,
                            type: "skill-check" as const,
                            options: rollOptions,
                            dc: params.dc,
                            rollTwice,
                            notes,
                            dosAdjustments: extractDegreeOfSuccessAdjustments(synthetics, domains),
                        };

                        const roll = await CheckPF2e.roll(
                            new CheckModifier(label, stat),
                            context,
                            params.event,
                            params.callback
                        );

                        for (const rule of this.rules.filter((r) => !r.ignored)) {
                            await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                        }

                        return roll;
                    },
                    lore: false,
                },
                { overwrite: false }
            );
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            system.skills[shortform] = stat;
        }

        // process OwnedItem instances, which for NPCs include skills, attacks, equipment, special abilities etc.
        const generatedMelee = Array.from(strikes.values()).flatMap((w) => w.toNPCAttacks());
        const items = this.items.contents.concat(generatedMelee);
        for (const item of items) {
            if (item.isOfType("lore")) {
                // override untrained skills if defined in the NPC data
                const skill = sluggify(item.name); // normalize skill name to lower-case and dash-separated words
                // assume lore, if skill cannot be looked up
                const { ability, shortform } = objectHasKey(SKILL_EXPANDED, skill)
                    ? SKILL_EXPANDED[skill]
                    : { ability: "int" as const, shortform: skill };

                const base = item.system.mod.value;
                const domains = [
                    skill,
                    `${ability}-based`,
                    "skill-check",
                    "lore-skill-check",
                    `${ability}-skill-check`,
                    "all",
                ];
                const modifiers = [
                    new ModifierPF2e({
                        slug: "base",
                        label: "PF2E.ModifierTitle",
                        modifier: base,
                        adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                    }),
                    extractModifiers(this.synthetics, domains),
                ].flat();

                const stat = new StatisticModifier(skill, modifiers, this.getRollOptions(domains));
                const additionalData = {
                    itemID: item.id,
                    lore: !objectHasKey(SKILL_EXPANDED, skill),
                    ability,
                    rank: 1,
                    notes: extractNotes(rollNotes, domains),
                    base,
                    expanded: skill,
                    label: item.name,
                    value: stat.totalModifier,
                    visible: true,
                    breakdown: stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                        .join(", "),
                    variants: Object.values(item.system.variants ?? {}),
                    roll: async (params: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                        console.warn(
                            `Rolling skill checks via actor.system.skills.${shortform}.roll() is deprecated, use actor.skills.${skill}.check.roll() instead`
                        );
                        const label = game.i18n.format("PF2E.SkillCheckWithName", { skillName: item.name });
                        const rollOptions = new Set(params.options ?? []);
                        const rollTwice = extractRollTwice(this.synthetics.rollTwice, domains, rollOptions);
                        const context: CheckRollContext = {
                            actor: this,
                            type: "skill-check",
                            options: rollOptions,
                            dc: params.dc,
                            rollTwice,
                            notes: stat.notes,
                            dosAdjustments: extractDegreeOfSuccessAdjustments(synthetics, domains),
                        };

                        const roll = await CheckPF2e.roll(
                            new CheckModifier(label, stat),
                            context,
                            params.event,
                            params.callback
                        );

                        for (const rule of this.rules.filter((r) => !r.ignored)) {
                            await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                        }

                        return roll;
                    },
                };

                system.skills[shortform] = mergeObject(stat, additionalData);
            } else if (item.isOfType("melee")) {
                system.actions.push(strikeFromMeleeItem(item));
            }
        }

        // Spellcasting Entries
        for (const entry of itemTypes.spellcastingEntry) {
            const { ability, tradition } = entry;

            // There are still some bestiary entries where these values are strings
            entry.system.spelldc.dc = Number(entry.system.spelldc.dc);
            entry.system.spelldc.value = Number(entry.system.spelldc.value);
            // Modifier adjustments aren't implemented in `Statistic` yet
            if (this.isElite) {
                entry.system.spelldc.dc += 2;
                entry.system.spelldc.value += 2;
            } else if (this.isWeak) {
                entry.system.spelldc.dc -= 2;
                entry.system.spelldc.value -= 2;
            }

            const baseSelectors = ["all", `${ability}-based`, "spell-attack-dc"];
            const attackSelectors = [
                `${tradition}-spell-attack`,
                "spell-attack",
                "spell-attack-roll",
                "attack",
                "attack-roll",
            ];
            const saveSelectors = [`${tradition}-spell-dc`, "spell-dc"];

            // Check Modifiers, calculate using the user configured value
            const baseMod = Number(entry.system?.spelldc?.value ?? 0);
            const attackModifiers = [new ModifierPF2e("PF2E.ModifierTitle", baseMod, MODIFIER_TYPE.UNTYPED)];

            // Save Modifiers, reverse engineer using the user configured value - 10
            const baseDC = Number(entry.system?.spelldc?.dc ?? 0);
            const saveModifiers = [new ModifierPF2e("PF2E.ModifierTitle", baseDC - 10, MODIFIER_TYPE.UNTYPED)];

            // Assign statistic data to the spellcasting entry
            entry.statistic = new Statistic(this, {
                slug: sluggify(entry.name),
                label: CONFIG.PF2E.magicTraditions[tradition ?? "arcane"],
                domains: baseSelectors,
                rollOptions: entry.getRollOptions("spellcasting"),
                check: {
                    type: "spell-attack-roll",
                    modifiers: attackModifiers,
                    domains: attackSelectors,
                },
                dc: {
                    modifiers: saveModifiers,
                    domains: saveSelectors,
                },
            });
        }

        // Initiative
        this.prepareInitiative();

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

    prepareSaves(): void {
        const systemData = this.system;
        const { modifierAdjustments } = this.synthetics;

        // Saving Throws
        const saves: Partial<Record<SaveType, Statistic>> = {};
        for (const saveType of SAVE_TYPES) {
            const save = systemData.saves[saveType];
            const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const base = save.value;
            const ability = save.ability;

            const domains = [saveType, `${ability}-based`, "saving-throw", "all"];
            const stat = new Statistic(this, {
                slug: saveType,
                label: saveName,
                domains: domains,
                modifiers: [
                    new ModifierPF2e({
                        slug: "base",
                        label: "PF2E.ModifierTitle",
                        modifier: base,
                        adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                    }),
                ],
                check: {
                    type: "saving-throw",
                },
            });

            saves[saveType] = stat;
            mergeObject(this.system.saves[saveType], stat.getTraceData());
            systemData.saves[saveType].base = base;
        }

        this.saves = saves as Record<SaveType, Statistic>;
    }

    async getAttackEffects(attack: MeleePF2e): Promise<RollNotePF2e[]> {
        const notes: RollNotePF2e[] = [];
        if (attack.description) {
            notes.push(
                new RollNotePF2e({
                    selector: "all",
                    visibility: "gm",
                    text: attack.description,
                })
            );
        }
        const formatItemName = (item: ItemPF2e): string => {
            if (item.isOfType("consumable")) {
                return `${item.name} - ${LocalizePF2e.translations.ITEM.TypeConsumable} (${item.quantity}) <button type="button" style="width: auto; line-height: 14px;" data-action="consume" data-item="${item.id}">${LocalizePF2e.translations.PF2E.ConsumableUseLabel}</button>`;
            }
            return item.name;
        };
        const formatNoteText = (item: ItemPF2e): Promise<string> => {
            // Call enrichHTML with the correct item context
            const rollData = item.getRollData();
            return TextEditor.enrichHTML(item.description, { rollData, async: true });
        };

        for (const attackEffect of attack.attackEffects) {
            const item = this.items.find(
                (i) => i.type !== "melee" && (i.slug ?? sluggify(i.name)) === sluggify(attackEffect)
            );
            if (item) {
                // Get description from the actor item.
                const note = new RollNotePF2e({
                    selector: "all",
                    visibility: "gm",
                    title: formatItemName(item),
                    text: await formatNoteText(item),
                });
                notes.push(note);
            } else {
                // Get description from the bestiary glossary compendium.
                const compendium = game.packs.get("pf2e.bestiary-ability-glossary-srd", { strict: true });
                const packItem = (await compendium.getDocuments({ "system.slug": { $in: [attackEffect] } }))[0];
                if (packItem instanceof ItemPF2e) {
                    const note = new RollNotePF2e({
                        selector: "all",
                        visibility: "gm",
                        title: formatItemName(packItem),
                        text: await formatNoteText(packItem),
                    });
                    notes.push(note);
                }
            }
        }

        return notes;
    }

    protected getHpAdjustment(level: number, adjustment: "elite" | "weak" | null): number {
        if (adjustment === "elite") {
            // Elite adjustment: Increase/decrease the creature's Hit Points based on its starting level (20+ 30HP, 5~19 20HP, 2~4 15HP, 1 or lower 10HP).
            if (level >= 20) {
                return 30;
            } else if (level <= 19 && level >= 5) {
                return 20;
            } else if (level <= 4 && level >= 2) {
                return 15;
            } else if (level <= 1) {
                return 10;
            }
        } else if (adjustment === "weak") {
            // Weak adjustment: Increase/decrease the creature's Hit Points based on its starting level (21+ -30HP, 6~20 -20HP, 3~5 -15HP, 1-2 -10HP).
            if (level >= 21) {
                return 30;
            } else if (level <= 20 && level >= 6) {
                return 20;
            } else if (level <= 5 && level >= 3) {
                return 15;
            } else if (level === 1 || level === 2) {
                return 10;
            }
        }
        return 0;
    }

    /** Make the NPC elite, weak, or normal */
    async applyAdjustment(adjustment: "elite" | "weak" | null): Promise<void> {
        const { isElite, isWeak } = this;
        if (
            (isElite && adjustment === "elite") ||
            (isWeak && adjustment === "weak") ||
            (!isElite && !isWeak && !adjustment)
        ) {
            return;
        }

        const currentHPAdjustment = (() => {
            if (isElite) {
                return this.getHpAdjustment(this.getBaseLevel(), "elite");
            } else if (isWeak) {
                return this.getHpAdjustment(this.getBaseLevel(), "weak");
            } else {
                return 0;
            }
        })();
        const newHPAdjustment = this.getHpAdjustment(this.getBaseLevel(), adjustment);
        const currentHP = this.system.attributes.hp.value;
        const maxHP = this.system.attributes.hp.max;
        const newHP = (() => {
            if (isElite) {
                if (adjustment === "weak") {
                    return currentHP - currentHPAdjustment - newHPAdjustment;
                } else if (!adjustment) {
                    return currentHP - currentHPAdjustment;
                }
            } else if (isWeak) {
                if (adjustment === "elite") {
                    this.system.attributes.hp.max = maxHP + currentHPAdjustment + newHPAdjustment; // Set max hp to allow update of current hp > max
                    return currentHP + currentHPAdjustment + newHPAdjustment;
                } else if (!adjustment) {
                    this.system.attributes.hp.max = maxHP + currentHPAdjustment;
                    return currentHP + currentHPAdjustment;
                }
            } else {
                if (adjustment === "elite") {
                    this.system.attributes.hp.max = currentHP + newHPAdjustment;
                    return currentHP + newHPAdjustment;
                } else if (adjustment === "weak") {
                    return currentHP - newHPAdjustment;
                }
            }
            return currentHP;
        })();

        await this.update({
            "system.attributes.hp.value": Math.max(0, newHP),
            "system.attributes.adjustment": adjustment,
        });
    }

    /** Returns the base level of a creature, as this gets modified on elite and weak adjustments */
    getBaseLevel(): number {
        if (this.isElite) {
            return this.level - 1;
        } else if (this.isWeak) {
            return this.level + 1;
        } else {
            return this.level;
        }
    }

    /** Create a variant clone of this NPC, adjusting any of name, description, and images */
    variantClone(params: VariantCloneParams & { save?: false }): this;
    variantClone(params: VariantCloneParams & { save: true }): Promise<this>;
    variantClone(params: VariantCloneParams): this | Promise<this>;
    variantClone(params: VariantCloneParams): this | Promise<this> {
        const source = this._source;
        const changes: DeepPartial<NPCSource> = {
            name: params.name ?? this.name,
            system: {
                details: { publicNotes: params.description ?? source.system.details.publicNotes },
            },
            img: params.img?.actor ?? source.img,
            prototypeToken: {
                texture: {
                    src: params.img?.token ?? source.prototypeToken.texture.src,
                },
            },
        };

        return this.clone(changes, { save: params.save, keepId: params.keepId });
    }
}

interface NPCPF2e {
    readonly data: NPCData;

    flags: NPCFlags;

    _sheet: NPCSheetPF2e<this> | null;

    get sheet(): NPCSheetPF2e<this>;
}

export { NPCPF2e };
