import type { ActorPF2e } from "@actor";
import { applyActorGroupUpdate, createActorGroupUpdate, iterateAllItems } from "@actor/helpers.ts";
import type { DatabaseDeleteOperation } from "@common/abstract/_module.d.mts";
import { ContainerPF2e, ItemPF2e, ItemProxyPF2e, KitPF2e, PhysicalItemPF2e } from "@item";
import { ItemSourcePF2e, KitSource, PhysicalItemSource, TreasureSource } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { Coins } from "@item/physical/helpers.ts";
import type { Currency } from "@item/physical/types.ts";
import { CURRENCY_TYPES, DENOMINATION_RATES } from "@item/physical/values.ts";
import { DelegatedCollection, ErrorPF2e, groupBy } from "@util";
import * as R from "remeda";
import { InventoryBulk } from "./bulk.ts";

import credstickJSON from "./credstick.json" with { type: "json" };
import upbJSON from "./upb.json" with { type: "json" };

class ActorInventory<TActor extends ActorPF2e> extends DelegatedCollection<PhysicalItemPF2e<TActor>> {
    actor: TActor;
    bulk: InventoryBulk;

    constructor(actor: TActor, entries?: PhysicalItemPF2e<TActor>[]) {
        super(entries?.map((entry) => [entry.id, entry]));
        this.actor = actor;

        // Created in the constructor so its ready for RE modification
        this.bulk = new InventoryBulk(this.actor);
    }

    get coins(): Coins {
        // todo: deprecation warning
        return this.currency;
    }

    get currency(): Coins {
        return this.filter((i) => i.isOfType("treasure") && i.isCurrency)
            .map((item) => item.assetValue)
            .reduce((first, second) => first.plus(second), new Coins());
    }

    get totalWealth(): Coins {
        return this.filter((item) => game.user.isGM || item.isIdentified)
            .map((item) => item.assetValue)
            .reduce((first, second) => first.plus(second), new Coins());
    }

    get invested(): { value: number; max: number } | null {
        if (this.actor.isOfType("character")) {
            return {
                value: this.filter((i) => i.isInvested).length,
                max: this.actor.system.resources.investiture.max,
            };
        }

        return null;
    }

    /** Find an item already owned by the actor that can stack with the given item */
    findStackableItem(
        item: PhysicalItemPF2e | ItemSourcePF2e,
        { containerId = null }: { containerId?: string | null } = {},
    ): PhysicalItemPF2e<TActor> | null {
        // Prevent upstream from mutating property descriptors
        const testItem = item instanceof PhysicalItemPF2e ? item.clone() : new ItemProxyPF2e(fu.deepClone(item));
        if (!testItem.isOfType("physical")) return null;

        const stackCandidates = this.filter(
            (i) => (containerId ? i.container?.id === containerId : !i.isInContainer) && i.isStackableWith(testItem),
        );
        if (stackCandidates.length > 1) {
            // Prefer stacking with unequipped items
            const notEquipped = stackCandidates.filter((item) => !item.isEquipped);
            return notEquipped.length > 0 ? notEquipped[0] : stackCandidates[0];
        } else {
            return stackCandidates.at(0) ?? null;
        }
    }

    addCoins(coins: Partial<Record<Currency, number>>, options: { combineStacks?: boolean } = {}): Promise<void> {
        // todo: deprecation warning
        return this.addCurrency(coins, options);
    }

    removeCoins(coins: Partial<Record<Currency, number>>, options?: { byValue?: boolean }): Promise<boolean> {
        // todo: deprecation warning
        return this.removeCurrency(coins, options);
    }

