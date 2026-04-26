import type { ActorPF2e } from "@actor";
import type { ApplicationConfiguration, ApplicationRenderContext } from "@client/applications/_types.d.mts";
import type { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.d.mts";
import type { CompendiumDirectoryRenderContext } from "@client/applications/sidebar/tabs/compendium-directory.d.mts";
import type { ContextMenuEntry } from "@client/applications/ux/context-menu.d.mts";
import type CompendiumCollection from "@client/documents/collections/compendium-collection.d.mts";
import type { ItemPF2e } from "@item";
import { ErrorPF2e } from "@util";
import { CompendiumMigrationStatus } from "../compendium-migration-status.ts";

/** Extend CompendiumDirectory to support a search bar */
export class CompendiumDirectoryPF2e extends fa.sidebar.tabs.CompendiumDirectory {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {
        actions: {
            openBrowser: CompendiumDirectoryPF2e.#onClickOpenBrowser,
        },
    };

    protected override async _preparePartContext(
        partId: string,
        context: CompendiumDirectoryRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<CompendiumDirectoryRenderContext> {
        const partContext = await super._preparePartContext(partId, context, options);
        if (partId === "footer") {
            const buttons = (partContext.buttons ??= []);
            buttons.push({
                type: "button",
                action: "openBrowser",
                icon: "fa-solid fa-magnifying-glass",
                label: "PF2E.CompendiumBrowser.Title",
            });
        }
        return partContext;
    }

    protected override async _onFirstRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void> {
        this._createContextMenu(this.#getDocumentMatchContextEntries, "ol.document-matches > li");
        return super._onFirstRender(context, options);
    }

    #getDocumentMatchContextEntries(): ContextMenuEntry[] {
        return [
            {
                name: "COMPENDIUM.ImportEntry",
                icon: "fa-solid fa-download",
                visible: (li: HTMLElement): boolean => {
                    const uuid = li.dataset.uuid;
                    if (!uuid) throw ErrorPF2e("Unexpected missing uuid");
                    const collection = game.packs.get(fromUuidSync(uuid)?.pack ?? "", { strict: true });
                    const documentClass = collection.documentClass as unknown as typeof foundry.abstract.Document;
                    return documentClass.canUserCreate(game.user);
                },
                onClick: async (_e: PointerEvent, li: HTMLElement): Promise<void> => {
                    const uuid = li.dataset.uuid;
                    if (!uuid) throw ErrorPF2e("Unexpected missing uuid");
                    const packCollection = game.packs.get(fromUuidSync(uuid)?.pack ?? "", { strict: true });
                    const worldCollection = game.collections.get(packCollection.documentName, { strict: true });
                    const indexData = fromUuidSync(uuid) ?? { _id: "" };
                    if (!("_id" in indexData && typeof indexData._id === "string")) {
                        throw ErrorPF2e("Unexpected missing document _id");
                    }
                    await worldCollection.importFromCompendium(
                        packCollection,
                        indexData._id,
                        {},
                        { renderSheet: true },
                    );
                },
            },
        ];
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _getEntryContextOptions(): ContextMenuEntry[] {
        const options = super._getEntryContextOptions();
        options.push({
            name: "COMPENDIUM.MigrationStatus",
            icon: "fa-solid fa-info",
            visible: (li: HTMLElement): boolean => {
                const compendium = game.packs.get(li.dataset.pack, { strict: true });
                const actorOrItem =
                    compendium.documentClass === CONFIG.Actor.documentClass ||
                    compendium.documentClass === CONFIG.Item.documentClass;
                const isSystemCompendium = compendium.metadata.packageType === "system";
                return game.user.isGM && actorOrItem && !isSystemCompendium;
            },
            onClick: async (_e: PointerEvent, li: HTMLElement): Promise<void> => {
                const compendium = game.packs.get(li.dataset.pack, { strict: true }) as CompendiumCollection<
                    ActorPF2e<null> | ItemPF2e<null>
                >;
                new CompendiumMigrationStatus(compendium).render(true);
            },
        });
        return options;
    }

    static async #onClickOpenBrowser(this: CompendiumDirectoryPF2e): Promise<void> {
        game.pf2e.compendiumBrowser.render({ force: true });
    }
}
