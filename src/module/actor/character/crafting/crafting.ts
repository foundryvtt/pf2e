import { ItemPF2e, type PhysicalItemPF2e } from "@item";
import type { PhysicalItemSource } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { UUIDUtils } from "@util/uuid.ts";
import type { CharacterPF2e } from "../document.ts";
import { CraftingAbility, type CraftingAbilityData } from "./ability.ts";
import { CraftingFormula } from "./formula.ts";

/** Caches and performs operations on elements related to crafting */
class CharacterCrafting {
    actor: CharacterPF2e;
    abilities: CraftingAbility[];

    #formulas: CraftingFormula[] | null = null;

    constructor(actor: CharacterPF2e) {
        this.actor = actor;

        this.abilities = Object.values(actor.system.crafting.entries)
            .filter((entry): entry is CraftingAbilityData => CraftingAbility.isValid(entry))
            .map((entry) => new CraftingAbility(this.actor, entry));
    }

    /**
     * Retrieves all formulas this actor knows including their associated items.
     * The result is cached until next data prep.
     */
    async getFormulas(): Promise<CraftingFormula[]> {
        if (this.#formulas) return this.#formulas;

        const formulas = this.actor.system.crafting.formulas;
        formulas.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
        const formulaMap = new Map(formulas.map((data) => [data.uuid, data]));
        const items = await UUIDUtils.fromUUIDs(formulas.map((f) => f.uuid));

        const result = items
            .filter((i): i is PhysicalItemPF2e => i instanceof ItemPF2e && i.isOfType("physical"))
            .map((item) => {
                const { dc, batchSize, deletable } = formulaMap.get(item.uuid) ?? { deletable: false };
                return new CraftingFormula(item, { dc, batchSize, deletable });
            });
        this.#formulas = result;
        return result;
    }

    getAbility(selector: string): CraftingAbility | null {
        return this.abilities.find((a) => a.selector === selector) ?? null;
    }

    async performDailyCrafting(): Promise<void> {
        const entries = this.abilities.filter((e) => e.isDailyPrep);
        const alchemicalEntries = entries.filter((e) => e.isAlchemical);
        const reagentCost = (await Promise.all(alchemicalEntries.map((e) => e.calculateReagentCost()))).reduce(
            (sum, cost) => sum + cost,
            0,
        );
        const reagentValue = (this.actor.system.resources.crafting.infusedReagents.value || 0) - reagentCost;
        if (reagentValue < 0) {
            ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MissingReagents"));
            return;
        } else {
            await this.actor.update({ "system.resources.crafting.infusedReagents.value": reagentValue });
            const key = reagentCost === 0 ? "ZeroConsumed" : reagentCost === 1 ? "OneConsumed" : "NConsumed";
            ui.notifications.info(
                game.i18n.format(`PF2E.Actor.Character.Crafting.Daily.Complete.${key}`, { quantity: reagentCost }),
            );
        }

        // Remove infused/temp items
        for (const item of this.actor.inventory) {
            if (item.system.temporary) await item.delete();
        }

        for (const entry of entries) {
            for (const formula of await entry.getPreparedCraftingFormulas()) {
                const itemSource: PhysicalItemSource = formula.item.toObject();
                itemSource.system.quantity = formula.quantity;
                itemSource.system.temporary = true;
                itemSource.system.size = this.actor.ancestry?.size === "tiny" ? "tiny" : "med";

                if (entry.isAlchemical && itemIsOfType(itemSource, "consumable", "equipment", "weapon")) {
                    itemSource.system.traits.value.push("infused");
                }
                await this.actor.addToInventory(itemSource);
            }
        }
    }
}

export { CharacterCrafting };
