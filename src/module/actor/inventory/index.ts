import { ActorPF2e } from "@actor";
import { ItemProxyPF2e, KitPF2e, PhysicalItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { Coins } from "@item/physical/data.ts";
import { CoinsPF2e, coinCompendiumIds } from "@item/physical/helpers.ts";
import { DENOMINATIONS } from "@item/physical/values.ts";
import { DelegatedCollection, ErrorPF2e, groupBy } from "@util";
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

    get coins(): CoinsPF2e {
        return this.filter((i) => i.isOfType("treasure") && i.isCoinage)
            .map((item) => item.assetValue)
            .reduce((first, second) => first.add(second), new CoinsPF2e());
    }

    get totalWealth(): CoinsPF2e {
        return this.filter((item) => game.user.isGM || item.isIdentified)
            .map((item) => item.assetValue)
            .reduce((first, second) => first.add(second), new CoinsPF2e());
    }

    get invested(): { value: number; max: number } | null {
        if (this.actor.isOfType("character")) {
            return {
                value: this.filter((item) => !!item.isInvested).length,
                max: this.actor.system.resources.investiture.max,
            };
        }

        return null;
    }

    /** Find an item already owned by the actor that can stack with the given item */
    findStackableItem(item: PhysicalItemPF2e | ItemSourcePF2e): PhysicalItemPF2e<TActor> | null {
        // Prevent upstream from mutating property descriptors
        const testItem = item instanceof PhysicalItemPF2e ? item.clone() : new ItemProxyPF2e(deepClone(item));
        if (!testItem.isOfType("physical")) return null;

        const stackCandidates = this.filter((i) => !i.isInContainer && i.isStackableWith(testItem));
        if (stackCandidates.length === 0) {
            return null;
        } else if (stackCandidates.length > 1) {
            // Prefer stacking with unequipped items
            const notEquipped = stackCandidates.filter((item) => !item.isEquipped);
            return notEquipped.length > 0 ? notEquipped[0] : stackCandidates[0];
        } else {
            return stackCandidates[0];
        }
    }

    async addCoins(coins: Partial<Coins>, { combineStacks = true }: { combineStacks?: boolean } = {}): Promise<void> {
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
                    const pack = game.packs.find<CompendiumCollection<PhysicalItemPF2e<null>>>(
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

    async removeCoins(coins: Partial<Coins>, { byValue = true }: { byValue?: boolean } = {}): Promise<boolean> {
        const coinsToRemove = new CoinsPF2e(coins);
        const actorCoins = this.coins;
        const coinsToAdd = new CoinsPF2e();

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
        const coinsToPull = actorCoins.add(coinsToAdd);
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
            .reduce((first, second) => first.add(second), new CoinsPF2e());
        await this.actor.deleteEmbeddedDocuments("Item", treasureIds);
        await this.actor.inventory.addCoins(coins);
    }

    /** Adds an item to this inventory without removing from its original location */
    async add(item: PhysicalItemPF2e | KitPF2e, options: AddItemOptions = {}): Promise<void> {
        if (options.stack && item.isOfType("physical")) {
            const stackableItem = this.findStackableItem(item._source);
            if (stackableItem) {
                await stackableItem.update({ "system.quantity": stackableItem.quantity + item.quantity });
                return;
            }
        }

        await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
    }
}

interface AddItemOptions {
    stack?: boolean;
}

export { ActorInventory, InventoryBulk };
