import { DamageDicePF2e, ModifierPF2e, ModifierPredicate, ProficiencyModifier, RawPredicate } from '../modifiers';
import { isCycle } from '@item/container/helpers';
import { DicePF2e } from '@scripts/dice';
import { ItemPF2e, SpellcastingEntryPF2e, PhysicalItemPF2e, ContainerPF2e } from '@item';
import type { ConditionPF2e, ArmorPF2e } from '@item/index';
import { ConditionData, WeaponData, ItemSourcePF2e, ItemType } from '@item/data';
import { ErrorPF2e, objectHasKey } from '@module/utils';
import type { ActiveEffectPF2e } from '@module/active-effect';
import { LocalizePF2e } from '@module/system/localize';
import { ItemTransfer } from './item-transfer';
import { RuleElementPF2e, TokenEffect } from '@module/rules/rule-element';
import { ActorSheetPF2e } from './sheet/base';
import { ChatMessagePF2e } from '@module/chat-message';
import { hasInvestedProperty } from '@item/data/helpers';
import { SUPPORTED_ROLL_OPTIONS } from './data/values';
import { SaveData, SaveString, SkillAbbreviation, SkillData, VisionLevel, VisionLevels } from './creature/data';
import { AbilityString, BaseActorDataPF2e } from './data/base';
import { ActorDataPF2e, ActorSourcePF2e } from './data';
import { TokenDocumentPF2e } from '@module/scene/token-document';
import { UserPF2e } from '@module/user';
import { isCreatureData } from './data/helpers';
import { ConditionType } from '@item/condition/data';
import { MigrationRunner, Migrations } from '@module/migration';
import { Size } from '@module/data';

interface ActorConstructorContextPF2e extends DocumentConstructionContext<ActorPF2e> {
    pf2e?: {
        ready?: boolean;
    };
}

/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 * @category Actor
 */
export class ActorPF2e extends Actor<TokenDocumentPF2e> {
    /** Has this actor gone through at least one cycle of data preparation? */
    private initialized: true | undefined;

    /** A separate collection of owned physical items for convenient access */
    physicalItems!: Collection<Embedded<PhysicalItemPF2e>>;

    /** Rule elements drawn from owned items */
    rules!: RuleElementPF2e[];

    constructor(data: PreCreate<ActorSourcePF2e>, context: ActorConstructorContextPF2e = {}) {
        if (context.pf2e?.ready) {
            super(data, context);
            this.physicalItems ??= new Collection();
            this.rules ??= [];
            this.initialized = true;
        } else {
            const ready = { pf2e: { ready: true } };
            return new CONFIG.PF2E.Actor.documentClasses[data.type](data, { ...ready, ...context });
        }
    }

    /** The compendium source ID of the actor **/
    get sourceId(): string | null {
        return this.getFlag('core', 'sourceId') ?? null;
    }

    /** The recorded schema version of this actor, updated after each data migration */
    get schemaVersion(): number | null {
        return this.data.data.schema.version;
    }

    get traits(): Set<string> {
        return new Set(this.data.data.traits.traits.value);
    }

    get level(): number {
        return this.data.data.details.level.value;
    }

    get size(): Size {
        return this.data.data.traits.size.value;
    }

    /**
     * Whether the actor can see, given its token placement in the current scene.
     * A meaningful implementation is found in `CreaturePF2e`.
     */
    get canSee(): boolean {
        return true;
    }

    get visionLevel(): VisionLevel {
        return VisionLevels.NORMAL;
    }

