import { CharacterPF2e, CreaturePF2e, PartyPF2e } from "@actor";
import { ActorPF2e } from "@actor/base.ts";
import { fontAwesomeIcon, htmlClosest, htmlQuery, htmlQueryAll, sortBy } from "@util";

/** Extend ActorDirectory to show more information */
class ActorDirectoryPF2e extends ActorDirectory<ActorPF2e<null>> {
    static override entryPartial = "systems/pf2e/templates/sidebar/actor-document-partial.hbs";

    /** Any additional "folder like" elements (such as parties) that are maintained separately */
    extraFolders: Record<string, boolean> = {};

    /** If we are currently dragging a party. Needed because dragenter/dragover doesn't contain the drag source. */
    draggingParty = false;

    static override get defaultOptions(): SidebarDirectoryOptions {
        const options = super.defaultOptions;
        options.renderUpdateKeys.push(
            "system.details.level.value",
            "system.attributes.adjustment",
            "system.details.members",
            "system.campaign.type"
        );
        return options;
    }

    override async getData(): Promise<object> {
        const parties = this.documents
            .filter((a): a is PartyPF2e<null> => a instanceof PartyPF2e)
            .sort(sortBy((p) => p.sort));
        return {
            ...(await super.getData()),
            parties,
            extraFolders: this.extraFolders,
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // Strip actor level from actors we lack proper observer permission for
        for (const element of htmlQueryAll(html, "li.directory-item.actor")) {
            const actor = game.actors.get(element.dataset.documentId ?? "");
            if (!actor?.testUserPermission(game.user, "OBSERVER")) {
                element.querySelector("span.actor-level")?.remove();
            }
        }

        // Implements folder-like collapse/expand functionality for parties.
        for (const partyEl of htmlQueryAll(html, ".party-header")) {
            partyEl.addEventListener("click", (event) => {
                // If this is a controls element, stop propogation and don't open/collapse the sheet
                if (htmlClosest(event.target, "a")?.closest(".controls")) {
                    event.stopPropagation();
                    return;
                }

                const folderEl = htmlClosest(event.target, ".party");
                const documentId = htmlClosest(event.target, "[data-document-id]")?.dataset.documentId ?? "";
                const party = game.actors.get(documentId);
                if (party && folderEl) {
                    this.extraFolders[documentId] = folderEl.classList.contains("collapsed");
                    folderEl.classList.toggle("collapsed");
                    if (this.popOut) this.setPosition();
                }
            });
        }

        // Alternative open sheet button (used by parties)
        for (const openSheetEl of htmlQueryAll(html, "[data-action=open-sheet]")) {
            openSheetEl.addEventListener("click", (event) => {
                event.stopPropagation();
                const documentId = htmlClosest(openSheetEl, "[data-document-id]")?.dataset.documentId;
                const document = game.actors.get(documentId ?? "");
                document?.sheet.render(true);
            });
        }

        // Register event to create an actor as a new party member
        for (const element of htmlQueryAll(html, "[data-action=create-member]")) {
            element.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const documentId = htmlClosest(element, "[data-document-id]")?.dataset.documentId;
                const party = game.actors.get(documentId ?? "");
                if (!(party instanceof PartyPF2e)) return;

                const button = event.currentTarget as HTMLElement;
                const actor = await CharacterPF2e.createDialog(
                    {},
                    {
                        width: 320,
                        left: window.innerWidth - 630,
                        top: button?.offsetTop ?? 0,
                        types: ["creature"],
                    }
                );

                // If the actor was created, add as a member and force the party folder open
                if (actor) {
                    this.extraFolders[party.id] = true;
                    await party.addMembers(actor);
                }
            });
        }

        this.#appendBrowseButton(html);
    }

    protected override _onDragStart(event: ElementDragEvent): void {
        super._onDragStart(event);

        // Add additional party metadata to the drag event
        const fromParty = htmlClosest(event.target, ".party")?.dataset.documentId;
        if (fromParty) {
            const data: ActorSidebarDropData = JSON.parse(event.dataTransfer.getData("text/plain"));
            data.fromParty = fromParty;
            this.draggingParty = fromUuidSync(data.uuid as ActorUUID) instanceof PartyPF2e;
            event.dataTransfer.setData("text/plain", JSON.stringify(data));
        } else {
            this.draggingParty = false;
        }
    }

    /** Overriden to prevent highlighting of certain types of draggeed data (such as parties) */
    protected override _onDragHighlight(event: DragEvent): void {
        if (event.type === "dragenter" && this.draggingParty) {
            event.stopPropagation();
            return;
        }

        super._onDragHighlight(event);
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
    protected override async _renderInner(data: object): Promise<JQuery> {
        const $element = await super._renderInner(data);
        const partyHTML = await renderTemplate("systems/pf2e/templates/sidebar/party-document-partial.hbs", data);
        $element.find(".directory-list").prepend(partyHTML);

        // Inject any additional data for specific party implementations
        for (const header of htmlQueryAll($element.get(0), ".party")) {
            const party = game.actors.get(header.dataset.documentId ?? "");
            if (!(party instanceof PartyPF2e)) continue;

            if (party.campaign?.createSidebarButtons) {
                const sidebarButtons = party.campaign.createSidebarButtons();
                if (sidebarButtons) {
                    header.querySelector(".controls")?.prepend(...sidebarButtons);
                }
            }
        }

        return $element;
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

    protected override _contextMenu($html: JQuery<HTMLElement>): void {
        super._contextMenu($html);
        ContextMenu.create(this, $html, ".party .party-header", this._getEntryContextOptions());
    }

    protected override _getEntryContextOptions(): EntryContextOption[] {
        const options = super._getEntryContextOptions();
        options.push({
            name: "Remove Member",
            icon: '<i class="fas fa-bus"></i>',
            condition: ($li) => $li.closest(".party").length > 0 && !$li.closest(".party-header").length,
            callback: ($li) => {
                const actorId = $li.data("document-id");
                const partyId = $li.closest(".party").data("document-id");
                const actor = game.actors.get(actorId ?? "");
                const party = game.actors.get(partyId ?? "");
                if (actor instanceof ActorPF2e && party instanceof PartyPF2e) {
                    party.removeMembers(actor.uuid as ActorUUID);
                }
            },
        });

        return options;
    }

    /** Append a button to open the bestiary browser for GMs */
    #appendBrowseButton(html: HTMLElement): void {
        if (!game.user.isGM) return;

        const browseButton = document.createElement("button");
        browseButton.type = "button";
        browseButton.append(
            fontAwesomeIcon("search", { fixedWidth: true }),
            " ",
            game.i18n.localize("PF2E.CompendiumBrowser.BestiaryBrowser")
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
