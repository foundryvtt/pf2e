import type { ActorType, CreaturePF2e } from "@actor";
import type { CharacterResources } from "@actor/character/data.ts";
import { CORE_RESOURCES } from "@actor/character/values.ts";
import { applyActorUpdate } from "@actor/helpers.ts";
import type { ActorCommitData } from "@actor/types.ts";
import { ItemProxyPF2e, PhysicalItemPF2e } from "@item";
import type { PhysicalItemSource } from "@item/base/data/index.ts";
import { sluggify } from "@util";
import { createBatchRuleElementUpdate } from "../helpers.ts";
import { RuleElementPF2e, type RuleElementOptions } from "./base.ts";
import { ResolvableValueField, type RuleElementSchema, type RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;

const INVALID_RESOURCES: (keyof CharacterResources)[] = [...CORE_RESOURCES, "crafting", "infusedReagents"];

class SpecialResourceRuleElement extends RuleElementPF2e<SpecialResourceSchema> {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(source: SpecialResourceSource, options: RuleElementOptions) {
        super({ priority: 18, ...source }, options);
        if (this.invalid) return;

        this.slug ??= this.item.slug ?? sluggify(this.item.name);
        if (INVALID_RESOURCES.includes(this.slug)) {
            this.failValidation("slug: invalid value");
        }

        if (this.level !== null && !this.itemUUID) {
            this.failValidation("level can only be set if itemUUID is set");
        }
    }

    static override defineSchema(): SpecialResourceSchema {
        return {
            ...super.defineSchema(),
            value: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
            max: new ResolvableValueField({ required: true, nullable: false }),
            itemUUID: new fields.DocumentUUIDField({
                required: false,
                nullable: false,
                blank: false,
                initial: undefined,
                type: "Item",
                label: "PF2E.UUID.Label",
            }),
            level: new ResolvableValueField({ required: false, nullable: true, initial: null }),
        };
    }

    /** Updates the remaining number of this resource. Where it updates depends on the type */
    async update(value: number, options: { save: false; checkLevel?: boolean }): Promise<ActorCommitData>;
    async update(value: number, options?: { save?: true; render?: boolean; checkLevel?: boolean }): Promise<void>;
    async update(
        value: number,
        { save = true, render = true, checkLevel = false }: SpecialResourceUpdateOptions = {},
    ): Promise<void | ActorCommitData> {
        const data: ActorCommitData<CreaturePF2e> = {
            actorUpdates: null,
            itemCreates: [],
            itemUpdates: [],
        };

        if (this.itemUUID) {
            // Find an existing item to update or create a new one
            const existing = this.actor.items.find((i) => i.sourceId === this.itemUUID);
            const level = this.level !== null ? Number(this.resolveValue(this.level)) : null;

            if (
                existing?.isOfType("physical") &&
                (existing.quantity !== value || (checkLevel && level !== existing.level))
            ) {
                const update = { _id: existing.id, system: { quantity: value } };
                if (checkLevel && level !== null) {
                    update.system = fu.mergeObject(update.system, { level: { value: level } });
                }
                data.itemUpdates.push(update);
            } else if (!existing) {
                const source = await this.#createItem(this.itemUUID, level);
                if (source) {
                    source.system.quantity = value;
                    data.itemCreates.push(source);
                }
            }
        } else {
            // update all rule elements with this same resource
            const allRules = this.actor.rules.filter(
                (r): r is SpecialResourceRuleElement => r.key === "SpecialResource" && r.slug === this.slug,
            );
            data.itemUpdates.push(...createBatchRuleElementUpdate(allRules, { value }));
        }

        if (save) {
            await applyActorUpdate(this.actor, data, { render });
        } else {
            return data;
        }
    }

    /** If an item uuid is specified, create it when this resource is first attached */
    override async preCreate({ tempItems, pendingItems }: RuleElementPF2e.PreCreateParams): Promise<void> {
        if (!this.test()) return;

        if (this.itemUUID) {
            // For pre creation, we don't really know the true priority. Assume it is the better between this and existing
            const key = sluggify(this.slug, { camel: "dromedary" });
            const thisMax = Number(this.resolveValue(this.max));
            this.max = Math.floor(Math.max(thisMax, this.actor.system.resources[key]?.max ?? 0));

            const uuid = this.resolveInjectedProperties(this.itemUUID);
            const level = this.level === null ? null : Number(this.resolveValue(this.level));
            const existingItem = this.actor.items.find((i) => i.sourceId === uuid);
            const existingTempItem = tempItems.find((i) => i.sourceId === uuid);
            if (existingTempItem) {
                const existingTempSource = pendingItems.find((i) => i._id === existingTempItem.id);
                if (existingTempSource && typeof level === "number") {
                    existingTempSource.system.level = { value: level };
                }
            } else if (!existingItem && uuid) {
                const source = await this.#createItem(uuid, level);
                if (source) {
                    const item = new ItemProxyPF2e(fu.deepClone(source), { parent: this.actor });
                    tempItems.push(item);
                    pendingItems.push(source);
                }
            } else if (typeof level === "number") {
                await existingItem?.update({ "system.level.value": level });
            }
        }
    }

    /** Treat special resources as upgrades during the AELike phase */
    override onApplyActiveEffects(): void {
        if (!this.test()) {
            this.ignored = true;
            return;
        }

        // Keep a record of the resource for blacklisting and redirection purposes
        // Also prepare a basic version for active effect like modification
        const key = sluggify(this.slug, { camel: "dromedary" });
        this.max = Number(this.resolveValue(this.max));
        if (!(key in this.actor.synthetics.resources)) {
            this.actor.synthetics.resources[key] = this;
            this.actor.system.resources[key] = fu.mergeObject(this.actor.system.resources[key] ?? {}, {
                value: 0,
                max: this.max,
            });
        } else {
            const existing = this.actor.system.resources[key];
            if (existing) {
                this.max = existing.max = Math.floor(Math.max(this.max, existing.max ?? 0));
            }
        }
    }

    /** Finish initializing the special resource, flooring values and assigning the value. If its from an item, use as the source of truth */
    override beforePrepareData(): void {
        if (this.ignored) return;

        const existing = this.actor.system.resources[sluggify(this.slug, { camel: "dromedary" })];
        if (existing) {
            const max = Math.floor(existing.max ?? 0);
            this.max = existing.max = max;
            const rawValue = this.itemUUID
                ? (this.actor.inventory.find((i) => i.sourceId === this.itemUUID)?.quantity ?? 0)
                : this.value;
            this.value = existing.value = Math.min(rawValue ?? max, max);
        } else {
            this.failValidation(`Missing resource system data for resource ${this.slug}`);
        }
    }

    async #createItem(uuid: string, level: number | null): Promise<PhysicalItemSource | null> {
        const grantedItem: ClientDocument | null = await (async () => {
            try {
                return (await fromUuid(uuid))?.clone() ?? null;
            } catch (error) {
                console.error(error);
                return null;
            }
        })();

        // todo: set grant item flags
        if (grantedItem instanceof PhysicalItemPF2e) {
            const grantedSource = grantedItem.toObject();
            grantedSource._id = fu.randomID();
            grantedSource.system.quantity = this.max;
            if (typeof level === "number") {
                grantedSource.system.level.value = level;
            }
            return grantedSource;
        } else {
            this.failValidation("itemUUID must refer to a physical item");
            return null;
        }
    }
}

interface SpecialResourceRuleElement
    extends RuleElementPF2e<SpecialResourceSchema>,
        Omit<ModelPropsFromSchema<SpecialResourceSchema>, "label"> {
    slug: string;
    max: number;
    get actor(): CreaturePF2e;
}

type SpecialResourceSource = RuleElementSource & {
    value?: unknown;
    max?: unknown;
    itemUUID?: unknown;
    level?: unknown;
};

type SpecialResourceSchema = RuleElementSchema & {
    /** Current value. If not set, defaults to null */
    value: fields.NumberField<number, number, false, false>;
    /** The maximum value attainable for this resource. */
    max: ResolvableValueField<true, false>;
    /** If this represents a physical resource, the UUID of the item to create */
    itemUUID: fields.DocumentUUIDField<ItemUUID, false, false, false>;
    /** If itemUUID exists, determines the level of the granted item */
    level: ResolvableValueField<false, true, true>;
};

interface SpecialResourceUpdateOptions {
    save?: boolean;
    render?: boolean;
    /** If set to true, updates the level if its an existing item */
    checkLevel?: boolean;
}

export { SpecialResourceRuleElement };
export type { SpecialResourceSource };
