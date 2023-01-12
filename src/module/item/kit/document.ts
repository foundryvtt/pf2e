import { ContainerPF2e, ItemPF2e, PhysicalItemPF2e } from "@item/index";
import { Price } from "@item/physical/data";
import { CoinsPF2e } from "@item/physical/helpers";
import { DENOMINATIONS } from "@item/physical/values";
import { UserPF2e } from "@module/user";
import { ErrorPF2e, isObject } from "@util";
import { fromUUIDs } from "@util/from-uuids";
import { KitData, KitEntryData } from "./data";

class KitPF2e extends ItemPF2e {
    get entries(): KitEntryData[] {
        return Object.values(this.system.items);
    }

    get price(): Price {
        return {
            value: new CoinsPF2e(this.system.price.value),
            per: this.system.price.per ?? 1,
        };
    }

    /** Expand a tree of kit entry data into a list of physical items */
    override async createGrantedItems(
        options: { entries?: KitEntryData[]; containerId?: string } = {}
    ): Promise<PhysicalItemPF2e[]> {
        const entries = options.entries ?? this.entries;
        const itemUUIDs = entries.map((e): ItemUUID => e.uuid);
        const items: unknown[] = await fromUUIDs(itemUUIDs);
        if (entries.length !== items.length) throw ErrorPF2e(`Some items from ${this.name} were not found`);
        if (!items.every((i): i is ItemPF2e => i instanceof ItemPF2e)) return [];

        return items.reduce(async (promise: PhysicalItemPF2e[] | Promise<PhysicalItemPF2e[]>, item, index) => {
            const prepared = await promise;
            const clone = item.clone({ _id: randomID() }, { keepId: true });
            const entry = entries[index];
            if (clone instanceof PhysicalItemPF2e) {
                clone.updateSource({
                    "system.quantity": entry.quantity,
                    "system.containerId": options.containerId,
                });
            }

            if (clone instanceof ContainerPF2e && entry.items) {
                const contents = await this.createGrantedItems({
                    entries: Object.values(entry.items),
                    containerId: clone.id,
                });
                prepared.push(clone, ...contents);
            } else if (clone instanceof KitPF2e) {
                const inflatedKit = await clone.createGrantedItems({ containerId: options.containerId });
                prepared.push(...inflatedKit);
            } else if (clone instanceof PhysicalItemPF2e) {
                prepared.push(clone);
            }

            return prepared;
        }, []);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        if (!changed.system) return await super._preUpdate(changed, options, user);

        // Clear 0 price denominations
        if (isObject<Record<string, unknown>>(changed.system?.price)) {
            const price: Record<string, unknown> = changed.system.price;
            for (const denomination of DENOMINATIONS) {
                if (price[denomination] === 0) {
                    price[`-=denomination`] = null;
                }
            }
        }

        await super._preUpdate(changed, options, user);
    }
}

interface KitPF2e {
    readonly data: KitData;
}

export { KitPF2e };
