import { ItemPF2e, FeatPF2e } from "@item";
import type { AncestryData } from "@item/ancestry/data";
import type { BackgroundData } from "@item/background/data";
import type { ClassData } from "@item/class/data";
import { tupleHasValue } from "@util";

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
}

interface ABCItemPF2e {
    readonly data: AncestryData | BackgroundData | ClassData;
}

export { ABCItemPF2e };
