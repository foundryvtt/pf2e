import { ActorPF2e, CreaturePF2e, PartyPF2e } from "@actor";
import { CREATURE_ACTOR_TYPES } from "@actor/values.ts";
import { ApplicationRenderContext } from "@client/applications/_types.mjs";
import type {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "@client/applications/api/handlebars-application.d.mts";
import type { ContextMenuEntry } from "@client/applications/ux/context-menu.d.mts";
import type { DropCanvasData } from "@client/helpers/hooks.d.mts";
import type { ActorUUID } from "@common/documents/_module.d.mts";
import { htmlClosest, htmlQueryAll } from "@util";
import * as R from "remeda";

/** Extend ActorDirectory to show more information */
class ActorDirectoryPF2e extends fa.sidebar.tabs.ActorDirectory<ActorPF2e<null>> {
    static override DEFAULT_OPTIONS: Partial<fa.sidebar.DocumentDirectoryConfiguration> = {
        actions: {
            togglePartyFolder: ActorDirectoryPF2e.#togglePartyFolder,
            openPartySheet: ActorDirectoryPF2e.#openPartySheet,
            activateParty: ActorDirectoryPF2e.#activateParty,
            createParty: ActorDirectoryPF2e.#createParty,
            createMember: ActorDirectoryPF2e.#createPartyMember,
            openCompendiumBrowser: () => game.pf2e.compendiumBrowser.openTab("bestiary"),
        },
        renderUpdateKeys: [
            "system.details.level.value",
            "system.attributes.adjustment",
            "system.details.members",
            "system.campaign.type",
        ],
    };

    static override PARTS = ((): Record<string, HandlebarsTemplatePart> => {
        const parts = super.PARTS;
        parts["parties"] = { template: "systems/pf2e/templates/sidebar/party-document-partial.hbs" };
        return parts;
    })();

    protected static override _entryPartial = "systems/pf2e/templates/sidebar/actor-document-partial.hbs";

    /** Any additional "folder like" elements (such as parties) that are maintained separately */
    #extraFolders: Record<string, boolean> = {};

    /** If we are currently dragging a party. Needed because dragenter/dragover doesn't contain the drag source. */
    #draggingParty = false;

    /** @todo Remove upon release of V13 stable */
    protected override async _prepareContext(options: HandlebarsRenderOptions): Promise<ApplicationRenderContext> {
        const context = await super._prepareContext(options);
        return Object.assign(context, {
            canCreateEntry: this._canCreateEntry(),
            canCreateFolder: this._canCreateFolder(),
        });
    }

    override async _preparePartContext(
        partId: string,
        context: object,
        options: HandlebarsRenderOptions,
    ): Promise<object> {
        const partContext = await super._preparePartContext(partId, context, options);
        if (partId !== "parties") return partContext;

        const activeParty = game.actors.party;
        if (options.isFirstRender && activeParty && game.settings.get("pf2e", "activePartyFolderState")) {
            this.#extraFolders[activeParty.id] = true;
        }
        const parties = R.sortBy(
            this.collection.filter((a): a is PartyPF2e<null> => a.isOfType("party") && a !== activeParty),
            (p) => p.sort,
        );
        return Object.assign(partContext, { activeParty, parties, extraFolders: this.#extraFolders });
    }

    protected override async _prepareFooterContext(
        context: object & { buttons?: object[] },
        options: HandlebarsRenderOptions,
    ): Promise<void> {
        await super._prepareFooterContext(context, options);
        if (game.user.isGM) {
            context.buttons ??= [];
            context.buttons.push({
                type: "button",
                icon: "fa-solid fa-magnifying-glass",
                label: "PF2E.CompendiumBrowser.BestiaryBrowser",
                action: "openCompendiumBrowser",
            });
        }
    }

    async saveActivePartyFolderState(): Promise<void> {
        game.settings.set("pf2e", "activePartyFolderState", this.#extraFolders[game.actors.party?.id ?? ""] ?? true);
    }

    override async _onRender(context: object, options: HandlebarsRenderOptions): Promise<void> {
        // Move the party list into the directory part
        // This must occur before super._onRender() so that drag/drop is registered correctly
        if (options.parts.includes("directory")) {
            const partiesPart = this.parts["parties"];
            partiesPart.remove();
            this.parts["directory"].prepend(partiesPart);
        }

        await super._onRender(context, options);

        // Strip actor level from actors we lack proper observer permission for
        for (const element of htmlQueryAll(this.element, "li.directory-item.actor")) {
            const actor = game.actors.get(element.dataset.entryId, { strict: true });
            if (!actor.testUserPermission(game.user, "OBSERVER")) {
                element.querySelector("span.actor-level")?.remove();
            }
        }
    }

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /** Collapses all open folders in this directory, including parties */
    override collapseAll(): void {
        super.collapseAll();
        for (const el of htmlQueryAll(this.element, ".directory-item.folder[data-party]")) {
            el.classList.remove("expanded");
            delete this.#extraFolders[el.dataset.entryId ?? ""];
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /** Overriden so matched actors in a party reveal their party "folder" as well */
    protected override _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement): void {
        // The super method will close all party folders, we will need to open them up again
        super._onSearchFilter(event, query, rgx, html);

        const folderLikes = htmlQueryAll(html, ".parties .folder");
        for (const folderLike of folderLikes) {
            const hasMatch =
                query !== "" && htmlQueryAll(folderLike, ".actor").some((li) => li.style.display !== "none");
            if (hasMatch) {
                folderLike.style.display = "flex";
                folderLike.classList.add("expanded");
            } else {
                const entryId = folderLike.dataset.entryId ?? "";
                folderLike.classList.toggle("expanded", !!this.#extraFolders[entryId]);
            }
        }
    }

    protected override _onDragStart(event: DragEvent): void {
        if (!(event.target instanceof HTMLElement && event.dataTransfer)) {
            return super._onDragStart(event);
        }

        // Prevent drag drop for the other parties folder
        if (event.target.dataset.entryId === "otherParties") {
            event.preventDefault();
            return;
        }

        super._onDragStart(event);

        // Add additional party metadata to the drag event
        const fromParty = htmlClosest(event.target, "[data-party]")?.dataset.entryId;
        if (fromParty) {
            const data: ActorSidebarDropData = JSON.parse(event.dataTransfer.getData("text/plain"));
            data.fromParty = fromParty;
            this.#draggingParty = fromUuidSync(data.uuid as ActorUUID) instanceof PartyPF2e;
            event.dataTransfer.setData("text/plain", JSON.stringify(data));
        } else {
            this.#draggingParty = false;
        }
    }

    /** Overriden to prevent highlighting of certain types of draggeed data (such as parties) */
    protected override _onDragHighlight(event: DragEvent): void {
        if (event.type === "dragenter" && this.#draggingParty) {
            return event.stopPropagation();
        }
        super._onDragHighlight(event);
    }

    protected override async _handleDroppedEntry(target: HTMLElement, data: ActorSidebarDropData): Promise<void> {
        await super._handleDroppedEntry(target, data);

        // Handle dragging members to and from parties (if relevant)
        const toPartyId = htmlClosest(target, "[data-party]")?.dataset.entryId;
        if (toPartyId !== data.fromParty && data.uuid) {
            const toParty = game.actors.get(toPartyId ?? "");
            const fromParty = game.actors.get(data.fromParty ?? "");
            const actor = fromUuidSync(data.uuid);
            if (fromParty instanceof PartyPF2e) {
                await fromParty.removeMembers(data.uuid as ActorUUID);
            }
            if (toParty instanceof PartyPF2e && actor instanceof CreaturePF2e) {
                await toParty.addMembers(actor);
            }
        }
    }

    /** Overriden to not fire folder events on party actors */
    protected override _createContextMenus(): void {
        this._createContextMenu(this._getFolderContextOptions, ".folder:not([data-party]) .folder-header", {
            fixed: true,
            hookName: "getFolderContextOptions",
            parentClassHooks: false,
        });
        this._createContextMenu(this._getEntryContextOptions, ".directory-item[data-entry-id]", {
            fixed: true,
            hookName: `get${this.documentName}ContextOptions`,
            parentClassHooks: false,
        });
    }

    protected override _getEntryContextOptions(): ContextMenuEntry[] {
        const entries = super._getEntryContextOptions();
        entries.push({
            name: "PF2E.Actor.Party.Sidebar.RemoveMember",
            icon: fa.fields.createFontAwesomeIcon("bus").outerHTML,
            condition: (li) => !!li.closest("[data-party]") && !li.closest(".folder-header"),
            callback: (li) => {
                const actorId = li.dataset.entryId;
                const partyId = li.closest<HTMLElement>("[data-party]")?.dataset.entryId;
                const actor = game.actors.get(actorId ?? "");
                const party = game.actors.get(partyId ?? "");
                if (actor && party instanceof PartyPF2e) {
                    party.removeMembers(actor.uuid);
                }
            },
        } satisfies ContextMenuEntry);
        return entries;
    }

    static async #togglePartyFolder(this: ActorDirectoryPF2e, event: PointerEvent): Promise<void> {
        const folderEl = htmlClosest(event.target, "header");
        const entryEl = htmlClosest(folderEl, "li");
        const partyId = entryEl?.dataset.entryId ?? "";
        if (entryEl && partyId) {
            this.#extraFolders[partyId] = !entryEl.classList.contains("expanded");
            entryEl.classList.toggle("expanded", this.#extraFolders[partyId]);
            if (this.isPopout) this.setPosition();
            await this.saveActivePartyFolderState();
        }
    }

    static async #openPartySheet(this: ActorDirectoryPF2e, event: PointerEvent): Promise<void> {
        const documentId = htmlClosest(event.target, "[data-entry-id]")?.dataset.entryId;
        const document = game.actors.get(documentId ?? "");
        document?.sheet.render(true);
    }

    static async #activateParty(this: ActorDirectoryPF2e, event: PointerEvent): Promise<void> {
        const documentId = htmlClosest(event.target, "[data-entry-id]")?.dataset.entryId ?? "";
        if (game.actors.has(documentId)) {
            game.settings.set("pf2e", "activeParty", documentId);
            this.saveActivePartyFolderState();
        }
    }

    static async #createParty(this: ActorDirectoryPF2e, event: PointerEvent): Promise<void> {
        await ActorPF2e.createDialog({ type: "party" });
        const partyId = htmlClosest(event.target, "[data-entry-id]")?.dataset.entryId;
        if (partyId) {
            this.#extraFolders[partyId] = true;
            this.render();
        }
    }

    static async #createPartyMember(this: ActorDirectoryPF2e, event: PointerEvent, button: HTMLElement): Promise<void> {
        const documentId = htmlClosest(event.target, "[data-entry-id]")?.dataset.entryId;
        const party = game.actors.get(documentId ?? "");
        if (!party?.isOfType("party")) return;

        const options = {
            types: [...CREATURE_ACTOR_TYPES],
            position: { width: 320, left: window.innerWidth - 630, top: button.offsetTop ?? 0 },
        };
        const actor = await ActorPF2e.createDialog({ prototypeToken: { actorLink: true } }, {}, options);

        // If the actor was created, add as a member and force the party folder open
        if (actor?.isOfType("creature")) {
            this.#extraFolders[party.id] = true;
            await party.addMembers(actor);
        }
    }
}

interface ActorSidebarDropData extends DropCanvasData<"actor", ActorPF2e> {
    fromParty?: string;
}

export { ActorDirectoryPF2e };
