/**
 * Implementation of Crafting rules on https://2e.aonprd.com/Actions.aspx?ID=43
 */

import { FormulaData, ProficiencyRank } from "@item/data";
import { Coins, coinValueInCopper, extractPriceFromItem } from "@module/item/treasure/helpers";
import { DegreeOfSuccess } from "@module/degree-of-success";
import { CharacterPF2e } from "@actor/character";
import { CheckModifier, ModifierPredicate } from "./modifiers";
import { PF2CheckDC } from "@system/check-degree-of-success";

// you have to be at least trained to craft
type TrainedProficiencies = Exclude<ProficiencyRank, "untrained">;
type Rewards = {
    [rank in TrainedProficiencies]: Partial<Coins>;
};

/**
 * There is a cap at each level for a certain proficiency
 * rank. If you go over that, it does not matter what rank
 * you actually performed
 */
function buildRewards(...rewards: Partial<Coins>[]): Rewards {
    const [trained, expert, master, legendary] = rewards;
    return {
        trained: trained,
        expert: expert ?? trained,
        master: master ?? expert ?? trained,
        legendary: legendary ?? master ?? expert ?? trained,
    };
}

/**
 * Crafting uses near identical rules to earning an income but
 * does not currently use the values for failure. This is being
 * left in to future proof against magic items or feats that
 * allow for continued crafting on a failed roll.
 */
const earnIncomeTable = {
    0: { failure: { cp: 1 }, rewards: buildRewards({ cp: 5 }) },
    1: { failure: { cp: 2 }, rewards: buildRewards({ sp: 2 }) },
    2: { failure: { cp: 4 }, rewards: buildRewards({ sp: 3 }) },
    3: { failure: { cp: 8 }, rewards: buildRewards({ sp: 5 }) },
    4: { failure: { sp: 1 }, rewards: buildRewards({ sp: 7 }, { sp: 8 }) },
    5: { failure: { sp: 2 }, rewards: buildRewards({ sp: 9 }, { gp: 1 }) },
    6: { failure: { sp: 3 }, rewards: buildRewards({ gp: 1, sp: 5 }, { gp: 2 }) },
    7: { failure: { sp: 4 }, rewards: buildRewards({ gp: 2 }, { gp: 2, sp: 5 }) },
    8: { failure: { sp: 5 }, rewards: buildRewards({ gp: 2, sp: 5 }, { gp: 3 }) },
    9: { failure: { sp: 6 }, rewards: buildRewards({ gp: 3 }, { gp: 4 }) },
    10: { failure: { sp: 7 }, rewards: buildRewards({ gp: 4 }, { gp: 5 }, { gp: 6 }) },
    11: { failure: { sp: 8 }, rewards: buildRewards({ gp: 5 }, { gp: 6 }, { gp: 8 }) },
    12: { failure: { sp: 9 }, rewards: buildRewards({ gp: 6 }, { gp: 8 }, { gp: 10 }) },
    13: { failure: { gp: 1 }, rewards: buildRewards({ gp: 7 }, { gp: 10 }, { gp: 15 }) },
    14: { failure: { gp: 1, sp: 5 }, rewards: buildRewards({ gp: 8 }, { gp: 15 }, { gp: 20 }) },
    15: { failure: { gp: 2 }, rewards: buildRewards({ gp: 10 }, { gp: 20 }, { gp: 28 }) },
    16: { failure: { gp: 2, sp: 5 }, rewards: buildRewards({ gp: 13 }, { gp: 25 }, { gp: 36 }, { gp: 40 }) },
    17: { failure: { gp: 3 }, rewards: buildRewards({ gp: 15 }, { gp: 30 }, { gp: 45 }, { gp: 55 }) },
    18: { failure: { gp: 4 }, rewards: buildRewards({ gp: 20 }, { gp: 45 }, { gp: 70 }, { gp: 90 }) },
    19: { failure: { gp: 6 }, rewards: buildRewards({ gp: 30 }, { gp: 60 }, { gp: 100 }, { gp: 130 }) },
    20: { failure: { gp: 8 }, rewards: buildRewards({ gp: 40 }, { gp: 75 }, { gp: 150 }, { gp: 200 }) },
    21: { failure: {}, rewards: buildRewards({ gp: 50 }, { gp: 90 }, { gp: 175 }, { gp: 300 }) },
};

