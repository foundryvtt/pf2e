import Sortable from "sortablejs";
import { ErrorPF2e } from "./misc.ts";

class DestroyableManager {
    #bodyObserver: MutationObserver;

    #appObservers = new Map<Node, MutationObserver>();

    #destroyables = new Map<Node, Destroyable[]>();

    declare static instance: DestroyableManager;

    static #OBSERVE_OPTIONS = {
        attributes: false,
        characterData: false,
        childList: true,
        subtree: false,
    };

    /** Start observing the document body. */
    static initialize(): void {
        DestroyableManager.instance ??= new DestroyableManager();
    }

    constructor() {
        this.#bodyObserver = new MutationObserver(this.#onMutate.bind(this));
        this.#bodyObserver.observe(document.body, DestroyableManager.#OBSERVE_OPTIONS);
    }

    observe(destroyable: Destroyable): void {
        const contentEl =
            destroyable instanceof Sortable
                ? destroyable.el.closest(".app, .application")?.querySelector(".window-content")
                : destroyable instanceof TooltipsterTarget
                  ? destroyable.element
                  : destroyable.DOM.input.closest(".app, .application")?.querySelector(".window-content");
        if (!contentEl) return console.warn(ErrorPF2e("No application element found").message);

        const destroyables = this.#destroyables.get(contentEl) ?? [];
        destroyables.push(destroyable);
        this.#destroyables.set(contentEl, destroyables);

        if (!this.#appObservers.has(contentEl)) {
            const observer = new MutationObserver(this.#onMutate.bind(this));
            observer.observe(contentEl, DestroyableManager.#OBSERVE_OPTIONS);
            this.#appObservers.set(contentEl, observer);
        }
    }

    /** Destroy destroyable instances in closed applications and replaced window content. */
    #onMutate(mutations: MutationRecord[]): void {
        for (const mutation of mutations) {
            for (const element of mutation.removedNodes) {
                for (const destroyable of this.#destroyables.get(element) ?? []) {
                    destroyable.destroy();
                }
                this.#destroyables.delete(element);
                this.#appObservers.delete(element);
            }
        }
    }
}

type Destroyable = Tagify<{ id: string; value: string }> | Tagify<Tagify.TagData> | Sortable | TooltipsterTarget;

class TooltipsterTarget {
    $element: JQuery;

    constructor($element: JQuery) {
        this.$element = $element;
    }

    get element(): HTMLElement {
        return this.$element[0];
    }

    destroy(): void {
        this.$element.tooltipster("destroy");
    }
}

function createSortable(list: HTMLElement, options: Sortable.Options): Sortable {
    const sortable = new Sortable(list, options);
    DestroyableManager.instance.observe(sortable);
    return sortable;
}

function createTooltipster(target: HTMLElement, options: JQueryTooltipster.ITooltipsterOptions): JQuery {
    const $element = $(target);
    DestroyableManager.instance.observe(new TooltipsterTarget($element));
    return $element.tooltipster(options);
}

export { DestroyableManager, createSortable, createTooltipster };
