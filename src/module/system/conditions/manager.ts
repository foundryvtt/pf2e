import { ActorPF2e } from "@actor";
import { ConditionPF2e } from "@item";
import { ConditionSource } from "@item/condition/data.ts";
import { ConditionSlug } from "@item/condition/types.ts";
import { TokenPF2e } from "@module/canvas/index.ts";
import { ErrorPF2e, setHasElement, sluggify, tupleHasValue } from "@util";
import { ConditionReference, FlattenedCondition } from "./types.ts";
import { CONDITION_SLUGS } from "@item/condition/values.ts";

/** A helper class to manage PF2e Conditions */
export class ConditionManager {
    static #initialized = false;

    static conditions: Map<ConditionSlug | ItemUUID, ConditionPF2e<null>> = new Map();

    /** Gets a list of condition slugs. */
    static get conditionsSlugs(): string[] {
        return [...this.conditions.keys()];
    }

    static async initialize(force = false): Promise<void> {
        if (this.#initialized && !force) return;

        type ConditionCollection = CompendiumCollection<ConditionPF2e<null>>;
        const content = (await game.packs.get<ConditionCollection>("pf2e.conditionitems")?.getDocuments()) ?? [];
        const entries = [
            ...content.map((c): [ConditionSlug, ConditionPF2e<null>] => [c.slug, c]),
            ...content.map((c): [ItemUUID, ConditionPF2e<null>] => [c.uuid, c]),
        ];
        this.conditions = new Map(entries);
        this.#initialized = true;
    }

    /**
     * Get a condition using the condition name.
     * @param slug A condition slug
     */
    static getCondition(slug: ConditionSlug, modifications?: DeepPartial<ConditionSource>): ConditionPF2e<null>;
    static getCondition(slug: string, modifications?: DeepPartial<ConditionSource>): ConditionPF2e<null> | null;
    static getCondition(slug: string, modifications: DeepPartial<ConditionSource> = {}): ConditionPF2e<null> | null {
        slug = sluggify(slug);
        if (!setHasElement(CONDITION_SLUGS, slug)) return null;

        const condition = ConditionManager.conditions.get(slug)?.clone(modifications);
        if (!condition) throw ErrorPF2e("Unexpected failure looking up condition");

        return condition;
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

        if (condition?.isOfType("condition")) {
            if (value === 0) {
                // Value is zero, remove the condition
                await condition.delete();
            } else if (actor?.isOfType("creature")) {
                // Cap the value if a capped condition
                const cappedConditions = ["dying", "wounded", "doomed"] as const;
                if (tupleHasValue(cappedConditions, condition.slug)) {
                    value = Math.min(value, actor.attributes[condition.slug].max);
                }
                await condition.update({ "system.value.value": value });
            }
        }
    }

    static getFlattenedConditions(actor: ActorPF2e): FlattenedCondition[] {
        const items = actor.conditions.active;
        const flatteneds: Map<string, FlattenedCondition> = new Map();

        for (const condition of items.sort(this.#sortConditions)) {
            // Sorted list of conditions.
            // First by active, then by base (lexicographically), then by value (descending).

            const flattened = flatteneds.get(condition.key) ?? {
                id: condition.id,
                type: "condition",
                badge: condition.badge,
                active: condition.active,
                name: condition.name,
                slug: condition.slug,
                value: condition.value,
                description: condition.description,
                img: condition.img,
                isIdentified: condition.isIdentified,
                references: false,
                isLocked: condition.isLocked,
                temporary: condition.isTemporary,
                parents: [],
                children: [],
                overrides: [],
                overriddenBy: [],
            };

            if (!condition.active && flatteneds.has(condition.key)) {
                continue;
            }

            flatteneds.set(condition.key, flattened);

            // Update any references
            const systemData = condition.system;
            if (systemData.references.parent) {
                const appliedBy =
                    items.find((other) => other.id === systemData.references.parent?.id) ??
                    condition.actor?.items.get(systemData.references.parent.id);

                if (appliedBy) {
                    const ref: ConditionReference = {
                        id: systemData.references.parent,
                        name: appliedBy.name,
                        base: appliedBy.slug ?? sluggify(appliedBy.name),
                        text: appliedBy.sourceId ? `@UUID[${appliedBy.sourceId}]` : "",
                    };

                    flattened.references = true;
                    flattened.isLocked = true;
                    flattened.parents.push(ref);
                }
            } else if (condition.flags.pf2e.grantedBy) {
                const granter = condition.actor?.items.get(condition.flags.pf2e.grantedBy.id);
                if (granter) {
                    flattened.parents.push({
                        id: { id: granter.id, type: granter.type },
                        name: granter.name,
                        base: granter.slug ?? sluggify(granter.name),
                        text: "",
                    });
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
        }

        for (const flattened of flatteneds.values()) {
            flattened.breakdown = ((): string => {
                if (flattened.parents.length > 0) {
                    const list = Array.from(new Set(flattened.parents.map((p) => p.name)))
                        .sort((a, b) => a.localeCompare(b))
                        .join(", ");
                    return game.i18n.format("PF2E.EffectPanel.AppliedBy", { "condition-list": list });
                }

                return "";
            })();
        }

        return Array.from(flatteneds.values());
    }

    static #sortConditions(conditionA: ConditionPF2e, conditionB: ConditionPF2e): number {
        return conditionA.slug === conditionB.slug
            ? conditionA.active
                ? -1
                : 1
            : conditionA.name.localeCompare(conditionB.name, game.i18n.lang);
    }
}
