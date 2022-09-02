import { ConditionSlug, ConditionSource } from "@item/condition/data";
import { ConditionPF2e } from "@item";
import { ActorPF2e } from "@actor";
import { TokenPF2e } from "@module/canvas";
import { ConditionReference, FlattenedCondition } from "./types";
import { ErrorPF2e, setHasElement, sluggify, tupleHasValue } from "@util";
import { CONDITION_SLUGS } from "@actor/values";

/** A helper class to manage PF2e Conditions */
export class ConditionManager {
    static #initialized = false;

    static conditions: Map<ConditionSlug, ConditionPF2e> = new Map();

    /** Gets a list of condition slugs. */
    static get conditionsSlugs(): string[] {
        return [...this.conditions.keys()];
    }

    static async initialize(force = false): Promise<void> {
        if (this.#initialized && !force) return;

        type ConditionCollection = CompendiumCollection<ConditionPF2e>;
        const content = await game.packs.get<ConditionCollection>("pf2e.conditionitems")?.getDocuments();
        const entries = content?.map((c): [ConditionSlug, ConditionPF2e] => [c.slug, c]) ?? [];
        this.conditions = new Map(entries);
        this.#initialized = true;
    }

    /**
     * Get a condition using the condition name.
     * @param slug A condition slug
     */
    static getCondition(slug: ConditionSlug, modifications?: DeepPartial<ConditionSource>): ConditionPF2e;
    static getCondition(slug: string, modifications?: DeepPartial<ConditionSource>): ConditionPF2e | null;
    static getCondition(slug: string, modifications: DeepPartial<ConditionSource> = {}): ConditionPF2e | null {
        slug = sluggify(slug);
        if (!setHasElement(CONDITION_SLUGS, slug)) return null;

        const condition = ConditionManager.conditions.get(slug)?.clone(modifications);
        if (!condition) throw ErrorPF2e("Unexpected failure looking up condition");

        return condition;
    }

    /**
     * Adds a condition to a token.
     * @param name  A collection of conditions to retrieve modifiers from.
     * @param token The token to add the condition to.
     */
    static addConditionToToken(name: string | ConditionSource, token: TokenPF2e): Promise<ConditionPF2e | null>;
    static addConditionToToken(name: string | ConditionSource, actor: ActorPF2e): Promise<ConditionPF2e | null>;
    static addConditionToToken(
        name: string | ConditionSource,
        actorOrToken: ActorPF2e | TokenPF2e
    ): Promise<ConditionPF2e | null>;
    static async addConditionToToken(
        name: string | ConditionSource,
        actorOrToken: ActorPF2e | TokenPF2e
    ): Promise<ConditionPF2e | null> {
        const actor = actorOrToken instanceof ActorPF2e ? actorOrToken : actorOrToken.actor;
        const conditionSource = typeof name === "string" ? this.getCondition(name)?.toObject() : name;
        if (!conditionSource) throw ErrorPF2e("Unexpected error retrieving condition");

        return actor ? this.createConditions(conditionSource, actor) : null;
    }

    /**
     * A convience alias for adding a condition to an actor
     * @param name  A collection of conditions to retrieve modifiers from.
     * @param actor The actor to add the condition to.
     */
    static async addConditionToActor(name: string | ConditionSource, actor: ActorPF2e): Promise<ConditionPF2e | null> {
        return this.addConditionToToken(name, actor);
    }

    private static async createConditions(source: ConditionSource, actor: ActorPF2e): Promise<ConditionPF2e | null> {
        const exists = actor.itemTypes.condition.some(
            (c) => c.slug === source.system.slug && c.system.references.parent === source.system.references.parent
        );
        if (exists) return null;

        source._id = randomID();
        const sources = [source, ...this.createAdditionallyAppliedConditions(source, actor)];
        await actor.createEmbeddedDocuments("Item", sources, { keepId: true });
        return actor.itemTypes.condition.find((condition) => condition.id === source._id) ?? null;
    }

    private static createAdditionallyAppliedConditions(
        baseCondition: ConditionSource,
        actor: ActorPF2e
    ): ConditionSource[] {
        const conditionsToCreate: ConditionSource[] = [];

        for (const linked of baseCondition.system.alsoApplies.linked) {
            const conditionSource = this.getCondition(linked.condition).toObject();
            if (linked.value) {
                conditionSource.system.value.value = linked.value;
            }
            conditionSource._id = randomID(16);
            conditionSource.system.references.parent = { id: baseCondition._id, type: "condition" };
            baseCondition.system.references.children.push({ id: conditionSource._id, type: "condition" });
            conditionSource.system.sources.hud = baseCondition.system.sources.hud;

            // Add linked condition to the list of items to create
            conditionsToCreate.push(conditionSource);
            // Add conditions that are applied by the previously added linked condition
            conditionsToCreate.push(...this.createAdditionallyAppliedConditions(conditionSource, actor));
        }

        for (const unlinked of baseCondition.system.alsoApplies.unlinked) {
            const conditionSource = this.getCondition(unlinked.condition).toObject();

            // Unlinked conditions can be abandoned, so we need to prevent duplicates
            const exists = actor.itemTypes.condition.some((c) => c.system.slug === conditionSource.system.slug);
            if (exists) continue;

            if (unlinked.value) {
                conditionSource.name = `${conditionSource.name} ${conditionSource.system.value.value}`;
                conditionSource.system.value.value = unlinked.value;
            }
            conditionSource._id = randomID(16);
            conditionSource.system.sources.hud = baseCondition.system.sources.hud;

            // Add unlinked condition to the list of items to create
            conditionsToCreate.push(conditionSource);
            // Add conditions that are applied by the previously added condition
            conditionsToCreate.push(...this.createAdditionallyAppliedConditions(conditionSource, actor));
        }

        return conditionsToCreate;
    }

    /**
     * Removes a condition from a token.
     * @param name  A collection of conditions to retrieve modifiers from.
     * @param token The token to add the condition to.
     */
    static removeConditionFromToken(itemId: string | string[], token: TokenPF2e): Promise<void>;
    static removeConditionFromToken(itemId: string | string[], actor: ActorPF2e): Promise<void>;
    static removeConditionFromToken(itemId: string | string[], actorOrToken: ActorPF2e | TokenPF2e): Promise<void>;
    static async removeConditionFromToken(
        itemId: string | string[],
        actorOrToken: ActorPF2e | TokenPF2e
    ): Promise<void> {
        const itemIds = Array.isArray(itemId) ? itemId : [itemId];
        const actor = actorOrToken instanceof ActorPF2e ? actorOrToken : actorOrToken.actor;
        if (actor) {
            await this.deleteConditions(itemIds, actor);
        }
    }

    /** A convenience alias for removing a condition from an actor */
    static async removeConditionFromActor(itemId: string | string[], actor: ActorPF2e): Promise<void> {
        return this.removeConditionFromToken(itemId, actor);
    }

    private static async deleteConditions(itemIds: string[], actor: ActorPF2e): Promise<ConditionPF2e[]> {
        const list: string[] = [];
        const stack = [...itemIds];
        while (stack.length) {
            const id = stack.pop() ?? "";
            const condition = actor.items.get(id);

            if (condition?.isOfType("condition")) {
                list.push(id);
                condition.system.references.children.forEach((child) => stack.push(child.id));
            }
        }

        return ConditionPF2e.deleteDocuments(list, { parent: actor });
    }

    static updateConditionValue(itemId: string, actor: ActorPF2e, value: number): Promise<void>;
    static updateConditionValue(itemId: string, token: TokenPF2e, value: number): Promise<void>;
    static updateConditionValue(itemId: string, actorOrToken: ActorPF2e | TokenPF2e, value: number): Promise<void>;
    static async updateConditionValue(
        itemId: string,
        actorOrToken: ActorPF2e | TokenPF2e,
        value: number
    ): Promise<void> {
        const actor = actorOrToken instanceof ActorPF2e ? actorOrToken : actorOrToken.actor;
        const condition = actor?.items.get(itemId);

        if (condition?.isOfType("condition") && actor) {
            if (value === 0) {
                // Value is zero, remove the status.
                await this.deleteConditions([itemId], actor);
            } else {
                // Cap the value if its a capped condition
                const cappedConditions = ["dying", "wounded", "doomed"] as const;
                if (actor.isOfType("creature") && tupleHasValue(cappedConditions, condition.slug)) {
                    value = Math.min(value, actor.attributes[condition.slug].max);
                }

                // Apply new value.
                await condition.update({ "system.value.value": value });
            }
        }
    }

    static getFlattenedConditions(items: ConditionPF2e[]): FlattenedCondition[] {
        const conditions: Map<string, FlattenedCondition> = new Map();

        for (const condition of items.sort(this.sortConditions)) {
            // Sorted list of conditions.
            // First by active, then by base (lexicographically), then by value (descending).

            const flattened = conditions.get(condition.slug) ?? {
                id: condition.id,
                badge: condition.badge,
                active: condition.isActive,
                name: condition.name,
                value: condition.value,
                description: condition.description,
                img: condition.img,
                references: false,
                locked: false,
                parents: [],
                children: [],
                overrides: [],
                overriddenBy: [],
                immunityFrom: [],
            };
            if (!condition.isActive && conditions.has(condition.slug)) {
                continue;
            }

            conditions.set(condition.slug, flattened);

            // Update any references
            const systemData = condition.system;
            if (systemData.references.parent) {
                const refCondition = items.find((other) => other.id === systemData.references.parent?.id);

                if (refCondition) {
                    const ref: ConditionReference = {
                        id: systemData.references.parent,
                        name: refCondition.name,
                        base: refCondition.slug,
                        text: "",
                    };

                    if (refCondition.value) {
                        ref.name = `${ref.name} ${refCondition.value}`;
                    }

                    const compendiumLink = refCondition.sourceId?.replace(/^Compendium\./, "");
                    ref.text = compendiumLink ? `@Compendium[${compendiumLink}]` : "";

                    flattened.references = true;
                    flattened.locked = true;
                    flattened.parents.push(ref);
                }
            }

            for (const childRef of systemData.references.children) {
                const refCondition = items.find((other) => other.id === childRef.id);

                if (refCondition) {
                    const ref: ConditionReference = {
                        id: systemData.references.parent,
                        name: refCondition.name,
                        base: refCondition.slug,
                        text: "",
                    };

                    if (refCondition.value) {
                        ref.name = `${ref.name} ${refCondition.value}`;
                    }

                    const compendiumLink = refCondition.sourceId?.replace(/^Compendium\./, "");
                    ref.text = compendiumLink ? `@Compendium[${compendiumLink}]` : "";

                    flattened.references = true;
                    flattened.children.push(ref);
                }
            }

            for (const overriddenByRef of systemData.references.overrides) {
                const refCondition = items.find((other) => other.id === overriddenByRef.id);

                if (refCondition) {
                    const ref = {
                        id: systemData.references.parent,
                        name: refCondition.name,
                        base: refCondition.slug,
                        text: "",
                    };

                    if (refCondition.value) {
                        ref.name = `${ref.name} ${refCondition.value}`;
                    }

                    const compendiumLink = refCondition.sourceId?.replace(/^Compendium\./, "");
                    ref.text = compendiumLink ? `@Compendium[${compendiumLink}]` : "";

                    flattened.references = true;
                    flattened.overrides.push(ref);
                }
            }

            for (const overriderRef of systemData.references.overriddenBy) {
                const refCondition = items.find((other) => other.id === overriderRef.id);

                if (refCondition) {
                    const ref = {
                        id: systemData.references.parent,
                        name: refCondition.name,
                        base: refCondition.slug,
                        text: "",
                    };

                    if (refCondition.value) {
                        ref.name = `${ref.name} ${refCondition.value}`;
                    }

                    const compendiumLink = refCondition.sourceId?.replace(/^Compendium\./, "");
                    ref.text = compendiumLink ? `@Compendium[${compendiumLink}]` : "";

                    flattened.references = true;
                    flattened.overriddenBy.push(ref);
                }
            }

            for (const immuneToRef of systemData.references.immunityFrom) {
                const refCondition = items.find((other) => other.id === immuneToRef.id);

                if (refCondition) {
                    const ref = {
                        id: systemData.references.parent,
                        name: refCondition.name,
                        base: refCondition.slug,
                        text: "",
                    };

                    if (refCondition.value) {
                        ref.name = `${ref.name} ${refCondition.value}`;
                    }

                    const compendiumLink = refCondition.sourceId?.replace(/^Compendium\./, "");
                    ref.text = compendiumLink ? `@Compendium[${compendiumLink}]` : "";

                    flattened.references = true;
                    flattened.immunityFrom.push(ref);
                }
            }
        }

        return Array.from(conditions.values());
    }

    private static sortConditions(conditionA: ConditionPF2e, conditionB: ConditionPF2e): number {
        return conditionA.slug === conditionB.slug
            ? conditionA.isActive
                ? -1
                : 1
            : conditionA.name.localeCompare(conditionB.name, game.i18n.lang);
    }
}
