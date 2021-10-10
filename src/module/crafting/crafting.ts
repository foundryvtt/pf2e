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

export interface CraftingResult {
    costs: {
        itemPrice: Coins;
        materials: Coins;
        reductionPerDay: Coins;
        lostMaterials: Coins;
    };
    successFlags: {
        criticalSuccess: boolean;
        success: boolean;
        failure: boolean;
        criticalFailure: boolean;
    };
    daysForZeroCost: number;
    item: PhysicalItemPF2e;
    itemUuid: string;
    quantity: number;
}

function calculateDaysToNoCost(itemCost: Coins, materialCost: Coins, reductionPerDay: Coins): number {
    return Math.ceil(
        (coinValueInCopper(itemCost) - coinValueInCopper(materialCost)) / coinValueInCopper(reductionPerDay)
    );
}

async function chatTemplate(craftingResult: CraftingResult) {
    const craftingData = JSON.stringify(craftingResult);
    const itemLink = "@" + craftingResult.itemUuid.replace(".", "[") + "]";

    const strings = {
        reductionPerDay: coinsToString(craftingResult.costs.reductionPerDay),
        materialCost: coinsToString(craftingResult.costs.materials),
        itemCost: coinsToString(craftingResult.costs.itemPrice),
        lostMaterials: coinsToString(craftingResult.costs.lostMaterials),
        itemLink: TextEditor.enrichHTML(itemLink),
    };

    const content = await renderTemplate("systems/pf2e/templates/chat/crafting-result.html", {
        craftingResult: craftingResult,
        strings: strings,
        craftingData: craftingData,
    });

    return content;
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

export async function craftItem(
    item: PhysicalItemPF2e,
    roll: Rolled<Roll<RollDataPF2e>>,
    quantity: number,
    actor: ActorPF2e,
    itemUuid: string
) {
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

    const degreeOfSuccess = roll.data.degreeOfSuccess || 0;

    if (!(actor instanceof CharacterPF2e)) {
        return;
    }

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

    const daysForZeroCost = degreeOfSuccess > 1 ? calculateDaysToNoCost(itemPrice, materialCosts, reductionPerDay) : 0;

    const craftingResult: CraftingResult = {
        costs: {
            itemPrice: itemPrice,
            materials: materialCosts,
            reductionPerDay: reductionPerDay,
            lostMaterials: lostMaterials,
        },
        daysForZeroCost: daysForZeroCost,
        item: item,
        itemUuid: itemUuid,
        quantity: quantity,
        successFlags: {
            criticalSuccess: degreeOfSuccess === 3,
            success: degreeOfSuccess >= 2,
            failure: degreeOfSuccess <= 1,
            criticalFailure: degreeOfSuccess === 0,
        },
    };

    return await chatTemplate(craftingResult);
}
