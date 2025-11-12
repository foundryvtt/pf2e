import type { ActorPF2e } from "@actor";
import { applyActorGroupUpdate, iterateAllItems } from "@actor/helpers.ts";
import type { DatabaseDeleteOperation } from "@common/abstract/_module.d.mts";
import { ContainerPF2e, ItemPF2e, ItemProxyPF2e, KitPF2e, PhysicalItemPF2e } from "@item";
import { ItemSourcePF2e, KitSource, PhysicalItemSource } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { RawCoins } from "@item/physical/data.ts";
import { Coins, coinCompendiumIds } from "@item/physical/helpers.ts";
import { DENOMINATIONS } from "@item/physical/values.ts";
import { DelegatedCollection, ErrorPF2e, groupBy } from "@util";
import * as R from "remeda";
import { InventoryBulk } from "./bulk.ts";

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
        return this.filter((i) => i.isOfType("treasure") && i.isCoinage)
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

    async addCoins(
        coins: Partial<RawCoins>,
        { combineStacks = true }: { combineStacks?: boolean } = {},
    ): Promise<void> {
        const topLevelCoins = this.actor.itemTypes.treasure.filter((item) => combineStacks && item.isCoinage);
        const coinsByDenomination = groupBy(topLevelCoins, (item) => item.denomination);

        for (const denomination of DENOMINATIONS) {
            const quantity = coins[denomination] ?? 0;
            if (quantity > 0) {
                const item = coinsByDenomination.get(denomination)?.at(0);
                if (item) {
                    await item.update({ "system.quantity": item.quantity + quantity });
                } else {
                    const compendiumId = coinCompendiumIds[denomination];
                    const pack = game.packs.find<fd.collections.CompendiumCollection<PhysicalItemPF2e<null>>>(
                        (p) => p.collection === "pf2e.equipment-srd",
                    );
                    if (!pack) throw ErrorPF2e("Unexpected error retrieving equipment compendium");

                    const item = (await pack.getDocument(compendiumId))?.clone();
                    if (item?.isOfType("treasure")) {
                        item.updateSource({ "system.quantity": quantity });
                        await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
                    }
                }
            }
        }
    }

    async removeCoins(coins: Partial<RawCoins>, { byValue = true }: { byValue?: boolean } = {}): Promise<boolean> {
        const coinsToRemove = new Coins(coins);
        const actorCoins = this.coins;
        const coinsToAdd = new Coins();

        if (byValue) {
            let valueToRemoveInCopper = coinsToRemove.copperValue;
            if (valueToRemoveInCopper > actorCoins.copperValue) {
                return false;
            }

            // Choose quantities of each coin to remove from smallest to largest to ensure we don't end in a situation
            // where we need to break a coin that has already been "removed"
            if (valueToRemoveInCopper % 10 > actorCoins.cp) {
                coinsToAdd.cp = 10;
                coinsToRemove.cp = valueToRemoveInCopper % 10;
                valueToRemoveInCopper += 10 - coinsToRemove.cp;
            } else {
                coinsToRemove.cp = valueToRemoveInCopper % 10; //  remove the units that other coins can't handle first
                valueToRemoveInCopper -= coinsToRemove.cp;
                const newCopper = actorCoins.cp - coinsToRemove.cp;
                const extraCopper = Math.min(valueToRemoveInCopper / 10, Math.trunc(newCopper / 10)) * 10;
                coinsToRemove.cp += extraCopper;
                valueToRemoveInCopper -= extraCopper;
            }

            if ((valueToRemoveInCopper / 10) % 10 > actorCoins.sp) {
                coinsToAdd.sp = 10;
                coinsToRemove.sp = (valueToRemoveInCopper / 10) % 10;
                valueToRemoveInCopper += 100 - coinsToRemove.sp * 10;
            } else {
                coinsToRemove.sp = (valueToRemoveInCopper / 10) % 10; //  remove the units that other coins can't handle first
                valueToRemoveInCopper -= coinsToRemove.sp * 10;
                const newSilver = actorCoins.sp - coinsToRemove.sp;
                const extraSilver = Math.min(valueToRemoveInCopper / 100, Math.trunc(newSilver / 10)) * 10;
                coinsToRemove.sp += extraSilver;
                valueToRemoveInCopper -= extraSilver * 10;
            }

            if ((valueToRemoveInCopper / 100) % 10 > actorCoins.gp) {
                coinsToAdd.gp = 10;
                coinsToRemove.gp = (valueToRemoveInCopper / 100) % 10;
                valueToRemoveInCopper += 1000 - coinsToRemove.gp * 100;
            } else {
                coinsToRemove.gp = (valueToRemoveInCopper / 100) % 10; //  remove the units that other coins can't handle first
                valueToRemoveInCopper -= coinsToRemove.gp * 100;
                const newGold = actorCoins.gp - coinsToRemove.gp;
                const extraGold = Math.min(valueToRemoveInCopper / 1000, Math.trunc(newGold / 10)) * 10;
                coinsToRemove.gp += extraGold;
                valueToRemoveInCopper -= extraGold * 100;
            }

            coinsToRemove.pp = valueToRemoveInCopper / 1000;
        }

        // Test if the actor has enough coins to pull
        const coinsToPull = actorCoins.plus(coinsToAdd);
        const sufficient =
            coinsToRemove.pp <= coinsToPull.pp &&
            coinsToRemove.gp <= coinsToPull.gp &&
            coinsToRemove.sp <= coinsToPull.sp &&
            coinsToRemove.cp <= coinsToPull.cp;
        if (!sufficient) {
            return false;
        }

        // If there are coins to add (because of rollover), add them first
        if (Object.values(coinsToAdd).some((value) => value !== 0)) {
            await this.addCoins(coinsToAdd);
        }

        // Begin reducing item quantities and deleting coinage
        const topLevelCoins = this.actor.itemTypes.treasure.filter((item) => item.isCoinage);
        const coinsByDenomination = groupBy(topLevelCoins, (item) => item.denomination);
        for (const denomination of DENOMINATIONS) {
            let quantityToRemove = coinsToRemove[denomination];
            const coinItems = coinsByDenomination.get(denomination);
            if (!!quantityToRemove && coinItems) {
                const itemsToUpdate: EmbeddedDocumentUpdateData[] = [];
                const itemsToDelete: string[] = [];
                for (const item of coinItems) {
                    if (quantityToRemove === 0) break;
                    if (item.quantity > quantityToRemove) {
                        itemsToUpdate.push({ _id: item.id, "system.quantity": item.quantity - quantityToRemove });
                        quantityToRemove = 0;
                        break;
                    } else {
                        quantityToRemove -= item.quantity;
                        itemsToDelete.push(item.id);
                    }
                }

                if (itemsToUpdate.length > 0) {
                    await this.actor.updateEmbeddedDocuments("Item", itemsToUpdate);
                }

                if (itemsToDelete.length > 0) {
                    await this.actor.deleteEmbeddedDocuments("Item", itemsToDelete);
                }

                // If there any remaining, show a warning. This should probably be validated in a future version
                if (quantityToRemove > 0) {
                    console.warn("Attempted to remove more coinage than exists");
                }
            }
        }

        return true;
    }

    async sellAllTreasure(): Promise<void> {
        const treasures = this.actor.itemTypes.treasure.filter((item) => !item.isCoinage);
        const treasureIds = treasures.map((item) => item.id);
        const coins = treasures
            .map((item) => item.assetValue)
            .reduce((first, second) => first.plus(second), new Coins());
        await this.actor.deleteEmbeddedDocuments("Item", treasureIds);
        await this.actor.inventory.addCoins(coins);
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
