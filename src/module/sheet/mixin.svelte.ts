import * as svelte from "svelte";
import type {
    ApplicationConfiguration,
    ApplicationRenderContext,
    ApplicationRenderOptions,
} from "types/foundry/client-esm/applications/_types.d.ts";
import type ApplicationV2 from "types/foundry/client-esm/applications/api/application.d.ts";

interface SvelteApplicationRenderContext {
    /** State data tracked by the root component: objects herein must be plain object. */
    state: object;
    /** This application instance */
    foundryApp: SvelteApplication;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function SvelteApplicationMixin<
    TBase extends AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> },
>(Base: TBase) {
    abstract class SvelteApplication extends Base {
        static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {
            classes: ["pf2e"],
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        protected abstract root: svelte.Component<any>;

        /** State data tracked by the root component */
        protected $state: object = $state({});

        /** Reactive version tabGroups that tabGroups itself will get replaced with on render */
        #$tabGroups: Record<string, string> = $state({});

        /** The mounted root component, saved to be unmounted on application close */
        #mount: object = {};

        override changeTab(tab: string, group: string, { force = false, updatePosition = true } = {}) {
            if (!tab || !group) throw new Error("You must pass both the tab and tab group identifier");
            if (this.tabGroups[group] === tab && !force) return; // No change necessary

            // Update the tab group. This will trigger a svelte re-render if its looking for it
            this.tabGroups[group] = tab;

            // Update automatic width or height
            if (!updatePosition) return;
            const positionUpdate: { width?: "auto"; height?: "auto" } = {};
            if (this.options.position.width === "auto") positionUpdate.width = "auto";
            if (this.options.position.height === "auto") positionUpdate.height = "auto";
            if (!foundry.utils.isEmpty(positionUpdate)) this.setPosition(positionUpdate);
        }

        protected override async _renderHTML(
            context: SvelteApplicationRenderContext,
        ): Promise<ApplicationRenderContext> {
            return context;
        }

        protected override _replaceHTML(
            result: SvelteApplicationRenderContext,
            content: HTMLElement,
            options: ApplicationRenderOptions,
        ): void {
            Object.assign(this.$state, result.state);
            if (options.isFirstRender) {
                // Replace tabGroups with getter/setter that goes through $tabGroups
                Object.assign(this.#$tabGroups, this.tabGroups);
                Object.defineProperty(this, "tabGroups", {
                    get: () => this.#$tabGroups,
                    set: (value) => Object.assign(this.#$tabGroups, value),
                });

                this.#mount = svelte.mount(this.root, { target: content, props: { ...result, state: this.$state } });
            }
        }

        protected override _onClose(options: ApplicationRenderOptions): void {
            super._onClose(options);
            svelte.unmount(this.#mount);
        }
    }

    return SvelteApplication;
}

type SvelteApplication = InstanceType<ReturnType<typeof SvelteApplicationMixin>>;

export { SvelteApplicationMixin, type SvelteApplicationRenderContext };
