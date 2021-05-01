import { DamageDicePF2e, ModifierPF2e, ModifierPredicate, ProficiencyModifier, RawPredicate } from '../modifiers';
import { ConditionManager } from '../conditions';
import { isCycle } from '@item/container';
import { DicePF2e } from '@scripts/dice';
import { ItemPF2e } from '@item/base';
import { ItemDataPF2e, ConditionData, WeaponData, isMagicDetailsData } from '@item/data-definitions';
import {
    ActorDataPF2e,
    HazardData,
    AbilityString,
    isCreatureData,
    CreatureData,
    SkillAbbreviation,
    SkillData,
    SaveData,
    SaveString,
} from './data-definitions';
import { PF2RuleElement, RuleElements } from '../rules/rules';
import {
    PF2MultipleAttackPenalty,
    PF2RuleElementSynthetics,
    PF2Striking,
    PF2WeaponPotency,
} from '../rules/rules-data-definitions';
import { PhysicalItemPF2e } from '@item/physical';
import { PF2RollNote } from '../notes';
import { ErrorPF2e, objectHasKey } from '@module/utils';
import { ActiveEffectPF2e } from '@module/active-effect';
import { ArmorPF2e } from '@item/armor';
import { LocalizePF2e } from '@module/system/localize';
import { ItemTransfer } from './item-transfer';
import { ConditionPF2e } from '@item/others';
import { TokenEffect } from '@module/rules/rule-element';

export const SKILL_DICTIONARY = Object.freeze({
    acr: 'acrobatics',
    arc: 'arcana',
    ath: 'athletics',
    cra: 'crafting',
    dec: 'deception',
    dip: 'diplomacy',
    itm: 'intimidation',
    med: 'medicine',
    nat: 'nature',
    occ: 'occultism',
    prf: 'performance',
    rel: 'religion',
    soc: 'society',
    ste: 'stealth',
    sur: 'survival',
    thi: 'thievery',
});

interface SkillExpanded {
    ability: AbilityString;
    shortform: SkillAbbreviation;
}

export const SKILL_EXPANDED: Record<string, SkillExpanded> = Object.freeze({
    acrobatics: { ability: 'dex', shortform: 'acr' },
    arcana: { ability: 'int', shortform: 'arc' },
    athletics: { ability: 'str', shortform: 'ath' },
    crafting: { ability: 'int', shortform: 'cra' },
    deception: { ability: 'cha', shortform: 'dec' },
    diplomacy: { ability: 'cha', shortform: 'dip' },
    intimidation: { ability: 'cha', shortform: 'itm' },
    medicine: { ability: 'wis', shortform: 'med' },
    nature: { ability: 'wis', shortform: 'nat' },
    occultism: { ability: 'int', shortform: 'occ' },
    performance: { ability: 'cha', shortform: 'prf' },
    religion: { ability: 'wis', shortform: 'rel' },
    society: { ability: 'int', shortform: 'soc' },
    stealth: { ability: 'dex', shortform: 'ste' },
    survival: { ability: 'wis', shortform: 'sur' },
    thievery: { ability: 'dex', shortform: 'thi' },
});

const SUPPORTED_ROLL_OPTIONS = Object.freeze([
    'all',
    'attack-roll',
    'damage-roll',
    'saving-throw',
    'fortitude',
    'reflex',
    'will',
    'perception',
    'initiative',
    'skill-check',
    'counteract-check',
]);

interface ActorConstructorOptionsPF2e extends EntityConstructorOptions {
    pf2e?: {
        ready?: boolean;
    };
}

/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 * @category Actor
 */
export class ActorPF2e extends Actor<ItemPF2e, ActiveEffectPF2e> {
    constructor(data: ActorDataPF2e, options: ActorConstructorOptionsPF2e = {}) {
        if (options.pf2e?.ready) {
            delete options.pf2e.ready;
            super(data, options);
        } else {
            try {
                const ready = { pf2e: { ready: true } };
                return new CONFIG.PF2E.Actor.entityClasses[data.type](data, { ...ready, ...options });
            } catch (_error) {
                super(data, options); // eslint-disable-line constructor-super
                console.warn(`Unrecognized Actor type (${data.type}): falling back to ActorPF2e`);
            }
        }
    }

    /** Parallel to Item#type, which is omitted in Foundry versions < 0.8 */
    get type() {
        return this.data.type;
    }

    get traits(): Set<string> {
        return new Set(this.data.data.traits.traits.value);
    }

    get level(): number {
        return this.data.data.details.level.value;
    }

    get temporaryEffects(): TemporaryEffect[] {
        const tokenIcon = (data: ConditionData) => {
            const folder = CONFIG.PF2E.statusEffects.effectsIconFolder;
            const statusName = data.data.hud.statusName;
            return `${folder}${statusName}.webp`;
        };
        const conditionTokenIcons = this.itemTypes.condition
            .filter((condition) => condition.fromSystem)
            .map((condition) => tokenIcon(condition.data));
        const conditionTokenEffects = Array.from(new Set(conditionTokenIcons)).map((icon) => new TokenEffect(icon));

        const effectTokenEffects = this.itemTypes.effect
            .filter((effect) => effect.data.data.tokenIcon?.show)
            .map((effect) => new TokenEffect(effect.img));

        return super.temporaryEffects
            .concat(this.data.data.tokenEffects)
            .concat(conditionTokenEffects)
            .concat(effectTokenEffects);
    }

    /** The default sheet, token, etc. image of a newly created world actor */
    static get defaultImg(): string {
        const match = Object.entries(CONFIG.PF2E.Actor.entityClasses).find(([_key, cls]) => cls.name === this.name);
        const filename = match ? `${match[0]}.svg` : 'mystery-man.svg';
        return `systems/pf2e/icons/default-icons/${filename}`;
    }

