import { ActorPF2e, CreaturePF2e } from "@actor";
import { Abilities, VisionLevel, VisionLevels } from "@actor/creature/data";
import { SaveType } from "@actor/data";
import { AbilityString, RollFunction, TraitViewData } from "@actor/data/base";
import { SAVE_TYPES, SKILL_DICTIONARY, SKILL_EXPANDED } from "@actor/data/values";
import { ConsumablePF2e, ItemPF2e, MeleePF2e } from "@item";
import { MeleeData } from "@item/data";
import { CheckModifier, ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from "@actor/modifiers";
import { RollNotePF2e } from "@module/notes";
import { extractModifiers, extractNotes, extractRollTwice } from "@module/rules/util";
import { WeaponDamagePF2e } from "@module/system/damage";
import { CheckPF2e, CheckRollContext, DamageRollPF2e } from "@module/system/rolls";
import { DamageType } from "@system/damage";
import { LocalizePF2e } from "@system/localize";
import { RollParameters } from "@system/rolls";
import { Statistic } from "@system/statistic";
import { TextEditorPF2e } from "@system/text-editor";
import { sluggify } from "@util";
import { NPCData, NPCSource, NPCStrike } from "./data";
import { NPCSheetPF2e } from "./sheet";
import { SIZE_TO_REACH } from "@actor/creature/values";
import { VariantCloneParams } from "./types";
import { StrikeAttackTraits } from "./strike-attack-traits";
import { CheckRoll } from "@system/check/roll";
import { calculateMAP } from "@actor/helpers";

class NPCPF2e extends CreaturePF2e {
    /** This NPC's ability scores */
    get abilities(): Abilities {
        return deepClone(this.data.data.abilities);
    }

    get description(): string {
        return this.data.data.details.publicNotes;
    }

    /** Does this NPC have the Elite adjustment? */
    get isElite(): boolean {
        return this.traits.has("elite");
    }

    /** Does this NPC have the Weak adjustment? */
    get isWeak(): boolean {
        return this.traits.has("weak");
    }

    /** NPCs with sufficient permissions can always see (for now) */
    override get visionLevel(): VisionLevel {
        return VisionLevels.NORMAL;
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
        return this.data.token.actorLink ? super.visible : this.permission >= CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER;
    }

    get isLootable(): boolean {
        const npcsAreLootable = game.settings.get("pf2e", "automation.lootableNPCs");
        return this.isDead && (npcsAreLootable || this.data.flags.pf2e.lootable);
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

        this.data.flags.pf2e.lootable ??= false;

        const systemData = this.data.data;
        for (const key of SAVE_TYPES) {
            systemData.saves[key].ability = CONFIG.PF2E.savingThrowDefaultAbilities[key];
        }

        const { attributes, details } = systemData;
        attributes.perception.ability = "wis";
        attributes.dexCap = [{ value: Infinity, source: "" }];
        attributes.reach = {
            general: SIZE_TO_REACH[this.size],
            manipulate: SIZE_TO_REACH[this.size],
        };

        if (details.alliance === undefined) {
            details.alliance = this.hasPlayerOwner ? "party" : "opposition";
        }
    }

    /** The NPC level needs to be known before the rest of the weak/elite adjustments */
    override prepareEmbeddedDocuments(): void {
        const { traits } = this;
        const { level } = this.data.data.details;

        const baseLevel = level.value;
        level.value = traits.has("elite") ? baseLevel + 1 : traits.has("weak") ? baseLevel - 1 : baseLevel;

        this.rollOptions.all[`self:level:${level.value}`] = true;

        super.prepareEmbeddedDocuments();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        const { data } = this.data;

        // Add rarity and custom traits to main trait list
        const traits = this.data.data.traits;
        const customTraits = traits.traits.custom.split(/\s*[,;|]\s*/).filter((trait) => trait);
        const traitSet = new Set(traits.traits.value.concat(customTraits));
        traits.traits.value = Array.from(traitSet).sort();

        // Extract as separate variables for easier use in this method.
        const { damageDice, statisticsModifiers, strikes, rollNotes } = this.synthetics;
        const itemTypes = this.itemTypes;
        const baseLevel = this.data._source.data.details.level.value;

        if (this.isElite) {
            statisticsModifiers.all = statisticsModifiers.all ?? [];
            statisticsModifiers.all.push(
                () => new ModifierPF2e("PF2E.NPC.Adjustment.EliteLabel", 2, MODIFIER_TYPE.UNTYPED)
            );
            statisticsModifiers.damage = statisticsModifiers.damage ?? [];
            statisticsModifiers.damage.push(
                () => new ModifierPF2e("PF2E.NPC.Adjustment.EliteLabel", 2, MODIFIER_TYPE.UNTYPED)
            );
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
            statisticsModifiers.all = statisticsModifiers.all ?? [];
            statisticsModifiers.all.push(
                () => new ModifierPF2e("PF2E.NPC.Adjustment.WeakLabel", -2, MODIFIER_TYPE.UNTYPED)
            );
            statisticsModifiers.damage = statisticsModifiers.damage ?? [];
            statisticsModifiers.damage.push(
                () => new ModifierPF2e("PF2E.NPC.Adjustment.WeakLabel", -2, MODIFIER_TYPE.UNTYPED)
            );
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
        data.details.level.base = baseLevel;

        // Compute 10+mod ability scores from ability modifiers
        for (const ability of Object.values(this.data.data.abilities)) {
            ability.mod = Number(ability.mod) || 0;
            ability.value = ability.mod * 2 + 10;
        }

        // Hit Points
        {
            const base = data.attributes.hp.max;
            const modifiers: ModifierPF2e[] = [
                extractModifiers(statisticsModifiers, ["hp"], { test: this.getRollOptions(["hp"]) }),
                extractModifiers(statisticsModifiers, ["hp-per-level"], {
                    test: this.getRollOptions(["hp-per-level"]),
                }).map((modifier) => {
                    modifier.modifier *= this.level;
                    return modifier;
                }),
            ].flat();

            const hpData = deepClone(data.attributes.hp);
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

            data.attributes.hp = stat;
        }

        // Speeds
        data.attributes.speed = this.prepareSpeed("land");
        const { otherSpeeds } = data.attributes.speed;
        for (let idx = 0; idx < otherSpeeds.length; idx++) {
            otherSpeeds[idx] = this.prepareSpeed(otherSpeeds[idx].type);
        }

        // Armor Class
        {
            const base = data.attributes.ac.value;
            const dexterity = Math.min(data.abilities.dex.mod, ...data.attributes.dexCap.map((cap) => cap.value));
            const domains = ["ac", "dex-based", "all"];
            const modifiers = [
                new ModifierPF2e("PF2E.BaseModifier", base - 10 - dexterity, MODIFIER_TYPE.UNTYPED),
                new ModifierPF2e(CONFIG.PF2E.abilities.dex, dexterity, MODIFIER_TYPE.ABILITY),
                this.getShieldBonus() ?? [],
                extractModifiers(statisticsModifiers, domains),
            ].flat();

            const rollOptions = this.getRollOptions(domains);
            const stat = mergeObject(new StatisticModifier("ac", modifiers, rollOptions), data.attributes.ac, {
                overwrite: false,
            });
            stat.base = base;
            stat.value = 10 + stat.totalModifier;
            stat.breakdown = [game.i18n.localize("PF2E.ArmorClassBase")]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                )
                .join(", ");

            data.attributes.ac = stat;
        }

        this.prepareSaves();

        // Perception
        {
            const base = data.attributes.perception.value;
            const domains = ["perception", "wis-based", "all"];
            const modifiers = [
                new ModifierPF2e("PF2E.BaseModifier", base - data.abilities.wis.mod, MODIFIER_TYPE.UNTYPED),
                new ModifierPF2e(CONFIG.PF2E.abilities.wis, data.abilities.wis.mod, MODIFIER_TYPE.ABILITY),
                ...extractModifiers(statisticsModifiers, domains),
            ];

            const stat = mergeObject(
                new StatisticModifier("perception", modifiers, this.getRollOptions(domains)),
                data.attributes.perception,
                { overwrite: false }
            );
            stat.base = base;
            stat.notes = extractNotes(rollNotes, domains);
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            stat.roll = async (args: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                const label = game.i18n.localize("PF2E.PerceptionCheck");
                const rollOptions = args.options ?? [];
                const rollTwice = extractRollTwice(this.synthetics.rollTwice, domains, rollOptions);

                const roll = await CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    {
                        actor: this,
                        type: "perception-check",
                        options: args.options,
                        dc: args.dc,
                        rollTwice,
                        notes: stat.notes,
                    },
                    args.event,
                    args.callback
                );

                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                }

                return roll;
            };

            data.attributes.perception = stat;
        }

        // default all skills to untrained
        data.skills = {};
        for (const [skill, { ability, shortform }] of Object.entries(SKILL_EXPANDED)) {
            const domains = [skill, `${ability}-based`, "skill-check", `${ability}-skill-check`, "all"];
            const modifiers = [
                new ModifierPF2e("PF2E.BaseModifier", 0, MODIFIER_TYPE.UNTYPED),
                new ModifierPF2e(CONFIG.PF2E.abilities[ability], data.abilities[ability].mod, MODIFIER_TYPE.ABILITY),
                ...extractModifiers(statisticsModifiers, domains),
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
                    roll: async (args: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                        console.warn(
                            `Rolling skill checks via actor.data.data.skills.${shortform}.roll() is deprecated, use actor.skills.${skill}.check.roll() instead`
                        );
                        const label = game.i18n.format("PF2E.SkillCheckWithName", { skillName: name });
                        const rollOptions = args.options ?? [];
                        const rollTwice = extractRollTwice(this.synthetics.rollTwice, domains, rollOptions);

                        const roll = await CheckPF2e.roll(
                            new CheckModifier(label, stat),
                            { actor: this, type: "skill-check", options: args.options, dc: args.dc, rollTwice, notes },
                            args.event,
                            args.callback
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
            data.skills[shortform] = stat;
        }

        // Automatic Actions
        data.actions = [];

        // process OwnedItem instances, which for NPCs include skills, attacks, equipment, special abilities etc.
        const generatedMelee = Array.from(strikes.values()).flatMap((w) => w.toNPCAttacks());
        const items = this.items.contents.concat(generatedMelee);
        for (const item of items) {
            const itemData = item.data;
            if (itemData.type === "lore") {
                // override untrained skills if defined in the NPC data
                const skill = sluggify(itemData.name); // normalize skill name to lower-case and dash-separated words
                // assume lore, if skill cannot be looked up
                const { ability, shortform } = SKILL_EXPANDED[skill] ?? { ability: "int", shortform: skill };

                const base = itemData.data.mod.value;
                const mod = data.abilities[ability].mod;
                const domains = [
                    skill,
                    `${ability}-based`,
                    "skill-check",
                    "lore-skill-check",
                    `${ability}-skill-check`,
                    "all",
                ];
                const modifiers = [
                    new ModifierPF2e("PF2E.BaseModifier", base - mod, MODIFIER_TYPE.UNTYPED),
                    new ModifierPF2e(CONFIG.PF2E.abilities[ability], mod, MODIFIER_TYPE.ABILITY),
                    extractModifiers(statisticsModifiers, domains),
                ].flat();

                const stat = mergeObject(
                    new StatisticModifier(skill, modifiers, this.getRollOptions(domains)),
                    data.skills[shortform],
                    { overwrite: false }
                );
                stat.notes = extractNotes(rollNotes, domains);
                stat.itemID = itemData._id;
                stat.base = base;
                stat.expanded = skill;
                stat.label = itemData.name;
                stat.lore = !SKILL_EXPANDED[skill];
                stat.rank = 1; // default to trained
                stat.value = stat.totalModifier;
                stat.visible = true;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    .join(", ");
                stat.roll = async (args: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                    console.warn(
                        `Rolling skill checks via actor.data.data.skills.${shortform}.roll() is deprecated, use actor.skills.${skill}.check.roll() instead`
                    );
                    const label = game.i18n.format("PF2E.SkillCheckWithName", { skillName: itemData.name });
                    const rollOptions = args.options ?? [];
                    const rollTwice = extractRollTwice(this.synthetics.rollTwice, domains, rollOptions);
                    const context: CheckRollContext = {
                        actor: this,
                        type: "skill-check",
                        options: rollOptions,
                        dc: args.dc,
                        rollTwice,
                        notes: stat.notes,
                    };

                    const roll = await CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        context,
                        args.event,
                        args.callback
                    );

                    for (const rule of this.rules.filter((r) => !r.ignored)) {
                        await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                    }

                    return roll;
                };

                const variants = itemData.data.variants;
                if (variants && Object.keys(variants).length) {
                    stat.variants = [];
                    for (const [, variant] of Object.entries(variants)) {
                        stat.variants.push(variant);
                    }
                }

                data.skills[shortform] = stat;
            } else if (item instanceof MeleePF2e) {
                const meleeData = item.data;
                const modifiers: ModifierPF2e[] = [];

                // traits
                const traits = meleeData.data.traits.value;

                // Determine the base ability score for this attack.
                let ability: AbilityString;
                {
                    ability = meleeData.data.weaponType.value === "ranged" ? "dex" : "str";
                    const bonus = Number(meleeData.data.bonus?.value) || 0;
                    if (traits.includes("finesse")) {
                        ability = "dex";
                    } else if (traits.includes("brutal")) {
                        ability = "str";
                    }

                    const mod = data.abilities[ability].mod;
                    modifiers.push(
                        new ModifierPF2e("PF2E.BaseModifier", bonus - mod, MODIFIER_TYPE.UNTYPED),
                        new ModifierPF2e(CONFIG.PF2E.abilities[ability], mod, MODIFIER_TYPE.ABILITY)
                    );
                }

                // Conditions and Custom modifiers to attack rolls
                const slug = item.slug ?? sluggify(item.name);
                const unarmedOrWeapon = meleeData.data.traits.value.includes("unarmed") ? "unarmed" : "weapon";
                const meleeOrRanged = meleeData.data.weaponType.value;

                const domains = [
                    "attack",
                    "mundane-attack",
                    `${slug}-attack`,
                    `${ability}-attack`,
                    `${ability}-based`,
                    `${meleeData._id}-attack`,
                    `${unarmedOrWeapon}-attack-roll`,
                    `${meleeOrRanged}-attack-roll`,
                    "strike-attack-roll",
                    "attack-roll",
                    "all",
                ];
                modifiers.push(...extractModifiers(statisticsModifiers, domains));
                modifiers.push(...StrikeAttackTraits.createAttackModifiers(item));
                const notes = extractNotes(rollNotes, domains);

                // action image
                const { imageUrl, actionGlyph } = ActorPF2e.getActionGraphics("action", 1);

                const attackEffects: Record<string, string | undefined> = CONFIG.PF2E.attackEffects;
                const additionalEffects = meleeData.data.attackEffects.value.map((tag) => {
                    const label =
                        attackEffects[tag] ??
                        this.items.find((item) => (item.slug ?? sluggify(item.name)) === tag)?.name ??
                        tag;
                    return { tag, label };
                });

                const statistic = new StatisticModifier(meleeData.name, modifiers, this.getRollOptions(domains));

                const traitObjects = traits.map(
                    (t): TraitViewData => ({
                        name: t,
                        label: CONFIG.PF2E.npcAttackTraits[t] ?? t,
                        description: CONFIG.PF2E.traitsDescriptions[t],
                    })
                );

                const action: NPCStrike = mergeObject(statistic, {
                    type: "strike" as const,
                    glyph: actionGlyph,
                    description: item.description,
                    imageUrl,
                    sourceId: item.id,
                    attackRollType: item.isRanged ? "PF2E.NPCAttackRanged" : "PF2E.NPCAttackMelee",
                    additionalEffects,
                    item,
                    weapon: item,
                    traits: traitObjects,
                    options: [],
                    variants: [],
                    success: "",
                    ready: true,
                    criticalSuccess: "",
                });

                Object.defineProperty(action, "origin", {
                    get: () => this.items.get(item.id),
                });

                action.breakdown = action.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    .join(", ");

                // Add a damage roll breakdown
                action.damageBreakdown = Object.values(meleeData.data.damageRolls).flatMap((roll) => {
                    const damageType = game.i18n.localize(CONFIG.PF2E.damageTypes[roll.damageType as DamageType]);
                    return [`${roll.damage} ${damageType}`];
                });
                if (action.damageBreakdown.length > 0) {
                    if (this.isElite) {
                        action.damageBreakdown[0] =
                            action.damageBreakdown[0] + ` +2 ${game.i18n.localize("PF2E.NPC.Adjustment.EliteLabel")}`;
                    } else if (this.isWeak) {
                        action.damageBreakdown[0] =
                            action.damageBreakdown[0] + ` -2 ${game.i18n.localize("PF2E.NPC.Adjustment.WeakLabel")}`;
                    }
                }

                const getRangeIncrement = (distance: number | null): number | null => {
                    const weaponIncrement = item.rangeIncrement;
                    return typeof distance === "number" && typeof weaponIncrement === "number"
                        ? Math.max(Math.ceil(distance / weaponIncrement), 1)
                        : null;
                };

                const strikeLabel = game.i18n.localize("PF2E.WeaponStrikeLabel");
                const maps = calculateMAP(item);
                const sign = action.totalModifier < 0 ? "" : "+";
                const attackTrait = {
                    name: "attack",
                    label: CONFIG.PF2E.featTraits.attack,
                    description: CONFIG.PF2E.traitsDescriptions.attack,
                };

                action.variants = [
                    null,
                    new ModifierPF2e("PF2E.MultipleAttackPenalty", maps.map2, MODIFIER_TYPE.UNTYPED),
                    new ModifierPF2e("PF2E.MultipleAttackPenalty", maps.map3, MODIFIER_TYPE.UNTYPED),
                ].map((map) => {
                    const label = map
                        ? game.i18n.format("PF2E.MAPAbbreviationLabel", { penalty: map.modifier })
                        : `${strikeLabel} ${sign}${action.totalModifier}`;
                    return {
                        label,
                        roll: async (args: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                            const attackEffects = await this.getAttackEffects(meleeData);
                            const rollNotes = notes.concat(attackEffects);
                            const context = this.getAttackRollContext({ item, viewOnly: false });
                            // Always add all weapon traits as options
                            const rollOptions = [
                                args.options ?? [],
                                context.options,
                                meleeData.data.traits.value,
                                context.self.item.getRollOptions("weapon"),
                            ].flat();

                            // Legacy support for "melee", "ranged", and "thrown" roll options
                            if (item.isThrown) {
                                rollOptions.push("ranged", "thrown");
                            } else if (item.isRanged) {
                                rollOptions.push("ranged");
                            } else {
                                rollOptions.push("melee");
                            }

                            const rangeIncrement = getRangeIncrement(context.target?.distance ?? null);
                            const rangePenalty = this.getRangePenalty(rangeIncrement, domains, rollOptions);
                            const otherModifiers = [map, rangePenalty].filter((m): m is ModifierPF2e => !!m);
                            const checkName = game.i18n.format(
                                item.isMelee ? "PF2E.Action.Strike.MeleeLabel" : "PF2E.Action.Strike.RangedLabel",
                                { weapon: item.name }
                            );

                            const roll = await CheckPF2e.roll(
                                new CheckModifier(checkName, action, otherModifiers),
                                {
                                    actor: context.self.actor,
                                    item: context.self.item,
                                    target: context.target,
                                    type: "attack-roll",
                                    options: rollOptions,
                                    notes: rollNotes,
                                    dc: args.dc ?? context.dc,
                                    rollTwice: extractRollTwice(this.synthetics.rollTwice, domains, rollOptions),
                                    traits: [attackTrait],
                                },
                                args.event
                            );

                            for (const rule of this.rules.filter((r) => !r.ignored)) {
                                await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                            }

                            return roll;
                        },
                    };
                });
                action.roll = action.attack = action.variants[0].roll;

                const damageRoll =
                    (outcome: "success" | "criticalSuccess"): RollFunction =>
                    async (args: RollParameters) => {
                        const context = this.getDamageRollContext({ item, viewOnly: false });
                        // always add all weapon traits as options
                        const options = (args.options ?? [])
                            .concat(context.options)
                            .concat(meleeData.data.traits.value);
                        const damage = WeaponDamagePF2e.calculateStrikeNPC(
                            context.self.item.data,
                            context.self.actor,
                            [attackTrait],
                            deepClone(statisticsModifiers),
                            this.cloneSyntheticsRecord(damageDice),
                            1,
                            options,
                            rollNotes
                        );
                        const { self, target } = context;

                        await DamageRollPF2e.roll(
                            damage,
                            { type: "damage-roll", self, target, outcome, options },
                            args.callback
                        );
                    };
                action.damage = damageRoll("success");
                action.critical = damageRoll("criticalSuccess");

                data.actions.push(action);
            }
        }

        // Spellcasting Entries
        for (const entry of itemTypes.spellcastingEntry) {
            const { ability, tradition } = entry;
            const abilityMod = data.abilities[ability].mod;

            // There are still some bestiary entries where these values are strings
            entry.data.data.spelldc.dc = Number(entry.data.data.spelldc.dc);
            entry.data.data.spelldc.value = Number(entry.data.data.spelldc.value);

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
            const baseMod = Number(entry.data.data?.spelldc?.value ?? 0);
            const attackModifiers = [
                new ModifierPF2e("PF2E.BaseModifier", baseMod - abilityMod, MODIFIER_TYPE.UNTYPED),
                new ModifierPF2e(CONFIG.PF2E.abilities[ability], abilityMod, MODIFIER_TYPE.ABILITY),
                ...extractModifiers(statisticsModifiers, baseSelectors),
                ...extractModifiers(statisticsModifiers, attackSelectors),
            ];

            // Save Modifiers, reverse engineer using the user configured value - 10
            const baseDC = Number(entry.data.data?.spelldc?.dc ?? 0);
            const saveModifiers = [
                new ModifierPF2e("PF2E.BaseModifier", baseDC - 10 - abilityMod, MODIFIER_TYPE.UNTYPED),
                new ModifierPF2e(CONFIG.PF2E.abilities[ability], abilityMod, MODIFIER_TYPE.ABILITY),
                ...extractModifiers(statisticsModifiers, baseSelectors),
                ...extractModifiers(statisticsModifiers, saveSelectors),
            ];

            // Assign statistic data to the spellcasting entry
            entry.statistic = new Statistic(this, {
                slug: sluggify(entry.name),
                label: CONFIG.PF2E.magicTraditions[tradition],
                notes: extractNotes(rollNotes, [...baseSelectors, ...attackSelectors]),
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

            entry.data.data.statisticData = entry.statistic.getChatData();

            // The elite/weak modifier doesn't update the source data, so we do it again here
            if (this.isElite) {
                entry.data.data.spelldc.dc += 2;
                entry.data.data.spelldc.value += 2;
            } else if (this.isWeak) {
                entry.data.data.spelldc.dc -= 2;
                entry.data.data.spelldc.value -= 2;
            }
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
        const data = this.data.data;
        const { rollNotes, statisticsModifiers } = this.synthetics;

        // Saving Throws
        const saves: Partial<Record<SaveType, Statistic>> = {};
        for (const saveType of SAVE_TYPES) {
            const save = data.saves[saveType];
            const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const base = save.value;
            const ability = save.ability;
            const abilityMod = data.abilities[ability].mod;

            const selectors = [saveType, `${ability}-based`, "saving-throw", "all"];
            const stat = new Statistic(this, {
                slug: saveType,
                label: saveName,
                notes: extractNotes(rollNotes, selectors),
                domains: selectors,
                modifiers: [
                    new ModifierPF2e("PF2E.BaseModifier", base - abilityMod, MODIFIER_TYPE.UNTYPED),
                    new ModifierPF2e(CONFIG.PF2E.abilities[ability], abilityMod, MODIFIER_TYPE.ABILITY),
                    ...extractModifiers(statisticsModifiers, selectors),
                ],
                check: {
                    type: "saving-throw",
                },
                dc: {},
            });

            saves[saveType] = stat;
            mergeObject(this.data.data.saves[saveType], stat.getCompatData());
            this.data.data.saves[saveType].base = base;
        }

        this.saves = saves as Record<SaveType, Statistic>;
    }

    protected async getAttackEffects(sourceItemData: MeleeData): Promise<RollNotePF2e[]> {
        const notes: RollNotePF2e[] = [];
        const description = sourceItemData.data.description.value;
        if (description) {
            notes.push(
                new RollNotePF2e(
                    "all",
                    `<div style="display: inline-block; font-weight: normal; line-height: 1.3em;" data-visibility="gm">${description}</div>`
                )
            );
        }
        const formatItemName = (item: ItemPF2e): string => {
            if (item instanceof ConsumablePF2e) {
                return `${item.name} - ${LocalizePF2e.translations.ITEM.TypeConsumable} (${item.quantity}) <button type="button" style="width: auto; line-height: 14px;" data-action="consume" data-item="${item.id}">${LocalizePF2e.translations.PF2E.ConsumableUseLabel}</button>`;
            }
            return item.name;
        };
        const formatNoteText = (itemName: string, item: ItemPF2e) => {
            // Call enrichString with the correct item context
            const rollData = item.getRollData();
            const description = TextEditorPF2e.enrichString(item.description, { rollData });

            return `<div style="display: inline-block; font-weight: normal; line-height: 1.3em;" data-visibility="gm"><div><strong>${itemName}</strong></div>${description}</div>`;
        };

        for (const attackEffect of sourceItemData.data.attackEffects.value) {
            const item = this.items.find(
                (item) => item.type !== "melee" && (item.slug ?? sluggify(item.name)) === sluggify(attackEffect)
            );
            const note = new RollNotePF2e("all", "");
            if (item) {
                // Get description from the actor item.
                note.text = formatNoteText(formatItemName(item), item);
                notes.push(note);
            } else {
                // Get description from the bestiary glossary compendium.
                const compendium = game.packs.get("pf2e.bestiary-ability-glossary-srd", { strict: true });
                const packItem = (await compendium.getDocuments({ "data.slug": { $in: [attackEffect] } }))[0];
                if (packItem instanceof ItemPF2e) {
                    note.text = formatNoteText(formatItemName(packItem), packItem);
                    notes.push(note);
                }
            }
        }

        return notes;
    }

    protected getHpAdjustment(level: number, adjustment: "elite" | "weak" | "normal"): number {
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
    async applyAdjustment(adjustment: "elite" | "weak" | "normal"): Promise<void> {
        if (
            (this.isElite && adjustment === "elite") ||
            (this.isWeak && adjustment === "weak") ||
            (!this.isElite && !this.isWeak && adjustment === "normal")
        ) {
            return;
        }

        const currentHPAdjustment = (() => {
            if (this.isElite) {
                return this.getHpAdjustment(this.getBaseLevel(), "elite");
            } else if (this.isWeak) {
                return this.getHpAdjustment(this.getBaseLevel(), "weak");
            } else {
                return 0;
            }
        })();
        const newHPAdjustment = this.getHpAdjustment(this.getBaseLevel(), adjustment);
        const currentHP = this.data.data.attributes.hp.value;
        const maxHP = this.data.data.attributes.hp.max;
        const newHP = (() => {
            if (this.isElite) {
                if (adjustment === "weak") {
                    return currentHP - currentHPAdjustment - newHPAdjustment;
                } else if (adjustment === "normal") {
                    return currentHP - currentHPAdjustment;
                }
            } else if (this.isWeak) {
                if (adjustment === "elite") {
                    this.data.data.attributes.hp.max = maxHP + currentHPAdjustment + newHPAdjustment; // Set max hp to allow update of current hp > max
                    return currentHP + currentHPAdjustment + newHPAdjustment;
                } else if (adjustment === "normal") {
                    this.data.data.attributes.hp.max = maxHP + currentHPAdjustment;
                    return currentHP + currentHPAdjustment;
                }
            } else {
                if (adjustment === "elite") {
                    this.data.data.attributes.hp.max = currentHP + newHPAdjustment;
                    return currentHP + newHPAdjustment;
                } else if (adjustment === "weak") {
                    return currentHP - newHPAdjustment;
                }
            }
            return currentHP;
        })();

        const toAdd = adjustment === "normal" ? [] : [adjustment];
        const toRemove = adjustment === "weak" ? ["elite"] : adjustment === "elite" ? ["weak"] : ["elite", "weak"];
        const newTraits = this.toObject()
            .data.traits.traits.value.filter((trait) => !toRemove.includes(trait))
            .concat(toAdd);

        await this.update({
            "data.attributes.hp.value": Math.max(0, newHP),
            "data.traits.traits.value": newTraits,
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
        const source = this.data._source;
        const changes: DeepPartial<NPCSource> = {
            name: params.name ?? this.name,
            data: {
                details: { publicNotes: params.description ?? source.data.details.publicNotes },
            },
            img: params.img?.actor ?? source.img,
            token: { img: params.img?.token ?? source.token.img },
        };

        return this.clone(changes, { save: params.save, keepId: params.keepId });
    }
}

interface NPCPF2e {
    readonly data: NPCData;

    _sheet: NPCSheetPF2e<this> | null;

    get sheet(): NPCSheetPF2e<this>;
}

export { NPCPF2e };
