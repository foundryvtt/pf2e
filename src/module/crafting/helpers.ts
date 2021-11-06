/**
 * Implementation of Crafting rules on https://2e.aonprd.com/Actions.aspx?ID=43
 */
import {
    Coins,
    coinsToString,
    coinValueInCopper,
    extractPriceFromItem,
    multiplyCoinValue,
} from "@module/item/treasure/helpers";
import { DegreeOfSuccess } from "@module/degree-of-success";
import { ActorPF2e, CharacterPF2e } from "@actor";
import { getIncomeForLevel, TrainedProficiencies } from "@scripts/macros/earn-income";
import { ConsumablePF2e, PhysicalItemPF2e, SpellPF2e } from "@item";
import { RollDataPF2e } from "@system/rolls";
import { ZeroToFour } from "@module/data";
import { createConsumableFromSpell } from "@item/consumable/spell-consumables";

interface Costs {
    reductionPerDay: Coins;
    materials: Coins;
    itemPrice: Coins;
    lostMaterials: Coins;
}

function calculateDaysToNoCost(costs: Costs): number {
    return Math.ceil(
        (coinValueInCopper(costs.itemPrice) - coinValueInCopper(costs.materials)) /
            coinValueInCopper(costs.reductionPerDay)
    );
}

function prepStrings(costs: Costs, itemUuid: string) {
    return {
        reductionPerDay: coinsToString(costs.reductionPerDay),
        materialCost: game.i18n.format("PF2E.Actions.Craft.Details.PayMaterials", {
            cost: coinsToString(costs.materials),
        }),
        itemCost: game.i18n.format("PF2E.Actions.Craft.Details.PayFull", {
            cost: coinsToString(costs.itemPrice),
        }),
        lostMaterials: game.i18n.format("PF2E.Actions.Craft.Details.LostMaterials", {
            cost: coinsToString(costs.lostMaterials),
        }),
        itemLink: TextEditor.enrichHTML("@" + itemUuid.replace(".", "[") + "]"),
    };
}

function calculateCosts(
    item: PhysicalItemPF2e,
    quantity: number,
    actor: CharacterPF2e,
    degreeOfSuccess: number
): Costs | undefined {
    const itemPrice = extractPriceFromItem({
        data: { quantity: { value: quantity }, price: item.data.data.price },
    });
    const materialCosts = multiplyCoinValue(itemPrice, 0.5);

    const lostMaterials: Coins = {
        pp: 0,
        gp: 0,
        sp: 0,
        cp: 0,
    };

    const reductionPerDay: Coins = {
        pp: 0,
        gp: 0,
        sp: 0,
        cp: 0,
    };

    const proficiency = skillRankToProficiency(actor.data.data.skills.cra.rank);

    if (!proficiency) {
        return;
    }

    if (degreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
        Object.assign(reductionPerDay, getIncomeForLevel(actor.level + 1).rewards[proficiency]);
    } else if (degreeOfSuccess === DegreeOfSuccess.SUCCESS) {
        Object.assign(reductionPerDay, getIncomeForLevel(actor.level).rewards[proficiency]);
    } else if (degreeOfSuccess === DegreeOfSuccess.CRITICAL_FAILURE) {
        Object.assign(lostMaterials, multiplyCoinValue(materialCosts, 0.1));
    }

    return {
        itemPrice: itemPrice,
        materials: materialCosts,
        lostMaterials: lostMaterials,
        reductionPerDay: reductionPerDay,
    };
}

function skillRankToProficiency(rank: ZeroToFour): TrainedProficiencies | undefined {
    switch (rank) {
        case 0:
            return;
        case 1:
            return "trained";
        case 2:
            return "expert";
        case 3:
            return "master";
        case 4:
            return "legendary";
    }
}

export async function craftItem(item: PhysicalItemPF2e, itemQuantity: number, actor: ActorPF2e) {
    const itemSource = item.toObject();
    itemSource.data.quantity.value = itemQuantity;

    const result = await actor.addToInventory(itemSource);
    if (!result) {
        ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.CantAddItem"));
        return;
    }

    ChatMessage.create({
        user: game.user.id,
        content: game.i18n.format("PF2E.Actions.Craft.Information.ReceiveItem", {
            actorName: actor.name,
            quantity: itemQuantity,
            itemName: item.name,
        }),
        speaker: { alias: actor.name },
    });
}

export async function craftSpellConsumable(item: PhysicalItemPF2e, itemQuantity: number, actor: ActorPF2e) {
    const consumableType = (item as ConsumablePF2e).consumableType;
    if (!(consumableType === "scroll" || consumableType === "wand")) return;
    const spellLevel = consumableType === "wand" ? Math.ceil(item.level / 2) - 1 : Math.ceil(item.level / 2);
    const validSpells = actor.itemTypes.spell
        .filter((spell) => spell.level <= spellLevel && !spell.isCantrip && !spell.isFocusSpell && !spell.isRitual)
        .reduce((result, spell) => {
            result[spell.level] = [...(result[spell.level] || []), spell];
            return result;
        }, <Record<number, Embedded<SpellPF2e>[]>>{});
    const content = await renderTemplate("systems/pf2e/templates/actors/crafting-select-spell-dialog.html", {
        spells: validSpells,
    });
    new Dialog({
        title: game.i18n.localize("PF2E.Actions.Craft.SelectSpellDialog.Title"),
        content,
        buttons: {
            cancel: {
                icon: '<i class="fa fa-times"></i>',
                label: game.i18n.localize("Cancel"),
            },
            craft: {
                icon: '<i class="fa fa-hammer"></i>',
                label: game.i18n.localize("PF2E.Actions.Craft.SelectSpellDialog.CraftButtonLabel"),
                callback: async ($dialog) => {
                    const spellId = String($dialog.find('select[name="spell"]').val());
                    const spell = actor.items.get(spellId);
                    if (!spell || !(spell instanceof SpellPF2e)) return;
                    const item = await createConsumableFromSpell(consumableType, spell, spellLevel);
                    craftItem(new ConsumablePF2e(item), itemQuantity, actor);
                },
            },
        },
        default: "craft",
    }).render(true);
    return;
}

export async function renderCraftingInline(
    item: PhysicalItemPF2e,
    roll: Rolled<Roll<RollDataPF2e>>,
    quantity: number,
    actor: ActorPF2e
) {
    if (!(actor instanceof CharacterPF2e)) return;

    const degreeOfSuccess = roll.data.degreeOfSuccess || 0;
    const costs = calculateCosts(item, quantity, actor, degreeOfSuccess);

    if (!costs) return;

    const daysForZeroCost = degreeOfSuccess > 1 ? calculateDaysToNoCost(costs) : 0;

    return await renderTemplate("systems/pf2e/templates/chat/crafting-result.html", {
        daysForZeroCost: daysForZeroCost,
        strings: prepStrings(costs, item.uuid),
        item,
        quantity: quantity,
        success: degreeOfSuccess > 1,
        criticalFailure: degreeOfSuccess === 0,
    });
}