    async addCurrency(
        coins: Partial<Record<Currency, number>>,
        { combineStacks = true }: { combineStacks?: boolean } = {},
    ): Promise<void> {
        const topLevelCoins = this.actor.itemTypes.treasure.filter((item) => combineStacks && item.isCurrency);
        const coinsByDenomination = groupBy(topLevelCoins, (item) => item.unit);
        const updates = createActorGroupUpdate();
        for (const denomination of CURRENCY_TYPES) {
            const quantity = coins[denomination] ?? 0;
            if (quantity <= 0) continue;
            const item = coinsByDenomination.get(denomination)?.at(0);
            if (item) {
                if (denomination === "credits") {
                    const newPrice = item.system.price.value.plus({ credits: quantity });
                    updates.itemUpdates.push({ _id: item.id, "system.price.value": newPrice.toObject() });
                } else {
                    updates.itemUpdates.push({ _id: item.id, "system.quantity": item.quantity + quantity });
                }
            } else {
                const source =
                    denomination === "upb"
                        ? (fu.deepClone(upbJSON) as PreCreate<TreasureSource>)
                        : denomination === "credits"
                          ? (fu.deepClone(credstickJSON) as PreCreate<TreasureSource>)
                          : ((await fromUuid<ItemPF2e>(coinCompendiumUuids[denomination]))?.toObject(true) ?? null);
                if (source?.type !== "treasure") throw ErrorPF2e("Unexpected error retrieving currency item");
                delete source._id;
                source.system ??= {};
                if (denomination === "credits") {
                    source.system.price ??= {};
                    source.system.price.value = { pp: undefined, gp: undefined, sp: quantity, cp: undefined };
                } else {
                    source.system.quantity = quantity;
                }
                updates.itemCreates.push(source);
            }
        }

        await applyActorGroupUpdate(this.actor, updates);
    }

    async removeCurrency(
        coins: Partial<Record<Currency, number>>,
        { byValue = true }: { byValue?: boolean } = {},
    ): Promise<boolean> {
        // Store what we have available. This is a copy. Exist early if total value is insufficient
        const actorCoins = this.currency;
        const totalValueToRemove = new Coins(coins).copperValue;
        if (totalValueToRemove > actorCoins.copperValue) return false; // insufficient

        // Variables to store the final operation we need to perform
        // Sometimes a coin may need to be added, for example removing 1 cp from 1 gp needs to also add 9 cp
        const removeResult = R.mapToObj(CURRENCY_TYPES, (d) => [d, 0]);
        const addResult = R.mapToObj(CURRENCY_TYPES, (d) => [d, 0]);

        // Phase 1 - remove exact without converting or splitting
        for (const type of CURRENCY_TYPES) {
            const toRemove = Math.min(coins[type] ?? 0, actorCoins[type]);
            removeResult[type] = toRemove;
            actorCoins[type] -= toRemove;
        }

        // Determine how much value we still need to remove. Exit early if insufficient.
        let valueToRemove = totalValueToRemove - new Coins(removeResult).copperValue;
        if (valueToRemove && !byValue) return false;

        if (byValue && valueToRemove) {
            // Phase 2 - remove by converting but without breaking any coins (best effort currency type maintenance)
            for (const [type, rate] of R.entries(DENOMINATION_RATES).toReversed()) {
                const toRemove = Math.min(actorCoins[type], Math.floor(valueToRemove / rate));
                if (!toRemove) continue;
                removeResult[type] += toRemove;
                actorCoins[type] -= toRemove;
                valueToRemove -= toRemove * rate;
            }

            // Phase 3 - Choose quantities of each coin to remove from smallest to largest to ensure we don't end in a situation
            // where we need to break a coin that has already been "removed".
            for (const [type, rate] of R.entries(R.pick(DENOMINATION_RATES, ["cp", "sp", "gp"]))) {
                if ((valueToRemove / rate) % 10 > actorCoins[type]) {
                    const toRemove = (valueToRemove / rate) % 10;
                    valueToRemove += (10 - toRemove) * rate;
                    addResult[type] += 10;
                    removeResult[type] += toRemove;
                } else {
                    const toRemove = (valueToRemove / rate) % 10; //  remove the units that other coins can't handle first
                    valueToRemove -= toRemove * rate;
                    const newValue = actorCoins[type] - toRemove;
                    const extraCoins = Math.min(valueToRemove / rate, Math.trunc(newValue / 10)) * 10;
                    removeResult[type] += toRemove + extraCoins;
                    valueToRemove -= extraCoins * rate;
                }
            }

            removeResult.pp = valueToRemove / 1000;

            // Phase 4 - Simplify and cancel out additions / removals
            for (const type of CURRENCY_TYPES) {
                const min = Math.min(addResult[type], removeResult[type]);
                addResult[type] -= min;
                removeResult[type] -= min;
            }
        }

        // If there are coins to add (because of rollover), add them first
        await this.addCoins(addResult);

        // Begin reducing item quantities and deleting coinage
        const moneyItems = this.actor.itemTypes.treasure.filter((item) => item.isCurrency);
        const moneyByType = R.groupBy(moneyItems, (item) => item.unit ?? "");
        const update = createActorGroupUpdate();
        for (const [type, coinItems] of R.entries(moneyByType)) {
            if (!type) continue;

            for (const item of coinItems) {
                if (removeResult[type] === 0) break;
                const moneyQuantity = type === "credits" ? item.system.price.value.credits : item.quantity;
                if (moneyQuantity > removeResult[type]) {
                    if (type === "credits") {
                        update.itemUpdates.push({
                            _id: item.id,
                            "system.price.==value": { sp: moneyQuantity - removeResult[type] },
                        });
                    } else {
                        update.itemUpdates.push({
                            _id: item.id,
                            "system.quantity": item.quantity - removeResult[type],
                        });
                    }
                    removeResult[type] = 0;
                    break;
                } else {
                    removeResult[type] -= moneyQuantity;
                    update.itemDeletes.push(item.id);
                }
            }

            // If there any remaining, show a warning. This should probably be validated in a future version
            if (removeResult[type] > 0) {
                console.warn("Attempted to remove more coinage than exists");
            }
        }

        await applyActorGroupUpdate(this.actor, update);
        return true;
    }

