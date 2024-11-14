import { ItemPF2e, type PhysicalItemPF2e } from "@item";
import type { PhysicalItemSource } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { calculateDC } from "@module/dc.ts";
import { UUIDUtils } from "@util/uuid.ts";
import type { CharacterPF2e } from "../document.ts";
import { CraftingAbility, type CraftingAbilityData } from "./ability.ts";
import { CraftingFormula } from "./types.ts";

/** Caches and performs operations on elements related to crafting */
class CharacterCrafting {
    actor: CharacterPF2e;
    abilities: Collection<CraftingAbility>;

    #formulas: CraftingFormula[] | null = null;

    constructor(actor: CharacterPF2e) {
        this.actor = actor;

        // Assemble all abilities. We check if label exists as a simple validation due to potential AELike tinkering
        const abilities = Object.values(actor.system.crafting.entries)
            .filter((d): d is CraftingAbilityData => !!d?.label && !!d.slug)
            .map((d): [string, CraftingAbility] => [d.slug, new CraftingAbility(this.actor, d)]);
        this.abilities = new Collection(abilities);
    }

    /**
     * Retrieves all formulas this actor knows including their associated items.
     * The result is cached until next data prep.
     */
    async getFormulas(): Promise<CraftingFormula[]> {
        if (this.#formulas) return this.#formulas;

        const formulas = this.actor.system.crafting.formulas;
        const formulaMap = new Map(formulas.map((data) => [data.uuid, data]));
        const items = await UUIDUtils.fromUUIDs(formulas.map((f) => f.uuid));

        const result = items
            .filter((i): i is PhysicalItemPF2e => i instanceof ItemPF2e && i.isOfType("physical"))
            .map((item): CraftingFormula | null => {
                const formula = formulaMap.get(item.uuid);
                if (!formula) return null;

                const isAmmo = item.isOfType("consumable") && item.isAmmo;
                const isMundaneAmmo = isAmmo && !item.isMagical;
                const isConsumable =
                    (item.isOfType("consumable") && item.category !== "wand") ||
                    (item.isOfType("weapon") && item.baseType === "alchemical-bomb");

                const batchSize = Math.max(
                    item.system.price.per,
                    isMundaneAmmo ? Math.clamp(item.system.price.per, 1, 10) : isConsumable && !isAmmo ? 4 : 1,
                );

                return {
                    ...formula,
                    item,
                    dc: calculateDC(item.level, {
                        rarity: item.rarity,
                        pwol: game.pf2e.settings.variants.pwol.enabled,
                    }),
                    batchSize,
                };
            })
            .filter((f): f is CraftingFormula => !!f);
        this.#formulas = result;
        return result;
    }

    async performDailyCrafting(): Promise<void> {
        const actor = this.actor;
        const abilities = this.abilities.filter((e) => e.isDailyPrep);

        // Compute total resource cost by resource
        const resourceCosts: Record<string, number> = {};
        for (const ability of abilities) {
            if (ability.resource) {
                const cost = await ability.calculateResourceCost();
                resourceCosts[ability.resource] ??= 0;
                resourceCosts[ability.resource] += cost;
            }
        }

        // Validate if resources are sufficient and compute new resource values
        const resourceUpdates: Record<string, number> = {};
        for (const [slug, cost] of Object.entries(resourceCosts)) {
            const resource = actor.getResource(slug);
            if (!resource || cost > resource.value) {
                ui.notifications.warn("PF2E.Actor.Character.Crafting.MissingResource", { localize: true });
                return;
            }

            resourceUpdates[slug] = resource.value - cost;
        }

        // Perform resource updates
        for (const [slug, value] of Object.entries(resourceUpdates)) {
            await actor.updateResource(slug, value);
        }

        // Remove infused/temp items
        const itemsToDelete = this.actor.inventory.filter((i) => i.system.temporary).map((i) => i.id);
        if (itemsToDelete.length) {
            await actor.deleteEmbeddedDocuments("Item", itemsToDelete);
        }

        // Assemble the items we need to create, grouped by uuid, then add the items
        const itemsToAdd: PreCreate<PhysicalItemSource>[] = [];
        for (const ability of abilities) {
            for (const formula of await ability.getPreparedCraftingFormulas()) {
                const itemSource: PhysicalItemSource = formula.item.toObject();
                itemSource.system.quantity = formula.quantity;
                itemSource.system.temporary = true;
                itemSource.system.size = this.actor.ancestry?.size === "tiny" ? "tiny" : "med";

                if (formula.item.isAlchemical && itemIsOfType(itemSource, "consumable", "equipment", "weapon")) {
                    itemSource.system.traits.value.push("infused");
                }
                itemsToAdd.push(itemSource);
            }
        }
        if (itemsToAdd.length) {
            actor.inventory.add(itemsToAdd, { stack: true });
        }
    }
}

export { CharacterCrafting };
