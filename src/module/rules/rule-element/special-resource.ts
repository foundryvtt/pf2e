import type { ActorType, CreaturePF2e } from "@actor";
import type { CharacterResources } from "@actor/character/data.ts";
import { applyActorUpdate } from "@actor/helpers.ts";
import type { ActorCommitData } from "@actor/types.ts";
import { PhysicalItemPF2e } from "@item";
import type { PhysicalItemSource } from "@item/base/data/index.ts";
import { sluggify } from "@util";
import type { NumberField, StringField } from "types/foundry/common/data/fields.js";
import { createBatchRuleElementUpdate } from "../helpers.ts";
import { type RuleElementOptions, RuleElementPF2e } from "./base.ts";
import { ResolvableValueField, type RuleElementSchema, type RuleElementSource } from "./data.ts";

const INVALID_RESOURCES: (keyof CharacterResources)[] = [
    "crafting",
    "focus",
    "heroPoints",
    "investiture",
    "infusedReagents",
    "resolve",
];

class SpecialResourceRuleElement extends RuleElementPF2e<SpecialResourceSchema> {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(source: SpecialResourceSource, options: RuleElementOptions) {
        super(source, options);
        if (this.invalid) return;

        this.slug ??= this.item.slug ?? sluggify(this.item.name);
        if (INVALID_RESOURCES.includes(this.slug)) {
            this.failValidation("slug: invalid value");
        }

        // Keep a record of the resource for blacklisting and redirection purposes
        // Also prepare a basic version for active effect like modification
        if (!this.ignored && !(this.slug in this.actor.synthetics.resources)) {
            this.actor.synthetics.resources[this.slug] = this;
            this.actor.system.resources[this.slug] = fu.mergeObject(this.actor.system.resources[this.slug] ?? {}, {
                value: 0,
                max: Number(this.resolveValue(this.max)) || 0,
            });
        }
    }

    /** Updates the rule element's max value to match alterations such as by ActiveEffectLike, and snapshots the resolved value */
    #updateMax() {
        const thisMax = Number(this.resolveValue(this.max));
        const existingMax = this.actor.system.resources[this.slug]?.max ?? 0;
        this.max = Math.max(thisMax, existingMax);
    }

    /** Updates the remaining number of this resource. Where it updates depends on the type */
    async update(value: number, options: { save: false }): Promise<ActorCommitData>;
    async update(value: number, options?: { save?: true }): Promise<void>;
    async update(value: number, { save = true }: { save?: boolean } = {}): Promise<void | ActorCommitData> {
        const data: ActorCommitData<CreaturePF2e> = {
            actorUpdates: null,
            itemCreates: [],
            itemUpdates: [],
        };

        if (this.itemUUID) {
            // Find an existing item to update or create a new one
            const uuid = this.resolveInjectedProperties(this.itemUUID);
            const existing = this.actor.items.find((i) => i.sourceId === uuid);
            if (existing) {
                if (existing.isOfType("physical") && existing.quantity !== value) {
                    data.itemUpdates.push({ _id: existing.id, system: { quantity: value } });
                }
            } else {
                const source = await this.#createItem(uuid);
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
            await applyActorUpdate(this.actor, data);
        } else {
            return data;
        }
    }

    /** If an item uuid is specified, create it */
    override async preCreate(args: RuleElementPF2e.PreCreateParams): Promise<void> {
        if (this.invalid) return;

        this.#updateMax();
        if (this.itemUUID) {
            const uuid = this.resolveInjectedProperties(this.itemUUID);
            const itemExists = this.actor.items.some((i) => i.sourceId === uuid);
            if (!itemExists && uuid) {
                const source = await this.#createItem(uuid);
                if (source) args.pendingItems.push(source);
            }
        }
    }

    async #createItem(uuid: string): Promise<PhysicalItemSource | null> {
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
            return grantedSource;
        } else {
            this.failValidation("itemUUID must refer to a physical item");
            return null;
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;
        this.#updateMax();
    }

    override afterPrepareData(): void {
        if (this.ignored) return;

        const max = this.actor.system.resources[this.slug]?.max ?? 0;
        const initial = this.initial ?? max;

        const actor = this.actor;
        this.value = Math.min(this.value ?? initial, max);
        const existing = actor.system.resources[this.slug];
        if (existing) {
            existing.value = this.value;
            existing.max = Math.max(max, existing.max);
        }
    }

    static override defineSchema(): SpecialResourceSchema {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            initial: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
            value: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
            max: new ResolvableValueField({ required: true, nullable: false }),
            itemUUID: new fields.StringField({
                required: false,
                nullable: false,
                blank: false,
                initial: undefined,
                label: "PF2E.UUID.Label",
            }),
        };
    }
}

interface SpecialResourceRuleElement
    extends RuleElementPF2e<SpecialResourceSchema>,
        Omit<ModelPropsFromSchema<SpecialResourceSchema>, "label"> {
    slug: string;
    max: number;
    get actor(): CreaturePF2e;
}

type SpecialResourceSource = RuleElementSource & { value?: unknown };

type SpecialResourceSchema = RuleElementSchema & {
    /** The initial value of this resource. Defaults to max if there is a max, otherwise 0 */
    initial: NumberField<number, number, false, false>;
    /** Current value. If not set, defaults to null */
    value: NumberField<number, number, false, false>;
    /** The maximum value attainable for this resource. */
    max: ResolvableValueField<true, false>;
    /** If this represents a physical resource, the UUID of the item to create */
    itemUUID: StringField<string, string, false, false, false>;
};

export { SpecialResourceRuleElement };
