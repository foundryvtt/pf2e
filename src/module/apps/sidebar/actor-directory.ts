import { ActorPF2e, CreaturePF2e, PartyPF2e } from "@actor";
import { CREATURE_ACTOR_TYPES } from "@actor/values.ts";
import { fontAwesomeIcon, htmlClosest, htmlQuery, htmlQueryAll } from "@util";
import * as R from "remeda";
import type { HandlebarsRenderOptions } from "types/foundry/client-esm/applications/api/handlebars-application.ts";
import type { DocumentDirectoryConfiguration } from "types/foundry/client-esm/applications/sidebar/document-directory.d.mts";

/** Extend ActorDirectory to show more information */
class ActorDirectoryPF2e extends foundry.applications.sidebar.tabs.ActorDirectory<ActorPF2e<null>> {
    static override _entryPartial = "systems/pf2e/templates/sidebar/actor-document-partial.hbs";

    /** Any additional "folder like" elements (such as parties) that are maintained separately */
    #extraFolders: Record<string, boolean> = {};

    /** If we are currently dragging a party. Needed because dragenter/dragover doesn't contain the drag source. */
    #draggingParty = false;

    static override DEFAULT_OPTIONS: Partial<DocumentDirectoryConfiguration> = {
        renderUpdateKeys: [
            "system.details.level.value",
            "system.attributes.adjustment",
            "system.details.members",
            "system.campaign.type",
        ],
    };

    override async _prepareContext(options: HandlebarsRenderOptions): Promise<object> {
        const activeParty = game.actors.party;

        if (!options.isFirstRender && activeParty && game.settings.get("pf2e", "activePartyFolderState")) {
            this.#extraFolders[activeParty.id] = true;
        }

        const parties = R.sortBy(
            this.collection.filter((a): a is PartyPF2e<null> => a.isOfType("party") && a !== activeParty),
            (p) => p.sort,
        );

        return Object.assign(await super._prepareContext(options), {
            activeParty,
            parties,
            placePartiesInSubfolder: parties.length > 1,
            extraFolders: this.#extraFolders,
        });
    }

    saveActivePartyFolderState(): void {
        game.settings.set("pf2e", "activePartyFolderState", this.#extraFolders[game.actors.party?.id ?? ""] ?? true);
    }

    override async _onRender(context: object, options: HandlebarsRenderOptions): Promise<void> {
        await super._onRender(context, options);
        const html = this.element;

        // Strip actor level from actors we lack proper observer permission for
        for (const element of htmlQueryAll(html, "li.directory-item.actor")) {
            const actor = game.actors.get(element.dataset.entryId, { strict: true });
            if (!actor.testUserPermission(game.user, "OBSERVER")) {
                element.querySelector("span.actor-level")?.remove();
            }
        }

        // Implements folder-like collapse/expand functionality for folder-likes.
        for (const folderLike of htmlQueryAll(html, ".folder-like")) {
            const header = htmlQuery(folderLike, ":scope > header");
            if (!header) continue;

            for (const eventType of ["dragenter", "dragleave", "dragend"] as const) {
                folderLike.addEventListener(eventType, (event) => {
                    this.#onDragHighlightFolderLike(folderLike, event);
                });
            }

            header.addEventListener("click", (event) => {
                const folderEl = htmlClosest(event.target, ".folder-like");
                const entryId = htmlClosest(event.target, "[data-entry-id]")?.dataset.entryId ?? "";
                if (folderEl && entryId) {
                    event.stopPropagation();
                    this.#extraFolders[entryId] = folderEl.classList.contains("collapsed");
                    folderEl.classList.toggle("collapsed", !this.#extraFolders[entryId]);
                    if (this.isPopout) this.setPosition();

                    this.saveActivePartyFolderState();
                }
            });

            // Alternative open sheet button (used by parties)
            const openSheetLink = htmlQuery(header, "a[data-action=open-sheet]");
            openSheetLink?.addEventListener("click", (event) => {
                event.stopPropagation();
                const documentId = htmlClosest(openSheetLink, "[data-document-id]")?.dataset.documentId;
                const document = game.actors.get(documentId ?? "");
                document?.sheet.render(true);
            });

            // Register event to create an actor as a new party member
            const createMemberLink = htmlQuery(header, "a[data-action=create-member]");
            createMemberLink?.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const documentId = htmlClosest(createMemberLink, "[data-document-id]")?.dataset.documentId;
                const party = game.actors.get(documentId ?? "");
                if (!party?.isOfType("party")) return;

                const button = event.currentTarget as HTMLElement;
                const actor = await ActorPF2e.createDialog(
                    {},
                    {
                        width: 320,
                        left: window.innerWidth - 630,
                        top: button?.offsetTop ?? 0,
                        types: [...CREATURE_ACTOR_TYPES],
                    },
                );

                // If the actor was created, add as a member and force the party folder open
                if (actor?.isOfType("creature")) {
                    this.#extraFolders[party.id] = true;
                    await party.addMembers(actor);
                }
            });

            // Register event to create a new party
            const createPartyLink = htmlQuery(header, "a[data-action=create-party]");
            createPartyLink?.addEventListener("click", async (event) => {
                event.stopPropagation();
                const actor = await ActorPF2e.create({ type: "party", name: "New Party" });
                actor?.sheet.render(true);

                const header = htmlClosest(createPartyLink, ".folder-like");
                const entryId = header?.dataset.entryId;
                if (entryId) {
                    this.#extraFolders[entryId] = true;
                    this.render();
                }
            });

            const activatePartyLink = htmlQuery(header, "a[data-action=activate-party]");
            activatePartyLink?.addEventListener("click", (event) => {
                event.stopPropagation();
                const documentId = htmlClosest(activatePartyLink, "[data-document-id]")?.dataset.documentId ?? "";
                if (game.actors.has(documentId)) {
                    game.settings.set("pf2e", "activeParty", documentId);
                    this.saveActivePartyFolderState();
                }
            });
        }

        this.#appendBrowseButton(html);
    }

