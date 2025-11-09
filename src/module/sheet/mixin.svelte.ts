import * as svelte from "svelte";

interface SvelteApplicationRenderContext extends fa.ApplicationRenderContext {
    /** State data tracked by the root component: objects herein must be plain object. */
    state: object;
    /** This application instance */
    foundryApp?: SvelteApplication;
}

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        protected abstract root: svelte.Component<any>;

        /** State data tracked by the root component */
        protected $state: object = $state({});

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
            Object.assign(this.$state, result.state);
            if (options.isFirstRender) {
                this.#mount = svelte.mount(this.root, { target: content, props: { ...result, state: this.$state } });
            }
        }

        protected override _onClose(options: fa.ApplicationClosingOptions): void {
            super._onClose(options);
            svelte.unmount(this.#mount);
        }
    }

    return SvelteApplication;
}

type SvelteApplication = InstanceType<ReturnType<typeof SvelteApplicationMixin>>;

export { SvelteApplicationMixin, type SvelteApplicationRenderContext };
