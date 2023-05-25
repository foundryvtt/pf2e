import { ActorPF2e } from "@actor";
import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { Price } from "@item/physical/data.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { DENOMINATIONS } from "@item/physical/values.ts";
import { UserPF2e } from "@module/user/index.ts";
import { ErrorPF2e, isObject } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import { KitEntryData, KitSource, KitSystemData } from "./data.ts";
import { Size } from "@module/data.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";

class KitPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
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
        options: { entries?: KitEntryData[]; containerId?: string; size?: Size } = {}
    ): Promise<PhysicalItemPF2e<null>[]> {
        const size = new ActorSizePF2e({ value: options.size ?? "med", smallIsMedium: true }).value;
        const entries = options.entries ?? this.entries;
        const itemUUIDs = entries.map((e): ItemUUID => e.uuid);
        const items: unknown[] = await UUIDUtils.fromUUIDs(itemUUIDs);
        if (entries.length !== items.length) throw ErrorPF2e(`Some items from ${this.name} were not found`);
        if (!items.every((i): i is ItemPF2e<null> => i instanceof ItemPF2e && !i.parent)) return [];

        return items.reduce(
            async (promise: PhysicalItemPF2e<null>[] | Promise<PhysicalItemPF2e<null>[]>, item, index) => {
                const prepared = await promise;
                const clone = item.clone({ _id: randomID(), system: { size } }, { keepId: true });
                const entry = entries[index];
                if (clone.isOfType("physical")) {
                    clone.updateSource({
                        "system.quantity": entry.quantity,
                        "system.containerId": options.containerId,
                    });
                }

                if (clone.isOfType("backpack") && entry.items) {
                    const contents = await this.createGrantedItems({
                        entries: Object.values(entry.items),
                        containerId: clone.id,
                        size,
                    });
                    prepared.push(clone, ...contents);
                } else if (clone instanceof KitPF2e) {
                    const inflatedKit = await clone.createGrantedItems({ containerId: options.containerId, size });
                    prepared.push(...inflatedKit);
                } else if (clone instanceof PhysicalItemPF2e) {
                    prepared.push(clone);
                }

                return prepared;
            },
            []
        );
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<TParent>,
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

interface KitPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: KitSource;
    system: KitSystemData;
}

export { KitPF2e };