    /** Add effect icons from effect items and rule elements */
    override get temporaryEffects(): TemporaryEffect[] {
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

    /** Get the actor's held shield. Meaningful implementation in `CreaturePF2e`'s override. */
    get heldShield(): Embedded<ArmorPF2e> | null {
        return null;
    }

    /**
     * As of Foundry 0.8: All subclasses of ActorPF2e need to use this factory method rather than having their own
     * overrides, since Foundry itself will call `ActorPF2e.create` when a new actor is created from the sidebar.
     */
    static override create<A extends ActorPF2e>(
        this: ConstructorOf<A>,
        data: PreCreate<A['data']['_source']>,
        context?: DocumentModificationContext,
    ): Promise<A | undefined>;
    static override create<A extends ActorPF2e>(
        this: ConstructorOf<A>,
        data: PreCreate<A['data']['_source']>[],
        context?: DocumentModificationContext,
    ): Promise<A[]>;
    static override create<A extends ActorPF2e>(
        this: ConstructorOf<A>,
        data: PreCreate<A['data']['_source']>[] | PreCreate<A['data']['_source']>,
        context?: DocumentModificationContext,
    ): Promise<A[] | A | undefined>;
    static override async create<A extends ActorPF2e>(
        this: ConstructorOf<A>,
        data: PreCreate<A['data']['_source']>[] | PreCreate<A['data']['_source']>,
        context: DocumentModificationContext = {},
    ): Promise<A[] | A | undefined> {
        if (game.settings.get('pf2e', 'defaultTokenSettings')) {
            const createData = Array.isArray(data) ? data : [data];
            for (const datum of createData) {
                // Set wounds, advantage, and display name visibility
                const nameMode = game.settings.get('pf2e', 'defaultTokenSettingsName');
                const barMode = game.settings.get('pf2e', 'defaultTokenSettingsBar');
                const merged = mergeObject(datum, {
                    permission: datum.permission ?? { default: CONST.ENTITY_PERMISSIONS.NONE },
                    token: {
                        bar1: { attribute: 'attributes.hp' }, // Default Bar 1 to Wounds
                        displayName: nameMode, // Default display name to be on owner hover
                        displayBars: barMode, // Default display bars to be on owner hover
                    },
                });

                // Set default token dimensions for familiars and vehicles
                const dimensionMap: Record<string, number> = { familiar: 0.5, vehicle: 2 };
                merged.token.height ??= dimensionMap[datum.type!] ?? 1;
                merged.token.width ??= merged.token.height;

                switch (merged.type) {
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
            }
        }

        return super.create(data, context) as Promise<A[] | A | undefined>;
    }

    /** Prepare token data derived from this actor */
    override prepareData(): void {
        super.prepareData();
        if (this.initialized) {
            for (const token of this.getActiveTokens()) {
                token.document.prepareData({ fromActor: true });
            }
        }
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.data.data.tokenEffects = [];
        this.preparePrototypeToken();
    }

    /** Prepare the physical-item collection on this actor, item-sibling data, and rule elements */
    override prepareEmbeddedEntities(): void {
        super.prepareEmbeddedEntities();
        const physicalItems: Embedded<PhysicalItemPF2e>[] = this.items.filter(
            (item) => item instanceof PhysicalItemPF2e,
        );
        this.physicalItems = new Collection(physicalItems.map((item) => [item.id, item]));

        // Prepare container contents now that this actor's embedded documents are ready
        const containers = physicalItems.filter(
            (item): item is Embedded<ContainerPF2e> => item instanceof ContainerPF2e,
        );
        for (const container of containers) {
            container.prepareContents();
        }

        // Rule elements
        this.rules = this.items.contents.flatMap((item) => item.prepareRuleElements());
    }

    /** Disable active effects from a physical item if it isn't equipped and (if applicable) invested */
    override applyActiveEffects() {
        for (const effect of this.effects) {
            const itemId = effect.data.origin?.match(/Item\.([0-9a-z]+)/i)?.[1] ?? '';
            const item = this.items.get(itemId);

            if (item instanceof PhysicalItemPF2e && (!item.isEquipped || item.isInvested === false)) {
                for (const effect of item.effects) {
                    effect.temporarilyDisable(this);
                }
            }
        }

        super.applyActiveEffects();
    }

    /** Prevent character importers from creating martial items */
    override createEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        data: PreCreate<foundry.data.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context: DocumentModificationContext = {},
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]> {
        const includesMartialItems = data.some(
            (datum: PreCreate<foundry.data.ActiveEffectSource> | PreCreate<ItemSourcePF2e>) =>
                'type' in datum && datum.type === 'martial',
        );
        if (includesMartialItems) {
            throw ErrorPF2e('Martial items are pending removal from the system and may no longer be created.');
        }

        return super.createEmbeddedDocuments(embeddedName, data, context) as Promise<ActiveEffectPF2e[] | ItemPF2e[]>;
    }

    /** Set defaults for this actor's prototype token */
    private preparePrototypeToken() {
        // Synchronize the token image with the actor image, if the token does not currently have an image
        const useSystemTokenSettings = game.settings.get('pf2e', 'defaultTokenSettings');
        const tokenImgIsDefault =
            this.data.token.img === (this.data.constructor as typeof BaseActorDataPF2e).DEFAULT_ICON;
        const tokenImgIsActorImg = this.data.token.img === this.img;
        if (useSystemTokenSettings && tokenImgIsDefault && !tokenImgIsActorImg) {
            this.data.token.update({ img: this.img });
        }

        // Disable (but don't save) manually-configured vision radii
        if (canvas.sight?.rulesBasedVision) {
            mergeObject(this.data.token, { brightSight: 0, dimSight: 0, lightAngle: 360, sightAngle: 360 });
        }
    }

    _applyInitiativeRollToCombatTracker(roll: Roll) {
        if (roll?.total) {
            // check that there is a combat active in this scene
            if (!game.combat) {
                ui.notifications.error('No active encounters in the Combat Tracker.');
                return;
            }

            const combatant = game.combat.turns.find((combatant) => combatant.actor?.id === this.id);
            if (!combatant) {
                ui.notifications.error(`No combatant found for ${this.name} in the Combat Tracker.`);
                return;
            }
            game.combat.setInitiative(combatant.id, roll.total);
        } else {
            console.log(
                'PF2e System | _applyInitiativeRollToCombatTracker | invalid roll object or roll.value mising: ',
                roll,
            );
        }
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

    /**
     * Get all tokens linked to this actor in all scenes
     * @returns An array of TokenDocuments
     */
    getAllTokens(): TokenDocument[] {
        const tokens: TokenDocument[] = [];
        for (const scene of game.scenes) {
            for (const token of scene.tokens) {
                if (token.isLinked && token.actor?.id === this.id) {
                    tokens.push(token);
                }
            }
        }
        return tokens;
    }

    /* -------------------------------------------- */
    /*  Rolls                                       */
    /* -------------------------------------------- */

    /**
     * Roll a Skill Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
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
    rollLoreSkill(event: JQuery.Event, item: Embedded<ItemPF2e>) {
        const itemData = item.data;
        if (itemData.type !== 'lore') {
            throw Error('Can only roll lore skills using lore items');
        }

        const parts = ['@mod', '@itemBonus'];
        const flavor = `${item.name} Skill Check`;

        let rollMod = 0;
        if (this.data.type === 'character') {
            const rank = itemData.data.proficient.value || 0;
            const proficiency = ProficiencyModifier.fromLevelAndRank(this.data.data.details.level.value, rank).modifier;
            const modifier = this.data.data.abilities.int.mod;
            rollMod = modifier + proficiency;
        } else if (this.data.type === 'npc') {
            rollMod = itemData.data.mod.value;
        }

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: {
                mod: rollMod,
            },
            title: flavor,
            speaker: ChatMessage.getSpeaker({ actor: this }),
        });
    }

    /**
     * Roll a Save Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
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

    /**
     * Roll a Attribute Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollAttribute(event: JQuery.Event, attributeName: string) {
        if (!objectHasKey(this.data.data.attributes, attributeName)) {
            throw ErrorPF2e(`Unrecognized attribute "${attributeName}"`);
        }

        const attribute = this.data.data.attributes[attributeName];
        const parts = ['@mod', '@itemBonus'];
        const configAttributes = CONFIG.PF2E.attributes;
        if (objectHasKey(configAttributes, attributeName)) {
            const flavor = `${game.i18n.localize(configAttributes[attributeName])} Check`;
            // Call the roll helper utility
            DicePF2e.d20Roll({
                event,
                parts,
                data: { mod: attribute.value },
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
                const data: any = {
                    user: game.user.id,
                    speaker: { alias: token.name },
                    content: message,
                    type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
                };
                if (game.settings.get('pf2e', 'metagame.secretDamage') && !token?.actor?.hasPlayerOwner) {
                    data.whisper = ChatMessage.getWhisperRecipients('GM');
                }
                ChatMessage.create(data);
            });
        }
        return true;
    }

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     */
    static async rollSave(ev: JQuery.ClickEvent, item: Embedded<ItemPF2e>): Promise<void> {
        if (canvas.tokens.controlled.length > 0) {
            const save = $(ev.currentTarget).attr('data-save') as SaveString;
            const dc = Number($(ev.currentTarget).attr('data-dc'));
            const itemTraits = item.data.data.traits.value;
            for (const t of canvas.tokens.controlled) {
                const actor = t.actor;
                if (!actor) return;
                if (actor.data.data.saves[save]?.roll) {
                    const options = actor.getRollOptions(['all', 'saving-throw', save]);
                    options.push('magical', 'spell');
                    if (itemTraits) {
                        options.push(...itemTraits);
                    }
                    actor.data.data.saves[save].roll({
                        event: ev,
                        dc: !Number.isNaN(dc) ? { value: Number(dc) } : undefined,
                        options,
                    });
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
    static async setCombatantInitiative(roll: JQuery): Promise<void> {
        const skillRolled = roll.find('.flavor-text').text();
        const valueRolled = parseFloat(roll.find('.dice-total').text());
        const promises: Promise<void>[] = [];
        for (const token of canvas.tokens.controlled) {
            if (!game.combat) {
                ui.notifications.error('No active encounters in the Combat Tracker.');
                return;
            }

            const combatant = game.combat.getCombatantByToken(token.id);
            if (!combatant) {
                ui.notifications.error("You haven't added this token to the Combat Tracker.");
                return;
            }

            // Kept separate from modifier checks above in case of enemies using regular character sheets (or pets using NPC sheets)
            let value = valueRolled;
            if (!combatant.actor?.hasPlayerOwner) {
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
            await ChatMessagePF2e.create({
                user: game.user.id,
                speaker: { alias: token.name },
                content: message,
                whisper: ChatMessage.getWhisperRecipients('GM')?.map((user) => user.id),
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            });

            promises.push(game.combat.setInitiative(combatant.id, value));
        }

        await Promise.all(promises);
    }

    async _setShowUnpreparedSpells(entryId: string, spellLevel: number) {
        if (!entryId || !spellLevel) {
            // TODO: Consider throwing an error on null inputs in the future.
            return;
        }

        const spellcastingEntry = this.items.get(entryId);
        if (!(spellcastingEntry instanceof SpellcastingEntryPF2e)) {
            return;
        }

        if (
            spellcastingEntry.data.data?.prepared?.value === 'prepared' &&
            spellcastingEntry.data.data?.showUnpreparedSpells?.value === false
        ) {
            if (CONFIG.debug.hooks === true) {
                console.log(`PF2e DEBUG | Updating spellcasting entry ${entryId} set showUnpreparedSpells to true.`);
            }

            const displayLevels: Record<number, boolean> = {};
            displayLevels[spellLevel] = true;
            await spellcastingEntry.update({
                'data.showUnpreparedSpells.value': true,
                'data.displayLevels': displayLevels,
            });
        }
    }

    isLootableBy(user: UserPF2e) {
        return this.canUserModify(user, 'update');
    }

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     * This allows for game systems to override this behavior and deploy special logic.
     * @param attribute The attribute path
     * @param value     The target attribute value
     * @param isDelta   Whether the number represents a relative change (true) or an absolute change (false)
     * @param isBar     Whether the new value is part of an attribute bar, or just a direct value
     */
    override async modifyTokenAttribute(
        attribute: string,
        value: number,
        isDelta = false,
        isBar = true,
        selectedShield: Embedded<ArmorPF2e> | null = null,
    ): Promise<this> {
        if (!Number.isInteger(value)) {
            return Promise.reject();
        }

        if (['attributes.shield', 'attributes.hp'].includes(attribute)) {
            const updateActorData: any = {};
            const shield = selectedShield ?? this.heldShield;
            let updatedShieldHp = -1;
            if (attribute === 'attributes.shield') {
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
                    updatedShieldHp = shieldHitPoints;
                } else if ('shield' in this.data.data.attributes && this.data.data.attributes.shield.max) {
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

            if (attribute === 'attributes.hp' && 'hp' in this.data.data.attributes) {
                const { hp } = this.data.data.attributes;
                const sp = 'sp' in this.data.data.attributes ? this.data.data.attributes.sp : { value: 0 };
                if (isDelta) {
                    if (value < 0) {
                        const { update, delta } = this.calculateHealthDelta({ hp, sp, delta: value });
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
            if (shield && updatedShieldHp >= 0) {
                updateActorData.items = [
                    {
                        _id: shield.id,
                        data: {
                            hp: {
                                value: updatedShieldHp,
                            },
                        },
                    },
                ];
            }

            return this.update(updateActorData);
        }
        return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }

    /**
     * Moves an item to another actor's inventory.
     * @param targetActor Instance of actor to be receiving the item.
     * @param item        Instance of the item being transferred.
     * @param quantity    Number of items to move.
     * @param containerId Id of the container that will contain the item.
     * @return The target item, if the transfer is successful, or otherwise `null`.
     */
    async transferItemToActor(
        targetActor: ActorPF2e,
        item: Embedded<ItemPF2e>,
        quantity: number,
        containerId?: string,
    ): Promise<Embedded<PhysicalItemPF2e> | null> {
        if (!(item instanceof PhysicalItemPF2e)) {
            return Promise.reject(new Error('Only physical items (with quantities) can be transfered between actors'));
        }
        const container = targetActor.physicalItems.get(containerId ?? '');
        if (!(!container || container instanceof ContainerPF2e)) {
            throw ErrorPF2e('containerId refers to a non-container');
        }

        // Loot transfers can be performed by non-owners when a GM is online */
        const gmMustTransfer = (source: ActorPF2e, target: ActorPF2e): boolean => {
            const bothAreOwned = source.isOwner && target.isOwner;
            const sourceIsOwnedOrLoot = source.isLootableBy(game.user);
            const targetIsOwnedOrLoot = target.isLootableBy(game.user);
            return !bothAreOwned && sourceIsOwnedOrLoot && targetIsOwnedOrLoot;
        };
        if (gmMustTransfer(this, targetActor)) {
            const source = { tokenId: this.token?.id, actorId: this.id, itemId: item.id };
            const target = { tokenId: targetActor.token?.id, actorId: targetActor.id };
            await new ItemTransfer(source, target, quantity, container?.id).request();
            return null;
        }

        if (!this.canUserModify(game.user, 'update')) {
            ui.notifications.error(game.i18n.localize('PF2E.ErrorMessage.CantMoveItemSource'));
            return null;
        }
        if (!targetActor.canUserModify(game.user, 'update')) {
            ui.notifications.error(game.i18n.localize('PF2E.ErrorMessage.CantMoveItemDestination'));
            return null;
        }

        // Limit the amount of items transfered to how many are actually available.
        quantity = Math.min(quantity, item.quantity);

        // Remove the item from the source if we are transferring all of it; otherwise, subtract the appropriate number.
        const newQuantity = item.quantity - quantity;
        const removeFromSource = newQuantity < 1;

        if (removeFromSource) {
            await item.delete();
        } else {
            await item.update({ 'data.quantity.value': newQuantity });
        }

        const newItemData = item.toObject();
        newItemData.data.quantity.value = quantity;
        newItemData.data.equipped.value = false;
        if (hasInvestedProperty(newItemData)) {
            const traits: Set<string> = item.traits;
            newItemData.data.invested.value = traits.has('invested') ? false : null;
        }

        // Stack with an existing item if possible
        const stackItem = this.findStackableItem(targetActor, newItemData);
        if (stackItem && stackItem.data.type !== 'backpack') {
            const stackQuantity = stackItem.quantity + quantity;
            await stackItem.update({ 'data.quantity.value': stackQuantity });
            return stackItem;
        }

        // Otherwise create a new item
        const result = await ItemPF2e.create(newItemData, { parent: targetActor });
        if (!result) {
            return null;
        }
        const movedItem = targetActor.physicalItems.get(result.id);
        if (!movedItem) return null;
        await targetActor.stowOrUnstow(movedItem, container);

        return item;
    }

    /** Find an item already owned by the actor that can stack with the to-be-transferred item */
    private findStackableItem(actor: ActorPF2e, itemData: ItemSourcePF2e): Embedded<PhysicalItemPF2e> | null {
        const testItem = new ItemPF2e(itemData);
        const stackCandidates = actor.physicalItems.filter(
            (stackCandidate) =>
                !stackCandidate.isInContainer &&
                testItem instanceof PhysicalItemPF2e &&
                stackCandidate.isStackableWith(testItem),
        );
        if (stackCandidates.length === 0) {
            return null;
        } else if (stackCandidates.length > 1) {
            // Prefer stacking with unequipped items
            const notEquipped = stackCandidates.filter((item) => !item.isEquipped);
            return notEquipped.length > 0 ? notEquipped[0] : stackCandidates[0];
        } else {
            return stackCandidates[0];
        }
    }

    /**
     * Moves an item into the inventory into or out of a container.
     * @param actor       Actor whose inventory should be edited.
     * @param getItem     Lambda returning the item.
     * @param containerId Id of the container that will contain the item.
     */
    async stowOrUnstow(item: Embedded<PhysicalItemPF2e>, container?: Embedded<ContainerPF2e>): Promise<void> {
        if (container && !isCycle(item.id, container.id, [item.data])) {
            await item.update({
                'data.containerId.value': container.id,
                'data.equipped.value': false,
            });
        } else {
            await item.update({ 'data.containerId.value': null });
        }
    }

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     * This allows for game systems to override this behavior and deploy special logic.
     */
    private calculateHealthDelta(args: { hp: { value: number; temp: number }; sp: { value: number }; delta: number }) {
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

    static getActionGraphics(actionType: string, actionCount?: number): { imageUrl: ImagePath; actionGlyph: string } {
        let actionImg: number | string = 0;
        if (actionType === 'action') actionImg = actionCount ?? 1;
        else if (actionType === 'reaction') actionImg = 'reaction';
        else if (actionType === 'free') actionImg = 'free';
        else if (actionType === 'passive') actionImg = 'passive';
        const graphics: Record<string, { imageUrl: ImagePath; actionGlyph: string }> = {
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
                imageUrl: 'systems/pf2e/icons/actions/Empty.webp',
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
        return this.setFlag('pf2e', flag, !this.getFlag('pf2e', flag));
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

    static getRollOptions(flags: ActorPF2e['data']['flags'], rollNames: string[]): string[] {
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

    /* -------------------------------------------- */
    /* Conditions                                   */
    /* -------------------------------------------- */

    /**
     * Get a condition on this actor, returning:
     *   - the highest-valued if there are multiple of a valued condition
     *   - the longest-lasting if there are multiple of a condition with a duration
     *   - the last applied if any are present and are neither valued nor with duration
     *   - otherwise `null`
     * @param slug the slug of a core condition (subject to change when user-created conditions are introduced)
     * @param [options.all=false] return all conditions of the requested type in the order described above
     */
    getCondition(
        slug: ConditionType,
        { all }: { all: boolean } = { all: false },
    ): Embedded<ConditionPF2e>[] | Embedded<ConditionPF2e> | null {
        const conditions = this.itemTypes.condition
            .filter((condition) => condition.slug === slug)
            .sort((conditionA, conditionB) => {
                const [valueA, valueB] = [conditionA.value ?? 0, conditionB.value ?? 0] as const;
                const [durationA, durationB] = [conditionA.duration ?? 0, conditionB.duration ?? 0] as const;

                return valueA > valueB
                    ? 1
                    : valueB < valueB
                    ? -1
                    : durationA > durationB
                    ? 1
                    : durationA < durationB
                    ? -1
                    : 0;
            });

        return all ? conditions : conditions[0] ?? null;
    }

    /**
     * Does this actor have the provided condition?
     * @param slug The slug of the queried condition
     */
    hasCondition(slug: ConditionType): boolean {
        return this.itemTypes.condition.some((condition) => condition.slug === slug);
    }

    /** Decrease the value of condition or remove it entirely */
    async decreaseCondition(
        conditionSlug: ConditionType | Embedded<ConditionPF2e>,
        { forceRemove }: { forceRemove: boolean } = { forceRemove: false },
    ): Promise<void> {
        // Find a valid matching condition if a slug was passed
        const condition = typeof conditionSlug === 'string' ? this.getCondition(conditionSlug) : conditionSlug;
        if (!condition) return;

        const systemData = condition.data.data;
        // Get all linked conditions if force-removing
        const conditionList = forceRemove
            ? [condition].concat(
                  this.itemTypes.condition.filter(
                      (maybeLinked) =>
                          maybeLinked.fromSystem &&
                          maybeLinked.data.data.base === systemData.base &&
                          maybeLinked.value === condition.value,
                  ),
              )
            : [condition];

        for await (const condition of conditionList) {
            const value = typeof condition.value === 'number' ? Math.max(condition.value - 1, 0) : null;

            if (value !== null && !forceRemove) {
                await game.pf2e.ConditionManager.updateConditionValue(condition.id, this, value);
            } else {
                await game.pf2e.ConditionManager.removeConditionFromActor(condition.id, this);
            }
        }
    }

    /** Increase a valued condition, or create a new one if not present */
    async increaseCondition(
        conditionSlug: ConditionType | Embedded<ConditionPF2e>,
        { min, max = Number.MAX_SAFE_INTEGER }: { min?: number | null; max?: number | null } = {},
    ): Promise<void> {
        const existing = typeof conditionSlug === 'string' ? this.getCondition(conditionSlug) : conditionSlug;
        if (existing) {
            const conditionValue = (() => {
                if (existing.value === null) return null;
                return min && max
                    ? Math.min(Math.max(min, existing.value), max)
                    : max
                    ? Math.min(existing.value + 1, max)
                    : existing.value + 1;
            })();
            if (conditionValue === null || conditionValue > (max ?? 0)) return;
            await game.pf2e.ConditionManager.updateConditionValue(existing.id, this, conditionValue);
        } else if (typeof conditionSlug === 'string') {
            const conditionSource = game.pf2e.ConditionManager.getCondition(conditionSlug).toObject();
            const conditionValue =
                typeof conditionSource?.data.value.value === 'number' && min && max
                    ? Math.min(Math.max(min, conditionSource.data.value.value), max)
                    : null;
            conditionSource.data.value.value = conditionValue;
            await game.pf2e.ConditionManager.addConditionToActor(conditionSource, this);
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Ensure imported actors are current on their schema version */
    protected override async _preCreate(
        data: PreDocumentId<this['data']['_source']>,
        options: DocumentModificationContext,
        user: UserPF2e,
    ): Promise<void> {
        await super._preCreate(data, options, user);
        if (options.parent) return;
        await MigrationRunner.ensureSchemaVersion(this, Migrations.constructFromVersion());
    }

    /** Fix bug in Foundry 0.8.8 where 'render = false' is not working when creating embedded documents */
    protected override _onCreateEmbeddedDocuments(
        embeddedName: 'Item' | 'ActiveEffect',
        documents: ActiveEffect[] | Item<ActorPF2e>[],
        result: foundry.data.ActiveEffectSource[] | ItemSourcePF2e[],
        options: DocumentModificationContext,
        userId: string,
    ) {
        if (options.render !== false) {
            super._onCreateEmbeddedDocuments(embeddedName, documents, result, options, userId);
        }
    }

    /** Fix bug in Foundry 0.8.8 where 'render = false' is not working when deleting embedded documents */
    protected override _onDeleteEmbeddedDocuments(
        embeddedName: 'Item' | 'ActiveEffect',
        documents: ActiveEffect[] | Item<ActorPF2e>[],
        result: foundry.data.ActiveEffectSource[] | ItemSourcePF2e[],
        options: DocumentModificationContext,
        userId: string,
    ) {
        if (options.render !== false) {
            super._onDeleteEmbeddedDocuments(embeddedName, documents, result, options, userId);
        }
    }
}

export interface ActorPF2e extends Actor<TokenDocumentPF2e> {
    readonly data: ActorDataPF2e;
    _sheet: ActorSheetPF2e<ActorPF2e> | ActorSheet<ActorPF2e, ItemPF2e> | null;

    get sheet(): ActorSheetPF2e<ActorPF2e> | ActorSheet<ActorPF2e, ItemPF2e>;

    get itemTypes(): {
        [K in ItemType]: Embedded<InstanceType<ConfigPF2e['PF2E']['Item']['documentClasses'][K]>>[];
    };

    /** See implementation in class */
    createEmbeddedDocuments(
        embeddedName: 'ActiveEffect',
        data: PreCreate<foundry.data.ActiveEffectSource>[],
        context?: DocumentModificationContext,
    ): Promise<ActiveEffectPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: 'Item',
        data: PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext,
    ): Promise<ItemPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        data: PreCreate<foundry.data.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext,
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;

    /** See implementation in class */
    updateEmbeddedDocuments(
        embeddedName: 'ActiveEffect',
        updateData: EmbeddedDocumentUpdateData<ActiveEffectPF2e>[],
        options?: DocumentModificationContext,
    ): Promise<ActiveEffectPF2e[]>;
    updateEmbeddedDocuments(
        embeddedName: 'Item',
        updateData: EmbeddedDocumentUpdateData<ItemPF2e>[],
        options?: DocumentModificationContext,
    ): Promise<ItemPF2e[]>;
    updateEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        updateData: EmbeddedDocumentUpdateData<ActiveEffectPF2e | ItemPF2e>[],
        options?: DocumentModificationContext,
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;

    getCondition(conditionType: ConditionType, { all }: { all: true }): Embedded<ConditionPF2e>[];
    getCondition(conditionType: ConditionType, { all }: { all: false }): Embedded<ConditionPF2e> | null;
    getCondition(conditionType: ConditionType): Embedded<ConditionPF2e> | null;
    getCondition(
        conditionType: ConditionType,
        { all }: { all: boolean },
    ): Embedded<ConditionPF2e>[] | Embedded<ConditionPF2e> | null;

    getFlag(scope: string, key: string): any;
    getFlag(scope: 'core', key: 'sourceId'): string | undefined;
    getFlag(scope: 'pf2e', key: 'rollOptions.all.target:flatFooted'): boolean;
}
