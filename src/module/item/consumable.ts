import { RollDamageOptions } from './base';
import { PhysicalItemPF2e } from './physical';
import { SpellPF2e } from './spell';
import { AbilityString } from '@actor/data-definitions';
import { ActorPF2e } from '../actor/base';
import { calculateDC, DCOptions } from '../dc';
import { ConsumableData, SpellcastingEntryData, SpellData, TrickMagicItemCastData } from './data-definitions';
import { TrickMagicItemPopup } from '@actor/sheet/trick-magic-item-popup';

export enum SpellConsumableTypes {
    Scroll,
    Wand,
}

const scrollCompendiumIds = {
    1: 'RjuupS9xyXDLgyIr',
    2: 'Y7UD64foDbDMV9sx',
    3: 'ZmefGBXGJF3CFDbn',
    4: 'QSQZJ5BC3DeHv153',
    5: 'tjLvRWklAylFhBHQ',
    6: '4sGIy77COooxhQuC',
    7: 'fomEZZ4MxVVK3uVu',
    8: 'iPki3yuoucnj7bIt',
    9: 'cFHomF3tty8Wi1e5',
    10: 'o1XIHJ4MJyroAHfF',
} as Record<number, string>;

const wandCompendiumIds = {
    1: 'UJWiN0K3jqVjxvKk',
    2: 'vJZ49cgi8szuQXAD',
    3: 'wrDmWkGxmwzYtfiA',
    4: 'Sn7v9SsbEDMUIwrO',
    5: '5BF7zMnrPYzyigCs',
    6: 'kiXh4SUWKr166ZeM',
    7: 'nmXPj9zuMRQBNT60',
    8: 'Qs8RgNH6thRPv2jt',
    9: 'Fgv722039TVM5JTc',
} as Record<number, string>;

function getIdForSpellConsumable(type: SpellConsumableTypes, heightenedLevel: number): string {
    if (type == SpellConsumableTypes.Scroll) {
        return scrollCompendiumIds[heightenedLevel];
    } else {
        return wandCompendiumIds[heightenedLevel];
    }
}

function getNameForSpellConsumable(type: SpellConsumableTypes, spellName: string, heightenedLevel: number): string {
    if (type == SpellConsumableTypes.Scroll) {
        return game.i18n.format('PF2E.ScrollFromSpell', { name: spellName, level: heightenedLevel });
    } else {
        return game.i18n.format('PF2E.WandFromSpell', { name: spellName, level: heightenedLevel });
    }
}

export async function createConsumableFromSpell(
    type: SpellConsumableTypes,
    spellData: SpellData,
    heightenedLevel?: number,
): Promise<ConsumableData> {
    heightenedLevel = heightenedLevel ?? spellData.data.level.value;
    const pack = game.packs.find((p) => p.collection === 'pf2e.equipment-srd');
    const spellConsumable = (await pack?.getEntry(getIdForSpellConsumable(type, heightenedLevel))) as ConsumableData;
    spellConsumable.data.traits.value.push(...duplicate(spellData.data.traditions.value));
    spellConsumable.name = getNameForSpellConsumable(type, spellData.name, heightenedLevel);
    spellConsumable.data.description.value = `@Compendium[pf2e.spells-srd.${spellData._id}]{${spellData.name}}\n<hr/>${spellConsumable.data.description.value}`;
    spellConsumable.data.spell = {
        data: duplicate(spellData),
        heightenedLevel: heightenedLevel,
    };
    return spellConsumable;
}

export function canCastConsumable(actor: ActorPF2e, item: ConsumableData): boolean {
    const spellData = item.data.spell?.data?.data ?? null;
    const spellcastingEntries = actor.data.items.filter(
        (i) => i.type === 'spellcastingEntry',
    ) as SpellcastingEntryData[];
    return (
        spellcastingEntries
            .filter((i) => ['prepared', 'spontaneous'].includes(i.data.prepared.value))
            .filter((i) => spellData?.traditions?.value.includes(i.data.tradition.value)).length > 0
    );
}

export interface TrickMagicItemDifficultyData {
    Arc?: number;
    Rel?: number;
    Occ?: number;
    Nat?: number;
}

const TraditionSkills = {
    arcane: 'Arc',
    divine: 'Rel',
    occult: 'Occ',
    primal: 'Nat',
};