type IncomeLevelMap = typeof earnIncomeTable;
type IncomeEarnerLevel = keyof IncomeLevelMap;
type IncomeForLevel = IncomeLevelMap[IncomeEarnerLevel];
function getIncomeForLevel(level: number): IncomeForLevel {
    return earnIncomeTable[Math.clamped(level, 0, 21) as IncomeEarnerLevel];
}

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
    requirements: Requirement[];
    daysForZeroCost: number;
    form: CraftingForm;
    formula: FormulaData;
    timeSpent: TimeSpent;
}

export interface PerDayEarnIncomeResult {
    rewards: Partial<Coins>;
    degreeOfSuccess: DegreeOfSuccess;
}

export interface Requirement {
    value: boolean;
    label: string;
}

export interface TimeSpent {
    value: number;
    unit: string;
}

export interface CraftingForm {
    dc: number;
    cost: string;
    quantity: number;
    specialtyCrafting: string;
}

function multiplyCoinValue(coins: Coins, factor: number): Coins {
    const result: Coins = {
        pp: 0,
        gp: 0,
        sp: 0,
        cp: 0,
    };
    let remainder = 0;
    for (const [key, value] of Object.entries(coins)) {
        let newValue = value! * factor + remainder;
        if (!Number.isInteger(newValue)) {
            remainder = (newValue - Math.floor(newValue)) * 10;
            newValue = Math.floor(newValue);
        } else {
            remainder = 0;
        }
        result[key as keyof Coins] = newValue;
    }
    return result;
}

