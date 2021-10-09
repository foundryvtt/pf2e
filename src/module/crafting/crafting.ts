/**
 * Implementation of Crafting rules on https://2e.aonprd.com/Actions.aspx?ID=43
 */
import { Coins, coinValueInCopper, extractPriceFromItem } from "@module/item/treasure/helpers";
import { DegreeOfSuccess } from "@module/degree-of-success";
import { CharacterPF2e } from "@actor/character";
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
    roll: {
        degreeOfSuccess: DegreeOfSuccess;
        dc: number;
        roll: number;
    };
    successFlags: {
        criticalSuccess: boolean;
        success: boolean;
        failure: boolean;
        criticalFailure: boolean;
    };
    requirements: Requirement[];
    daysForZeroCost: number;
    item: PhysicalItemPF2e;
    itemUuid: string;
    quantity: number;
}

export interface Requirement {
    value: boolean;
    label: string;
}

function coinsToString(coins: Partial<Coins>) {
    const mapResult = Object.entries(coins).map(([key, value]) => {
        if (value > 0) {
            return `${value} ${game.i18n.localize(CONFIG.PF2E.currencies[key as keyof Coins])}`;
        } else {
            return null;
        }
    });
    return mapResult.filter((string) => string != null).join(", ");
}

function escapeHtml(html: string) {
    const text = document.createTextNode(html);
    const p = document.createElement("p");
    p.appendChild(text);
    return p.innerHTML;
}

function calculateDaysToNoCost(
    itemCost: Partial<Coins>,
    materialCost: Partial<Coins>,
    reductionPerDay: Partial<Coins>
): number {
    return Math.ceil(
        (coinValueInCopper(itemCost as Coins) - coinValueInCopper(materialCost as Coins)) /
            coinValueInCopper(reductionPerDay as Coins)
    );
}

async function chatTemplate(craftingResult: CraftingResult) {
    const reductionPerDay = escapeHtml(coinsToString(craftingResult.costs.reductionPerDay));
    const materialCost = escapeHtml(coinsToString(craftingResult.costs.materials));
    const itemCost = escapeHtml(coinsToString(craftingResult.costs.itemPrice));
    const lostMaterials = escapeHtml(coinsToString(craftingResult.costs.lostMaterials));
    const craftingData = JSON.stringify(craftingResult);

    const uuid = craftingResult.itemUuid;
    const index = uuid.indexOf(".");
    const itemLink = `@${uuid.substr(0, index)}[${uuid.substr(index + 1)}]`;

    const strings = {
        reductionPerDay: reductionPerDay,
        materialCost: materialCost,
        itemCost: itemCost,
        lostMaterials: lostMaterials,
        itemLink: itemLink,
    };

    const content = await renderTemplate("systems/pf2e/templates/chat/crafting-result.html", {
        craftingResult: craftingResult,
        strings: strings,
        craftingData: craftingData,
    });

    return content;
}

function checkRequirements(actor: CharacterPF2e, item: PhysicalItemPF2e): Requirement[] {
    // TODO Localize strings
    const requirements: Requirement[] = [];
    const itemLevel = item.data.data.level.value;

    // Item level must be of your level or lower
    const levelRequirement: Requirement = {
        label: "Item is your Level or Lower",
        value: itemLevel <= actor.level,
    };
    requirements.push(levelRequirement);

    // Must be trained. Items above level 9 need Master Crafting. Items above level 16 need Legendary.
    const craftingProf = actor.data.data.skills["cra"].rank;
    const proficiencyRequirement: Requirement = {
        label: "Trained in Crafting",
        value: true,
    };
    if (itemLevel >= 16) {
        proficiencyRequirement.label = "Legendary in Crafting";
        if (craftingProf < 4) {
            proficiencyRequirement.value = false;
        }
    } else if (itemLevel >= 9) {
        proficiencyRequirement.label = "Master in Crafting";
        if (craftingProf < 3) {
            proficiencyRequirement.value = false;
        }
    } else if (craftingProf === 0) {
        proficiencyRequirement.value = false;
    }
    requirements.push(proficiencyRequirement);

    return requirements;
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
    dc: number,
    actor: CharacterPF2e,
    itemUuid: string
) {
    const itemPrice = extractPriceFromItem({
        data: { quantity: { value: quantity }, price: item.data.data.price },
    });
    const materialCosts = extractPriceFromItem({
        data: { quantity: { value: quantity * 0.5 }, price: item.data.data.price },
    });

    let lostMaterials: Coins = {
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

    const proficiency = skillRankToProficiency(actor.data.data.skills.cra.rank);

    if (!proficiency) {
        return;
    }

    if (degreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
        Object.assign(reductionPerDay, getIncomeForLevel(actor.level + 1).rewards[proficiency]);
    } else if (degreeOfSuccess === DegreeOfSuccess.SUCCESS) {
        Object.assign(reductionPerDay, getIncomeForLevel(actor.level).rewards[proficiency]);
    } else if (degreeOfSuccess === DegreeOfSuccess.CRITICAL_FAILURE) {
        lostMaterials = extractPriceFromItem({
            data: { quantity: { value: quantity * 0.05 }, price: item.data.data.price },
        });
    }

    let daysForZeroCost = 0;

    if (degreeOfSuccess > 1) {
        daysForZeroCost = calculateDaysToNoCost(itemPrice, materialCosts, reductionPerDay);
    }

    const requirements = checkRequirements(actor, item);

    const craftingResult: CraftingResult = {
        costs: {
            itemPrice: itemPrice,
            materials: materialCosts,
            reductionPerDay: reductionPerDay,
            lostMaterials: lostMaterials,
        },
        roll: {
            degreeOfSuccess: degreeOfSuccess,
            dc: dc,
            roll: roll.total,
        },
        requirements: requirements,
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

    const content = await chatTemplate(craftingResult);

    const chatData = {
        user: game.user.id,
        content,
        speaker: ChatMessage.getSpeaker(),
    };
    ChatMessage.create(chatData, {});
}
