import { ActorPF2e } from "@actor";
import { ActionMacroHelpers } from "@system/action-macros";

const ACTION_COST = ["free", "reaction", 1, 2, 3] as const;
type ActionCost = (typeof ACTION_COST)[number];

interface ActionVariantUseOptions extends Record<string, unknown> {
    actors?: ActorPF2e | ActorPF2e[];
    event: Event;
}

interface ActionVariant {
    cost?: ActionCost;
    description?: string;
    glyph?: string;
    name?: string;
    slug: string;
    traits: string[];
    use(options?: Partial<ActionVariantUseOptions>): Promise<unknown>;
}

interface ActionUseOptions extends ActionVariantUseOptions {
    variant: string;
}

interface Action {
    cost?: ActionCost;
    description?: string;
    glyph?: string;
    img?: string;
    name: string;
    slug: string;
    traits: string[];
    variants: Collection<ActionVariant>;
    /** Uses the default variant for this action, which will usually be the first one in the collection. */
    use(options?: Partial<ActionUseOptions>): Promise<unknown>;
}

type ActionVariantProxy = ActionVariant & { statistic?: string };
class ActionVariantProxyHandler implements ProxyHandler<ActionVariant> {
    readonly #actor;

    constructor(actor: ActorPF2e) {
        this.#actor = actor;
    }

    get(target: ActionVariantProxy, property: keyof ActionVariantProxy) {
        const result = target[property];
        switch (property) {
            case "statistic":
                if ("statistic" in target && typeof result === "string") {
                    const { property: statistic } = ActionMacroHelpers.resolveStat(result);
                    return getProperty(this.#actor, statistic);
                }
                break;
            case "use":
                if (result instanceof Function) {
                    const actor = this.#actor;
                    return function (options?: Partial<ActionVariantUseOptions>) {
                        return result.apply(target, [{ ...options, actors: actor }]);
                    };
                }
                break;
            default:
                if (result instanceof Function) {
                    // change the type definition of the parameter if more methods are added
                    return function (...args: [options?: Partial<ActionVariantUseOptions>]) {
                        return result.apply(target, args);
                    };
                }
        }
        return result;
    }
}

type ActionProxy = Action & { statistic?: string; variants: Collection<ActionVariant & { statistic?: string }> };
class ActionProxyHandler implements ProxyHandler<Action> {
    readonly #actor;

    constructor(actor: ActorPF2e) {
        this.#actor = actor;
    }

    get(target: ActionProxy, property: keyof ActionProxy) {
        const result = target[property];
        switch (property) {
            case "statistic":
                if ("statistic" in target && typeof result === "string") {
                    const { property: statistic } = ActionMacroHelpers.resolveStat(result);
                    return getProperty(this.#actor, statistic);
                }
                break;
            case "use":
                if (result instanceof Function) {
                    const actor = this.#actor;
                    return function (options?: Partial<ActionUseOptions>) {
                        return result.apply(target, [{ ...options, actors: actor }]);
                    };
                }
                break;
            case "variants": {
                const variantProxyHandler = new ActionVariantProxyHandler(this.#actor);
                const variants: [string, ActionVariant][] = (result as Collection<ActionVariant>).contents
                    .map((variant) => new Proxy(variant, variantProxyHandler))
                    .map((variant) => [variant.slug, variant]);
                return new Collection<ActionVariant>(variants);
            }
            default:
                if (result instanceof Function) {
                    // change the type definition of the parameter if more methods are added
                    return function (...args: [options?: Partial<ActionUseOptions>]) {
                        return result.apply(target, args);
                    };
                }
        }
        return result;
    }
}

class ActorActions {
    readonly strike = new Collection<Action>();
    readonly encounter = new Collection<Action>();
    readonly exploration = new Collection<Action>();
    readonly downtime = new Collection<Action>();

    get [Symbol.iterator]() {
        return [...this.strike, ...this.encounter, ...this.exploration, ...this.downtime][Symbol.iterator];
    }
}

export {
    ACTION_COST,
    Action,
    ActionCost,
    ActionProxyHandler,
    ActionUseOptions,
    ActionVariant,
    ActionVariantUseOptions,
    ActorActions,
};
