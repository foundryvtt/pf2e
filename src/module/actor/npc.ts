/* global game, CONFIG */
import { PF2EActor, SKILL_DICTIONARY, SKILL_EXPANDED } from './actor';
import { PF2EItem } from '../item/item';
import { PF2CheckModifier, PF2Modifier, PF2ModifierType, PF2StatisticModifier } from '../modifiers';
import { PF2WeaponDamage } from '../system/damage/weapon';
import { PF2Check, PF2DamageRoll } from '../system/rolls';
import { CharacterStrike, CharacterStrikeTrait, NpcData, NPCSkillData } from './actorDataDefinitions';
import { PF2RuleElements } from '../rules/rules';
import { PF2RollNote } from '../notes';
import { PF2ECONFIG } from '../../scripts/config';

export class PF2ENPC extends PF2EActor {
    /** @override */
    data!: NpcData;

    /** Prepare Character type specific data. */
    prepareData(): void {
        super.prepareData();
        const actorData = this.data;
        const rules = actorData.items.reduce(
            (accumulated, current) => accumulated.concat(PF2RuleElements.fromOwnedItem(current)),
            [],
        );

        const { data } = actorData;
        const { statisticsModifiers, damageDice, strikes, rollNotes } = this._prepareCustomModifiers(actorData, rules);

        // Compute 'fake' ability scores from ability modifiers (just in case the scores are required for something)
        for (const abl of Object.values(actorData.data.abilities)) {
            abl.mod = Number(abl.mod ?? 0); // ensure the modifier is never a string
            abl.value = abl.mod * 2 + 10;
        }

        // Armor Class
        {
            const base: number = data.attributes.ac.base ?? Number(data.attributes.ac.value);
            const dexterity = Math.min(
                data.abilities.dex.mod,
                ...(data.attributes.dexCap ?? []).map((cap) => cap.value),
            );
            const modifiers = [
                new PF2Modifier('PF2E.BaseModifier', base - 10 - dexterity, PF2ModifierType.UNTYPED),
                new PF2Modifier(CONFIG.PF2E.abilities.dex, dexterity, PF2ModifierType.ABILITY),
            ];
            ['ac', 'dex-based', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
            });

            const stat = mergeObject(new PF2StatisticModifier('ac', modifiers), data.attributes.ac, {
                overwrite: false,
            });
            stat.base = base;
            stat.value = 10 + stat.totalModifier;
            stat.breakdown = [game.i18n.localize('PF2E.ArmorClassBase')]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`),
                )
                .join(', ');

            data.attributes.ac = stat;
        }

        // Saving Throws
        for (const [saveName, save] of Object.entries(data.saves as Record<string, any>)) {
            const base: number = save.base ?? Number(save.value);
            const modifiers = [
                new PF2Modifier('PF2E.BaseModifier', base - data.abilities[save.ability].mod, PF2ModifierType.UNTYPED),
                new PF2Modifier(
                    CONFIG.PF2E.abilities[save.ability],
                    data.abilities[save.ability].mod,
                    PF2ModifierType.ABILITY,
                ),
            ];
            const notes = [] as PF2RollNote[];
            [saveName, `${save.ability}-based`, 'saving-throw', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const stat = mergeObject(new PF2StatisticModifier(saveName, modifiers), save, {
                overwrite: false,
            });
            stat.base = base;
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            stat.roll = (event, options = [], callback?) => {
                const label = game.i18n.format('PF2E.SavingThrowWithName', {
                    saveName: game.i18n.localize(CONFIG.PF2E.saves[saveName]),
                });
                PF2Check.roll(
                    new PF2CheckModifier(label, stat),
                    { actor: this, type: 'saving-throw', options, notes },
                    event,
                    callback,
                );
            };

            data.saves[saveName] = stat;
        }

        // Perception
        {
            const base: number = data.attributes.perception.base ?? Number(data.attributes.perception.value);
            const modifiers = [
                new PF2Modifier('PF2E.BaseModifier', base - data.abilities.wis.mod, PF2ModifierType.UNTYPED),
                new PF2Modifier(CONFIG.PF2E.abilities.wis, data.abilities.wis.mod, PF2ModifierType.ABILITY),
            ];
            const notes = [] as PF2RollNote[];
            ['perception', 'wis-based', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const stat = mergeObject(new PF2StatisticModifier('perception', modifiers), data.attributes.perception, {
                overwrite: false,
            });
            stat.base = base;
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            stat.roll = (event, options = [], callback?) => {
                const label = game.i18n.localize('PF2E.PerceptionCheck');
                PF2Check.roll(
                    new PF2CheckModifier(label, stat),
                    { actor: this, type: 'perception-check', options, notes },
                    event,
                    callback,
                );
            };

            data.attributes.perception = stat;
        }

        // default all skills to untrained
        for (const [skill, { ability, shortform }] of Object.entries(SKILL_EXPANDED)) {
            const modifiers = [
                new PF2Modifier('PF2E.BaseModifier', 0, PF2ModifierType.UNTYPED),
                new PF2Modifier(CONFIG.PF2E.abilities[ability], data.abilities[ability].mod, PF2ModifierType.ABILITY),
            ];
            const notes = [] as PF2RollNote[];
            [skill, `${ability}-based`, 'skill-check', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const name = game.i18n.localize(`PF2E.Skill${SKILL_DICTIONARY[shortform].capitalize()}`);
            const stat = mergeObject(
                new PF2StatisticModifier(name, modifiers),
                {
                    ability,
                    expanded: skill,
                    label: name,
                    visible: false,
                },
                { overwrite: false },
            );
            stat.lore = false;
            stat.rank = 0; // default to untrained
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            stat.roll = (event, options = [], callback?) => {
                const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: name });
                PF2Check.roll(
                    new PF2CheckModifier(label, stat),
                    { actor: this, type: 'skill-check', options, notes },
                    event,
                    callback,
                );
            };
            data.skills[shortform] = stat;
        }

        // Automatic Actions
        data.actions = [];

        // process OwnedItem instances, which for NPCs include skills, attacks, equipment, special abilities etc.
        for (const item of actorData.items.concat(strikes)) {
            if (item.type === 'lore') {
                // override untrained skills if defined in the NPC data
                const skill = item.name.slugify(); // normalize skill name to lower-case and dash-separated words
                // assume lore, if skill cannot be looked up
                const { ability, shortform } = SKILL_EXPANDED[skill] ?? { ability: 'int', shortform: skill };

                const base: number = (item.data.mod as any).base ?? Number(item.data.mod.value);
                const modifiers = [
                    new PF2Modifier('PF2E.BaseModifier', base - data.abilities[ability].mod, PF2ModifierType.UNTYPED),
                    new PF2Modifier(
                        CONFIG.PF2E.abilities[ability],
                        data.abilities[ability].mod,
                        PF2ModifierType.ABILITY,
                    ),
                ];
                const notes = [] as PF2RollNote[];
                [skill, `${ability}-based`, 'skill-check', 'all'].forEach((key) => {
                    (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                    (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
                });

                const stat = mergeObject(new PF2StatisticModifier(item.name, modifiers), data.skills[shortform], {
                    overwrite: false,
                });
                stat.itemID = item._id;
                stat.base = base;
                stat.expanded = skill;
                stat.label = item.name;
                stat.lore = !SKILL_EXPANDED[skill];
                stat.rank = 1; // default to trained
                stat.value = stat.totalModifier;
                stat.visible = true;
                stat.loreItemId = item._id; // Required to find the item related to this skill later
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = (event, options = [], callback?) => {
                    const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: item.name });
                    PF2Check.roll(
                        new PF2CheckModifier(label, stat),
                        { actor: this, type: 'skill-check', options, notes },
                        event,
                        callback,
                    );
                };

                const variants = (item.data as any).variants;
                if (variants && Object.keys(variants).length) {
                    stat.variants = [];
                    for (const [, variant] of Object.entries(variants)) {
                        stat.variants.push(variant);
                    }
                }

                data.skills[shortform] = stat;
            } else if (item.type === 'melee') {
                const modifiers = [];
                const notes = [] as PF2RollNote[];

                // traits
                const traits = PF2EActor.traits(item?.data?.traits?.value);

                // Determine the base ability score for this attack.
                let ability;
                {
                    ability = (item.data as any).weaponType?.value === 'ranged' ? 'dex' : 'str';
                    const bonus = Number(item.data?.bonus?.value ?? 0);
                    if (traits.includes('finesse')) {
                        ability = 'dex';
                    } else if (traits.includes('brutal')) {
                        ability = 'str';
                    }
                    modifiers.push(
                        new PF2Modifier(
                            'PF2E.BaseModifier',
                            bonus - data.abilities[ability].mod,
                            PF2ModifierType.UNTYPED,
                        ),
                        new PF2Modifier(
                            CONFIG.PF2E.abilities[ability],
                            data.abilities[ability].mod,
                            PF2ModifierType.ABILITY,
                        ),
                    );
                }

                // Conditions and Custom modifiers to attack rolls
                {
                    const stats = [];
                    stats.push(`${item.name.replace(/\s+/g, '-').toLowerCase()}-attack`); // convert white spaces to dash and lower-case all letters
                    stats
                        .concat([
                            'attack',
                            `${ability}-attack`,
                            `${ability}-based`,
                            `${item._id}-attack`,
                            'attack-roll',
                            'all',
                        ])
                        .forEach((key) => {
                            (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                            (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
                        });
                }

                // action image
                const { imageUrl, actionGlyph } = PF2EActor.getActionGraphics(
                    (item as any).data?.actionType?.value || 'action',
                    parseInt(((item as any).data?.actions || {}).value, 10) || 1,
                );

                const action = new PF2StatisticModifier(item.name, modifiers) as CharacterStrike;
                action.glyph = actionGlyph;
                action.imageUrl = imageUrl;
                action.type = 'strike';
                action.attackRollType =
                    (item.data as any).weaponType?.value === 'ranged' ? 'PF2E.NPCAttackRanged' : 'PF2E.NPCAttackMelee';
                action.breakdown = action.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');

                action.traits = [
                    { name: 'attack', label: game.i18n.localize('PF2E.TraitAttack'), toggle: false },
                ].concat(
                    traits.map((trait) => {
                        const key = CONFIG.PF2E.weaponTraits[trait] ?? trait;
                        const option: CharacterStrikeTrait = {
                            name: trait,
                            label: key,
                            toggle: false,
                        };
                        return option;
                    }),
                );

                // Add the base attack roll (used for determining on-hit)
                action.attack = (event, options = []) => {
                    options = options.concat(PF2EActor.traits(item?.data?.traits?.value)); // always add all weapon traits as options
                    PF2Check.roll(
                        new PF2CheckModifier(`Strike: ${action.name}`, action),
                        { actor: this, type: 'attack-roll', options, notes },
                        event,
                    );
                };
                action.roll = action.attack;

                const map = PF2EItem.calculateMap(item);
                action.variants = [
                    {
                        label: `Strike ${action.totalModifier < 0 ? '' : '+'}${action.totalModifier}`,
                        roll: (event, options = []) => {
                            options = options.concat(PF2EActor.traits(item?.data?.traits?.value)); // always add all weapon traits as options
                            PF2Check.roll(
                                new PF2CheckModifier(`Strike: ${action.name}`, action),
                                { actor: this, type: 'attack-roll', options, notes },
                                event,
                            );
                        },
                    },
                    {
                        label: `MAP ${map.map2}`,
                        roll: (event, options = []) => {
                            options = options.concat(PF2EActor.traits(item?.data?.traits?.value)); // always add all weapon traits as options
                            PF2Check.roll(
                                new PF2CheckModifier(`Strike: ${action.name}`, action, [
                                    new PF2Modifier('PF2E.MultipleAttackPenalty', map.map2, PF2ModifierType.UNTYPED),
                                ]),
                                { actor: this, type: 'attack-roll', options, notes },
                                event,
                            );
                        },
                    },
                    {
                        label: `MAP ${map.map3}`,
                        roll: (event, options = []) => {
                            options = options.concat(PF2EActor.traits(item?.data?.traits?.value)); // always add all weapon traits as options
                            PF2Check.roll(
                                new PF2CheckModifier(`Strike: ${action.name}`, action, [
                                    new PF2Modifier('PF2E.MultipleAttackPenalty', map.map3, PF2ModifierType.UNTYPED),
                                ]),
                                { actor: this, type: 'attack-roll', options, notes },
                                event,
                            );
                        },
                    },
                ];
                action.damage = (event, options = [], callback?) => {
                    const damage = PF2WeaponDamage.calculateStrikeNPC(
                        item,
                        actorData,
                        action.traits,
                        statisticsModifiers,
                        damageDice,
                        1,
                        options,
                        rollNotes,
                    );
                    PF2DamageRoll.roll(damage, { type: 'damage-roll', outcome: 'success', options }, event, callback);
                };
                action.critical = (event, options = [], callback?) => {
                    const damage = PF2WeaponDamage.calculateStrikeNPC(
                        item,
                        actorData,
                        action.traits,
                        statisticsModifiers,
                        damageDice,
                        1,
                        options,
                        rollNotes,
                    );
                    PF2DamageRoll.roll(
                        damage,
                        { type: 'damage-roll', outcome: 'criticalSuccess', options },
                        event,
                        callback,
                    );
                };

                data.actions.push(action);
            }
        }

        // Process all NPC skills to make sure they have all data setup
        for (const skillId of Object.keys(this.data.data.skills)) {
            const skill = this.data.data.skills[skillId];

            this._processNPCSkill(skill);
        }
    }

    /**
     * Modifies the value of a NPC skill.
     * It will automatically calculate modifiers for the ability score and the base value.
     * @param skillId ID of the skill to modify.
     * @param value New total value for the skill.
     */
    assignNPCSkillValue(skillId: string, value: number) {
        const skill = this.data.data.skills[skillId];

        if (skill === undefined) {
            console.warn(`Unable to set value ${value} to skill ${skillId}. No skill with that ID.`);
            return;
        }

        const abilityName = PF2ECONFIG.abilities[skill.ability] ?? PF2ECONFIG.abilities['int'];

        const abilityModifier = skill.findModifierByName(abilityName);

        if (abilityModifier === null) {
            console.warn(
                `Unable to find ability modifier with ID ${abilityName} for skill ${skillId}. Unable to set value.`,
            );
            return;
        }

        // Base value will be what's remaining after removing the ability modifier
        const baseValue = value - abilityModifier.modifier;

        const baseModifier = skill.findModifierByName('PF2E.BaseModifier');

        if (baseModifier === null) {
            console.warn(`Unable to find base modifier for skill ${skillId}. Unable to ser value.`);
            return;
        }

        baseModifier.modifier = baseValue;

        skill.visible = baseValue > 0;

        // Refresh skill value after changing its base modifier
        skill.applyStackingRules();
        skill.value = skill.totalModifier;

        this._updateSkillVisiblity(skill);
    }

    /**
     * Updates the visibility of a skill based on its values.
     * @param skill Skill to update.
     */
    private _updateSkillVisiblity(skill: NPCSkillData): boolean {
        let isVisible: boolean = false;

        const baseModifier = skill.findModifierByName('PF2E.BaseModifier');

        if (baseModifier.modifier > 0) {
            isVisible = true;
        }

        skill.visible = isVisible;

        return isVisible;
    }

    /**
     * Converts an item to a skill name (full name, lower-case format).
     * @param itemName Name of the item.
     */
    convertItemNameToSkillName(itemName: string): string {
        return itemName.toLowerCase().replace(/\s+/g, '-');
    }

    /**
     * Converts the name of an item into the format of skill IDs.
     * @param itemName Name of the item to convert to skill ID.
     */
    convertItemNameToSkillId(itemName: string): string {
        const skillName = this.convertItemNameToSkillName(itemName);

        return this.convertSkillNameToSkillId(skillName);
    }

    /**
     * Converts the name of a skill into the name of an item.
     * @param skillName Name of the skill, using the lowercase and dash-separated format.
     */
    convertSkillNameToItemName(skillName: string): string {
        return skillName.replace(/-/g, ' ').titleCase();
    }

    /**
     * Converts the name of a skill into a skill ID.
     * @param skillName Name of the skill.
     */
    convertSkillNameToSkillId(skillName: string): string {
        for (const skillDataId of Object.keys(SKILL_EXPANDED)) {
            if (skillDataId === skillName) {
                return SKILL_EXPANDED[skillDataId].shortform;
            }
        }

        // If not possible to find a short name, use the same
        return skillName;
    }

    /**
     * Converts from the 3-letter ID to the full, lower-letter name.
     * @param skillId ID of the skill.
     */
    convertSkillIdToSkillName(skillId: string): string {
        for (const skillDataId of Object.keys(SKILL_EXPANDED)) {
            const skillData = SKILL_EXPANDED[skillDataId];

            if (skillData.shortform == skillId) {
                return skillDataId;
            }
        }

        // If not possible to find a short name, use the same
        return skillId;
    }

    /**
     * Finds the skill item related to the skill provided.
     * Each skill in the characters has an item in the items collection
     * defining the skill. They are of 'lore' type, even for non-lore skills.
     * @param skillId ID of the skill to search for.
     */
    findSkillItem(skillId: string): PF2EItem {
        const skill = this.data.data.skills[skillId];

        if (skill !== undefined && skill.loreItemId !== undefined) {
            return this.getOwnedItem(skill.loreItemId);
        }

        // If not found, try to find it based on the skill name

        let skillName = this.convertSkillIdToSkillName(skillId);

        let skillItem = this.items.find((item) => {
            if (item.type !== 'lore') return false;

            const itemSkillName = this.convertItemNameToSkillName(item.name);

            return skillName === itemSkillName;
        });

        return skillItem;
    }

    /**
     * Extra processing for NPC skills.
     * This will handle proficiency calculation, expeptions, etc.
     * The skill must be created first from a skill item before calling this method.
     * @param skill Skill to process.
     */
    _processNPCSkill(skill) {
        const totalValue: number = skill.value;
        const level = this.data.data.details.level.value;
        const ability = this.data.data.abilities[skill.ability];
        const abilityModifier = ability ? ability.mod : 0;

        // Whatever is left, must come from proficiency
        const proficiencyValue = totalValue - level - abilityModifier;

        let proficiencyRank: number;

        // Select proficiency based on value
        if (proficiencyValue >= 8) {
            proficiencyRank = 4; // Legendary
        } else if (proficiencyValue >= 6) {
            proficiencyRank = 3; // Master
        } else if (proficiencyValue >= 4) {
            proficiencyRank = 2; // Expert
        } else if (proficiencyValue >= 2) {
            proficiencyRank = 1; // Trained
        } else {
            proficiencyRank = 0; // Untrained
        }

        skill.value = totalValue;
        skill.rank = proficiencyRank;
    }

    private updateTokenAttitude(attitude: string) {
        const disposition = PF2ENPC.mapNPCAttitudeToTokenDisposition(attitude);
        const tokens = this._getTokenData();

        for (const key of Object.keys(tokens)) {
            const token = tokens[key];
            token.disposition = disposition;
        }

        const dispositionActorUpdate = {
            'token.disposition': disposition,
            attitude,
        };

        this._updateAllTokens(dispositionActorUpdate, tokens);
    }

    private static mapNPCAttitudeToTokenDisposition(attitude: string): number {
        if (attitude === null) {
            return CONST.TOKEN_DISPOSITIONS.HOSTILE;
        }

        if (attitude === 'hostile') {
            return CONST.TOKEN_DISPOSITIONS.HOSTILE;
        } else if (attitude === 'unfriendly' || attitude === 'indifferent') {
            return CONST.TOKEN_DISPOSITIONS.NEUTRAL;
        } else {
            return CONST.TOKEN_DISPOSITIONS.FRIENDLY;
        }
    }

    private static mapTokenDispositionToNPCAttitude(disposition: number): string {
        if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
            return 'friendly';
        } else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) {
            return 'indifferent';
        } else {
            return 'hostile';
        }
    }

    protected _onUpdate(data: any, options: object, userId: string, context: object) {
        super._onUpdate(data, options, userId, context);

        const attitude = data?.data?.traits?.attitude?.value;

        if (attitude && game.userId === userId) {
            this.updateTokenAttitude(attitude);
        }
    }

    public updateNPCAttitudeFromDisposition(disposition: number) {
        this.data.data.traits.attitude.value = PF2ENPC.mapTokenDispositionToNPCAttitude(disposition);
    }
}
