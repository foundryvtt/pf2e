import { ConditionPF2e } from "@item";
import { ConditionSlug, PersistentDamagePF2e } from "@item/condition/index.ts";
import { ActorPF2e } from "./base.ts";
import { DelegatedCollection } from "@util";

/** A wrapper for collections of conditions on an actor, filterable by whether they're active or stored/temporary */
class ActorConditions<TActor extends ActorPF2e> extends DelegatedCollection<ConditionPF2e<TActor>> {
    /** A secondary map by condition slug */
    #slugMap = new Collection<ConditionPF2e<TActor>[]>();

    /** Return an array of only active conditions */
    get active(): ConditionPF2e<TActor>[] {
        return this.filter((c) => c.active);
    }

    /** Return an array of only stored conditions */
    get stored(): ConditionPF2e<TActor>[] {
        return this.filter((c) => !c.inMemoryOnly);
    }

    /** Convenience getters for active badged conditions, especially for use by @actor resolvables in rule elements */
    get clumsy(): ConditionPF2e<TActor> | null {
        return this.bySlug("clumsy", { active: true }).shift() ?? null;
    }

    get doomed(): ConditionPF2e<TActor> | null {
        return this.bySlug("doomed", { active: true }).shift() ?? null;
    }

    get drained(): ConditionPF2e<TActor> | null {
        return this.bySlug("drained", { active: true }).shift() ?? null;
    }

    get dying(): ConditionPF2e<TActor> | null {
        return this.bySlug("dying", { active: true }).shift() ?? null;
    }

    get enfeebled(): ConditionPF2e<TActor> | null {
        return this.bySlug("enfeebled", { active: true }).shift() ?? null;
    }

    get frightened(): ConditionPF2e<TActor> | null {
        return this.bySlug("frightened", { active: true }).shift() ?? null;
    }

    get sickened(): ConditionPF2e<TActor> | null {
        return this.bySlug("sickened", { active: true }).shift() ?? null;
    }

    get slowed(): ConditionPF2e<TActor> | null {
        return this.bySlug("slowed", { active: true }).shift() ?? null;
    }

    get stunned(): ConditionPF2e<TActor> | null {
        return this.bySlug("stunned", { active: true }).shift() ?? null;
    }

    get stupefied(): ConditionPF2e<TActor> | null {
        return this.bySlug("stupefied", { active: true }).shift() ?? null;
    }

    get wounded(): ConditionPF2e<TActor> | null {
        return this.bySlug("wounded", { active: true }).shift() ?? null;
    }

    /** Provide additional options for retrieving a condition */
    override get(
        key: Maybe<string>,
        options: { strict: true; active?: boolean | null; temporary?: boolean | null },
    ): ConditionPF2e<TActor>;
    override get(key: string, options?: ConditionsGetOptions): ConditionPF2e<TActor> | undefined;
    override get(
        key: string,
        { strict = false, active = null, temporary = null }: ConditionsGetOptions = {},
    ): ConditionPF2e<TActor> | undefined {
        const condition = super.get(key, { strict });
        if (active === true && !condition?.active) return undefined;
        if (active === false && condition?.active) return undefined;
        if (temporary === true && condition?.actor.items.has(key)) return undefined;
        if (temporary === false && !condition?.actor.items.has(key)) return undefined;

        return condition;
    }

    override set(id: string, condition: ConditionPF2e<TActor>): this {
        super.set(id, condition);
        const listBySlug = this.#slugMap.get(condition.slug) ?? [];
        listBySlug.push(condition);
        this.#slugMap.set(condition.slug, listBySlug);

        return this;
    }

    every(condition: (value: ConditionPF2e<TActor>) => boolean): boolean {
        return this.contents.every(condition);
    }

    flatMap<T>(transformer: (value: ConditionPF2e<TActor>) => T | T[] | never[]): T[] {
        return this.contents.flatMap(transformer);
    }

    /** No deletions: a new instance is created every data preparation cycle */
    override delete(): false {
        return false;
    }

    /**
     * Get an array of conditions by slug
     * The "dead" slug is permitted due to `StatusEffectsPF2e`'s usage of this class, though it will always return an
     * empty array.
     */
    bySlug(slug: "persistent-damage", options?: ConditionsBySlugOptions): PersistentDamagePF2e<TActor>[];
    bySlug(slug: "dead", options?: ConditionsBySlugOptions): never[];
    bySlug(slug: ConditionSlug | "dead", options?: ConditionsBySlugOptions): ConditionPF2e<TActor>[];
    bySlug(slug: string, { active = null, temporary = null }: ConditionsBySlugOptions = {}): ConditionPF2e<TActor>[] {
        return (this.#slugMap.get(slug) ?? []).filter((condition): boolean => {
            const activeFilterSatisfied =
                active === true ? condition.active : active === false ? !condition.active : true;
            const temporaryFilterSatisfied =
                temporary === true
                    ? !condition.actor.items.has(condition.id)
                    : temporary === false
                    ? condition.actor.items.has(condition.id)
                    : true;
            return activeFilterSatisfied && temporaryFilterSatisfied;
        });
    }
}

interface ConditionsGetOptions extends CollectionGetOptions {
    /** Filter by the active state of the condition: `null` will return one in either state */
    active?: boolean | null;
    /**
     * Filter by the whether the condition is temporary (in-memory) or stored on the actor: `null` will return
     * a condition of either kind
     */
    temporary?: boolean | null;
}

type ConditionsBySlugOptions = Omit<ConditionsGetOptions, "strict">;

export { ActorConditions };
