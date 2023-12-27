import type { ActorPF2e } from "@actor";
import {
    Action,
    ActionSection,
    ActionVariant,
    SingleCheckAction,
    SingleCheckActionVariant,
} from "@actor/actions/index.ts";
import type { TokenPF2e } from "@module/canvas/index.ts";
import { htmlClosest, htmlQuery } from "@util";
import { getSelectedActors } from "@util/token-actor-utils.ts";

interface ActionBrowserData {
    actions: Record<ActionSection | "favorites" | "other", ActionListItem[]>;
    actor?: ActorPF2e;
    disabled: boolean;
}

class ActionVariantListItem {
    readonly checks;
    readonly #variant;

    constructor(variant: ActionVariant, actor?: ActorPF2e) {
        this.checks = variant instanceof SingleCheckActionVariant ? variant.preview({ actor }) : undefined;
        this.#variant = variant;
    }

    get cost(): ActionVariant["cost"] {
        return this.#variant.cost;
    }

    get name(): ActionVariant["name"] {
        return this.#variant.name;
    }

    get slug(): ActionVariant["slug"] {
        return this.#variant.slug;
    }

    get traits(): ActionVariant["traits"] {
        return this.#variant.traits;
    }
}

class ActionListItem {
    readonly #action;
    readonly checks;
    readonly variants;

    constructor(action: Action, actor?: ActorPF2e) {
        this.#action = action;
        if (action.variants.size === 0) {
            this.checks = action instanceof SingleCheckAction ? action.preview({ actor }) : undefined;
        }
        const variants: [string, ActionVariantListItem][] = action.variants.contents
            .map((variant) => new ActionVariantListItem(variant, actor))
            .map((variant) => [variant.slug, variant]);
        this.variants = new Collection<ActionVariantListItem>(variants);
    }

    get cost(): Action["cost"] {
        return this.#action.cost;
    }

    get img(): Action["img"] {
        return this.#action.img;
    }

    get name(): Action["name"] {
        return this.#action.name;
    }

    get section(): Action["section"] {
        return this.#action.section;
    }

    get slug(): Action["slug"] {
        return this.#action.slug;
    }

    get traits(): Action["traits"] {
        return this.#action.traits;
    }
}

export class ActionBrowser extends Application {
    readonly #controlTokenHandler: HookCallback<unknown[]>;

    constructor(options?: Partial<ApplicationOptions>) {
        super(options);
        this.#controlTokenHandler = this.onControlToken.bind(this) as HookCallback<unknown[]>;
    }

    static override get defaultOptions(): ApplicationOptions {
        return fu.mergeObject(super.defaultOptions, {
            id: "action-browser",
            height: 550,
            width: 700,
            resizable: true,
            tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "favorites" }],
            template: "systems/pf2e/templates/action-browser/action-browser.hbs",
            title: "PF2E.ActionBrowser.Title",
        });
    }

    override get title(): string {
        const actors = getSelectedActors({ assignedFallback: true });
        const actor = actors.length === 1 ? actors[0] : undefined;
        return actor ? `${super.title} (${actor.name})` : super.title;
    }

    override getData(_options?: ApplicationOptions): ActionBrowserData | Promise<ActionBrowserData> {
        const actors = getSelectedActors({ assignedFallback: true });
        const actor = actors.length === 1 ? actors[0] : undefined;
        const actions: ActionBrowserData["actions"] = {
            favorites: [],
            basic: [],
            ["specialty-basic"]: [],
            skill: [],
            other: [],
        };
        [...game.pf2e.actions.values()]
            .map((action) => new ActionListItem(action, actor))
            .forEach((action) => {
                actions[action.section ?? "other"].push(action);
            });
        return {
            actions,
            actor,
            disabled: actors.length === 0,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Action usage
        htmlQuery(html, ".content")?.addEventListener("click", (event) => {
            const enabled = getSelectedActors({ assignedFallback: true }).length > 0;
            const action = htmlClosest(event.target, "[data-action-slug]")?.dataset.actionSlug;
            if (action) {
                const handler = htmlClosest(event.target, "[data-action-handler]")?.dataset.actionHandler;
                if (handler === "use" && enabled) {
                    const multipleAttackPenalty = htmlClosest(event.target, "[data-action-map]")?.dataset.actionMap;
                    const statistic = htmlClosest(event.target, "[data-action-statistic]")?.dataset.actionStatistic;
                    const variant = htmlClosest(event.target, "[data-action-variant-slug]")?.dataset.actionVariantSlug;
                    game.pf2e.actions
                        .get(action ?? "")
                        ?.use({
                            event,
                            multipleAttackPenalty: multipleAttackPenalty ? Number(multipleAttackPenalty) : undefined,
                            statistic,
                            variant,
                        })
                        .catch((reason: Error | string) => {
                            if (reason) {
                                ui.notifications.warn(reason.toString());
                            }
                        });
                } else if (handler === "chat") {
                    game.pf2e.actions.get(action ?? "")?.toMessage();
                } else {
                    // show in details panel
                }
            }
        });
    }

    override render(force?: boolean, options?: RenderOptions): this {
        if (force && !this.rendered) {
            Hooks.on("controlToken", this.#controlTokenHandler);
            getSelectedActors({ assignedFallback: true }).forEach((actor) => (actor.apps[this.appId] = this));
        }
        return super.render(force, options);
    }

    override close(options?: { force?: boolean }): Promise<void> {
        Hooks.off("controlToken", this.#controlTokenHandler);
        getSelectedActors({ assignedFallback: true }).forEach((actor) => delete actor.apps[this.appId]);
        return super.close(options);
    }

    // debounced render method to prevent double-rendering in case of rapidly fired control token events, like when
    // tabbing through tokens on the canvas
    private refresh = fu.debounce(this.render, 100);

    private onControlToken(token: TokenPF2e, control: boolean) {
        if (token.actor) {
            if (control) {
                token.actor.apps[this.appId] = this;
            } else if (token.actor) {
                delete token.actor.apps[this.appId];
            }
        }
        this.refresh(false);
    }
}
