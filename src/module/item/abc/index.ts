import { ItemPF2e } from "../index";
import type { AncestryData } from "@item/ancestry/data";
import type { BackgroundData } from "@item/background/data";
import type { ClassData } from "@item/class/data";
import { FeatPF2e } from "@item/feat";

/** Abstract base class representing a Pathfinder (A)ncestry, (B)ackground, or (C)lass */
export abstract class ABCItemPF2e extends ItemPF2e {
    getLinkedFeatures(): Embedded<FeatPF2e>[] {
        if (!this.actor) return [];
        const existingABCIds = this.actor.itemTypes[this.data.type].map((i: Embedded<ABCItemPF2e>) => i.id);
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

export interface ABCItemPF2e {
    readonly data: AncestryData | BackgroundData | ClassData;
}