    async sellAllTreasure(): Promise<void> {
        const treasures = this.actor.itemTypes.treasure.filter((item) => !item.isCurrency);
        const treasureIds = treasures.map((item) => item.id);
        const coins = treasures
            .map((item) => item.assetValue)
            .reduce((first, second) => first.plus(second), new Coins());
        await this.actor.deleteEmbeddedDocuments("Item", treasureIds);
        await this.actor.inventory.addCurrency(coins);
    }

    /** Deletes all temporary items, skipping those that are associated with a special resource */
    async deleteTemporaryItems(
        operation?: Partial<DatabaseDeleteOperation<TActor>> | undefined,
    ): Promise<PhysicalItemPF2e<TActor>[]> {
        const actor = this.actor;
        const specialResourceItems = Object.values(actor.synthetics.resources)
            .map((r) => r.itemUUID)
            .filter((i) => !!i);
        return this.#massDelete(
            [...iterateAllItems(actor)].filter(
                (i): i is PhysicalItemPF2e<TActor> =>
                    i.isOfType("physical") &&
                    i.system.temporary &&
                    (!!i.parentItem || !i.sourceId || !specialResourceItems.includes(i.sourceId)),
            ),
            operation,
        );
    }

    /** A internal only helper to delete items and subitems with reduced re-rendering */
    async #massDelete(
        items: PhysicalItemPF2e<TActor>[],
        operation: Partial<DatabaseDeleteOperation<TActor>> | undefined = {},
    ): Promise<PhysicalItemPF2e<TActor>[]> {
        const actor = this.actor;
        const itemsToDelete = items.filter((i) => !i.parentItem).map((i) => i.id);
        const subItemsToDelete = items.filter((i) => i.parentItem);
        const render = operation?.render ?? true;
        if (!itemsToDelete.length && !subItemsToDelete.length) return [];

        const subItemDeleteGroups = Object.values(R.groupBy(subItemsToDelete, (s) => s.parentItem?._id ?? ""));
        const deletedItems: PhysicalItemPF2e<TActor>[] = [];
        if (itemsToDelete.length) {
            const deleted = await actor.deleteEmbeddedDocuments("Item", itemsToDelete, {
                ...operation,
                render: render && !subItemsToDelete.length,
            });
            deletedItems.push(...(deleted as PhysicalItemPF2e<TActor>[]));
        }

        // Due to nested sub items, it is more difficult (but not impossible) to include them in the batch.
        // Consider making a may to merge update calls more trivially somehow
        for (const [idx, group] of subItemDeleteGroups.entries()) {
            const parentItem = group[0].parentItem!;
            const isLast = idx === subItemDeleteGroups.length - 1;
            await parentItem.update(
                {
                    "system.subitems": parentItem._source.system.subitems?.filter(
                        (s) => !group.some((d) => d.id === s._id),
                    ),
                },
                { render: render && isLast },
            );
        }
        deletedItems.push(...subItemsToDelete);

        return deletedItems;
    }

    /** Adds one or more items to this inventory without removing from its original location. */
    async add(
        itemOrItems: AddItemParam,
        { stack = true, render = true, container, keepId }: AddItemOptions = {},
    ): Promise<PhysicalItemPF2e<TActor>[]> {
        const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
        const itemCreates: PreCreate<PhysicalItemSource | KitSource>[] = [];
        const newQuantities: Record<string, number> = {};
        const containerId = container?.id ?? null;
        const resultIds: string[] = []; // stores ids to retrieve in the end for the result
        for (const item of items) {
            const isPhysical = itemIsOfType(item, "physical");

            if (stack && isPhysical) {
                const source = "_source" in item ? item._source : item;
                const stackableItem = this.findStackableItem(source, { containerId });
                if (stackableItem) {
                    resultIds.push(stackableItem.id);
                    newQuantities[stackableItem.id] ??= stackableItem.quantity;
                    newQuantities[stackableItem.id] += item.system.quantity;
                    continue;
                }
            }

            // Create source, place in valid container, though skip if keepId is on and its already in a container
            const source = item instanceof ItemPF2e ? item.toObject() : item;
            source._id = keepId ? (source._id ?? fu.randomID()) : fu.randomID();
            const alreadyInValidContainer =
                keepId && isPhysical && items.some((i) => i._id === item.system.containerId);
            if (itemIsOfType(source, "physical")) {
                source.system.containerId = alreadyInValidContainer ? source.system.containerId : containerId;
            }

            // Add source to items to create
            itemCreates.push(source);
            resultIds.push(source._id);
        }

        const itemUpdates = Object.entries(newQuantities).map(([_id, quantity]) => ({
            _id,
            "system.quantity": quantity,
        }));
        await applyActorGroupUpdate(this.actor, { itemCreates, itemUpdates }, { render, keepId: true });

        // Return created or updated items
        return resultIds.map((id) => this.actor.inventory.get(id, { strict: true }));
    }
}

const coinCompendiumUuids = {
    pp: "Compendium.pf2e.equipment-srd.Item.JuNPeK5Qm1w6wpb4",
    gp: "Compendium.pf2e.equipment-srd.Item.B6B7tBWJSqOBz5zz",
    sp: "Compendium.pf2e.equipment-srd.Item.5Ew82vBF9YfaiY9f",
    cp: "Compendium.pf2e.equipment-srd.Item.lzJ8AVhRcbFul5fh",
};

type AddItemParam = AddableItemSourceOrEntry | AddableItemSourceOrEntry[];
type AddableItemSourceOrEntry = PhysicalItemPF2e | KitPF2e | PreCreate<PhysicalItemSource | KitSource>;

interface AddItemOptions {
    stack?: boolean;
    render?: boolean;
    container?: ContainerPF2e<ActorPF2e>;
    keepId?: boolean;
}

export { ActorInventory, InventoryBulk };
export type { AddItemParam };