    get defaultImg(): string {
        return ((this.constructor as unknown) as { defaultImg: string }).defaultImg;
    }

    /** Get the actor's held shield. Meaningful implementation in `CreaturePF2e`'s override. */
    get heldShield(): Owned<ArmorPF2e> | null {
        return null;
    }

    /** As of Foundry 0.7.9: All subclasses of ActorPF2e need to use this factory method rather than having their own
     *  overrides, since Foundry itself will call `ActorPF2e.create` when a new actor is created from the sidebar.
     * @override
     */
    static create<A extends ActorPF2e>(
        this: new (data: A['data'], options?: EntityConstructorOptions) => A,
        data: PreCreate<A['data']>,
        options?: EntityCreateOptions,
    ): Promise<A>;
    static create<A extends ActorPF2e>(
        this: new (data: A['data'], options?: EntityConstructorOptions) => A,
        data: PreCreate<A['data']>[] | PreCreate<A['data']>,
        options?: EntityCreateOptions,
    ): Promise<A[] | A>;
    static async create<A extends ActorPF2e>(
        data: PreCreate<A['data']>[] | PreCreate<A['data']>,
        options: EntityCreateOptions = {},
    ): Promise<A[] | A> {
        const createData: PreCreate<ActorDataPF2e>[] = Array.isArray(data) ? data : [data];
        for (const datum of createData) {
            // Set the default image according to the actor's type
            datum.img ??= CONFIG.PF2E.Actor.entityClasses[datum.type].defaultImg;

            if (game.settings.get('pf2e', 'defaultTokenSettings')) {
                // Set wounds, advantage, and display name visibility
                const nameMode = game.settings.get('pf2e', 'defaultTokenSettingsName');
                const barMode = game.settings.get('pf2e', 'defaultTokenSettingsBar');
                const merged = mergeObject(datum, {
                    permission: datum.permission ?? { default: CONST.ENTITY_PERMISSIONS.NONE },
                    token: {
                        bar1: { attribute: 'attributes.hp' }, // Default Bar 1 to Wounds
                        displayName: nameMode, // Default display name to be on owner hover
                        displayBars: barMode, // Default display bars to be on owner hover
                        name: datum.name, // Set token name to actor name
                    },
                });

                // Set default token dimensions for familiars and vehicles
                const dimensionMap: Record<string, number> = { familiar: 0.5, vehicle: 2 };
                merged.token.height ??= dimensionMap[datum.type] ?? 1;
                merged.token.width ??= merged.token.height;

                switch (merged.type) {
                    case 'animalCompanion':
                    case 'character':
                    case 'familiar':
                        // Default characters and their minions to having tokens with vision and an actor link
                        merged.token.actorLink = true;
                        merged.token.disposition = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
                        merged.token.vision = true;
                        break;
                    case 'loot':
                        // Make loot actors linked, interactable and neutral disposition
                        merged.token.actorLink = true;
                        merged.permission.default = CONST.ENTITY_PERMISSIONS.LIMITED;
                        merged.token.disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
                        break;
                    case 'npc':
                        merged.token.disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
                        break;
                    default:
                        merged.token.disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
                }

                // Swap out the initial pre-create actor data for the expanded copy
                const index = createData.indexOf(datum);
                createData[index] = merged;
            }
        }

        return super.create(data, options) as Promise<A[] | A>;
    }

    /** @override */
    prepareBaseData(): void {
        super.prepareBaseData();
        this.data.data.tokenEffects = [];
    }

    /** @override */
    prepareDerivedData(): void {
        super.prepareDerivedData();

        // Synchronize the token image with the actor image, if the token does not currently have an image.
        this._prepareTokenImg();
    }

    _prepareTokenImg() {
        if (game.settings.get('pf2e', 'defaultTokenSettings')) {
            if (this.data.token.img === this.defaultImg && this.data.token.img !== this.img) {
                this.data.token.img = this.img;
            }
        }
    }

    _applyInitiativeRollToCombatTracker(roll: Roll) {
        if (roll?.total) {
            // check that there is a combat active in this scene
            if (!game.combat) {
                ui.notifications.error('No active encounters in the Combat Tracker.');
                return;
            }

            const combatant = game.combat.turns.find((c) => c.actor.id === this._id);
            if (combatant === undefined) {
                ui.notifications.error(`No combatant found for ${this.name} in the Combat Tracker.`);
                return;
            }
            game.combat.setInitiative(combatant._id, roll.total);
        } else {
            console.log(
                'PF2e System | _applyInitiativeRollToCombatTracker | invalid roll object or roll.value mising: ',
                roll,
            );
        }
    }

    onCreateOwnedItem(child: ItemDataPF2e, _options: EntityCreateOptions, _userId: string) {
        if (!(isCreatureData(this.data) && this.can(game.user, 'update'))) return;
        const rules = RuleElements.fromRuleElementData(child.data?.rules ?? [], child);
        const tokens = this._getTokenData();
        const actorUpdates = {};
        for (const rule of rules) {
            rule.onCreate(this.data, child, actorUpdates, Object.values(tokens));
        }
        this._updateAllTokens(actorUpdates, tokens);
    }

    onDeleteOwnedItem(child: ItemDataPF2e, _options: EntityCreateOptions, _userId: string) {
        if (!(isCreatureData(this.data) && this.can(game.user, 'update'))) return;
        const rules = RuleElements.fromRuleElementData(child.data?.rules ?? [], child);
        const tokens = this._getTokenData();
        const actorUpdates = {};
        for (const rule of rules) {
            rule.onDelete(this.data, child, actorUpdates, Object.values(tokens));
        }
        this._updateAllTokens(actorUpdates, tokens);
    }

