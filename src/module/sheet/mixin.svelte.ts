import * as svelte from "svelte";

interface SvelteApplicationRenderContext extends fa.ApplicationRenderContext {
    /**
     * Render-derived data. The mixin replaces this wholesale on every render, so
     * it MUST NOT be mutated from TypeScript. Anything user- or peer-mutated
     * belongs on instance-level $state (declared in a .svelte.ts file) instead.
     * Optional: omit entirely if all live state lives on the app instance.
     */
    state?: object;
    /** This application instance */
    foundryApp?: fa.api.ApplicationV2;
}

/**
 * The root component's props: the render context, with `state` swapped for a getter.
 *   const { ... }: SvelteAppProps<MyContext> = $props();
 */
type SvelteAppProps<TContext extends SvelteApplicationRenderContext = SvelteApplicationRenderContext> = Omit<
    TContext,
    "state"
> & {
    /** Returns the current state object. Call inside a $derived to track replacement. */
    getState: () => Readonly<NonNullable<TContext["state"]>>;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function SvelteApplicationMixin<
    TBase extends AbstractConstructorOf<fa.api.ApplicationV2> & {
        DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration>;
    },
>(Base: TBase) {
    abstract class SvelteApplication extends Base {
        static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
            classes: ["pf2e"],
        };

        /** The root component. `never` props let any component be assigned here, whatever props it declares */
        protected abstract root: svelte.Component<never>;

        /**
         * Reactive slot for the render-derived state object. $state.raw means the
         * SLOT is reactive (reassigning it fires signals), but the value inside
         * is treated as immutable. This enforces the contract: anyone mutating
         * this.$state.foo = bar will see the write succeed but no reactivity
         * fire, which is the desired behavior to push that state to a different
         * surface (component-local $state or instance-level $state).
         */
        #state: object = $state.raw({});

        protected get $state(): object {
            return this.#state;
        }

        protected set $state(value: object) {
            this.#state = value;
        }

        /** The mounted root component, saved to be unmounted on application close */
        #mount: object = {};

        protected abstract override _prepareContext(
            options: fa.ApplicationRenderOptions,
        ): Promise<SvelteApplicationRenderContext>;

        protected override async _renderHTML(
            context: SvelteApplicationRenderContext,
        ): Promise<SvelteApplicationRenderContext> {
            return context;
        }

        protected override _replaceHTML(
            result: SvelteApplicationRenderContext,
            content: HTMLElement,
            options: fa.ApplicationRenderOptions,
        ): void {
            // Wholesale-replace the state object. Components read it via the
            // getState prop inside a $derived so they pick up the new value.
            const { state, ...context } = result;
            this.$state = state ?? {};
            if (options.isFirstRender) {
                // Props are only passed once, so `state` itself is left out
                const props = { ...context, getState: (): object => this.$state };
                this.#mount = svelte.mount(this.root, { target: content, props: props as never });
            }
            // Ensure the DOM is settled before _onRender overrides run
            svelte.flushSync();
        }

        protected override _onClose(options: fa.ApplicationClosingOptions): void {
            super._onClose(options);
            svelte.unmount(this.#mount);
        }
    }

    return SvelteApplication;
}

export { SvelteApplicationMixin };
export type { SvelteAppProps, SvelteApplicationRenderContext };
