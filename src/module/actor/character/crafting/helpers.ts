import { CoinsPF2e } from "@item/physical/helpers";
import { DegreeOfSuccess } from "@system/degree-of-success";
import { ActorPF2e, CharacterPF2e } from "@actor";
import { getIncomeForLevel } from "@scripts/macros/earn-income";
import { ConsumablePF2e, PhysicalItemPF2e, SpellPF2e } from "@item";
import { OneToTen } from "@module/data";
import { createConsumableFromSpell } from "@item/consumable/spell-consumables";
import { CheckRoll } from "@system/check";
import { ChatMessagePF2e } from "@module/chat-message";

/** Implementation of Crafting rules on https://2e.aonprd.com/Actions.aspx?ID=43 */

interface Costs {
    reductionPerDay: CoinsPF2e;
    materials: CoinsPF2e;
    itemPrice: CoinsPF2e;
    lostMaterials: CoinsPF2e;
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
        itemLink: await TextEditor.enrichHTML(item.link, { rollData, async: true }),
    };
}

function calculateCosts(
    item: PhysicalItemPF2e,
    quantity: number,
    actor: CharacterPF2e,
    degreeOfSuccess: number
): Costs | null {
    const itemPrice = CoinsPF2e.fromPrice(item.price, quantity);
    const materialCosts = itemPrice.scale(0.5);
    const lostMaterials = new CoinsPF2e();
    const reductionPerDay = new CoinsPF2e();

    const proficiency = actor.skills.crafting.rank;
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
    infused?: boolean
): Promise<void> {
    const itemSource = item.toObject();
    itemSource.system.quantity = itemQuantity;
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
        user: game.user.id,
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
    actor: ActorPF2e
): Promise<void> {
    const consumableType = item.consumableType;
    if (!(consumableType === "scroll" || consumableType === "wand")) return;
    const spellLevel = (
        consumableType === "wand" ? Math.ceil(item.level / 2) - 1 : Math.ceil(item.level / 2)
    ) as OneToTen;
    const validSpells = actor.itemTypes.spell
        .filter((s) => s.baseLevel <= spellLevel && !s.isCantrip && !s.isFocusSpell && !s.isRitual)
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
                    const spellId = String($dialog.find("select[name=spell]").val());
                    const spell = actor.items.get(spellId);
                    if (!spell?.isOfType("spell")) return;
                    const item = await createConsumableFromSpell(consumableType, spell, spellLevel);

                    return craftItem(new ConsumablePF2e(item), itemQuantity, actor);
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
    free: boolean
): Promise<string | null> {
    if (!actor.isOfType("character")) return null;

    const degreeOfSuccess = roll.options.degreeOfSuccess ?? 0;
    const costs = calculateCosts(item, quantity, actor, degreeOfSuccess);
    if (!costs) return null;

    const daysForZeroCost = degreeOfSuccess > 1 ? calculateDaysToNoCost(costs) : 0;

    return await renderTemplate("systems/pf2e/templates/chat/crafting-result.html", {
        daysForZeroCost: daysForZeroCost,
        strings: await prepStrings(costs, item),
        item,
        quantity,
        success: degreeOfSuccess > 1,
        criticalFailure: degreeOfSuccess === 0,
        free: free,
    });
}
