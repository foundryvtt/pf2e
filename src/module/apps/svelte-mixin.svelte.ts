import * as svelte from "svelte";
import type {
    ApplicationRenderContext,
    ApplicationRenderOptions,
} from "types/foundry/client-esm/applications/_types.d.ts";
import type ApplicationV2 from "types/foundry/client-esm/applications/api/application.d.ts";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function SvelteApplicationMixin<TBase extends AbstractConstructorOf<ApplicationV2>>(Base: TBase) {
    abstract class SvelteApplication extends Base {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        protected abstract root: svelte.Component<any>;

        #data: ApplicationRenderContext = $state({});

        /** The mounted root component, saved to be unmounted on application close */
        #mount: object = {};

        protected override async _renderHTML(context: ApplicationRenderContext): Promise<ApplicationRenderContext> {
            return context;
        }

        protected override _replaceHTML(
            result: ApplicationRenderContext,
            content: HTMLElement,
            options: ApplicationRenderOptions,
        ): void {
            foundry.utils.mergeObject(this.#data, result, { performDeletions: true });
            if (options.isFirstRender) {
                this.#mount = svelte.mount(this.root, { target: content, props: result });
            }
        }

        protected override _onClose(options: ApplicationRenderOptions): void {
            super._onClose(options);
            svelte.unmount(this.#mount);
        }
    }

    return SvelteApplication;
}

export { SvelteApplicationMixin };
