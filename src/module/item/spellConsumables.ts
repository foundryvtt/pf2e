/* global game */
import { PF2EActor } from '../actor/actor';
import { ConsumableData, SpellcastingEntryData, SpellData } from './dataDefinitions';
import { PF2EItem } from './item';

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

export async function scrollFromSpell(spellData: SpellData, heightenedLevel?: number): Promise<ConsumableData> {
    heightenedLevel = heightenedLevel ?? spellData.data.level.value;
    const pack = game.packs.find((p) => p.collection === 'pf2e.equipment-srd');
    const scroll = (await pack.getEntry(scrollCompendiumIds[heightenedLevel])) as ConsumableData;
    scroll.name = game.i18n.format('PF2E.ScrollFromSpell', { name: spellData.name, level: heightenedLevel });
    scroll.data.spell = {
        data: duplicate(spellData),
        heightenedLevel: heightenedLevel,
    };
    return scroll;
}

export const wandCompendiumIds = {
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

export async function wandFromSpell(spellData: SpellData, heightenedLevel?: number): Promise<ConsumableData> {
    heightenedLevel = heightenedLevel ?? spellData.data.level.value;
    const pack = game.packs.find((p) => p.collection === 'pf2e.equipment-srd');
    const wand = (await pack.getEntry(wandCompendiumIds[heightenedLevel])) as ConsumableData;
    wand.name = game.i18n.format('PF2E.WandFromSpell', { name: spellData.name, level: heightenedLevel });
    wand.data.spell = {
        data: duplicate(spellData),
        heightenedLevel: heightenedLevel,
    };
    return wand;
}

export async function castSpellFromConsumable(item: ConsumableData, actor: PF2EActor) {
    if (!item.data.spell) return;
    const spellData = item.data.spell.data.data;
    let spellcastingEntries = actor.data.items.filter((i) => i.type === 'spellcastingEntry') as SpellcastingEntryData[];
    // Filter to only spellcasting entries that are eligible to cast this consumable
    spellcastingEntries = spellcastingEntries
        .filter((i) => ['prepared', 'spontaneous'].includes(i.data.prepared.value))
        .filter((i) => spellData.traditions.value.includes(i.data.tradition.value));
    if (spellcastingEntries.length > 0) {
        const localize: Localization['localize'] = game.i18n.localize.bind(game.i18n);
        let maxBonus = 0;
        let bestEntry = 0;
        for (let i = 0; i < spellcastingEntries.length; i++) {
            if (spellcastingEntries[i].data.spelldc.value > maxBonus) {
                maxBonus = spellcastingEntries[i].data.spelldc.value;
                bestEntry = i;
            }
        }
        spellData.isSave = spellData.spellType.value === 'save';
        if (spellData.isSave) {
            spellData.save.dc = spellcastingEntries[bestEntry].data.spelldc.dc;
        } else spellData.save.dc = spellcastingEntries[bestEntry].data.spelldc.value;
        spellData.save.str = spellData.save.value ? CONFIG.PF2E.saves[spellData.save.value.toLowerCase()] : '';
        spellData.damageLabel =
            spellData.spellType.value === 'heal' ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');
        spellData.isAttack = spellData.spellType.value === 'attack';

        const props: (number | string)[] = [
            CONFIG.PF2E.spellLevels[spellData.level.value],
            `${localize('PF2E.SpellComponentsLabel')}: ${spellData.components.value}`,
            spellData.range.value ? `${localize('PF2E.SpellRangeLabel')}: ${spellData.range.value}` : null,
            spellData.target.value ? `${localize('PF2E.SpellTargetLabel')}: ${spellData.target.value}` : null,
            spellData.area.value
                ? `${localize('PF2E.SpellAreaLabel')}: ${CONFIG.PF2E.areaSizes[spellData.area.value]} ${
                      CONFIG.PF2E.areaTypes[spellData.area.areaType]
                  }`
                : null,
            spellData.areasize?.value ? `${localize('PF2E.SpellAreaLabel')}: ${spellData.areasize.value}` : null,
            spellData.time.value ? `${localize('PF2E.SpellTimeLabel')}: ${spellData.time.value}` : null,
            spellData.duration.value ? `${localize('PF2E.SpellDurationLabel')}: ${spellData.duration.value}` : null,
        ];
        spellData.spellLvl = item.data.spell.heightenedLevel.toString();
        if (spellData.level.value < parseInt(spellData.spellLvl, 10)) {
            props.push(`Heightened: +${parseInt(spellData.spellLvl, 10) - spellData.level.value}`);
        }
        spellData.properties = props.filter((p) => p !== null);

        const traits = PF2EItem.traitChatData(spellData.traits, CONFIG.PF2E.spellTraits);
        // TODO: This line needs to be fixed as these types are not even vaguely compatible
        spellData.traits = traits.filter((p) => p) as any;

        const template = `systems/pf2e/templates/chat/spell-card.html`;
        const { token } = actor;
        const templateData = {
            actor: actor,
            tokenId: token ? `${token.scene._id}.${token.id}` : null,
            item: item,
            data: spellData,
        };

        // Basic chat message data
        const chatData: any = {
            user: game.user._id,
            speaker: {
                actor: actor._id,
                token: actor.token,
                alias: actor.name,
            },
            flags: {
                core: {
                    canPopout: true,
                },
            },
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        };

        // Toggle default roll mode
        const rollMode = game.settings.get('core', 'rollMode');
        if (['gmroll', 'blindroll'].includes(rollMode))
            chatData.whisper = ChatMessage.getWhisperRecipients('GM').map((u) => u._id);
        if (rollMode === 'blindroll') chatData.blind = true;

        // Render the template
        chatData.content = await renderTemplate(template, templateData);

        // Create the chat message
        return ChatMessage.create(chatData, { displaySheet: false });
    }
}
