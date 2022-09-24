import { ActorPF2e } from "@actor/base";

/** Extend ActorDirectory to show more information */
export class ActorDirectoryPF2e extends ActorDirectory<ActorPF2e> {
    override async getData(): Promise<object> {
        return {
            ...(await super.getData()),
            documentPartial: "systems/pf2e/templates/sidebar/actor-document-partial.html",
        };
    }
}