    /**
     * Builds an object with ID to token data mappings, for all tokens associated with this actor. The data has been
     * duplicated so it can easily be changed and used for updating the token instances.
     */
    protected _getTokenData(): Record<string, any> {
        const tokens: Record<string, any> = {};
        if (this.isToken) {
            const id = this?.token?.data?._id;
            if (id) {
                tokens[id] = duplicate(canvas.tokens.get(id)?.data);
            }
        } else {
            for (const scene of game.scenes.values()) {
                scene
                    .getEmbeddedCollection('Token')
                    .filter((token) => token.actorLink && token.actorId === this.id)
                    .map((token) => duplicate(token))
                    .forEach((token) => {
                        tokens[token._id] = token;
                    });
            }
        }
        return tokens;
    }

    async _updateAllTokens(actorUpdates: any, tokens: Record<string, any>): Promise<any[]> {
        const promises: Promise<any>[] = [];
        if (actorUpdates && !isObjectEmpty(actorUpdates)) {
            promises.push(this.update(actorUpdates));
        }
        for (const scene of game.scenes.values()) {
            const local = scene
                .getEmbeddedCollection('Token')
                .filter(
                    (token) =>
                        (this.isToken && token?._id === this.token?.data?._id) ||
                        (token.actorLink && token.actorId === this.id),
                )
                .map((token) => tokens[token._id])
                .filter((token) => !!token)
                .map((token) => {
                    if (!token.actorLink) {
                        token.actorData = token.actorData ?? {};
                        mergeObject(token.actorData, actorUpdates);
                    }
                    return token;
                });
            promises.push(scene.updateEmbeddedEntity('Token', local));
        }
        return Promise.all(promises);
    }

    /** Compute custom stat modifiers provided by users or given by conditions. */
    protected _prepareCustomModifiers(actorData: CreatureData, rules: PF2RuleElement[]): PF2RuleElementSynthetics {
        // Collect all sources of modifiers for statistics and damage in these two maps, which map ability -> modifiers.
        const statisticsModifiers: Record<string, ModifierPF2e[]> = {};
        const damageDice: Record<string, DamageDicePF2e[]> = {};
        const strikes: WeaponData[] = [];
        const rollNotes: Record<string, PF2RollNote[]> = {};
        const weaponPotency: Record<string, PF2WeaponPotency[]> = {};
        const striking: Record<string, PF2Striking[]> = {};
        const multipleAttackPenalties: Record<string, PF2MultipleAttackPenalty[]> = {};
        const synthetics: PF2RuleElementSynthetics = {
            damageDice,
            statisticsModifiers,
            strikes,
            rollNotes,
            weaponPotency,
            striking,
            multipleAttackPenalties,
        };
        rules.forEach((rule) => {
            try {
                rule.onBeforePrepareData(actorData, synthetics);
            } catch (error) {
                // ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onBeforePrepareData on rule element ${rule}.`, error);
            }
        });

        // Get all of the active conditions (from the item array), and add their modifiers.
        const conditions = actorData.items.filter(
            (i): i is ConditionData => i.flags.pf2e?.condition && i.type === 'condition' && i.data.active,
        );

        for (const [key, value] of ConditionManager.getModifiersFromConditions(conditions.values())) {
            statisticsModifiers[key] = (statisticsModifiers[key] || []).concat(value);
        }

        // Character-specific custom modifiers & custom damage dice.
        if (['character', 'familiar', 'npc'].includes(actorData.type)) {
            const { data } = actorData;

            // Custom Modifiers (which affect d20 rolls and damage).
            data.customModifiers = data.customModifiers ?? {};
            for (const [statistic, modifiers] of Object.entries(data.customModifiers)) {
                statisticsModifiers[statistic] = (statisticsModifiers[statistic] || []).concat(modifiers);
            }

            // Damage Dice (which add dice to damage rolls).
            data.damageDice = data.damageDice ?? {};
            for (const [attack, dice] of Object.entries(data.damageDice)) {
                damageDice[attack] = (damageDice[attack] || []).concat(dice);
            }
        }

        return {
            statisticsModifiers,
            damageDice,
            strikes,
            rollNotes,
            weaponPotency,
            striking,
            multipleAttackPenalties,
        };
    }

    getStrikeDescription(weaponData: WeaponData) {
        const flavor = {
            description: 'PF2E.Strike.Default.Description',
            criticalSuccess: 'PF2E.Strike.Default.CriticalSuccess',
            success: 'PF2E.Strike.Default.Success',
        };
        const traits = weaponData.data.traits.value;
        if (traits.includes('unarmed')) {
            flavor.description = 'PF2E.Strike.Unarmed.Description';
            flavor.success = 'PF2E.Strike.Unarmed.Success';
        } else if (traits.find((trait) => trait.startsWith('thrown'))) {
            flavor.description = 'PF2E.Strike.Combined.Description';
            flavor.success = 'PF2E.Strike.Combined.Success';
        } else if (weaponData.data.range?.value === 'melee') {
            flavor.description = 'PF2E.Strike.Melee.Description';
            flavor.success = 'PF2E.Strike.Melee.Success';
        } else if ((parseInt(weaponData.data.range?.value, 10) || 0) > 0) {
            flavor.description = 'PF2E.Strike.Ranged.Description';
            flavor.success = 'PF2E.Strike.Ranged.Success';
        }
        return flavor;
    }

    /* -------------------------------------------- */
    /*  Rolls                                       */
    /* -------------------------------------------- */

