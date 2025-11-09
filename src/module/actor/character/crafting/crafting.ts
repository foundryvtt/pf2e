import { ItemPF2e, type PhysicalItemPF2e } from "@item";
import { calculateDC } from "@module/dc.ts";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import type { CharacterPF2e } from "../document.ts";
import { CraftingAbility } from "./ability.ts";
import type { CraftingAbilityData, CraftingFormula } from "./types.ts";

/** Caches and performs operations on elements related to crafting */
class CharacterCrafting {
    actor: CharacterPF2e;
    abilities = new Collection<string, CraftingAbility>();

    #formulas: CraftingFormula[] | null = null;

    constructor(actor: CharacterPF2e) {
        this.actor = actor;
    }

    /** Initializes the crafting data. Must be called every data preparation */
    initialize(): void {
        this.#formulas = null;

        // Assemble all abilities. We check if label exists as a simple validation due to potential AELike tinkering
        const abilityData = Object.values(this.actor.system.crafting.entries).filter(
            (d): d is CraftingAbilityData => !!d?.label && !!d.slug && d.craftableItems.length > 0,
        );

        // Add or update abilities
        const abilities: CraftingAbility[] = [];
        for (const data of abilityData) {
            const ability = this.abilities.get(data.slug) ?? new CraftingAbility(this.actor);
            ability.initialize(data);
            abilities.push(ability);
        }

        this.abilities.clear();
        for (const ability of abilities) {
            this.abilities.set(ability.slug, ability);
        }
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

                const isConsumable = item.system.traits.value.includes("consumable");
                const batchSize = Math.max(item.system.price.per, isConsumable ? 4 : 1);

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

    /** Removes all infused items and un-expends all prepared items */
    async resetDailyCrafting(): Promise<void> {
        const actor = this.actor;

        // Delete temporary items, and determine what got deleted
        const deletedItems = await this.actor.inventory.deleteTemporaryItems({ render: false });

        // Un-expend all crafted formulas.
        const abilitiesToReset = this.abilities.filter(
            (a) => a.isDailyPrep && a.preparedFormulaData.some((f) => f.expended),
        );
        for (const ability of abilitiesToReset) {
            const formulas = ability.preparedFormulaData.map((f) => ({ ...f, expended: false }));
            await ability.updateFormulas(formulas, { render: false });
        }

        // Restore all resources associated with the entries, if any
        const resourcesToRestore = R.unique(abilitiesToReset.map((a) => a.resource).filter((r): r is string => !!r));
        for (const slug of resourcesToRestore) {
            const resource = actor.getResource(slug);
            if (resource) {
                await actor.updateResource(slug, resource.max, { render: false });
            }
        }

        // Update the actor's flags to not be set to complete
        const wasDailyCraftingComplete = actor.flags.pf2e.dailyCraftingComplete;
        await actor.update({ "flags.pf2e.dailyCraftingComplete": false }, { render: false });

        // Re-render any actor sheets if anything changed
        if (
            deletedItems.length > 0 ||
            abilitiesToReset.length > 0 ||
            resourcesToRestore.length > 0 ||
            wasDailyCraftingComplete
        ) {
            actor.render();
        }
    }

    async performDailyCrafting(): Promise<void> {
        const actor = this.actor;
        const abilities = this.abilities.filter((e) => e.isDailyPrep);
        const results = await Promise.all(abilities.map((a) => a.calculateDailyCrafting()));
        const itemsToAdd = results.flatMap((r) => r.items);
        if (itemsToAdd.length === 0) {
            return;
        }

        // If any of our results is insufficient on its own, return early
        if (results.some((r) => r.insufficient)) {
            ui.notifications.warn("PF2E.Actor.Character.Crafting.MissingResource", { localize: true });
            return;
        }

        // Compute total resource cost by resource
        const resourceCosts = results.reduce((costs: Record<string, number>, result) => {
            if (result.resource) {
                costs[result.resource.slug] ??= 0;
                costs[result.resource.slug] += result.resource.cost;
            }
            return costs;
        }, {});

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
            await actor.updateResource(slug, value, { render: false });
        }

        // Expend all crafted formulas.
        for (const ability of abilities) {
            const formulas = ability.preparedFormulaData.map((f) => ({ ...f, expended: true }));
            await ability.updateFormulas(formulas, { render: false });
        }

        // Add the items. There will always be items to add if it go to here, and that will trigger the re-render
        await actor.update({ "flags.pf2e.dailyCraftingComplete": true }, { render: false });
        await actor.inventory.add(itemsToAdd, { stack: true });
        ui.notifications.info("PF2E.Actor.Character.Crafting.Daily.Complete", { localize: true });
    }
}

export { CharacterCrafting };
