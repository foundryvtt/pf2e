import { ActorPF2e } from "@actor";
import { PhysicalItemPF2e, TreasurePF2e } from "@item";
import { Coins } from "@item/physical/data";
import { DENOMINATIONS } from "@item/physical/values";
import { coinCompendiumIds, CoinsPF2e } from "@item/physical/helpers";
import { groupBy } from "@util";
import { InventoryBulk } from "./bulk";

class ActorInventory extends Collection<Embedded<PhysicalItemPF2e>> {
    constructor(public readonly actor: ActorPF2e, entries?: Embedded<PhysicalItemPF2e>[]) {
        super(entries?.map((entry) => [entry.id, entry]));
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

    get invested() {
        if (this.actor.isOfType("character")) {
            return {
                value: this.filter((item) => !!item.isInvested).length,
                max: this.actor.data.data.resources.investiture.max,
            };
        }

        return null;
    }

    get bulk(): InventoryBulk {
        return new InventoryBulk(this.actor);
    }

    async addCoins(coins: Partial<Coins>, { combineStacks = true }: { combineStacks?: boolean } = {}) {
        const topLevelCoins = this.actor.itemTypes.treasure.filter((item) => combineStacks && item.isCoinage);
        const coinsByDenomination = groupBy(topLevelCoins, (item) => item.denomination);

        for (const denomination of DENOMINATIONS) {
            const quantity = coins[denomination] ?? 0;
            if (quantity > 0) {
                const item = coinsByDenomination.get(denomination)?.[0];
                if (item) {
                    await item.update({ "data.quantity": item.quantity + quantity });
                } else {
                    const compendiumId = coinCompendiumIds[denomination];
                    const pack = game.packs.find<CompendiumCollection<PhysicalItemPF2e>>(
                        (p) => p.collection === "pf2e.equipment-srd"
                    );
                    if (!pack) {
                        throw Error("unable to get pack!");
                    }
                    const item = await pack.getDocument(compendiumId);
                    if (item?.data.type === "treasure") {
                        item.data.update({ "data.quantity": quantity });
                        await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
                    }
                }
            }
        }
    }

    async removeCoins(coins: Partial<Coins>, { byValue = true }: { byValue?: boolean } = {}) {
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
                const itemsToUpdate: EmbeddedDocumentUpdateData<TreasurePF2e>[] = [];
                const itemsToDelete: string[] = [];
                for (const item of coinItems) {
                    if (quantityToRemove === 0) break;
                    if (item.quantity > quantityToRemove) {
                        itemsToUpdate.push({ _id: item.id, "data.quantity": item.quantity - quantityToRemove });
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
}

export { ActorInventory, InventoryBulk };