    /**
     * Roll a Skill Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollSkill(event: JQuery.Event, skillName: SkillAbbreviation) {
        const skl: SkillData = this.data.data.skills[skillName];
        const rank: string = CONFIG.PF2E.proficiencyLevels[skl.rank];
        const parts = ['@mod', '@itemBonus'];
        const flavor = `${rank} ${CONFIG.PF2E.skills[skillName]} Skill Check`;

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: {
                mod: skl.value - skl.item,
                itemBonus: skl.item,
            },
            title: flavor,
            speaker: ChatMessage.getSpeaker({ actor: this }),
        });
    }

    /**
     * Roll a Lore (Item) Skill Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollLoreSkill(event: JQuery.Event, item: Owned<ItemPF2e>) {
        const { data } = item;
        if (data.type !== 'lore') {
            throw Error('Can only roll lore skills using lore items');
        }

        const parts = ['@mod', '@itemBonus'];
        const flavor = `${item.name} Skill Check`;

        let rollMod = 0;
        let itemBonus = 0;
        if (item.actor.data.type === 'character') {
            const rank = data.data.proficient?.value || 0;
            const proficiency = ProficiencyModifier.fromLevelAndRank(this.data.data.details.level.value, rank).modifier;
            const modifier = this.data.data.abilities.int.mod;

            itemBonus = Number((data.data.item || {}).value || 0);
            rollMod = modifier + proficiency;
        } else if (item.actor.data.type === 'npc') {
            rollMod = data.data.mod.value;
        }

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: {
                mod: rollMod,
                itemBonus,
            },
            title: flavor,
            speaker: ChatMessage.getSpeaker({ actor: this }),
        });
    }

    /* -------------------------------------------- */
    /**
     * Roll a Save Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollSave(event: JQuery.Event, saveName: SaveString) {
        const save: SaveData = this.data.data.saves[saveName];
        const parts = ['@mod', '@itemBonus'];
        const flavor = `${game.i18n.localize(CONFIG.PF2E.saves[saveName])} Save Check`;

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: {
                mod: save.value - (save.item ?? 0),
                itemBonus: save.item ?? 0,
            },
            title: flavor,
            speaker: ChatMessage.getSpeaker({ actor: this }),
        });
    }

    /**
     * Roll an Ability Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollAbility(event: JQuery.Event, abilityName: AbilityString) {
        const skl = this.data.data.abilities[abilityName];
        const parts = ['@mod'];
        const flavor = `${game.i18n.localize(CONFIG.PF2E.abilities[abilityName])} Check`;

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: { mod: skl.mod },
            title: flavor,
            speaker: ChatMessage.getSpeaker({ actor: this }),
        });
    }

    /* -------------------------------------------- */

    /**
     * Roll a Attribute Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollAttribute(event: JQuery.Event, attributeName: string) {
        const skl = this.data.data.attributes[attributeName];
        const parts = ['@mod', '@itemBonus'];
        const configAttributes = CONFIG.PF2E.attributes;
        if (objectHasKey(configAttributes, attributeName)) {
            const flavor = `${game.i18n.localize(configAttributes[attributeName])} Check`;
            // Call the roll helper utility
            DicePF2e.d20Roll({
                event,
                parts,
                data: {
                    mod: skl.value - (skl.item ?? 0),
                    itemBonus: skl.item,
                },
                title: flavor,
                speaker: ChatMessage.getSpeaker({ actor: this }),
            });
        }
    }

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     *
     * @param roll The chat entry which contains the roll data
     * @param multiplier A damage multiplier to apply to the rolled damage.
     */
    static async applyDamage(
        roll: JQuery,
        multiplier: number,
        attribute = 'attributes.hp',
        modifier = 0,
        { shieldID }: { shieldID?: string } = {},
    ) {
        const tokens = canvas.tokens.controlled.filter((token) => token.actor);
        if (tokens.length === 0) {
            ui.notifications.error(game.i18n.localize('PF2E.UI.errorTargetToken'));
            return false;
        }

        const value = Math.floor(parseFloat(roll.find('.dice-total').text()) * multiplier) + modifier;
        const messageSender = roll.find('.message-sender').text();
        const flavorText = roll.find('.flavor-text').text();
        for (const token of tokens) {
            const actor = token.actor!;
            const shield =
                attribute === 'attributes.shield'
                    ? shieldID
                        ? actor.itemTypes.armor.find((armor) => armor.isShield && armor.id === shieldID) ?? null
                        : actor.heldShield
                    : null;
            if (attribute === 'attributes.shield' && shield?.isBroken) {
                const warnings = LocalizePF2e.translations.PF2E.Actions.RaiseAShield;
                ui.notifications.warn(
                    game.i18n.format(warnings.ShieldIsBroken, { actor: token.name, shield: shield.name }),
                );
            }

            const shieldFlavor =
                attribute === 'attributes.shield' && shield?.isBroken === false
                    ? game.i18n.format('PF2E.UI.applyDamage.shieldActive', { shield: shield.name })
                    : game.i18n.localize('PF2E.UI.applyDamage.shieldInActive');
            const shieldDamage =
                attribute === 'attributes.shield' && shield?.isBroken === false && value > 0
                    ? `(${Math.max(0, value - shield.hardness)})`
                    : '';
            const appliedResult =
                value > 0
                    ? game.i18n.localize('PF2E.UI.applyDamage.damaged') + value + shieldDamage
                    : game.i18n.localize('PF2E.UI.applyDamage.healed') + value * -1;
            const modifiedByGM = modifier !== 0 ? `Modified by GM: ${modifier < 0 ? '-' : '+'}${modifier}` : '';
            const by = game.i18n.localize('PF2E.UI.applyDamage.by');
            const hitpoints = game.i18n.localize('PF2E.HitPointsHeader').toLowerCase();
            const message = await renderTemplate('systems/pf2e/templates/chat/damage/result-message.html', {
                flavorText,
                by,
                messageSender,
                modifiedByGM,
                actor: token.name,
                shieldFlavor,
                appliedResult,
                hitpoints,
            });
            actor.modifyTokenAttribute(attribute, value * -1, true, true, shield).then(() => {
                ChatMessage.create({
                    user: game.user._id,
                    speaker: { alias: token.name },
                    content: message,
                    type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
                });
            });
        }
        return true;
    }

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     */
    static async rollSave(ev: JQuery.ClickEvent, item: Owned<ItemPF2e>): Promise<void> {
        if (canvas.tokens.controlled.length > 0) {
            for (const t of canvas.tokens.controlled) {
                const actor = t.actor;
                const save = $(ev.currentTarget).attr('data-save') as SaveString;
                const itemTraits = item.data.data.traits.value;
                if (!actor) return;

                if (actor.data.data.saves[save]?.roll) {
                    const options = actor.getRollOptions(['all', 'saving-throw', save]);
                    options.push('magical', 'spell');
                    if (itemTraits) {
                        options.push(...itemTraits);
                    }
                    actor.data.data.saves[save].roll({ event: ev, options });
                } else {
                    actor.rollSave(ev, save);
                }
            }
        } else {
            throw ErrorPF2e(game.i18n.localize('PF2E.UI.errorTargetToken'));
        }
    }

