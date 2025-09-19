import type { ActorPF2e, ActorType, CreaturePF2e } from "@actor";
import type { CharacterResources } from "@actor/character/data.ts";
import { CORE_RESOURCES } from "@actor/character/values.ts";
import { applyActorGroupUpdate, createActorGroupUpdate } from "@actor/helpers.ts";
import type { ActorGroupUpdate } from "@actor/types.ts";
import type { ItemUUID } from "@client/documents/_module.d.mts";
import type Document from "@common/abstract/document.d.mts";
import { ItemPF2e, ItemProxyPF2e, PhysicalItemPF2e } from "@item";
import type { PhysicalItemSource } from "@item/base/data/index.ts";
import { AnyChoiceField } from "@system/schema-data-fields.ts";
import { sluggify } from "@util";
import { createBatchRuleElementUpdate } from "../helpers.ts";
import { RuleElement, type RuleElementOptions } from "./base.ts";
import {
    ModelPropsFromRESchema,
    ResolvableValueField,
    type RuleElementSchema,
    type RuleElementSource,
} from "./data.ts";
import fields = foundry.data.fields;

const INVALID_RESOURCES: (keyof CharacterResources)[] = [...CORE_RESOURCES, "crafting", "infusedReagents"];

class SpecialResourceRuleElement extends RuleElement<SpecialResourceSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

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

        // If unset, set to 0 for now. It'll gain an actual value during beforeCreateData()
        this.value ??= 0;
    }

    static override defineSchema(): SpecialResourceSchema {
        return {
            ...super.defineSchema(),
            value: new fields.NumberField({ required: true, nullable: true, initial: null }),
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
            renew: new AnyChoiceField({
                required: false,
                nullable: false,
                choices: ["daily", false],
                initial: "daily",
            }),
        };
    }

    /** Updates the remaining number of this resource. Where it updates depends on the type */
    async update(value: number, options: { save: false; checkLevel?: boolean }): Promise<ActorGroupUpdate>;
    async update(value: number, options?: { save?: true; render?: boolean; checkLevel?: boolean }): Promise<void>;
    async update(
        value: number,
        { save = true, render = true, checkLevel = false }: SpecialResourceUpdateOptions = {},
    ): Promise<void | ActorGroupUpdate> {
        const data = createActorGroupUpdate();

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
            await applyActorGroupUpdate(this.actor, data, { render });
        } else {
            return data;
        }
    }

    /** Returns data that when applied updates this resources uses based on renewal rules */
    async renewUses(duration: "turn" | "round" | "day"): Promise<ActorGroupUpdate> {
        if (duration === "day" && this.renew !== false) {
            return this.update(this.max, { save: false, checkLevel: true });
        }
        return createActorGroupUpdate();
    }

    /** If an item uuid is specified, create it when this resource is first attached */
    override async preCreate({ tempItems, pendingItems }: RuleElement.PreCreateParams): Promise<void> {
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
                    const item = new ItemProxyPF2e(fu.deepClone(source), { parent: this.actor }) as ItemPF2e<ActorPF2e>;
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
                : (this._source.value ?? max);
            this.value = existing.value = Math.min(rawValue, max);
        } else {
            this.failValidation(`Missing resource system data for resource ${this.slug}`);
        }
    }

    async #createItem(uuid: string, level: number | null): Promise<PhysicalItemSource | null> {
        const grantedItem: Document | null = await (async () => {
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
    extends RuleElement<SpecialResourceSchema>,
        ModelPropsFromRESchema<SpecialResourceSchema> {
    slug: string;
    max: number;
    value: number;
    get actor(): CreaturePF2e;
}

type SpecialResourceSource = RuleElementSource & {
    value?: unknown;
    max?: unknown;
    itemUUID?: unknown;
    level?: unknown;
    renew?: unknown;
};

type SpecialResourceSchema = RuleElementSchema & {
    /** Current value. If not set, defaults to null */
    value: fields.NumberField<number, number, true, true, true>;
    /** The maximum value attainable for this resource. */
    max: ResolvableValueField<true, false>;
    /** If this represents a physical resource, the UUID of the item to create */
    itemUUID: fields.DocumentUUIDField<ItemUUID, false, false, false>;
    /** If itemUUID exists, determines the level of the granted item */
    level: ResolvableValueField<false, true, true>;
    /** Determines if the resource is rewnewable. Defaults to "daily" */
    renew: AnyChoiceField<false | "daily", false, false>;
};

interface SpecialResourceUpdateOptions {
    save?: boolean;
    render?: boolean;
    /** If set to true, updates the level if its an existing item */
    checkLevel?: boolean;
}

export { SpecialResourceRuleElement };
export type { SpecialResourceSource };
