/* global game, CONFIG */
import { PF2EActor, SKILL_EXPANDED } from './actor';
import { PF2EItem } from '../item/item';
import { PF2CheckModifier, PF2Modifier, PF2ModifierType, PF2StatisticModifier } from '../modifiers';
import { PF2WeaponDamage } from '../system/damage/weapon';
import { PF2Check, PF2DamageRoll } from '../system/rolls';
import { CharacterStrike, CharacterStrikeTrait, NpcData } from './actorDataDefinitions';
import { PF2RuleElements } from '../rules/rules';

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
        const { statisticsModifiers, damageDice, strikes } = this._prepareCustomModifiers(actorData, rules);

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
            [saveName, `${save.ability}-based`, 'saving-throw', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
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
                    { actor: this, type: 'saving-throw', options },
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
            ['perception', 'wis-based', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
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
                    { actor: this, type: 'perception-check', options },
                    event,
                    callback,
                );
            };

            data.attributes.perception = stat;
        }

        // Automatic Actions
        data.actions = [];

        // process OwnedItem instances, which for NPCs include skills, attacks, equipment, special abilities etc.
        for (const item of actorData.items.concat(strikes)) {
            if (item.type === 'lore') {
                // skill
                // normalize skill name to lower-case and dash-separated words
                const skill = item.name.toLowerCase().replace(/\s+/g, '-');
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
                [skill, `${ability}-based`, 'skill-check', 'all'].forEach((key) => {
                    (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                });

                const stat = mergeObject(new PF2StatisticModifier(item.name, modifiers), data.skills[shortform], {
                    overwrite: false,
                });
                stat.base = base;
                stat.expanded = skill;
                stat.label = item.name;
                stat.value = stat.totalModifier;
                stat.visible = true;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = (event, options = [], callback?) => {
                    const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: item.name });
                    PF2Check.roll(
                        new PF2CheckModifier(label, stat),
                        { actor: this, type: 'skill-check', options },
                        event,
                        callback,
                    );
                };

                data.skills[shortform] = stat;
            } else if (item.type === 'melee') {
                const modifiers = [];

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
                        { actor: this, type: 'attack-roll', options },
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
                                { actor: this, type: 'attack-roll', options },
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
                                { actor: this, type: 'attack-roll', options },
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
                                { actor: this, type: 'attack-roll', options },
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
                        {},
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
                        {},
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
        const attitude = PF2ENPC.mapTokenDispositionToNPCAttitude(disposition);
        this.data.data.traits.attitude.value = attitude;
    }
}
