import type { ActorPF2e } from "@actor";
import { ActorSizePF2e } from "@actor/data/size.ts";
import type { ItemUUID } from "@common/documents/_module.d.mts";
import { ItemPF2e, type PhysicalItemPF2e } from "@item";
import type { ClassTrait } from "@item/class/types.ts";
import { Price } from "@item/physical/data.ts";
import { Size } from "@module/data.ts";
import { ErrorPF2e } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import { KitSource, KitSystemData, type KitEntryData } from "./data.ts";

class KitPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    static override get validTraits(): Record<ClassTrait, string> {
        return CONFIG.PF2E.classTraits;
    }

    get entries(): KitEntryData[] {
        return Object.values(this.system.items);
    }

    get price(): Price {
        return this.system.price;
    }

    /** Expand a tree of kit entry data into a list of physical items */
    override async createGrantedItems(
        options: { entries?: KitEntryData[]; containerId?: string; size?: Size } = {},
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
                const clone = item.clone({ _id: fu.randomID(), system: { size } }, { keepId: true });
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
                } else if (clone.isOfType("kit")) {
                    const inflatedKit = await clone.createGrantedItems({ containerId: options.containerId, size });
                    prepared.push(...inflatedKit);
                } else if (clone.isOfType("physical")) {
                    prepared.push(clone);
                }

                return prepared;
            },
            [],
        );
    }
}

interface KitPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: KitSource;
    system: KitSystemData;
}

export { KitPF2e };
