import { PF2EActor } from '../actor/actor';
import { PF2EItem } from './item';
import { getPropertySlots } from './runes';
import { TraitSelector5e } from '../system/trait-selector';
import { LoreDetailsData, MartialData, WeaponData } from './data-definitions';
import { LocalizePF2e } from '../system/localization';
import { ConfigPF2e } from 'src/scripts/config';

/**
 * Override and extend the basic :class:`ItemSheet` implementation.
 * @category Other
 */
export class ItemSheetPF2e extends ItemSheet<PF2EItem> {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.width = 630;
        options.height = 460;
        options.classes = options.classes.concat(['pf2e', 'item']);
        options.template = 'systems/pf2e/templates/items/item-sheet.html';
        options.tabs = [
            {
                navSelector: '.tabs',
                contentSelector: '.sheet-body',
                initial: 'description',
            },
        ];
        options.resizable = true;
        options.submitOnChange = true;

        return options;
    }
    /* -------------------------------------------- */

    /**
     * Prepare item sheet data
     * Start with the base item data and extending with additional properties for rendering.
     */

    getData() {
        const data: any = super.getData();
        data.buildMode = BUILD_MODE;
        // Fix for #193 - super.getData() was returning the original item (before update) when rerendering an OwnedItem of a token.
        // This works because the actor's items are already updated by the time the ItemSheet rerenders.
        const updatedData = this?.actor?.items?.get(this?.entity?.id ?? '')?.data;
        if (updatedData) {
            data.item = updatedData;
            data.data = updatedData.data;
        }
        data.abilities = CONFIG.PF2E.abilities;
        data.saves = CONFIG.PF2E.saves; // Sheet display details

        const { type } = this.item;
        mergeObject(data, {
            type,
            hasSidebar: true,
            sidebarTemplate: () => `systems/pf2e/templates/items/${type}-sidebar.html`,
            hasDetails: [
                'consumable',
                'equipment',
                'feat',
                'spell',
                'weapon',
                'armor',
                'action',
                'melee',
                'backpack',
                'condition',
                'lore',
            ].includes(type),
            detailsTemplate: () => `systems/pf2e/templates/items/${type}-details.html`,
        }); // Damage types

        const itemData = duplicate(this.item.data);
        const traits = itemData.data.traits.value.filter((trait) => !!trait);

        const dt = duplicate(CONFIG.PF2E.damageTypes);
        if (['spell', 'feat'].includes(type)) mergeObject(dt, CONFIG.PF2E.healingTypes);
        data.damageTypes = dt; // do not let user set bulk if in a stack group because the group determines bulk

        const stackGroup = data.data?.stackGroup?.value;
        data.bulkDisabled = stackGroup !== undefined && stackGroup !== null && stackGroup.trim() !== '';
        data.rarity = CONFIG.PF2E.rarityTraits; // treasure data
        data.usage = CONFIG.PF2E.usageTraits; // usage data
        data.stackGroups = CONFIG.PF2E.stackGroups;

        if (type === 'treasure') {
            data.currencies = CONFIG.PF2E.currencies;
            data.bulkTypes = CONFIG.PF2E.bulkTypes; // Consumable Data
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (type === 'consumable') {
            data.consumableTypes = CONFIG.PF2E.consumableTypes;
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.stackGroups = CONFIG.PF2E.stackGroups;
            data.consumableTraits = CONFIG.PF2E.consumableTraits;
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (type === 'spell') {
            // Spell Data
            mergeObject(data, {
                spellTypes: CONFIG.PF2E.spellTypes,
                spellCategories: CONFIG.PF2E.spellCategories,
                spellSchools: CONFIG.PF2E.spellSchools,
                spellLevels: CONFIG.PF2E.spellLevels,
                magicTraditions: CONFIG.PF2E.magicTraditions,
                // spellBasic: CONFIG.PF2E.spellBasic,
                spellComponents: this._formatSpellComponents(data.data),
                areaSizes: CONFIG.PF2E.areaSizes,
                areaTypes: CONFIG.PF2E.areaTypes,
                spellScalingModes: CONFIG.PF2E.spellScalingModes,
            });

            this._prepareTraits(traits, mergeObject(CONFIG.PF2E.magicTraditions, CONFIG.PF2E.spellTraits));
        } else if (type === 'weapon') {
            // get a list of all custom martial skills
            const martialSkills: MartialData[] = [];

            if (this.actor) {
                for (const i of this.actor.data.items) {
                    if (i.type === 'martial') martialSkills.push(i);
                }
            }

            data.martialSkills = martialSkills; // Weapon Data

            const materials: Partial<typeof CONFIG.PF2E.preciousMaterials> = duplicate(CONFIG.PF2E.preciousMaterials);
            delete materials.dragonhide;
            const slots = getPropertySlots(data);
            this.assignPropertySlots(data, slots);
            data.preciousMaterials = materials;
            data.weaponPotencyRunes = CONFIG.PF2E.weaponPotencyRunes;
            data.weaponStrikingRunes = CONFIG.PF2E.weaponStrikingRunes;
            data.weaponPropertyRunes = CONFIG.PF2E.weaponPropertyRunes;
            data.preciousMaterials = CONFIG.PF2E.preciousMaterials;
            data.preciousMaterialGrades = CONFIG.PF2E.preciousMaterialGrades;

            data.weaponTraits = traits.map(
                (trait) => CONFIG.PF2E.weaponTraits[trait as keyof ConfigPF2e['PF2E']['weaponTraits']] ?? trait,
            );
            data.weaponTypes = CONFIG.PF2E.weaponTypes;
            data.weaponGroups = CONFIG.PF2E.weaponGroups;
            data.itemBonuses = CONFIG.PF2E.itemBonuses;
            data.damageDie = CONFIG.PF2E.damageDie;
            data.damageDice = CONFIG.PF2E.damageDice;
            data.conditionTypes = CONFIG.PF2E.conditionTypes;
            data.weaponDamage = CONFIG.PF2E.damageTypes;
            data.weaponRange = CONFIG.PF2E.weaponRange;
            data.weaponReload = CONFIG.PF2E.weaponReload;
            data.weaponMAP = CONFIG.PF2E.weaponMAP;
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.sizes = CONFIG.PF2E.actorSizes;
            data.isBomb = type === 'weapon' && data.data?.group?.value === 'bomb';

            this._prepareTraits(data.data.traits, CONFIG.PF2E.weaponTraits);
        } else if (type === 'melee') {
            // Melee Data
            const actions = {};

            if (this.actor) {
                for (const i of this.actor.data.items) {
                    if (i.type === 'action') actions[i.name] = i.name;
                }
            }

            data.attackEffects = CONFIG.PF2E.attackEffects;
            mergeObject(data.attackEffects, actions);
            data.hasSidebar = false;
            data.detailsActive = true;
            data.weaponDamage = CONFIG.PF2E.damageTypes;

            this._prepareTraits(data.data.traits, CONFIG.PF2E.weaponTraits);
        } else if (type === 'feat') {
            // Feat types
            data.featTypes = CONFIG.PF2E.featTypes;
            data.featActionTypes = CONFIG.PF2E.featActionTypes;
            data.actionsNumber = CONFIG.PF2E.actionsNumber;
            data.categories = CONFIG.PF2E.actionCategories;
            data.featTags = [data.data.level.value, data.data.traits.value].filter((t) => !!t);

            this._prepareTraits(data.data.traits, CONFIG.PF2E.featTraits);
        } else if (type === 'condition') {
            // Condition types

            data.conditions = [];
        } else if (type === 'action') {
            // Action types
            const actorWeapons: WeaponData[] = [];

            if (this.actor) {
                for (const i of this.actor.data.items) {
                    if (i.type === 'weapon') actorWeapons.push(i);
                }
            }

            const actionType = data.data.actionType.value || 'action';
            let actionImg: string | number = 0;
            if (actionType === 'action') actionImg = parseInt((data.data.actions || {}).value, 10) || 1;
            else if (actionType === 'reaction') actionImg = 'reaction';
            else if (actionType === 'free') actionImg = 'free';
            else if (actionType === 'passive') actionImg = 'passive';

            data.item.img = this._getActionImg(actionImg);
            data.categories = CONFIG.PF2E.actionCategories;
            data.weapons = actorWeapons;
            data.actionTypes = CONFIG.PF2E.actionTypes;
            data.actionsNumber = CONFIG.PF2E.actionsNumber;
            data.featTraits = CONFIG.PF2E.featTraits;
            data.skills = CONFIG.PF2E.skillList;
            data.proficiencies = CONFIG.PF2E.proficiencyLevels;
            data.actionTags = [data.data.traits.value].filter((t) => !!t);

            this._prepareTraits(data.data.traits, CONFIG.PF2E.featTraits);
        } else if (type === 'equipment') {
            // Equipment data
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.stackGroups = CONFIG.PF2E.stackGroups;
            data.equipmentTraits = CONFIG.PF2E.equipmentTraits;
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (type === 'backpack') {
            // Backpack data
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.equipmentTraits = CONFIG.PF2E.equipmentTraits;
            data.sizes = CONFIG.PF2E.actorSizes;
            // this._prepareTraits(data.data.traits, CONFIG.PF2E.backpackTraits);
        } else if (type === 'armor') {
            // Armor data
            const slots = getPropertySlots(data);
            this.assignPropertySlots(data, slots);
            data.armorPotencyRunes = CONFIG.PF2E.armorPotencyRunes;
            data.armorResiliencyRunes = CONFIG.PF2E.armorResiliencyRunes;
            data.armorPropertyRunes = CONFIG.PF2E.armorPropertyRunes;
            data.armorTypes = CONFIG.PF2E.armorTypes;
            data.armorGroups = CONFIG.PF2E.armorGroups;
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.armorTraits = CONFIG.PF2E.armorTraits;
            data.preciousMaterials = CONFIG.PF2E.preciousMaterials;
            data.preciousMaterialGrades = CONFIG.PF2E.preciousMaterialGrades;
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (type === 'lore') {
            // Lore-specific data
            data.proficiencies = CONFIG.PF2E.proficiencyLevels;
        } else if (type === 'effect') {
            // Effect-specific data
            if (this?.actor?.items) {
                const scopes = new Set<string>();

                data.item.data.rules
                    .filter((rule) => rule.key === 'PF2E.RuleElement.EffectTarget')
                    .forEach((rule) => {
                        scopes.add((rule as any).scope);
                    });
                if (scopes) {
                    data.targets = this.actor.items
                        .filter((item) => scopes.has(item.type))
                        .map((item) => {
                            return { id: item.id, name: item.name };
                        });
                }
            }
        }

        data.enabledRulesUI = game.settings.get(game.system.id, 'enabledRulesUI') ?? false;

        const durationString = (duration: ActiveEffectDuration): string => {
            const translations = LocalizePF2e.translations.PF2E.ActiveEffects;
            type DurationEntry = [string, number | string | null];
            const durationEntries: DurationEntry[] = Object.entries(duration).filter((entry: DurationEntry) =>
                ['rounds', 'seconds', 'turns'].includes(entry[0]),
            );

            const [key, quantity] =
                durationEntries.find(
                    (entry: DurationEntry): entry is [string, number | null] => typeof entry[1] === 'number',
                ) ?? (['permanent', null] as const);

            if (key === 'permanent') {
                return translations.Duration.Permanent;
            }

            type UnitLabel = 'Second' | 'Seconds' | 'Round' | 'Rounds' | 'Turn' | 'Turns';
            const unit =
                quantity === 1
                    ? ((key.slice(0, 1).toUpperCase() + key.slice(1, -1)) as UnitLabel)
                    : ((key.slice(0, 1).toUpperCase() + key.slice(1)) as UnitLabel);
            return game.i18n.format(translations.Duration[unit ?? 'seconds'], {
                quantity,
            });
        };

        interface ActiveEffectSheetData {
            id: string;
            iconPath: string | null;
            name: string;
            duration: string;
            enabled: boolean;
        }
        const actor = this.item.actor;
        const origin = `Actor.${actor?.id}.OwnedItem.${this.item.id}`; // `;
        const effects =
            actor instanceof PF2EActor
                ? actor.effects.entries.filter((effect) => effect.data.origin === origin)
                : this.item.effects.entries;

        data.activeEffects = {
            showList: BUILD_MODE === 'development' || effects.length > 0,
            canCreate: BUILD_MODE === 'development' && actor === null && !this.item.uuid.match(/Compendium/),
            effects: effects.map(
                (effect): ActiveEffectSheetData => ({
                    id: effect.id,
                    iconPath: effect.data.icon ?? null,
                    name: effect.data.label,
                    duration: durationString(effect.data.duration),
                    enabled: !effect.data.disabled,
                }),
            ),
        };

        return data;
    }

    assignPropertySlots(data, number: number) {
        const slots = [1, 2, 3, 4];

        for (const slot of slots) {
            if (number >= slot) {
                data[`propertyRuneSlots${slot}`] = true;
            }
        }
    }

    _prepareTraits(traits, choices) {
        if (traits.selected) {
            traits.selected = traits.value.reduce((obj, t) => {
                obj[t] = choices[t];
                return obj;
            }, {});
        } else {
            traits.selected = [];
        } // Add custom entry

        if (traits.custom) traits.selected.custom = traits.custom;
    }
    /* -------------------------------------------- */

    _formatSpellComponents(data) {
        if (!data.components.value) return [];
        const comps = data.components.value.split(',').map((c) => CONFIG.PF2E.spellComponents[c.trim()] || c.trim());
        if (data.materials.value) comps.push(data.materials.value);
        return comps;
    }
    /* -------------------------------------------- */

    onTraitSelector(event) {
        event.preventDefault();
        const a = $(event.currentTarget);
        const options = {
            name: a.parents('label').attr('for'),
            title: a.parent().text().trim(),
            width: a.attr('data-width') || 'auto',
            has_placeholders: a.attr('data-has-placeholders') === 'true',
            choices: CONFIG.PF2E[a.attr('data-options') ?? ''],
        };
        new TraitSelector5e(this.item, options).render(true);
    }
    /* -------------------------------------------- */

    /**
     * Get the action image to use for a particular action type.
     * @private
     */

    _getActionImg(action) {
        const img = {
            0: 'icons/svg/mystery-man.svg',
            1: 'systems/pf2e/icons/actions/OneAction.png',
            2: 'systems/pf2e/icons/actions/TwoActions.png',
            3: 'systems/pf2e/icons/actions/ThreeActions.png',
            free: 'systems/pf2e/icons/actions/FreeAction.png',
            reaction: 'systems/pf2e/icons/actions/Reaction.png',
            passive: 'icons/svg/mystery-man.svg',
        };
        return img[action];
    }

    async _addDamageRoll(event: JQuery.TriggeredEvent) {
        event.preventDefault();
        const newKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const newDamageRoll = {
            damage: '',
            damageType: '',
        };
        return this.item.update({
            [`data.damageRolls.${newKey}`]: newDamageRoll,
        });
    }

    async _deleteDamageRoll(event: JQuery.TriggeredEvent) {
        event.preventDefault();
        if (event.originalEvent) {
            await this._onSubmit(event.originalEvent);
        }
        const targetKey = $(event.target).parents('.damage-part').attr('data-damage-part');
        return this.item.update({
            [`data.damageRolls.-=${targetKey}`]: null,
        });
    }
    /* -------------------------------------------- */

    /**
     * Activate listeners for interactive item sheet events
     */
    activateListeners(html: JQuery) {
        super.activateListeners(html); // Checkbox changes

        html.find('li.trait-item input[type="checkbox"]').on('click', (event) => {
            if (event.originalEvent instanceof MouseEvent) {
                this._onSubmit(event.originalEvent); // Trait Selector
            }
        });

        html.find('.trait-selector').on('click', (ev) => this.onTraitSelector(ev)); // Add Damage Roll

        html.find('.add-damage').on('click', (ev) => {
            this._addDamageRoll(ev);
        }); // Remove Damage Roll

        html.find('.delete-damage').on('click', (ev) => {
            this._deleteDamageRoll(ev);
        });

        html.find('.add-rule-element').on('click', async (event) => {
            event.preventDefault();
            if (event.originalEvent instanceof MouseEvent) {
                await this._onSubmit(event.originalEvent); // submit any unsaved changes
            }
            const rules = (this.item.data.data as any).rules ?? [];
            this.item.update({
                'data.rules': rules.concat([{ key: 'PF2E.RuleElement.Unrecognized' }]),
            });
        });
        html.find('.rules').on('click', '.remove-rule-element', async (event) => {
            event.preventDefault();
            if (event.originalEvent instanceof MouseEvent) {
                await this._onSubmit(event.originalEvent); // submit any unsaved changes
            }
            const rules = duplicate((this.item.data.data as any).rules ?? []) as any[];
            const index = event.currentTarget.dataset.ruleIndex;
            if (rules && rules.length > Number(index)) {
                rules.splice(index, 1);
                this.item.update({ 'data.rules': rules });
            }
        });

        html.find('.add-skill-variant').on('click', (_event) => {
            const variants =
                (this.actor?.items?.get(this?.entity?.id ?? '')?.data.data as LoreDetailsData)?.variants ?? {};
            const index = Object.keys(variants).length;
            this.item.update({
                [`data.variants.${index}`]: { label: '+X in terrain', options: '' },
            });
        });
        html.find('.skill-variants').on('click', '.remove-skill-variant', (event) => {
            const index = event.currentTarget.dataset.skillVariantIndex;
            this.item.update({ [`data.variants.-=${index}`]: null });
        });

        // Active Effect controls
        html.find('.tab.effects table th a[data-action="create"]').on('click', () => {
            const ae = ActiveEffect.create(
                {
                    label: 'New Effect',
                    icon: 'systems/pf2e/icons/default-icons/effect.svg',
                    origin: this.item.uuid,
                    disabled: false,
                    duration: {
                        rounds: undefined,
                        seconds: undefined,
                    },
                },
                this.item,
            );
            ae.create().then((effectData) => {
                this.render();
                this.item.effects.get(effectData._id)!.sheet.render(true);
            });
        });

        const $aeControls = html.find('.tab.effects table tbody td.controls');

        const actor = this.item.actor;
        const origin = `Actor.${actor?.id}.OwnedItem.${this.item.id}`; // `;

        const getEffects = (): ActiveEffect[] => {
            return actor instanceof PF2EActor
                ? actor.effects.entries.filter((effect) => effect.data.origin === origin)
                : this.item.effects.entries;
        };
        const getEffectId = (target: HTMLElement): string | undefined => {
            return $(target).closest('tr').data('effect-id');
        };
        const effects = getEffects();
        effects;

        $aeControls.find('input[data-action="enable"]').on('change', (event) => {
            event.preventDefault();

            const effects = getEffects();
            const effectId = getEffectId(event.target);
            const effect = effects.find((ownedEffect) => ownedEffect.id === effectId);
            if (effect instanceof ActiveEffect) {
                const isDisabled = !$(event.target as HTMLInputElement).is(':checked');
                const refresh = () => this.render();
                if (actor instanceof PF2EActor) {
                    actor.updateEmbeddedEntity('ActiveEffect', { _id: effect.id, disabled: isDisabled }).then(refresh);
                } else {
                    effect.update({ disabled: isDisabled }).then(refresh);
                }
            }
        });

        $aeControls.find('a[data-action="edit"]').on('click', (event) => {
            const effects = getEffects();
            const effectId = getEffectId(event.target);
            const effect = effects.find((ownedEffect) => ownedEffect.id === effectId);
            if (effect instanceof ActiveEffect) {
                effect.sheet.render(true);
            }
        });
        $aeControls.find('a[data-action="delete"]').on('click', (event) => {
            const effects = getEffects();
            const effectId = getEffectId(event.target);
            const effect = effects.find((ownedEffect) => ownedEffect.id === effectId);
            if (effect instanceof ActiveEffect) {
                if (actor instanceof PF2EActor) {
                    actor.deleteEmbeddedEntity('ActiveEffect', effect.id);
                } else {
                    effect.delete();
                }
            }
        });
    }

    _getSubmitData(updateData: Record<string, unknown> = {}): Record<string, unknown> {
        // create the expanded update data object
        const fd = new FormDataExtended(this.form, { editors: this.editors });
        const data: Record<string, unknown> & { data?: { rules?: string[] } } = updateData
            ? mergeObject(fd.toObject(), updateData)
            : expandObject(fd.toObject());

        // ensure all rules objects are parsed and saved as objects
        if (data?.data?.rules) {
            data.data.rules = Object.entries(data.data.rules).map(([_, value]) => {
                try {
                    return JSON.parse(value as string);
                } catch (error) {
                    ui.notifications.warn('Syntax error in rule element definition.');
                    throw error;
                }
            });
        }

        return flattenObject(data); // return the flattened submission data
    }
}