    /**
     * Set initiative for the combatant associated with the selected token or tokens with the rolled dice total.
     * @param roll The chat entry which contains the roll data
     */
    static async setCombatantInitiative(roll: JQuery) {
        const skillRolled = roll.find('.flavor-text').text();
        const valueRolled = parseFloat(roll.find('.dice-total').text());
        const promises: Promise<void>[] = [];
        for (const t of canvas.tokens.controlled) {
            if (!game.combat) {
                ui.notifications.error('No active encounters in the Combat Tracker.');
                return;
            }

            const combatant = game.combat.getCombatantByToken(t.id);
            if (combatant === undefined) {
                ui.notifications.error("You haven't added this token to the Combat Tracker.");
                return;
            }

            // Kept separate from modifier checks above in case of enemies using regular character sheets (or pets using NPC sheets)
            let value = valueRolled;
            if (!combatant.actor.hasPlayerOwner) {
                value += 0.5;
            }
            const message = `
      <div class="dice-roll">
      <div class="dice-result">
        <div class="dice-tooltip" style="display: none;">
            <div class="dice-formula" style="background: 0;">
              <span style="font-size: 10px;">${skillRolled} <span style="font-weight: bold;">${valueRolled}</span></span>
            </div>
        </div>
        <div class="dice-total" style="padding: 0 10px; word-break: normal;">
          <span style="font-size: 12px; font-style:oblique; font-weight: 400;">${combatant.name}'s Initiative is now ${value}!</span>
        </div>
      </div>
      </div>
      `;
            ChatMessage.create({
                user: game.user._id,
                speaker: { alias: t.name },
                content: message,
                whisper: ChatMessage.getWhisperRecipients('GM'),
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            });

            promises.push(game.combat.setInitiative(combatant._id, value));
        }

        await Promise.all(promises);
    }

    /* -------------------------------------------- */
    /* Owned Item Management
  /* -------------------------------------------- */

    async _setShowUnpreparedSpells(entryId: string, spellLevel: number) {
        if (!entryId || !spellLevel) {
            // TODO: Consider throwing an error on null inputs in the future.
            return;
        }

        const spellcastingEntry = this.getOwnedItem(entryId);
        if (spellcastingEntry === null || spellcastingEntry.data.type !== 'spellcastingEntry') {
            return;
        }

        if (
            spellcastingEntry.data.data?.prepared?.value === 'prepared' &&
            spellcastingEntry.data.data?.showUnpreparedSpells?.value === false
        ) {
            if (CONFIG.debug.hooks === true) {
                console.log(`PF2e DEBUG | Updating spellcasting entry ${entryId} set showUnpreparedSpells to true.`);
            }

            const currentLvlToDisplay: Record<number, boolean> = {};
            currentLvlToDisplay[spellLevel] = true;
            await this.updateEmbeddedEntity('OwnedItem', {
                _id: entryId,
                'data.showUnpreparedSpells.value': true,
                'data.displayLevels': currentLvlToDisplay,
            });
        }
    }

    /** @override */
    async updateEmbeddedEntity(
        embeddedName: keyof typeof ActorPF2e['config']['embeddedEntities'],
        data: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options = {},
    ): Promise<ActiveEffectData | ActiveEffectData[] | ItemDataPF2e | ItemDataPF2e[]> {
        const updateData = Array.isArray(data) ? data : [data];
        for (const datum of updateData) {
            const item = this.items.get(datum._id);
            if (item instanceof PhysicalItemPF2e) {
                await PhysicalItemPF2e.updateIdentificationData(item.data, datum);
            }
        }

        return super.updateEmbeddedEntity(embeddedName, updateData, options);
    }

