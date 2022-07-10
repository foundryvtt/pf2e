import { ItemPF2e } from "../index";
import type { AncestryData } from "@item/ancestry/data";
import type { BackgroundData } from "@item/background/data";
import type { ClassData } from "@item/class/data";
import { FeatPF2e } from "@item/feat";
import { UserPF2e } from "@module/user";

/** Abstract base class representing a Pathfinder (A)ncestry, (B)ackground, or (C)lass */
export abstract class ABCItemPF2e extends ItemPF2e {
    getLinkedFeatures(): Embedded<FeatPF2e>[] {
        if (!this.actor) return [];
        const existingABCIds = this.actor.itemTypes[this.data.type].map((item: Embedded<ABCItemPF2e>) => item.id);
        return this.actor.itemTypes.feat.filter((feat) => existingABCIds.includes(feat.data.data.location ?? ""));
    }

    protected logAutoChange(this: Embedded<ABCItemPF2e>, path: string, value: string | number): void {
        if (value === 0) return;
        this.actor.data.data.autoChanges[path] = [
            {
                mode: "upgrade",
                level: 1,
                value: value,
                source: this.name,
            },
        ];
    }

    /** Increase HP by amount increased by new ABC item */
    protected override async _preCreate(
        data: PreDocumentId<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        if (this.actor?.isOfType("character")) {
            const clone = this.actor.clone({
                items: [...this.actor.toObject().items, this.toObject()],
            });
            const hpMaxDifference = clone.hitPoints.max - this.actor.hitPoints.max;
            if (hpMaxDifference !== 0) {
                const newHitPoints = this.actor.hitPoints.value + hpMaxDifference;
                this.actor.update(
                    { "data.attributes.hp.value": newHitPoints },
                    { render: false, allowHPOverage: true }
                );
            }
        }

        return super._preCreate(data, options, user);
    }
}

export interface ABCItemPF2e {
    readonly data: AncestryData | BackgroundData | ClassData;
}
