import { ConsumablePF2e, SpellPF2e } from "@item";
import { ConsumableSource } from "@item/data";
import { MagicTradition } from "@item/spell/types";
import { MAGIC_TRADITIONS } from "@item/spell/values";
import { traditionSkills } from "@item/spellcasting-entry/trick";
import { calculateDC, DCOptions } from "@module/dc";
import { ErrorPF2e, setHasElement } from "@util";

const cantripDeckId = "tLa4bewBhyqzi6Ow";

const scrollCompendiumIds: Record<number, string | undefined> = {
    1: "RjuupS9xyXDLgyIr",
    2: "Y7UD64foDbDMV9sx",
    3: "ZmefGBXGJF3CFDbn",
    4: "QSQZJ5BC3DeHv153",
    5: "tjLvRWklAylFhBHQ",
    6: "4sGIy77COooxhQuC",
    7: "fomEZZ4MxVVK3uVu",
    8: "iPki3yuoucnj7bIt",
    9: "cFHomF3tty8Wi1e5",
    10: "o1XIHJ4MJyroAHfF",
};

const spellConsumableItemTypes = ["cantrip-deck-5", "scroll", "wand"] as const;
type SpellConsumableItemType = typeof spellConsumableItemTypes[number];

const wandCompendiumIds: Record<number, string | undefined> = {
    1: "UJWiN0K3jqVjxvKk",
    2: "vJZ49cgi8szuQXAD",
    3: "wrDmWkGxmwzYtfiA",
    4: "Sn7v9SsbEDMUIwrO",
    5: "5BF7zMnrPYzyigCs",
    6: "kiXh4SUWKr166ZeM",
    7: "nmXPj9zuMRQBNT60",
    8: "Qs8RgNH6thRPv2jt",
    9: "Fgv722039TVM5JTc",
};

function getIdForSpellConsumable(type: SpellConsumableItemType, heightenedLevel: number): string | null {
    let id = null;
    switch (type) {
        case "cantrip-deck-5":
            id = cantripDeckId;
            break;
        case "scroll":
            id = scrollCompendiumIds[heightenedLevel] ?? null;
            break;
        default:
            id = wandCompendiumIds[heightenedLevel] ?? null;
    }
    return id;
}

function getNameForSpellConsumable(type: SpellConsumableItemType, spellName: string, heightenedLevel: number): string {
    let name;
    switch (type) {
        case "cantrip-deck-5":
            name = game.i18n.format("PF2E.CantripDeckFromSpell", { name: spellName });
            break;
        case "scroll":
            name = game.i18n.format("PF2E.ScrollFromSpell", { name: spellName, level: heightenedLevel });
            break;
        default:
            name = game.i18n.format("PF2E.WandFromSpell", { name: spellName, level: heightenedLevel });
    }
    return name;
}

function isSpellConsumable(itemId: string): boolean {
    return (
        itemId === cantripDeckId ||
        Object.values(scrollCompendiumIds).includes(itemId) ||
        Object.values(wandCompendiumIds).includes(itemId)
    );
}

function isSpellConsumableItemType(type: string): type is SpellConsumableItemType {
    return spellConsumableItemTypes.includes(type as SpellConsumableItemType);
}

async function createConsumableFromSpell(
    type: SpellConsumableItemType,
    spell: SpellPF2e,
    heightenedLevel = spell.baseLevel
): Promise<ConsumableSource> {
    const pack = game.packs.find((p) => p.collection === "pf2e.equipment-srd");
    const itemId = getIdForSpellConsumable(type, heightenedLevel);
    const consumable = await pack?.getDocument(itemId ?? "");
    if (!(consumable instanceof ConsumablePF2e)) {
        throw ErrorPF2e("Failed to retrieve consumable item");
    }

    const consumableSource = consumable.toObject();
    consumableSource.system.traits.value.push(...spell.traditions);
    consumableSource.name = getNameForSpellConsumable(type, spell.name, heightenedLevel);
    const description = consumableSource.system.description.value;
    consumableSource.system.description.value =
        (spell.sourceId ? "@" + spell.sourceId.replace(".", "[") + "]" : spell.description) + `\n<hr />${description}`;

    // Cantrip deck casts at level 1
    if (type !== "cantrip-deck-5") {
        consumableSource.system.spell = spell.clone({ "system.location.heightenedLevel": heightenedLevel }).toObject();
    }

    return consumableSource;
}

interface TrickMagicItemDifficultyData {
    arcana?: number;
    religion?: number;
    occultism?: number;
    nature?: number;
}

function calculateTrickMagicItemCheckDC(
    item: ConsumablePF2e,
    options: DCOptions = { proficiencyWithoutLevel: false }
): TrickMagicItemDifficultyData {
    const level = Number(item.level);
    const saveDC = calculateDC(level, options);

    const skills: [string, number][] = item.system.traits.value
        .filter((t): t is MagicTradition => setHasElement(MAGIC_TRADITIONS, t))
        .map((tradition) => [traditionSkills[tradition], saveDC]);

    return Object.fromEntries(skills);
}

export {
    calculateTrickMagicItemCheckDC,
    createConsumableFromSpell,
    isSpellConsumable,
    isSpellConsumableItemType,
    SpellConsumableItemType,
    TrickMagicItemDifficultyData,
};