    isLootableBy(user: User) {
        return this.can(user, 'update');
    }

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     * This allows for game systems to override this behavior and deploy special logic.
     * @param attribute The attribute path
     * @param value     The target attribute value
     * @param isDelta   Whether the number represents a relative change (true) or an absolute change (false)
     * @param isBar     Whether the new value is part of an attribute bar, or just a direct value
     */
    async modifyTokenAttribute(
        attribute: string,
        value: number,
        isDelta = false,
        isBar = true,
        selectedShield: Owned<ArmorPF2e> | null = null,
    ): Promise<this> {
        if (!Number.isInteger(value)) {
            return Promise.reject();
        }

        if (['attributes.shield', 'attributes.hp'].includes(attribute)) {
            const updateActorData: any = {};
            const updateShieldData = {
                _id: '',
                data: {
                    hp: {
                        value: 0,
                    },
                },
            };
            if (attribute === 'attributes.shield') {
                const shield = selectedShield ?? this.heldShield;
                if (shield?.isBroken === false) {
                    let shieldHitPoints = shield.hitPoints.current;
                    if (isDelta && value < 0) {
                        // shield block
                        value = Math.min(shield.hardness + value, 0); // value is now a negative modifier (or zero), taking into account hardness
                        if (value < 0) {
                            attribute = 'attributes.hp'; // update the actor's hit points after updating the shield
                            shieldHitPoints = Math.clamped(shield.hitPoints.current + value, 0, shield.hitPoints.max);
                        }
                    } else {
                        shieldHitPoints = Math.clamped(value, 0, shield.hitPoints.max);
                    }
                    shield.data.data.hp.value = shieldHitPoints; // ensure the shield item has the correct state in prepareData() on the first pass after Actor#update
                    updateActorData['data.attributes.shield.value'] = shieldHitPoints;
                    // actor update is necessary to properly refresh the token HUD resource bar
                    updateShieldData._id = shield._id;
                    updateShieldData.data.hp.value = shieldHitPoints;
                } else if (this.data.data.attributes.shield.max) {
                    // NPC with no shield but pre-existing shield data
                    const shieldData = this.data.data.attributes.shield;
                    const currentHitPoints = Number(shieldData.value);
                    const maxHitPoints = Number(shieldData.max);
                    let shieldHitPoints = currentHitPoints;
                    if (isDelta && value < 0) {
                        // shield block
                        value = Math.min(Number(shieldData.hardness) + value, 0); // value is now a negative modifier (or zero), taking into account hardness
                        if (value < 0) {
                            attribute = 'attributes.hp'; // update the actor's hit points after updating the shield
                            shieldHitPoints = Math.clamped(currentHitPoints + value, 0, maxHitPoints);
                        }
                    } else {
                        shieldHitPoints = Math.clamped(value, 0, maxHitPoints);
                    }
                    updateActorData['data.attributes.shield.value'] = shieldHitPoints;
                } else if (isDelta) {
                    attribute = 'attributes.hp'; // actor has no shield, apply the specified delta value to actor instead
                }
            }

            if (attribute === 'attributes.hp') {
                const { hp, sp } = this.data.data.attributes;
                if (isDelta) {
                    if (value < 0) {
                        const { update, delta } = this._calculateHealthDelta({ hp, sp, delta: value });
                        value = delta;
                        for (const [k, v] of Object.entries(update)) {
                            updateActorData[k] = v;
                        }
                    }
                    value = Math.clamped(Number(hp.value) + value, 0, hp.max);
                }
                value = Math.clamped(value, 0, hp.max);
                updateActorData['data.attributes.hp.value'] = value;
            }

            return this.update(updateActorData).then(() => {
                if (updateShieldData._id !== '') {
                    // this will trigger a second prepareData() call, but is necessary for persisting the shield state
                    this.updateOwnedItem(updateShieldData);
                }
                return this;
            });
        }
        return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }

    /**
     * Moves an item to another actor's inventory.
     * @param targetActor Instance of actor to be receiving the item.
     * @param item        Instance of the item being transferred.
     * @param quantity    Number of items to move.
     * @param containerId Id of the container that will contain the item.
     */
    async transferItemToActor(
        targetActor: ActorPF2e,
        item: Owned<ItemPF2e>,
        quantity: number,
        containerId?: string,
    ): Promise<Owned<PhysicalItemPF2e> | null> {
        if (!(item instanceof PhysicalItemPF2e)) {
            return Promise.reject(new Error('Only physical items (with quantities) can be transfered between actors'));
        }

        // Loot transfers can be performed by non-owners when a GM is online */
        const gmMustTransfer = (source: ActorPF2e, target: ActorPF2e): boolean => {
            const bothAreOwned = source.hasPerm(game.user, 'owner') && target.hasPerm(game.user, 'owner');
            const sourceIsOwnedOrLoot = source.isLootableBy(game.user);
            const targetIsOwnedOrLoot = target.isLootableBy(game.user);
            return !bothAreOwned && sourceIsOwnedOrLoot && targetIsOwnedOrLoot;
        };
        if (gmMustTransfer(this, targetActor)) {
            const source = { tokenId: this.token?.id, actorId: this.id, itemId: item.id };
            const target = { tokenId: targetActor.token?.id, actorId: targetActor.id };
            await new ItemTransfer(source, target, quantity, containerId).request();
            return null;
        }

        if (!this.can(game.user, 'update')) {
            ui.notifications.error(game.i18n.localize('PF2E.ErrorMessage.CantMoveItemSource'));
            return null;
        }
        if (!targetActor.can(game.user, 'update')) {
            ui.notifications.error(game.i18n.localize('PF2E.ErrorMessage.CantMoveItemDestination'));
            return null;
        }

        // Limit the amount of items transfered to how many are actually available.
        const sourceItemQuantity = Number(item.data.data.quantity.value);
        quantity = Math.min(quantity, sourceItemQuantity);

        // Remove the item from the source if we are transferring all of it; otherwise, subtract the appropriate number.
        const newItemQuantity = sourceItemQuantity - quantity;
        const hasToRemoveFromSource = newItemQuantity < 1;

        if (hasToRemoveFromSource) {
            await this.deleteEmbeddedEntity('OwnedItem', item._id);
        } else {
            const update = { _id: item._id, 'data.quantity.value': newItemQuantity };
            await this.updateEmbeddedEntity('OwnedItem', update);
        }

        const newItemData = duplicate(item._data);
        newItemData.data.quantity.value = quantity;
        newItemData.data.equipped.value = false;
        if (isMagicDetailsData(newItemData.data)) {
            newItemData.data.invested.value = false;
        }

        const result = await targetActor.createEmbeddedEntity('OwnedItem', newItemData);
        if (result === null) {
            return null;
        }
        const movedItem = targetActor.items.get(result._id);
        if (!(movedItem instanceof PhysicalItemPF2e)) {
            return null;
        }
        await targetActor.stashOrUnstash(movedItem, containerId);

        return item;
    }

