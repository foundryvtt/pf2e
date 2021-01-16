import { SpellData } from './dataDefinitions';
import { PF2EConsumable } from './others';

export const scrollCompendiumIds = {
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

export async function scrollFromSpell(spellData: SpellData, heightenedLevel: number): Promise<PF2EConsumable> {
    const pack = game.packs.find((p) => p.collection === 'pf2e.equipment-srd');
    const scroll = (await pack.getEntity(scrollCompendiumIds[heightenedLevel])) as PF2EConsumable;
    scroll.data.data.spell.data = spellData;
    scroll.data.data.spell.heightenedLevel = heightenedLevel;
    return scroll;
}