function rankToProficiency(rank: number): TrainedProficiencies {
    if (rank === 1) {
        return "trained";
    } else if (rank === 2) {
        return "expert";
    } else if (rank === 3) {
        return "master";
    } else {
        return "legendary";
    }
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

function degreeOfSuccessLabel(degreeOfSuccessLabel: DegreeOfSuccess) {
    if (degreeOfSuccessLabel === 0) {
        return "Critical Failure";
    } else if (degreeOfSuccessLabel === 1) {
        return "Failure";
    } else if (degreeOfSuccessLabel === 2) {
        return "Success";
    } else {
        return "Critical Success";
    }
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
    const degreeOfSuccess = degreeOfSuccessLabel(craftingResult.roll.degreeOfSuccess);
    const reductionPerDay = escapeHtml(coinsToString(craftingResult.costs.reductionPerDay));
    const materialCost = escapeHtml(coinsToString(craftingResult.costs.materials));
    const itemCost = escapeHtml(coinsToString(craftingResult.costs.itemPrice));
    const lostMaterials = escapeHtml(coinsToString(craftingResult.costs.lostMaterials));
    const successColor = craftingResult.roll.degreeOfSuccess > 1 ? "darkgreen" : "darkred";
    const craftingData = JSON.stringify(craftingResult);

    const uuid = craftingResult.formula.data.craftedObjectUuid.value;
    const index = uuid.indexOf(".");
    const itemLink = `@${uuid.substr(0, index)}[${uuid.substr(index + 1)}]`;

    const strings = {
        degreeOfSuccess: degreeOfSuccess,
        reductionPerDay: reductionPerDay,
        materialCost: materialCost,
        itemCost: itemCost,
        lostMaterials: lostMaterials,
        itemLink: itemLink,
    };

    const content = await renderTemplate("systems/pf2e/templates/chat/crafting-result.html", {
        craftingResult: craftingResult,
        successColor: successColor,
        strings: strings,
        craftingData: craftingData,
    });

    return content;
}

export function performRoll(actor: CharacterPF2e, formulaData: FormulaData, event: JQuery.Event, form: CraftingForm) {
    const options = actor.getRollOptions(["all", "skill-check", "crafting"]);
    options.push("action:craft");
    if (form.specialtyCrafting) options.push(form.specialtyCrafting);
    for (const craftingType of formulaData.data.craftingType.value) {
        options.push(craftingType);
    }

    for (const trait of formulaData.data.traits.value) {
        options.push(trait);
    }

    const checkModifiers = new CheckModifier("Craft", actor.data.data.skills["cra"], []);
    const activeSpecialty = checkModifiers.modifiers.filter(
        (m) =>
            m.name.includes("Specialty Crafting") &&
            ModifierPredicate.test(m.predicate, ["action:craft", form.specialtyCrafting])
    );
    if (activeSpecialty.length) options.push("specialty");

    const dc: PF2CheckDC = {
        value: form.dc,
        visibility: "all",
        adjustments: actor.data.data.skills["cra"].adjustments,
        scope: "CheckOutcome",
    };

    game.pf2e.Check.roll(
        new CheckModifier("Craft", actor.data.data.skills["cra"], []),
        { actor, type: "skill-check", options, dc: dc },
        event,
        (roll) => {
            craftItem(
                formulaData,
                roll.total,
                (roll.data as any).degreeOfSuccess,
                actor.data.data.skills.cra.rank,
                form,
                actor
            );
        }
    );
}

function checkRequirements(actor: CharacterPF2e, formulaData: FormulaData): Requirement[] {
    // TODO Localize strings
    const requirements: Requirement[] = [];
    const itemLevel = formulaData.data.level.value;

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

    for (const craftingType of formulaData.data.craftingType.value) {
        const value = actor.data.flags.pf2e?.crafting?.types?.[craftingType] ?? false;
        const craftingTypeRequirement: Requirement = {
            label: `Can Craft ${game.i18n.localize(CONFIG.PF2E.craftingTypes[craftingType])} Items`,
            value: value,
        };
        requirements.push(craftingTypeRequirement);
    }

    return requirements;
}

export async function craftItem(
    formula: FormulaData,
    rollResult: number,
    degreeOfSuccess: DegreeOfSuccess,
    rank: number,
    form: CraftingForm,
    actor: CharacterPF2e
) {
    const itemPrice = extractPriceFromItem({
        data: { quantity: { value: form.quantity }, price: { value: form.cost } },
    });
    const materialCosts = multiplyCoinValue(itemPrice, 0.5);
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

    const proficiency = rankToProficiency(rank);

    if (degreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
        Object.assign(reductionPerDay, getIncomeForLevel(actor.level + 1).rewards[proficiency]);
    } else if (degreeOfSuccess === DegreeOfSuccess.SUCCESS) {
        Object.assign(reductionPerDay, getIncomeForLevel(actor.level).rewards[proficiency]);
    } else if (degreeOfSuccess === DegreeOfSuccess.CRITICAL_FAILURE) {
        lostMaterials = multiplyCoinValue(materialCosts, 0.1);
    }

    let daysForZeroCost = 0;

    if (degreeOfSuccess > 1) {
        daysForZeroCost = calculateDaysToNoCost(itemPrice, materialCosts, reductionPerDay);
    }

    const requirements = checkRequirements(actor, formula);

    const isSnare = formula.data.craftingType.value.includes("snare");
    const timeSpent: TimeSpent = {
        value: isSnare ? 1 : 4,
        unit: isSnare ? "Minute(s)" : "Day(s)",
    };

    const craftingResult: CraftingResult = {
        costs: {
            itemPrice: itemPrice,
            materials: materialCosts,
            reductionPerDay: reductionPerDay,
            lostMaterials: lostMaterials,
        },
        roll: {
            degreeOfSuccess: degreeOfSuccess,
            dc: formula.data.craftDC.value,
            roll: rollResult,
        },
        requirements: requirements,
        daysForZeroCost: daysForZeroCost,
        form: form,
        formula: formula,
        timeSpent: timeSpent,
    };

    const content = await chatTemplate(craftingResult);

    const chatData = {
        user: game.user.id,
        content,
        speaker: ChatMessage.getSpeaker(),
    };
    ChatMessage.create(chatData, {});
}