    /**
     * Moves an item into the inventory into or out of a container.
     * @param actor       Actor whose inventory should be edited.
     * @param getItem     Lambda returning the item.
     * @param containerId Id of the container that will contain the item.
     */
    async stashOrUnstash(item: PhysicalItemPF2e, containerId?: string): Promise<void> {
        if (containerId) {
            if (!isCycle(item.id, containerId, [item.data])) {
                await item.update({
                    'data.containerId.value': containerId,
                    'data.equipped.value': false,
                });
            }
        } else {
            await item.update({ 'data.containerId.value': '' });
        }
    }

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     * This allows for game systems to override this behavior and deploy special logic.
     */
    _calculateHealthDelta(args: {
        hp: { value: number; temp: number };
        sp: { value: number; temp: number };
        delta: number;
    }) {
        const update: any = {};
        const { hp, sp } = args;
        let { delta } = args;
        if (hp.temp + delta >= 0) {
            update['data.attributes.hp.temp'] = hp.temp + delta;
            delta = 0;
        } else {
            update['data.attributes.hp.temp'] = 0;
            delta = hp.temp + delta;
        }
        if (game.settings.get('pf2e', 'staminaVariant') > 0 && delta < 0) {
            if (sp.value + delta >= 0) {
                update['data.attributes.sp.value'] = sp.value + delta;
                delta = 0;
            } else {
                update['data.attributes.sp.value'] = 0;
                delta = sp.value + delta;
            }
        }
        return {
            update,
            delta,
        };
    }

    static getActionGraphics(actionType: string, actionCount?: number): { imageUrl: string; actionGlyph: string } {
        let actionImg: number | string = 0;
        if (actionType === 'action') actionImg = actionCount ?? 1;
        else if (actionType === 'reaction') actionImg = 'reaction';
        else if (actionType === 'free') actionImg = 'free';
        else if (actionType === 'passive') actionImg = 'passive';
        const graphics = {
            1: { imageUrl: 'systems/pf2e/icons/actions/OneAction.webp', actionGlyph: 'A' },
            2: { imageUrl: 'systems/pf2e/icons/actions/TwoActions.webp', actionGlyph: 'D' },
            3: { imageUrl: 'systems/pf2e/icons/actions/ThreeActions.webp', actionGlyph: 'T' },
            free: { imageUrl: 'systems/pf2e/icons/actions/FreeAction.webp', actionGlyph: 'F' },
            reaction: { imageUrl: 'systems/pf2e/icons/actions/Reaction.webp', actionGlyph: 'R' },
            passive: { imageUrl: 'systems/pf2e/icons/actions/Passive.webp', actionGlyph: '' },
        };
        if (objectHasKey(graphics, actionImg)) {
            return {
                imageUrl: graphics[actionImg].imageUrl,
                actionGlyph: graphics[actionImg].actionGlyph,
            };
        } else {
            return {
                imageUrl: 'systems/pf2e/icons/actions/OneAction.webp',
                actionGlyph: '',
            };
        }
    }

    /**
     * Adds a custom modifier that will be included when determining the final value of a stat. The
     * name parameter must be unique for the custom modifiers for the specified stat, or it will be
     * ignored.
     */
    async addCustomModifier(
        stat: string,
        name: string,
        value: number,
        type: string,
        predicate?: RawPredicate,
        damageType?: string,
        damageCategory?: string,
    ) {
        // TODO: Consider adding another 'addCustomModifier' function in the future which takes a full PF2Modifier object,
        // similar to how addDamageDice operates.
        if (!isCreatureData(this.data)) {
            throw Error('Custom modifiers only work for characters, NPCs, and familiars');
        }

        const customModifiers = duplicate(this.data.data.customModifiers ?? {});
        if (!(customModifiers[stat] ?? []).find((m) => m.name === name)) {
            const modifier = new ModifierPF2e(name, value, type);
            if (damageType) {
                modifier.damageType = damageType;
            }
            if (damageCategory) {
                modifier.damageCategory = damageCategory;
            }
            modifier.custom = true;

            // modifier predicate
            modifier.predicate = predicate instanceof ModifierPredicate ? predicate : new ModifierPredicate(predicate);
            modifier.ignored = !modifier.predicate.test!();

            customModifiers[stat] = (customModifiers[stat] ?? []).concat([modifier]);
            await this.update({ 'data.customModifiers': customModifiers });
        }
    }

    /** Removes a custom modifier by name. */
    async removeCustomModifier(stat: string, modifier: number | string) {
        if (!isCreatureData(this.data)) {
            throw Error('Custom modifiers only work for characters, NPCs, and familiars');
        }

        const customModifiers = duplicate(this.data.data.customModifiers ?? {});
        if (typeof modifier === 'number' && customModifiers[stat] && customModifiers[stat].length > modifier) {
            customModifiers[stat].splice(modifier, 1);
            await this.update({ 'data.customModifiers': customModifiers });
        } else if (typeof modifier === 'string' && customModifiers[stat]) {
            customModifiers[stat] = customModifiers[stat].filter((m) => m.name !== modifier);
            await this.update({ 'data.customModifiers': customModifiers });
        } else {
            throw Error('Custom modifiers can only be removed by name (string) or index (number)');
        }
    }

    /** Adds custom damage dice. */
    async addDamageDice(param: DamageDicePF2e) {
        if (!isCreatureData(this.data)) {
            throw Error('Custom damage dice only work for characters, NPCs, and familiars');
        }

        const damageDice = duplicate(this.data.data.damageDice ?? {});
        if (!(damageDice[param.selector] ?? []).find((d) => d.name === param.name)) {
            // Default new dice to apply to all damage rolls, and ensure we mark this as a custom damage dice source.
            param.selector = param?.selector ?? 'damage';
            param.custom = true;

            // The damage dice constructor performs some basic validations for us, like checking that the
            // name and selector are both defined.
            const dice = new DamageDicePF2e(param);

            damageDice[param.selector] = (damageDice[param.selector] ?? []).concat([dice]);
            await this.update({ 'data.damageDice': damageDice });
        }
    }

