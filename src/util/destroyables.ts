import Sortable from "sortablejs";
import { ErrorPF2e } from "./misc.ts";

class DestroyableManager {
    #bodyObserver: MutationObserver;

    #appObservers = new Map<Node, MutationObserverContext>();

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
        this.#bodyObserver = new MutationObserver(this.#onMutateBody.bind(this));
        this.#bodyObserver.observe(document.body, DestroyableManager.#OBSERVE_OPTIONS);
    }

    observe(destroyable: Destroyable): void {
        const destroyableEl =
            destroyable instanceof Sortable
                ? destroyable.el
                : "elementOrigin" in destroyable
                  ? destroyable.elementOrigin()
                  : destroyable.DOM.input;
        const contentEl = destroyableEl?.closest(".app, .application")?.querySelector(".window-content");
        if (!contentEl) return console.warn(ErrorPF2e("No application element found").message);

        let context = this.#appObservers.get(contentEl);
        if (context) {
            context.elements.add({ node: destroyableEl, destroyable });
            return;
        }

        context = {
            observer: null,
            contextKey: contentEl,
            elements: new Set([{ node: destroyableEl, destroyable }]),
        };
        const observer = new MutationObserver(this.#onMutateContent(context));
        context.observer = observer;

        this.#appObservers.set(contentEl, context);

        observer.observe(contentEl, DestroyableManager.#OBSERVE_OPTIONS);
    }

    #onMutateContent(context: MutationObserverContext): (mutations: MutationRecord[]) => void {
        return (mutations: MutationRecord[]) => {
            for (const mutation of mutations) {
                for (const removedNode of mutation.removedNodes) {
                    for (const element of context.elements) {
                        if (removedNode.contains(element.node)) {
                            element.destroyable.destroy();
                            context.elements.delete(element);
                        }
                    }
                    if (context.elements.size > 0) {
                        continue;
                    }
                    if (context.observer) {
                        context.observer.disconnect();
                    }
                    this.#appObservers.delete(context.contextKey);
                    context.observer = null;
                    return;
                }
            }
        };
    }

    #onMutateBody(mutations: MutationRecord[]) {
        for (const mutation of mutations) {
            for (const removedNode of mutation.removedNodes) {
                for (const [node, context] of this.#appObservers.entries()) {
                    if (!removedNode.contains(node)) {
                        continue;
                    }
                    for (const element of context.elements) {
                        element.destroyable.destroy();
                    }
                    if (context.observer) {
                        context.observer.disconnect();
                    }
                    this.#appObservers.delete(node);
                    context.observer = null;
                }
            }
        }
    }
}

interface MutationObserverContext {
    observer: MutationObserver | null;
    contextKey: Node;
    elements: Set<{ node: Node; destroyable: Destroyable }>;
}

interface Tooltipster {
    destroy(): void;
    elementOrigin(): HTMLElement;
}

type Destroyable = Tagify<{ id: string; value: string }> | Tagify<Tagify.TagData> | Sortable | Tooltipster;

function createSortable(list: HTMLElement, options: Sortable.Options): Sortable {
    const sortable = new Sortable(list, options);
    DestroyableManager.instance.observe(sortable);
    return sortable;
}

function createTooltipster(target: HTMLElement, options: JQueryTooltipster.ITooltipsterOptions): JQuery {
    const $element = $(target);
    const $tooltipsterEl = $element.tooltipster(options);
    // get tooltipster namespace key
    const tooltipsterNs: string | undefined = $tooltipsterEl.data("tooltipster-ns")?.[0];
    if (!tooltipsterNs) {
        console.warn(ErrorPF2e("No tooltipster namespace found").message);
        return $tooltipsterEl;
    }
    // get internal tooltipster instance
    const tooltipsterInstance: Destroyable | undefined = $tooltipsterEl.data(tooltipsterNs);
    if (!tooltipsterInstance) {
        console.warn(ErrorPF2e("No tooltipster instance found").message);
        return $tooltipsterEl;
    }
    // create wrapper of instance and tooltipster element for cleanup after element has been removed from DOM
    DestroyableManager.instance.observe(tooltipsterInstance);
    return $tooltipsterEl;
}

export { DestroyableManager, createSortable, createTooltipster };
