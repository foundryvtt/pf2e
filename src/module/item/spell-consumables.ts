import { AbilityString } from '@actor/data-definitions';
import { ActorPF2e } from '../actor/base';
import { calculateDC, DCOptions } from '../dc';
import { ConsumableData, SpellcastingEntryData, SpellData, TrickMagicItemCastData } from './data-definitions';

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
};

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
};

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
        .map((s) => [TraditionSkills[s], DC]);
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
