import { ActorPF2e } from "@actor";
import { ConditionPF2e } from "@item";
import { ConditionSource } from "@item/condition/data.ts";
import { ConditionSlug } from "@item/condition/types.ts";
import { TokenPF2e } from "@module/canvas/index.ts";
import { ErrorPF2e, localizer, setHasElement, sluggify, tupleHasValue } from "@util";
import { CONDITION_SLUGS } from "@item/condition/values.ts";

/** A helper class to manage PF2e Conditions */
export class ConditionManager {
    static #initialized = false;

    static conditions: Map<ConditionSlug | ItemUUID, ConditionPF2e<null>> = new Map();

    private static CONDITION_SOURCES?: ConditionSource[] = CONDITION_SOURCES;

    /** Gets a list of condition slugs. */
    static get conditionsSlugs(): string[] {
        return [...this.conditions.keys()].filter((k) => !k.startsWith("Compendium."));
    }

    static async initialize(force = false): Promise<void> {
        if (!this.#initialized) {
            this.conditions = new Map(
                this.CONDITION_SOURCES?.flatMap((source) => {
                    const condition: ConditionPF2e<null> = new ConditionPF2e(source, { pack: "pf2e.conditionitems" });
                    return [
                        [condition.slug, condition],
                        [condition.uuid, condition],
                    ];
                }) ?? [],
            );
            delete this.CONDITION_SOURCES;
        }

        if ((!this.#initialized || force) && game.i18n.lang !== "en" && game.modules.get("babele")?.active) {
            const localize = localizer("PF2E.condition");
            for (const condition of this.conditions.values()) {
                condition.name = condition._source.name = localize(`${condition.slug}.name`);
                condition.system.description.value = condition._source.system.description.value = localize(
                    `${condition.slug}.rules`,
                );
            }
        }
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
        value: number,
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
}
