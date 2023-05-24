import { ActorPF2e } from "@actor";
import { FeatPF2e, ItemPF2e } from "@item";
import type { AncestrySource, AncestrySystemData } from "@item/ancestry/data.ts";
import type { BackgroundSource, BackgroundSystemData } from "@item/background/data.ts";
import type { ClassSource, ClassSystemData } from "@item/class/data.ts";
import { MigrationList, MigrationRunner } from "@module/migration/index.ts";
import { objectHasKey } from "@util";
import { UUIDUtils } from "@util/uuid.ts";

/** Abstract base class representing a Pathfinder (A)ncestry, (B)ackground, or (C)lass */
abstract class ABCItemPF2e<TParent extends ActorPF2e | null> extends ItemPF2e<TParent> {
    /** Returns all items that should also be deleted should this item be deleted */
    override getLinkedItems(): FeatPF2e<ActorPF2e>[] {
        if (!this.actor || !objectHasKey(this.actor.itemTypes, this.type)) return [];
        const existingABCIds = this.actor.itemTypes[this.type].map((i) => i.id);
        return this.actor.itemTypes.feat.filter((f) => existingABCIds.includes(f.system.location ?? ""));
    }

    /** Returns items that should also be added when this item is created */
    override async createGrantedItems(options: { level?: number } = {}): Promise<FeatPF2e<null>[]> {
        const entries = Object.values(this.system.items);
        const packEntries = entries.filter((entry) => !!entry.uuid);
        if (!packEntries.length) return [];

        const items = (await UUIDUtils.fromUUIDs(entries.map((e) => e.uuid))).map((i) => i.clone());
        for (const item of items) {
            if (item instanceof ItemPF2e) {
                await MigrationRunner.ensureSchemaVersion(item, MigrationList.constructFromVersion(item.schemaVersion));
            }
        }

        const level = options.level ?? this.parent?.level;

        return items.flatMap((item): FeatPF2e<null> | never[] => {
            if (item instanceof FeatPF2e) {
                if (item.category === "classfeature") {
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

    protected logAutoChange(path: string, value: string | number): void {
        if (value === 0 || !this.actor) return;
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

interface ABCItemPF2e<TParent extends ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: AncestrySource | BackgroundSource | ClassSource;
    system: AncestrySystemData | BackgroundSystemData | ClassSystemData;
}

export { ABCItemPF2e };
