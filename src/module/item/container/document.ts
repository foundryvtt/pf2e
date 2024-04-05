import type { ActorPF2e } from "@actor";
import { InventoryBulk } from "@actor/inventory/index.ts";
import { RawItemChatData } from "@item/base/data/index.ts";
import { EquipmentTrait } from "@item/equipment/data.ts";
import { Bulk } from "@item/physical/bulk.ts";
import { PhysicalItemPF2e } from "@item/physical/document.ts";
import type { UserPF2e } from "@module/user/index.ts";
import type { ContainerSource, ContainerSystemData } from "./data.ts";
import { hasExtraDimensionalParent } from "./helpers.ts";

class ContainerPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    static override get validTraits(): Record<EquipmentTrait, string> {
        return CONFIG.PF2E.equipmentTraits;
    }

    /** This container's contents, reloaded every data preparation cycle */
    contents: Collection<PhysicalItemPF2e<NonNullable<TParent>>> = new Collection();

    /** Is this an actual stowing container or merely one of the old pouches/quivers/etc.? */
    get stowsItems(): boolean {
        return this.system.stowing;
    }

    get isCollapsed(): boolean {
        return this.system.collapsed;
    }

    get capacity(): { value: Bulk; max: Bulk } {
        return {
            value: InventoryBulk.computeTotalBulk(this.contents.contents, this.actor?.size ?? "med"),
            max: new Bulk(this.system.bulk.capacity),
        };
    }

    /** The percentage filled of container's bulk capacity: if over 100%, return a value without excess Light units. */
    get percentFull(): number {
        const { value, max } = this.capacity;
        const realPercent = Math.floor((value.toLightUnits() / max.toLightUnits()) * 100);
        return realPercent > 100 ? Math.floor((value.normal / max.normal) * 100) : realPercent;
    }

    get bulkIgnored(): Bulk {
        const isOverfilled = this.percentFull > 100;
        const extradimensionalParadox = this.traits.has("extradimensional") && hasExtraDimensionalParent(this);
        const canIgnoreBulk = !isOverfilled && !extradimensionalParadox;

        return canIgnoreBulk ? new Bulk(this.system.bulk.ignored) : new Bulk();
    }

    override get bulk(): Bulk {
        return super.bulk.plus(this.capacity.value.minus(this.bulkIgnored));
    }

    /** Reload this container's contents following Actor embedded-document preparation */
    override prepareSiblingData(this: ContainerPF2e<ActorPF2e>): void {
        super.prepareSiblingData();

        if (this.system.containerId === this.id) this.system.containerId = null;
        this.contents = new Collection(
            this.actor.inventory.filter((i) => i.container?.id === this.id).map((item) => [item.id, item]),
        );
    }

    /** Move the contents of this container into the next-higher container or otherwise the main actor inventory */
    async ejectContents(): Promise<void> {
        if (!this.actor) return;

        const updates = this.contents.map((i) => ({ _id: i.id, "system.containerId": this.container?.id ?? null }));
        await this.actor.updateEmbeddedDocuments("Item", updates, { render: false });
    }

    override async getChatData(
        this: ContainerPF2e<TParent>,
        htmlOptions: EnrichmentOptions = {},
    ): Promise<RawItemChatData> {
        return this.processChatData(htmlOptions, {
            ...(await super.getChatData()),
            traits: this.traitChatData(CONFIG.PF2E.equipmentTraits),
        });
    }

    /** Coerce changes to container bulk data into validity */
    protected override _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (!changed.system?.bulk) return super._preUpdate(changed, options, user);

        if (changed.system.bulk.heldOrStowed !== undefined) {
            changed.system.bulk.heldOrStowed = Math.clamped(Number(changed.system.bulk.heldOrStowed), 0, 999) || 0;
            if (!Number.isInteger(changed.system.bulk.heldOrStowed)) changed.system.bulk.heldOrStowed = 0.1;
        }

        for (const property of ["capacity", "ignored"] as const) {
            if (changed.system.bulk[property] !== undefined) {
                changed.system.bulk[property] =
                    Math.clamped(Math.trunc(Number(changed.system.bulk[property])), 0, 999) || 0;
            }
        }

        return super._preUpdate(changed, options, user);
    }
}

interface ContainerPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: ContainerSource;
    system: ContainerSystemData;

    get traits(): Set<EquipmentTrait>;
}

export { ContainerPF2e };
