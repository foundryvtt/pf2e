import { ItemPF2e, FeatPF2e } from "@item";
import type { AncestryData } from "@item/ancestry/data";
import type { BackgroundData } from "@item/background/data";
import type { ClassData } from "@item/class/data";
import { MigrationList, MigrationRunner } from "@module/migration";
import { objectHasKey } from "@util";
import { fromUUIDs } from "@util/from-uuids";

/** Abstract base class representing a Pathfinder (A)ncestry, (B)ackground, or (C)lass */
abstract class ABCItemPF2e extends ItemPF2e {
    /** Returns all items that should also be deleted should this item be deleted */
    override getLinkedItems(): Embedded<FeatPF2e>[] {
        if (!this.actor || !objectHasKey(this.actor.itemTypes, this.type)) return [];
        const existingABCIds = this.actor.itemTypes[this.type].map((i) => i.id);
        return this.actor.itemTypes.feat.filter((f) => existingABCIds.includes(f.system.location ?? ""));
    }

    /** Returns items that should also be added when this item is created */
    override async createGrantedItems(options: { level?: number } = {}): Promise<FeatPF2e[]> {
        const entries = Object.values(this.system.items);
        const packEntries = entries.filter((entry) => !!entry.uuid);
        if (!packEntries.length) return [];

        const items = (await fromUUIDs(entries.map((e) => e.uuid))).map((i) => i.clone());
        for (const item of items) {
            if (item instanceof ItemPF2e) {
                await MigrationRunner.ensureSchemaVersion(item, MigrationList.constructFromVersion(item.schemaVersion));
            }
        }

        const level = options.level ?? this.parent?.level;

        return items.flatMap((item): FeatPF2e | never[] => {
            if (item instanceof FeatPF2e) {
                if (item.featType === "classfeature") {
                    const level = entries.find((e) => item.sourceId === e.uuid)?.level ?? item.level;
                    item.updateSource({ "system.level.value": level });
                }

                if (level !== undefined && level < item.level) {
                    return [];
                }

                item.updateSource({ system: { location: this.id } });
                return item;
            } else {
                console.error("PF2e System | Missing or invalid ABC item");
                return [];
            }
        });
    }

    protected logAutoChange(this: Embedded<ABCItemPF2e>, path: string, value: string | number): void {
        if (value === 0) return;
        this.actor.system.autoChanges[path] = [
            {
                mode: "upgrade",
                level: 1,
                value: value,
                source: this.name,
            },
        ];
    }
}

interface ABCItemPF2e {
    readonly data: AncestryData | BackgroundData | ClassData;
}

export { ABCItemPF2e };
