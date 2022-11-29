import { ItemPF2e, FeatPF2e } from "@item";
import type { AncestryData } from "@item/ancestry/data";
import type { BackgroundData } from "@item/background/data";
import type { ClassData } from "@item/class/data";
import { FeatSource } from "@item/data";
import { MigrationList, MigrationRunner } from "@module/migration";
import { tupleHasValue } from "@util";
import { fromUUIDs } from "@util/from-uuids";

/** Abstract base class representing a Pathfinder (A)ncestry, (B)ackground, or (C)lass */
abstract class ABCItemPF2e extends ItemPF2e {
    getLinkedFeatures(): Embedded<FeatPF2e>[] {
        if (!this.actor || !tupleHasValue(["ancestry", "background", "class"] as const, this.type)) return [];
        const existingABCIds = this.actor.itemTypes[this.type].map((i: Embedded<ABCItemPF2e>) => i.id);
        return this.actor.itemTypes.feat.filter((f) => existingABCIds.includes(f.system.location ?? ""));
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

    /** Pulls the features that should be granted by this ABC */
    async getFeatures(options: { level?: number } = {}): Promise<FeatSource[]> {
        const entries = Object.values(this.system.items);
        const packEntries = entries.filter((entry) => !!entry.uuid);
        if (!packEntries.length) return [];

        const items = (await fromUUIDs(entries.map((e) => e.uuid))).map((i) => i.clone());
        for (const item of items) {
            if (item instanceof ItemPF2e) {
                await MigrationRunner.ensureSchemaVersion(item, MigrationList.constructFromVersion(item.schemaVersion));
            }
        }

        return items.flatMap((item): FeatSource | never[] => {
            if (item instanceof FeatPF2e) {
                if (item.featType === "classfeature") {
                    const level = entries.find((e) => item.sourceId === e.uuid)?.level ?? item.level;
                    item.updateSource({ "system.level.value": level });
                }

                const levelTooHigh = options.level !== undefined && options.level < item.level;
                if (levelTooHigh) {
                    return [];
                }

                const featSource = item.toObject();
                featSource._id = randomID(16);
                featSource.system.location = this.id;
                return featSource;
            } else {
                console.error("PF2e System | Missing or invalid ABC item");
                return [];
            }
        });
    }
}

interface ABCItemPF2e {
    readonly data: AncestryData | BackgroundData | ClassData;
}

export { ABCItemPF2e };
