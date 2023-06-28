import { CreaturePF2e } from "@actor";
import { Language } from "@actor/creature/index.ts";
import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { Statistic } from "@system/statistic/index.ts";
import { createHTMLElement, htmlClosest, htmlQuery, htmlQueryAll, sortBy, sum } from "@util";
import { PartyPF2e } from "./document.ts";
import { LanguageSheetData, MemberBreakdown, PartySheetData } from "./types.ts";
import { ActorSheetRenderOptionsPF2e } from "@actor/sheet/data-types.ts";

interface PartySheetRenderOptions extends ActorSheetRenderOptionsPF2e {
    actors?: boolean;
}

class PartySheetPF2e extends ActorSheetPF2e<PartyPF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;

        return {
            ...options,
            classes: [...options.classes, "party"],
            width: 720,
            height: 580,
            template: "systems/pf2e/templates/actors/party/sheet.hbs",
            scrollY: [...options.scrollY, ".tab.active", ".tab.active .content", ".sidebar"],
            tabs: [
                {
                    navSelector: "form > nav",
                    contentSelector: ".container",
                    initial: "main",
                },
            ],
        };
    }

    regionTemplates: Record<string, string> = {
        overview: "overview.hbs",
        inventoryMembers: "inventory-members.hbs",
        exploration: "exploration.hbs",
        explorationSidebar: "exploration-sidebar.hbs",
    };

    override get isLootSheet(): boolean {
        return this.actor.canUserModify(game.user, "update");
    }

    override async getData(options?: ActorSheetOptions): Promise<PartySheetData> {
        const base = await super.getData(options);
        const members = this.actor.members;

        return {
            ...base,
            members: this.#prepareMembers(),
            inventorySummary: {
                totalCoins:
                    sum(members.map((actor) => actor.inventory.coins.goldValue ?? 0)) +
                    this.actor.inventory.coins.goldValue,
                totalWealth:
                    sum(members.map((actor) => actor.inventory.totalWealth.goldValue ?? 0)) +
                    this.actor.inventory.totalWealth.goldValue,
                totalBulk: members
                    .map((actor) => actor.inventory.bulk.value)
                    .reduce((a, b) => a.plus(b), this.actor.inventory.bulk.value),
            },
            languages: this.#prepareLanguages(),
            orphaned: this.actor.items.filter((i) => !i.isOfType(...this.actor.allowedItemTypes)),
        };
    }

    #prepareMembers(): MemberBreakdown[] {
        /** sanitize common cases for npc sense types (by removing acuity and range). This should be removed once npcs are refactored */
        function sanitizeSense(label: string): string {
            return label
                .replace(/\((imprecise|precise)\)/gi, "")
                .replace(/\d+/g, "")
                .replaceAll("feet", "")
                .trim();
        }

        return this.actor.members.map((actor) => {
            const hasBulk = actor.inventory.bulk.encumberedAt !== Infinity;
            const bestSkills = Object.values(actor.skills ?? {})
                .filter((s): s is Statistic => !!s?.proficient)
                .sort(sortBy((s) => s.mod ?? 0))
                .reverse()
                .slice(0, 5)
                .map((s) => ({ slug: s.slug, mod: s.mod, label: s.label, rank: s.rank }));
            const heroPoints = actor.isOfType("character") ? actor.system.resources.heroPoints : null;
            const senses = (() => {
                const rawSenses = actor.system.traits.senses ?? [];
                if (!Array.isArray(rawSenses)) {
                    return rawSenses.value.split(",").map((l) => ({
                        labelFull: l.trim(),
                        label: sanitizeSense(l),
                    }));
                }

                // An actor sometimes has only darkvision (fetchling), or darkvision and low-light vision (elf aasimar).
                // This is inconsistent, but normal for pf2e. However, its redundant for this sheet.
                // We remove low-light vision from the result if the actor has darkvision.
                const hasDarkvision = rawSenses.some((s) => s.type === "darkvision");
                const adjustedSenses = hasDarkvision ? rawSenses.filter((r) => r.type !== "lowLightVision") : rawSenses;
                return adjustedSenses.map((r) => ({
                    acuity: r.acuity,
                    labelFull: r.label ?? "",
                    label: CONFIG.PF2E.senses[r.type] ?? r.type,
                }));
            })();
            return { actor, hasBulk, bestSkills, heroPoints, senses };
        });
    }

    #prepareLanguages(): LanguageSheetData[] {
        const allLanguages = new Set(this.actor.members.flatMap((m) => m.system.traits.languages?.value ?? []));

        return [...allLanguages]
            .map(
                (slug): LanguageSheetData => ({
                    slug,
                    label: game.i18n.localize(CONFIG.PF2E.languages[slug]),
                    actors: this.#getActorsThatUnderstand(slug),
                })
            )
            .sort(sortBy((l) => l.label));
    }

    #getActorsThatUnderstand(slug: Language) {
        return this.actor.members.filter((m): m is CreaturePF2e => !!m?.system.traits.languages?.value.includes(slug));
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // Add open actor sheet links
        for (const openSheetLink of htmlQueryAll(html, "[data-action=open-sheet]")) {
            const tab = openSheetLink.dataset.tab;
            const actorUUID = htmlClosest(openSheetLink, "[data-actor-uuid]")?.dataset.actorUuid;
            const actor = fromUuidSync(actorUUID ?? "");
            openSheetLink.addEventListener("click", async () => actor?.sheet.render(true, { tab }));
        }

        for (const memberElem of htmlQueryAll(html, "[data-actor-uuid]")) {
            const actorUUID = memberElem.dataset.actorUuid;
            const actor = this.document.members.find((m) => m.uuid === actorUUID);

            if (game.user.isGM) {
                htmlQuery(memberElem, "a[data-action=remove-member]")?.addEventListener("click", async (event) => {
                    const confirmed = event.ctrlKey
                        ? true
                        : await Dialog.confirm({
                              title: game.i18n.localize("PF2E.Actor.Party.RemoveMember.Title"),
                              content: game.i18n.localize("PF2E.Actor.Party.RemoveMember.Content"),
                          });
                    if (confirmed && actor) {
                        this.document.removeMembers(actor);
                    }
                });
            }

            if (actor?.isOfType("character") && actor.canUserModify(game.user, "update")) {
                const heroPointsPips = htmlQuery(memberElem, "a[data-action=adjust-hero-points]");
                const { heroPoints } = actor;
                heroPointsPips?.addEventListener("click", async () => {
                    const newValue = Math.min(heroPoints.value + 1, heroPoints.max);
                    await actor.update({ "system.resources.heroPoints.value": newValue });
                });
                heroPointsPips?.addEventListener("contextmenu", async (event) => {
                    event.preventDefault();
                    const newValue = Math.max(heroPoints.value - 1, 0);
                    await actor.update({ "system.resources.heroPoints.value": newValue });
                });
            }
        }

        // Mouseover tooltips to show actors that speak the language
        for (const languageTag of htmlQueryAll(html, "[data-language]")) {
            const slug = languageTag.dataset.language as Language;
            const actors = this.#getActorsThatUnderstand(slug);
            const members = actors.map((m) => m.name).join(", ");
            const titleLabel = game.i18n.localize("PF2E.Actor.Party.MembersLabel");
            const title = createHTMLElement("strong", { children: [titleLabel] });
            const content = createHTMLElement("span", { children: [title, members] });
            $(languageTag).tooltipster({ content });
        }
    }

    /** Overriden to prevent inclusion of campaign-only item types. Those should get added to their own sheet */
    protected override async _onDropItemCreate(
        itemData: ItemSourcePF2e | ItemSourcePF2e[]
    ): Promise<Item<PartyPF2e>[]> {
        const toTest = Array.isArray(itemData) ? itemData : [itemData];
        const supported = [...PHYSICAL_ITEM_TYPES, ...this.actor.baseAllowedItemTypes];
        const invalid = toTest.filter((i) => !supported.includes(i.type));
        if (invalid.length) {
            for (const source of invalid) {
                const type = game.i18n.localize(CONFIG.Item.typeLabels[source.type] ?? source.type.titleCase());
                ui.notifications.error(game.i18n.format("PF2E.Item.CannotAddType", { type }));
            }
            return [];
        }

        return super._onDropItemCreate(itemData);
    }

    /** Recursively performs a render and activation of all sub-regions */
    async #renderRegions(element: HTMLElement, data: object): Promise<void> {
        // Eventually this should cache results to compare if re-rendering
        for (const region of htmlQueryAll(element, "[data-region]")) {
            const regionId = region.dataset.region ?? "";
            const templateName = this.regionTemplates[regionId];
            if (!templateName) continue;

            const template = `systems/pf2e/templates/actors/party/regions/${templateName}`;
            const result = await renderTemplate(template, data);

            region.innerHTML = result;
            if (this._state !== Application.RENDER_STATES.RENDERING) {
                this.activateListeners($(region));
            }

            await this.#renderRegions(region, data);
        }
    }

    override async render(force?: boolean, options?: PartySheetRenderOptions): Promise<this> {
        if (options?.actors) {
            const data = await this.getData();
            this._saveScrollPositions(this.element);
            await this.#renderRegions(this.element[0], data);
            this._restoreScrollPositions(this.element);
            return this;
        } else {
            return super.render(force, options);
        }
    }

    protected override async _renderInner(
        data: Record<string, unknown>,
        options: RenderOptions
    ): Promise<JQuery<HTMLElement>> {
        const result = await super._renderInner(data, options);
        await this.#renderRegions(result[0], data);

        return result;
    }

    protected override async _onDropActor(
        event: ElementDragEvent,
        data: DropCanvasData<"Actor", PartyPF2e>
    ): Promise<false | void> {
        await super._onDropActor(event, data);

        const actor = fromUuidSync(data.uuid as ActorUUID);
        if (actor instanceof CreaturePF2e) {
            this.document.addMembers(actor);
        }
    }
}

export { PartySheetPF2e, PartySheetRenderOptions };