    /** Removes damage dice by name. */
    async removeDamageDice(selector: string, dice: number | string) {
        if (!isCreatureData(this.data)) {
            throw Error('Custom damage dice only work for characters, NPCs, and familiars');
        }

        const damageDice = duplicate(this.data.data.damageDice ?? {});
        if (typeof dice === 'number' && damageDice[selector] && damageDice[selector].length > dice) {
            damageDice[selector].splice(dice, 1);
            await this.update({ 'data.damageDice': damageDice });
        } else if (typeof dice === 'string' && damageDice[selector]) {
            damageDice[selector] = damageDice[selector].filter((d) => d.name !== dice);
            await this.update({ 'data.damageDice': damageDice });
        } else {
            throw Error('Dice can only be removed by name (string) or index (number)');
        }
    }

    /** Toggle the given roll option (swapping it from true to false, or vice versa). */
    async toggleRollOption(rollName: string, optionName: string) {
        if (!SUPPORTED_ROLL_OPTIONS.includes(rollName) && !this.data.data.skills[rollName]) {
            throw new Error(`${rollName} is not a supported roll`);
        }
        const flag = `rollOptions.${rollName}.${optionName}`;
        return this.setFlag(game.system.id, flag, !this.getFlag(game.system.id, flag));
    }

    /** Set the given roll option. */
    async setRollOption(rollName: string, optionName: string, enabled: boolean) {
        if (!SUPPORTED_ROLL_OPTIONS.includes(rollName) && !this.data.data.skills[rollName]) {
            throw new Error(`${rollName} is not a supported roll`);
        }
        const flag = `rollOptions.${rollName}.${optionName}`;
        return this.setFlag(game.system.id, flag, !!enabled);
    }

    /** Unset (i.e., delete entirely) the given roll option. */
    async unsetRollOption(rollName: string, optionName: string) {
        const flag = `rollOptions.${rollName}.${optionName}`;
        return this.unsetFlag(game.system.id, flag);
    }

    /** Enable the given roll option for thie given roll name. */
    async enableRollOption(rollName: string, optionName: string) {
        return this.setRollOption(rollName, optionName, true);
    }

    /** Disable the given roll option for the given roll name. */
    async disableRollOption(rollName: string, optionName: string) {
        return this.setRollOption(rollName, optionName, false);
    }

    /** Obtain roll options relevant to rolls of the given types (for use in passing to the `roll` functions on statistics). */
    getRollOptions(rollNames: string[]): string[] {
        return ActorPF2e.getRollOptions(this.data.flags, rollNames);
    }

    static getRollOptions(flags: BaseEntityData['flags'], rollNames: string[]): string[] {
        const flag: Record<string, Record<string, boolean>> = flags[game.system.id]?.rollOptions ?? {};
        return rollNames
            .flatMap((rollName) =>
                // convert flag object to array containing the names of all fields with a truthy value
                Object.entries(flag[rollName] ?? {}).reduce(
                    (opts, [key, value]) => opts.concat(value ? key : []),
                    [] as string[],
                ),
            )
            .reduce((unique, option) => {
                // ensure option entries are unique
                return unique.includes(option) ? unique : unique.concat(option);
            }, [] as string[]);
    }

    getAbilityMod(ability: AbilityString): number {
        return this.data.data.abilities[ability].mod;
    }

    /** Reduce a valued condition, or deletion one or more linked conditions */
    async removeOrReduceCondition(
        condition: Owned<ConditionPF2e>,
        { forceRemove = false }: { forceRemove: boolean } = { forceRemove: false },
    ): Promise<void> {
        if (!condition.fromSystem) {
            return;
        }

        const details = condition.data.data;
        // Get all linked conditions if force-removing
        const conditionList = forceRemove
            ? [condition].concat(
                  this.itemTypes.condition.filter(
                      (maybeLinked) =>
                          maybeLinked.fromSystem &&
                          maybeLinked.data.data.base === details.base &&
                          maybeLinked.data.data.value.value === details.value.value,
                  ),
              )
            : [condition];

        const tokens = this.token ? [this.token] : this.getActiveTokens();
        if (tokens.length === 0) {
            const idList = conditionList.map((condition) => condition.id);
            await this.deleteEmbeddedEntity('OwnedItem', idList);
            return;
        }

        for await (const condition of conditionList) {
            const data = condition.data.data;
            const value = data.value.isValued ? Math.max(data.value.value - 1, 0) : null;

            for await (const token of tokens) {
                if (value !== null && !forceRemove) {
                    await game.pf2e.ConditionManager.updateConditionValue(condition.id, token, value);
                } else {
                    await game.pf2e.ConditionManager.removeConditionFromToken(condition.id, token);
                }
            }
        }
    }
}

export interface ActorPF2e {
    data: ActorDataPF2e;
    _data: ActorDataPF2e;

    /**
     * See implementation in class
     * @override
     */
    updateEmbeddedEntity(
        embeddedName: 'ActiveEffect',
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData>;
    updateEmbeddedEntity(
        embeddedName: 'ActiveEffect',
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ActiveEffectData[]>;
    updateEmbeddedEntity(
        embeddedName: 'OwnedItem',
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ItemDataPF2e>;
    updateEmbeddedEntity(
        embeddedName: 'OwnedItem',
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ItemDataPF2e | ItemDataPF2e[]>;
    updateEmbeddedEntity(
        embeddedName: keyof typeof ActorPF2e['config']['embeddedEntities'],
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ItemDataPF2e>;
    updateEmbeddedEntity(
        embeddedName: keyof typeof ActorPF2e['config']['embeddedEntities'],
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ActiveEffectData[] | ItemDataPF2e | ItemDataPF2e[]>;
}

export class HazardPF2e extends ActorPF2e {}
export interface HazardPF2e {
    data: HazardData;
    _data: HazardData;
}

export type TokenPF2e = Token<ActorPF2e>;
export type UserPF2e = User<ActorPF2e>;
