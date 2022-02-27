import { ActorPF2e } from "@actor/index";
import { ContainerPF2e, ItemPF2e, PhysicalItemPF2e } from "@item/index";
import { ErrorPF2e } from "@util";
import { fromUUIDs } from "@util/from-uuids";
import { KitData, KitEntryData } from "./data";

export class KitPF2e extends ItemPF2e {
    static override get schema(): typeof KitData {
        return KitData;
    }

    get entries(): KitEntryData[] {
        return Object.values(this.data.data.items);
    }

    /** Expand a tree of kit entry data into a list of physical items */
    async inflate({
        entries = this.entries,
        containerId = null,
    }: { entries?: KitEntryData[]; containerId?: string | null } = {}): Promise<PhysicalItemPF2e[]> {
        const itemUUIDs = entries.map((e): ItemUUID => (e.pack ? `Compendium.${e.pack}.${e.id}` : `Item.${e.id}`));
        const items: unknown[] = await fromUUIDs(itemUUIDs);
        if (entries.length !== items.length) throw ErrorPF2e(`Some items from ${this.name} were not found`);
        if (!items.every((i): i is ItemPF2e => i instanceof ItemPF2e)) return [];

        return items.reduce(async (promise: PhysicalItemPF2e[] | Promise<PhysicalItemPF2e[]>, item, index) => {
            const prepared = await promise;
            const clone = item.clone({ _id: randomID() }, { keepId: true });
            const entry = entries[index];
            if (clone.data.isPhysical) {
                clone.data.update({
                    "data.quantity.value": entry.quantity,
                    "data.containerId.value": containerId,
                });
            }

            if (clone instanceof ContainerPF2e && entry.items) {
                const contents = await this.inflate({
                    entries: Object.values(entry.items),
                    containerId: clone.id,
                });
                prepared.push(clone, ...contents);
            } else if (clone instanceof KitPF2e) {
                const inflatedKit = await clone.inflate({ containerId });
                prepared.push(...inflatedKit);
            } else if (clone instanceof PhysicalItemPF2e) {
                prepared.push(clone);
            }

            return prepared;
        }, []);
    }

    /** Inflate this kit and add its items to the provided actor */
    async dumpContents({
        actor,
        containerId = null,
    }: {
        actor: ActorPF2e;
        containerId?: string | null;
    }): Promise<void> {
        const sources = (await this.inflate({ containerId })).map((i) => i.toObject());
        await actor.createEmbeddedDocuments("Item", sources, { keepId: true });
    }
}

export interface KitPF2e {
    readonly data: KitData;
}