    /** Overriden so matched actors in a party reveal their party "folder" as well */
    protected override _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement): void {
        super._onSearchFilter(event, query, rgx, html);

        const folderLikes = htmlQueryAll(html, ".folder-like");
        for (const folderLike of folderLikes) {
            const hasMatch =
                query !== "" && htmlQueryAll(folderLike, ".actor").some((li) => li.style.display !== "none");
            if (hasMatch) {
                folderLike.removeAttribute("style");
                folderLike.classList.remove("collapsed");
                const folderLikeHeader = htmlQuery(folderLike, ":scope > header");
                if (folderLikeHeader) folderLikeHeader.removeAttribute("style");
            } else {
                const entryId = folderLike.dataset.entryId ?? "";
                folderLike.classList.toggle("collapsed", !this.#extraFolders[entryId]);
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
        const fromParty = htmlClosest(event.target, ".party")?.dataset.documentId;
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

    #onDragHighlightFolderLike(folderLike: HTMLElement, event: DragEvent): void {
        event.stopPropagation();
        if (this.#draggingParty) return;

        // Remove current drop target
        if (event.type === "dragleave") {
            const element = document.elementFromPoint(event.clientX, event.clientY);
            if (element?.closest(".folder-like") === folderLike) return;
        }

        folderLike?.classList.toggle("droptarget", event.type === "dragenter");
    }

    protected override async _handleDroppedEntry(target: HTMLElement, data: ActorSidebarDropData): Promise<void> {
        await super._handleDroppedEntry(target, data);

        // Handle dragging members to and from parties (if relevant)
        const toPartyId = htmlClosest(target, ".party")?.dataset.documentId;
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

    /** Inject parties without having to alter a core template */
    protected override async _renderHTML(
        context: object,
        options: HandlebarsRenderOptions,
    ): Promise<Record<string, HTMLElement>> {
        const parts = await super._renderHTML(context, options);
        const directory = parts.directory;

        // Add parties to sidebar (if any exist)
        if (game.actors.some((a) => a.isOfType("party"))) {
            const partyHTML = await renderTemplate(
                "systems/pf2e/templates/sidebar/party-document-partial.hbs",
                context,
            );
            directory.querySelector(".directory-list")?.prepend(partyHTML);

            // Inject any additional data for specific party implementations
            for (const header of htmlQueryAll(directory, ".party")) {
                const party = game.actors.get(header.dataset.documentId ?? "");
                const sidebarButtons = party?.isOfType("party") ? (party.campaign?.createSidebarButtons?.() ?? []) : [];
                header.querySelector("header h3")?.after(...sidebarButtons);
            }
        }

        return parts;
    }

    protected override _getEntryContextOptions(): ContextMenuEntry[] {
        const entries = super._getEntryContextOptions();
        entries.push({
            name: "PF2E.Actor.Party.Sidebar.RemoveMember",
            icon: fontAwesomeIcon("bus").outerHTML,
            condition: ($li) => $li.closest(".party").length > 0 && !$li.closest(".party-header").length,
            callback: ($li) => {
                const actorId = $li.data("document-id");
                const partyId = $li.closest(".party").data("document-id");
                const actor = game.actors.get(actorId ?? "");
                const party = game.actors.get(partyId ?? "");
                if (actor && party instanceof PartyPF2e) {
                    party.removeMembers(actor.uuid);
                }
            },
        });

        return entries;
    }

    /** Append a button to open the bestiary browser for GMs */
    #appendBrowseButton(html: HTMLElement): void {
        if (!game.user.isGM) return;

        const browseButton = document.createElement("button");
        browseButton.type = "button";
        browseButton.append(
            fontAwesomeIcon("search", { fixedWidth: true }),
            " ",
            game.i18n.localize("PF2E.CompendiumBrowser.BestiaryBrowser"),
        );
        browseButton.addEventListener("click", () => {
            game.pf2e.compendiumBrowser.openTab("bestiary");
        });
        htmlQuery(html, "footer.directory-footer")?.append(browseButton);
    }
}

interface ActorSidebarDropData extends DropCanvasData<"actor", ActorPF2e> {
    fromParty?: string;
}

export { ActorDirectoryPF2e };
