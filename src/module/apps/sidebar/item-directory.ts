import type { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.d.mts";
import type { ContextMenuEntry } from "@client/applications/ux/context-menu.d.mts";
import type { ItemPF2e } from "@item";
import { fontAwesomeIcon, htmlQuery, htmlQueryAll } from "@util";
import { ItemAttacher } from "../item-attacher.ts";

/** Extend ItemDirectory to show more information */
export class ItemDirectoryPF2e extends fa.sidebar.tabs.ItemDirectory<ItemPF2e<null>> {
    protected static override _entryPartial = `${SYSTEM_ROOT}/templates/sidebar/item-document-partial.hbs`;

    static override DEFAULT_OPTIONS: DeepPartial<fa.sidebar.DocumentDirectoryConfiguration> = {
        renderUpdateKeys: ["system.level.value"],
    };

    protected override async _onRender(context: object, options: HandlebarsRenderOptions): Promise<void> {
        await super._onRender(context, options);
        for (const element of htmlQueryAll(this.element, "li.directory-item.item")) {
            const item = game.items.get(element.dataset.documentId ?? "");
            if (!item?.testUserPermission(game.user, "OBSERVER")) {
                element.querySelector("span.item-level")?.remove();
            }
        }

        this.#appendBrowseButton();
    }

    /** Add `ContextMenuEntry` to attach physical items */
    protected override _getEntryContextOptions(): ContextMenuEntry[] {
        const options = super._getEntryContextOptions();

        options.push({
            name: "PF2E.Item.Physical.Attach.SidebarContextMenuOption",
            icon: fontAwesomeIcon("paperclip").outerHTML,
            condition: (li: HTMLElement) => {
                const item = game.items.get(li.dataset.entryId, { strict: true });
                return (
                    item.isOwner &&
                    item.isOfType("physical") &&
                    game.items.some((i) => i !== item && i.isOwner && i.isOfType("physical") && i.acceptsSubitem(item))
                );
            },
            callback: (li: HTMLElement) => {
                const item = game.items.get(li.dataset.entryId, { strict: true });
                if (
                    item.isOwner &&
                    item.isOfType("physical") &&
                    game.items.some((i) => i !== item && i.isOwner && i.isOfType("physical") && i.acceptsSubitem(item))
                ) {
                    new ItemAttacher({ item }).render(true);
                }
            },
        });

        return options;
    }

    /** Append a button to open the compendium browser */
    #appendBrowseButton(): void {
        const browseButton = document.createElement("button");
        browseButton.type = "button";
        browseButton.append(
            fontAwesomeIcon("search", { fixedWidth: true }),
            " ",
            game.i18n.localize("PF2E.CompendiumBrowser.Title"),
        );
        browseButton.addEventListener("click", () => {
            game.pf2e.compendiumBrowser.render({ force: true });
        });
        htmlQuery(this.element, "footer.directory-footer")?.append(browseButton);
    }
}
