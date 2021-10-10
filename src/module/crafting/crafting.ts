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
import { PhysicalItemPF2e } from "@item";
import { RollDataPF2e } from "@system/rolls";
import { ZeroToFour } from "@module/data";

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

export async function renderCraftingInline(
    item: PhysicalItemPF2e,
    roll: Rolled<Roll<RollDataPF2e>>,
    quantity: number,
    actor: ActorPF2e,
    itemUuid: string
) {
    if (!(actor instanceof CharacterPF2e)) return;

    const degreeOfSuccess = roll.data.degreeOfSuccess || 0;
    const costs = calculateCosts(item, quantity, actor, degreeOfSuccess);

    if (!costs) return;

    const daysForZeroCost = degreeOfSuccess > 1 ? calculateDaysToNoCost(costs) : 0;

    return await renderTemplate("systems/pf2e/templates/chat/crafting-result.html", {
        daysForZeroCost: daysForZeroCost,
        strings: prepStrings(costs, itemUuid),
        img: item.img,
        itemUuid: itemUuid,
        quantity: quantity,
        success: degreeOfSuccess > 1,
        criticalFailure: degreeOfSuccess === 0,
    });
}