export function calculateTrickMagicItemCheckDC(
    itemData: ConsumableData,
    options: DCOptions = { proficiencyWithoutLevel: false },
): TrickMagicItemDifficultyData {
    const level = Number(itemData.data.level.value);
    const DC = calculateDC(level, options);
    const skills: [string, number][] = itemData.data.traits.value
        .filter((t) => ['arcane', 'primal', 'divine', 'occult'].includes(t))
        .map((s) => [TraditionSkills[s as keyof typeof TraditionSkills], DC]);
    return Object.fromEntries(skills);
}

export function calculateTrickMagicItemCastData(actor: ActorPF2e, skill: string): TrickMagicItemCastData {
    const highestMentalStat = ['int', 'wis', 'cha']
        .map((s) => {
            return { stat: s, mod: actor.getAbilityMod(s as AbilityString) };
        })
        .reduce((highest, next) => {
            if (next.mod > highest.mod) {
                return next;
            } else {
                return highest;
            }
        }).stat as AbilityString;
    const spellDC =
        actor.data.data.details.level.value +
        Math.max(0, actor.data.data.skills[skill].rank - 2) * 2 +
        actor.getAbilityMod(highestMentalStat);
    return {
        ability: highestMentalStat,
        data: { spelldc: { value: spellDC, dc: spellDC + 10 } },
        _id: '',
    };
}

export class ConsumablePF2e extends PhysicalItemPF2e {
    async getSpell() {
        const spellData = this.data.data.spell?.data;
        if (spellData && this.actor) {
            return SpellPF2e.createOwned(spellData, this.actor);
        }

        return null;
    }

    /**
     * Use a consumable item
     */
    async rollConsumable(this: Owned<ConsumablePF2e>, _ev: JQuery.ClickEvent) {
        const item = this.data;
        if (item.type !== 'consumable') throw Error('Tried to roll consumable on a non-consumable');
        if (!this.actor) throw Error('Tried to roll a consumable that has no actor');

        const itemData = item.data;
        // Submit the roll to chat
        if (
            ['scroll', 'wand'].includes(item.data.consumableType.value) &&
            item.data.spell?.data &&
            this.actor instanceof ActorPF2e
        ) {
            if (canCastConsumable(this.actor, item)) {
                this._castEmbeddedSpell();
            } else if (this.actor.itemTypes.feat.some((feat) => feat.slug === 'trick-magic-item')) {
                const DC = calculateTrickMagicItemCheckDC(item);
                const trickMagicItemCallback = async (trickMagicItemPromise: TrickMagicItemCastData): Promise<void> => {
                    const trickMagicItemData = await trickMagicItemPromise;
                    if (trickMagicItemData) this._castEmbeddedSpell(trickMagicItemData);
                };
                const popup = new TrickMagicItemPopup(this.actor, DC, trickMagicItemCallback);
                popup.render(true);
            } else {
                const content = game.i18n.format('PF2E.LackCastConsumableCapability', { name: this.name });
                ChatMessage.create({
                    user: game.user._id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    whisper: ChatMessage.getWhisperRecipients(this.actor.name),
                    content,
                });
            }
        } else {
            const cv = itemData.consume.value;
            const content = `Uses ${this.name}`;
            if (cv) {
                new Roll(cv).toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: content,
                });
            } else {
                ChatMessage.create({
                    user: game.user._id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    content,
                });
            }
        }

        // Deduct consumed charges from the item
        if (itemData.autoUse.value) this.consume();
    }

    async rollAttack(options: RollDamageOptions) {
        const spell = await this.getSpell();
        if (spell) {
            return spell.rollAttack(options);
        }
    }

    async rollDamage(options: RollDamageOptions) {
        const spell = await this.getSpell();
        if (spell) {
            return spell.rollDamage(options);
        }
    }

    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = this.data.data;
        const localize = game.i18n.localize.bind(game.i18n);
        const consumableType = CONFIG.PF2E.consumableTypes[data.consumableType.value];
        return this.processChatData(htmlOptions, {
            ...data,
            consumableType: {
                ...data.consumableType,
                str: consumableType,
            },
            properties: [
                consumableType,
                `${data.charges.value}/${data.charges.max} ${localize('PF2E.ConsumableChargesLabel')}`,
            ],
            hasCharges: data.charges.value >= 0,
        });
    }

    handleButtonAction(this: Owned<ConsumablePF2e>, event: JQuery.ClickEvent, action: string | undefined): boolean {
        if (action === 'consume') {
            this.rollConsumable(event);
            return true;
        }

        // without binding, the this: Owned<ItemPF2e> errors in betterer
        return super.handleButtonAction.bind(this)(event, action);
    }
}

export interface ConsumablePF2e {
    data: ConsumableData;
    _data: ConsumableData;
}
