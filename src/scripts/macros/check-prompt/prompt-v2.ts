// import type { ApplicationConfiguration } from "@client/applications/_types.d.mts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import Root from "./app.svelte";

class CheckPromptV2 extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = {
        position: {
            width: 650,
            height: 500,
        },
        window: {
            icon: "fa-solid fa-dice-d20",
            title: "PF2E.Actor.Party.CheckPrompt.Title",
            resizable: true,
        },
    };

    protected override root = Root;

    protected override async _prepareContext(): Promise<CheckPromptV2Context> {

        return {
            foundryApp: this,
            state: {

            }
        }
    }
}

interface CheckPromptV2Context extends SvelteApplicationRenderContext {
    state: CheckPromptV2State;
}

interface CheckPromptV2State {

}

export async function checkPromptV2(): Promise<void> {
    new CheckPromptV2().render({force: true});
};
export type { CheckPromptV2Context };