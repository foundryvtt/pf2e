import type { ActorPF2e, CharacterPF2e } from "@actor";
import type { Rolled } from "@client/dice/_module.d.mts";
import type { ConsumablePF2e, PhysicalItemPF2e, SpellPF2e } from "@item";
import { ItemProxyPF2e } from "@item";
import { createConsumableFromSpell } from "@item/consumable/spell-consumables.ts";
import { Coins } from "@item/physical/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { OneToTen } from "@module/data.ts";
import { getIncomeForLevel } from "@scripts/macros/earn-income/calculate.ts";
import { CheckRoll } from "@system/check/index.ts";
import { DegreeOfSuccess } from "@system/degree-of-success.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { fontAwesomeIcon } from "@util";
import appv1 = foundry.appv1;

/** Implementation of Crafting rules on https://2e.aonprd.com/Actions.aspx?ID=43 */

interface Costs {
    reductionPerDay: Coins;
    materials: Coins;
    itemPrice: Coins;
    lostMaterials: Coins;
}

function calculateDaysToNoCost(costs: Costs): number {
    return Math.ceil((costs.itemPrice.copperValue - costs.materials.copperValue) / costs.reductionPerDay.copperValue);
}

async function prepStrings(costs: Costs, item: PhysicalItemPF2e) {
    const rollData = item.getRollData();

    return {
        reductionPerDay: costs.reductionPerDay.toString(),
        materialCost: game.i18n.format("PF2E.Actions.Craft.Details.PayMaterials", {
            cost: costs.materials.toString(),
        }),
        itemCost: game.i18n.format("PF2E.Actions.Craft.Details.PayFull", {
            cost: costs.itemPrice.toString(),
        }),
        lostMaterials: game.i18n.format("PF2E.Actions.Craft.Details.LostMaterials", {
            cost: costs.lostMaterials.toString(),
        }),
        itemLink: await TextEditorPF2e.enrichHTML(item.link, { rollData }),
    };
}

function calculateCosts(
    item: PhysicalItemPF2e,
    quantity: number,
    actor: CharacterPF2e,
    degreeOfSuccess: number,
    skill: string = "crafting",
): Costs | null {
    const itemPrice = Coins.fromPrice(item.price, quantity);
    const materialCosts = itemPrice.scale(0.5);
    const lostMaterials = new Coins();
    const reductionPerDay = new Coins();

    const proficiency = actor.skills[skill]?.rank;
    if (!proficiency) return null;

    if (degreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
        Object.assign(reductionPerDay, getIncomeForLevel(actor.level + 1).rewards[proficiency]);
    } else if (degreeOfSuccess === DegreeOfSuccess.SUCCESS) {
        Object.assign(reductionPerDay, getIncomeForLevel(actor.level).rewards[proficiency]);
    } else if (degreeOfSuccess === DegreeOfSuccess.CRITICAL_FAILURE) {
        Object.assign(lostMaterials, materialCosts.scale(0.1));
    }

    return {
        itemPrice: itemPrice,
        materials: materialCosts,
        lostMaterials: lostMaterials,
        reductionPerDay: reductionPerDay,
    };
}

export async function craftItem(
    item: PhysicalItemPF2e,
    itemQuantity: number,
    actor: ActorPF2e,
    infused?: boolean,
): Promise<void> {
    const itemSource = item.toObject();
    itemSource.system.quantity = itemQuantity;
    itemSource.system.size = actor.size === "tiny" ? "tiny" : "med";
    const itemTraits = item.traits;
    if (infused && itemTraits.has("alchemical") && itemTraits.has("consumable")) {
        const sourceTraits: string[] = itemSource.system.traits.value;
        sourceTraits.push("infused");
        itemSource.system.temporary = true;
    }
    const result = await actor.addToInventory(itemSource);
    if (!result) {
        ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.CantAddItem"));
        return;
    }

    await ChatMessagePF2e.create({
        author: game.user.id,
        content: game.i18n.format("PF2E.Actions.Craft.Information.ReceiveItem", {
            actorName: actor.name,
            quantity: itemQuantity,
            itemName: item.name,
        }),
        speaker: { alias: actor.name },
    });
}

export async function craftSpellConsumable(
    item: ConsumablePF2e,
    itemQuantity: number,
    actor: ActorPF2e,
): Promise<void> {
    const consumableType = item.category;
    if (!(consumableType === "scroll" || consumableType === "wand")) return;
    const rank = (consumableType === "wand" ? Math.ceil(item.level / 2) - 1 : Math.ceil(item.level / 2)) as OneToTen;
    const validSpells = actor.itemTypes.spell
        .filter((s) => s.baseRank <= rank && !s.isCantrip && !s.isFocusSpell && !s.isRitual)
        .reduce(
            (result, spell) => {
                result[spell.baseRank] = [...(result[spell.baseRank] || []), spell];
                return result;
            },
            {} as Record<number, SpellPF2e<ActorPF2e>[]>,
        );
    const content = await fa.handlebars.renderTemplate(
        "systems/pf2e/templates/actors/crafting-select-spell-dialog.hbs",
        { spells: validSpells },
    );

    new appv1.api.Dialog({
        title: game.i18n.localize("PF2E.Actions.Craft.SelectSpellDialog.Title"),
        content,
        buttons: {
            cancel: {
                icon: fontAwesomeIcon("times").outerHTML,
                label: game.i18n.localize("Cancel"),
            },
            craft: {
                icon: fontAwesomeIcon("hammer").outerHTML,
                label: game.i18n.localize("PF2E.Actions.Craft.SelectSpellDialog.CraftButtonLabel"),
                callback: async ($dialog) => {
                    const spellId = String($dialog.find("select[name=spell]").val());
                    const spell = actor.items.get(spellId);
                    if (!spell?.isOfType("spell")) return;
                    const data = await createConsumableFromSpell(spell, {
                        type: consumableType,
                        rank,
                    });
                    return craftItem(new ItemProxyPF2e(data) as PhysicalItemPF2e, itemQuantity, actor);
                },
            },
        },
        default: "craft",
    }).render(true);
}

export async function renderCraftingInline(
    item: PhysicalItemPF2e,
    roll: Rolled<CheckRoll>,
    quantity: number,
    actor: ActorPF2e,
    free: boolean,
    skill: string = "crafting",
): Promise<string | null> {
    if (!actor.isOfType("character")) return null;

    const degreeOfSuccess = roll.options.degreeOfSuccess ?? 0;
    const costs = calculateCosts(item, quantity, actor, degreeOfSuccess, skill);
    if (!costs) return null;

    const daysForZeroCost = degreeOfSuccess > 1 ? calculateDaysToNoCost(costs) : 0;

    return await fa.handlebars.renderTemplate("systems/pf2e/templates/chat/crafting-result.hbs", {
        daysForZeroCost: daysForZeroCost,
        strings: await prepStrings(costs, item),
        item,
        quantity,
        success: degreeOfSuccess > 1,
        criticalFailure: degreeOfSuccess === 0,
        free: free,
    });
}
