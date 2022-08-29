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
     * Takes a list of valued conditions with the same base and selects the highest value.
     * @param sources A filtered list of conditions with the same base name.
     * @param updates    A running list of updates to make to embedded items.
     */
    private static processValuedCondition(
        sources: ConditionSource[],
        updates: Map<string, ConditionSource>
    ): ConditionSource {
        let applied: ConditionSource | null = null;

        for (const source of sources) {
            if (!applied || Number(source.system.value.value) > Number(applied.system.value.value)) {
                // First condition, or new max achieved.

                if (!source.system.active) {
                    // New MAX is inactive, neet to make it active.
                    const update = updates.get(source._id) ?? source;
                    update.system.active = true;
                    updates.set(update._id, update);
                }

                if (applied) {
                    // Only fix appliedCondition on n+1 iterations.

                    if (applied.system.active) {
                        // Condition came in active, need to deactivate it.

                        const update = updates.get(applied._id) ?? source;
                        update.system.active = false;
                        updates.set(update._id, update);
                    } else {
                        // Came in inactive, but became applied for a time,
                        // which means we created an update for it we must delete.

                        updates.delete(applied._id);
                    }
                }

                applied = source;
            } else if (source.system.active) {
                // Not new max, but was active.
                const update = updates.get(source._id) ?? source;
                update.system.active = false;
                updates.set(update._id, update);
            }

            this.clearOverrides(source, updates);
        }

        if (!applied) throw ErrorPF2e("Unexpected error processing condition override");

        return applied;
    }

    /**
     * Takes a list of toggle conditions with the same base and selects the first.
     *
     * @param sources A filtered list of conditions with the same base name.
     * @param updates A running list of updates to make to embedded items.
     */
    private static processToggleCondition(
        sources: ConditionSource[],
        updates: Map<string, ConditionSource>
    ): ConditionSource {
        let applied: ConditionSource | null = null;

        for (const source of sources) {
            // Set the appliedCondition the first condition we see.
            applied ??= source;

            if (source._id === applied._id && !source.system.active) {
                // Is the applied condition and not active
                const update = updates.get(source._id) ?? source;
                update.system.active = true;
                updates.set(update._id, update);
            } else if (source._id !== applied._id && source.system.active) {
                // Is not the applied condition and is active
                const update = updates.get(source._id) ?? source;
                update.system.active = false;
                updates.set(update._id, update);
            }

            this.clearOverrides(source, updates);
        }
        if (!applied) throw ErrorPF2e("Unexpected error processing condition toggle");

        return applied;
    }

    /**
     * Clears any overrides from a condition.
     *
     * @param source The condition to check, and remove, any overrides.
     * @param updates   A running list of updates to make to embedded items.
     */
    private static clearOverrides(source: ConditionSource, updates: Map<string, ConditionSource>): void {
        if (source.system.references.overrides.length) {
            // Clear any overrides
            const update = updates.get(source._id) ?? source;
            update.system.references.overrides.splice(0, update.system.references.overriddenBy.length);
            updates.set(update._id, update);
        }

        if (source.system.references.overriddenBy.length) {
            // Was previous overridden.  Remove it for now.
            const update = updates.get(source._id) ?? source;
            update.system.references.overriddenBy.splice(0, update.system.references.overriddenBy.length);
            updates.set(update._id, update);
        }
    }

    private static processOverride(
        overridden: ConditionSource,
        overrider: ConditionSource,
        updates: Map<string, ConditionSource>
    ) {
        if (overridden.system.active) {
            // Condition was active.  Deactivate it.

            const update = updates.get(overridden._id) ?? duplicate(overridden);
            update.system.active = false;

            updates.set(update._id, update);
        }

        if (!overridden.system.references.overriddenBy.some((i) => i.id === overrider._id)) {
            // Condition doesn't have overrider as part of overridenBy list.

            const update = updates.get(overridden._id) ?? duplicate(overridden);
            update.system.references.overriddenBy.push({ id: overrider._id, type: "condition" });
            updates.set(update._id, update);
        }

        if (!overrider.system.references.overrides.some((i) => i.id === overridden._id)) {
            // Overrider does not have overriden condition in overrides list.

            const update = updates.get(overrider._id) ?? duplicate(overrider);
            update.system.references.overrides.push({ id: overridden._id, type: "condition" });
            updates.set(update._id, update);
        }
    }

    private static processConditions(actor: ActorPF2e): Promise<void>;
    private static processConditions(token: TokenPF2e): Promise<void>;
    private static processConditions(actorOrToken: ActorPF2e | TokenPF2e): Promise<void>;
    private static async processConditions(actorOrToken: ActorPF2e | TokenPF2e): Promise<void> {
        const actor = actorOrToken instanceof ActorPF2e ? actorOrToken : actorOrToken.actor;
        const conditions = actor?.itemTypes.condition.map((condition) => condition._source) ?? [];

        // Any updates to items go here.
        const updates = new Map<string, ConditionSource>();

        // Map of applied conditions.
        const appliedConditions: Map<string, ConditionSource> = new Map();

        const slugSet = new Set<ConditionSlug>();

        // A list of overrides seen.
        const overriding: ConditionSlug[] = [];

        for (const condition of conditions) {
            if (!slugSet.has(condition.system.slug)) {
                // Have not seen this base condition before.
                const slug = condition.system.slug;
                slugSet.add(slug);

                // List of conditions with the same base.
                const list = conditions.filter((c) => c.system.slug === slug);

                let appliedCondition: ConditionSource;

                if (ConditionManager.getCondition(slug).value) {
                    // Condition is normally valued.
                    appliedCondition = this.processValuedCondition(list, updates);
                } else {
                    // Condition is not valued.
                    appliedCondition = this.processToggleCondition(list, updates);
                }

                appliedConditions.set(slug, appliedCondition);

                if (appliedCondition.system.overrides.length) {
                    overriding.push(slug);
                }
            }
        }

        // Iterate the overriding bases.
        for (const slug of overriding) {
            // Make sure to get the most recent version of a condition.
            const overrider = updates.get(appliedConditions.get(slug)?._id ?? "") ?? appliedConditions.get(slug);
            if (!overrider) continue;

            // Iterate the condition's overrides.
            for (const overriddenBase of overrider?.system.overrides ?? []) {
                const overriddenSlug = sluggify(overriddenBase);
                if (appliedConditions.has(overriddenSlug)) {
                    // `appliedConditions` has a condition that needs to be overridden

                    // Remove the condition from applied.
                    appliedConditions.delete(overriddenSlug);

                    // Ensure all copies of overridden base are updated.
                    for (const source of conditions.filter((c) => c.system.slug === overriddenBase)) {
                        // List of conditions that have been overridden.
                        const overridden = updates.get(source._id) ?? source;
                        this.processOverride(overridden, overrider, updates);
                    }
                }
            }
        }

        // Make sure to update any items that need updating.
        if (updates.size) {
            await actor?.updateEmbeddedDocuments("Item", Array.from(updates.values()));
        }
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

        if (actor) {
            const condition = await this.createConditions(conditionSource, actor);
            if (condition) this.processConditions(actor);
            return condition;
        }

        return null;
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
            const deleted = await this.deleteConditions(itemIds, actor);
            if (deleted.length > 0) this.processConditions(actor);
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
    static async updateConditionValue(itemId: string, actorOrToken: ActorPF2e | TokenPF2e, value: number) {
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
                console.debug(`PF2e System | Setting condition '${condition.name}' to ${value}.`);
            }

            await this.processConditions(actor);
        }
    }

    static getFlattenedConditions(items: ConditionPF2e[]): FlattenedCondition[] {
        const conditions: Map<string, FlattenedCondition> = new Map();

        for (const condition of items.sort(this.sortCondition)) {
            // Sorted list of conditions.
            // First by active, then by base (lexicographically), then by value (descending).

            const name = condition.value ? `${condition.name} ${condition.value}` : condition.name;
            const flattened = conditions.get(name) ?? {
                id: condition.id,
                badge: condition.badge,
                active: condition.isActive,
                name,
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
            conditions.set(name, flattened);

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

    private static sortCondition(conditionA: ConditionPF2e, conditionB: ConditionPF2e): number {
        if (conditionA.slug === conditionB.slug) {
            // Both are active or both inactive.

            if (conditionA.slug === conditionB.slug) {
                // Both are same base

                if (conditionA.value && conditionB.value) {
                    // Valued condition
                    // Sort values by descending order.
                    return conditionB.value - conditionA.value;
                } else {
                    // Not valued condition
                    return 0;
                }
            } else {
                // Different bases
                return conditionA.slug.localeCompare(conditionB.slug);
            }
        } else if (conditionA.isActive && !conditionB.isActive) {
            // A is active, B is not
            // A should be before B.
            return -1;
        } else if (!conditionA.isActive && conditionB.isActive) {
            // B is active, A is not
            // Be should be before A.
            return 1;
        }

        return 0;
    }
}
