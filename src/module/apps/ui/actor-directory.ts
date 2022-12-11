import { ActorPF2e } from "@actor/base";
import { htmlQueryAll } from "@util";

/** Extend ActorDirectory to show more information */
export class ActorDirectoryPF2e<TDocument extends ActorPF2e> extends ActorDirectory<TDocument> {
    static override get defaultOptions(): SidebarDirectoryOptions {
        const options = super.defaultOptions;
        options.renderUpdateKeys.push("system.details.level.value", "system.attributes.adjustment");
        return options;
    }

    override async getData(): Promise<object> {
        return {
            ...(await super.getData()),
            documentPartial: "systems/pf2e/templates/sidebar/actor-document-partial.html",
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const element of htmlQueryAll(html, "li.directory-item.actor")) {
            const actor = game.actors.get(element.dataset.documentId ?? "");
            if (!actor?.testUserPermission(game.user, "OBSERVER")) {
                element.querySelector("span.actor-level")?.remove();
            }
        }
    }

    /** Include flattened update data so parent method can read nested update keys */
    protected override async _render(force?: boolean, context: SidebarDirectoryRenderOptions = {}): Promise<void> {
        // Create new reference in case other applications are using the same context object
        context = deepClone(context);

        if (context.action === "update" && context.documentType === "Actor" && context.data) {
            context.data = context.data.map((d) => ({ ...d, ...flattenObject(d) }));
        }

        return super._render(force, context);
    }
}
