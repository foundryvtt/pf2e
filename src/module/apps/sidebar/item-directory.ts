import { ItemPF2e } from "@item";
import { fontAwesomeIcon, htmlQuery, htmlQueryAll } from "@util";
import { ItemAttacher } from "../item-attacher.ts";

/** Extend ItemDirectory to show more information */
export class ItemDirectoryPF2e<TItem extends ItemPF2e<null>> extends ItemDirectory<TItem> {
    static override entryPartial = "systems/pf2e/templates/sidebar/item-document-partial.hbs";

    static override get defaultOptions(): SidebarDirectoryOptions {
        const options = super.defaultOptions;
        options.renderUpdateKeys.push("system.level.value");
        return options;
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const element of htmlQueryAll(html, "li.directory-item.item")) {
            const item = game.items.get(element.dataset.documentId ?? "");
            if (!item?.testUserPermission(game.user, "OBSERVER")) {
                element.querySelector("span.item-level")?.remove();
            }
        }

        this.#appendBrowseButton(html);
    }

    /** Include flattened update data so parent method can read nested update keys */
    protected override async _render(force?: boolean, context: SidebarDirectoryRenderOptions = {}): Promise<void> {
        // Create new reference in case other applications are using the same context object
        context = fu.deepClone(context);

        if (context.action === "update" && context.documentType === "Item" && context.data) {
            context.data = context.data.map((d) => ({ ...d, ...fu.flattenObject(d) }));
        }

        return super._render(force, context);
    }

    /** Add `EntryContextOption` to attach physical items */
    protected override _getEntryContextOptions(): EntryContextOption[] {
        const options = super._getEntryContextOptions();

        options.push({
            name: "PF2E.Item.Physical.Attach.SidebarContextMenuOption",
            icon: fontAwesomeIcon("paperclip").outerHTML,
            condition: ($li) => {
                const row = $li[0];
                const item = game.items.get(row.dataset.documentId, { strict: true });
                return (
                    item.isOwner &&
                    item.isOfType("physical") &&
                    game.items.some((i) => i !== item && i.isOwner && i.isOfType("physical") && i.acceptsSubitem(item))
                );
            },
            callback: ($li) => {
                const row = $li[0];
                const item = game.items.get(row.dataset.documentId, { strict: true });
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
    #appendBrowseButton(html: HTMLElement): void {
        const browseButton = document.createElement("button");
        browseButton.type = "button";
        browseButton.append(
            fontAwesomeIcon("search", { fixedWidth: true }),
            " ",
            game.i18n.localize("PF2E.CompendiumBrowser.Title"),
        );
        browseButton.addEventListener("click", () => {
            game.pf2e.compendiumBrowser.render(true, { focus: true });
        });
        htmlQuery(html, "footer.directory-footer")?.append(browseButton);
    }
}
