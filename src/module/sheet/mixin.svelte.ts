import * as svelte from "svelte";
import type {
    ApplicationConfiguration,
    ApplicationRenderContext,
    ApplicationRenderOptions,
} from "types/foundry/client-esm/applications/_types.d.ts";
import type ApplicationV2 from "types/foundry/client-esm/applications/api/application.d.ts";

interface BaseSvelteState {
    tabGroups: Record<string, string>;
    user: { isGM: boolean };
    editable: boolean | null;
}

interface SvelteApplicationRenderContext {
    /** State data tracked by the root component: objects herein must be plain object. */
    state: BaseSvelteState;
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

        /** The mounted root component, saved to be unmounted on application close */
        #mount: object = {};

        override changeTab(tab: string, group: string, { force = false } = {}) {
            if (!tab || !group) throw new Error("You must pass both the tab and tab group identifier");
            if (this.tabGroups[group] === tab && !force) return; // No change necessary

            // Update the tab group and trigger a re-render
            this.tabGroups[group] = tab;
            this.render(false);
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
                this.#mount = svelte.mount(this.root, {
                    target: content,
                    context: new Map<string, unknown>([
                        ["foundryApp", this],
                        ["state", this.$state],
                    ]),
                    props: { ...result, state: this.$state },
                });
            }
        }

        protected override _onClose(options: ApplicationRenderOptions): void {
            super._onClose(options);
            svelte.unmount(this.#mount);
        }

        protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
            return {
                foundryApp: this,
                state: {
                    tabGroups: this.tabGroups,
                    user: { isGM: game.user.isGM },
                    editable: this instanceof DocumentSheet ? this.isEditable : null,
                },
            };
        }
    }

    return SvelteApplication;
}

type SvelteApplication = InstanceType<ReturnType<typeof SvelteApplicationMixin>>;

export { SvelteApplicationMixin, type BaseSvelteState, type SvelteApplicationRenderContext };
