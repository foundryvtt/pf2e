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
import { DegreeOfSuccess } from "@system/degree-of-success";
import { ActorPF2e, CharacterPF2e } from "@actor";
import { getIncomeForLevel, TrainedProficiencies } from "@scripts/macros/earn-income";
import { ConsumablePF2e, PhysicalItemPF2e, SpellPF2e } from "@item";
import { RollDataPF2e } from "@system/rolls";
import { ZeroToFour } from "@module/data";
import { createConsumableFromSpell } from "@item/consumable/spell-consumables";
import { AELikeRuleElement } from "@module/rules/rule-element/ae-like";

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

function prepStrings(costs: Costs, item: PhysicalItemPF2e) {
    const rollData = item.getRollData();

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
        itemLink: game.pf2e.TextEditor.enrichHTML(item.link, { rollData }),
    };
}

function calculateCosts(
    item: PhysicalItemPF2e,
    quantity: number,
    actor: CharacterPF2e,
    degreeOfSuccess: number
): Costs | undefined {
    const itemPrice = extractPriceFromItem({
        data: { quantity, price: item.data.data.price },
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

function modifyInfusedItemDC(itemDescription: string, newDC: Number): string {
    // Second capture group is the items DC
    const dcRegex = /(@Check\[type:[fortitude|reflex|will]|dc:)(\d+)/i;
    const regexMatchResult = itemDescription.match(dcRegex);
    // If a check is found in item description, regexMatchResult stores second capture group in 3rd position
    if (regexMatchResult && regexMatchResult.length === 3 && +regexMatchResult[2] < newDC) {
        itemDescription = itemDescription.replace(dcRegex, "$1" + newDC);
    }
    // In all cases, add a note to the item description
    itemDescription = itemDescription.concat(
        game.i18n.format("PF2E.Actions.Craft.Information.ModifiedInfusedItem", { newDC: newDC.toString() })
    );
    return itemDescription;
}

export async function craftItem(item: PhysicalItemPF2e, itemQuantity: number, actor: ActorPF2e, infused?: boolean) {
    const itemSource = item.toObject();
    itemSource.data.quantity = itemQuantity;
    const itemTraits = item.traits;
    if (infused && itemTraits.has("alchemical") && itemTraits.has("consumable")) {
        const sourceTraits: string[] = itemSource.data.traits.value;
        sourceTraits.push("infused");
        itemSource.data.temporary = true;
        // Modifies infused object's DC based on RuleElements
        const infusedRE = actor.rules.find(
            (r) => !r.ignored && (r as AELikeRuleElement)?.data?.path === "data.crafting.infusedAlchemicalItemDC"
        );
        if (infusedRE) {
            // The rule element contains the path in the actor object to the dc value to use
            const newDC = eval(infusedRE.data.value as string);
            itemSource.data.description.value = modifyInfusedItemDC(itemSource.data.description.value, newDC);
        }
    }
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
        .filter((spell) => spell.baseLevel <= spellLevel && !spell.isCantrip && !spell.isFocusSpell && !spell.isRitual)
        .reduce((result, spell) => {
            result[spell.baseLevel] = [...(result[spell.baseLevel] || []), spell];
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
        strings: prepStrings(costs, item),
        item,
        quantity,
        success: degreeOfSuccess > 1,
        criticalFailure: degreeOfSuccess === 0,
    });
}
