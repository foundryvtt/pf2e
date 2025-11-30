import type { ActorPF2e, CharacterPF2e, CreaturePF2e, NPCPF2e } from "@actor";
import { ItemTransferDialog } from "@actor/sheet/popups/item-transfer-dialog.ts";
import type { ActorUUID, UserUUID } from "@common/documents/_module.d.mts";
import type { ItemPF2e, PhysicalItemPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import type { UserPF2e } from "@module/user/document.ts";
import { ErrorPF2e, localizer } from "@util";
import { traitSlugToObject } from "@util/tags.ts";
import MiniSearch from "minisearch";
import * as R from "remeda";
import { CompendiumDirectoryPF2e } from "../sidebar/compendium-directory.ts";
import Root from "./app.svelte";

/** An application to facilitate trading between two creature actors */
class TradeDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    constructor({ self, trader, ...options }: ConstructorParams) {
        super(options);
        const initiator = !!self.initiator;
        this.#self = { actor: self.actor, initiator, initialMarked: self.item?.id ?? null, gift: self.gift ?? 0 };
        this.#self.actor.apps[this.id] = this;
        this.#trader = {
            user: trader.user,
            actor: trader.actor,
            items: trader.actor.inventory.map((i) => i.clone({}, { keepId: true })),
            initialMarked: trader.item?.id ?? null,
            gift: trader.gift ?? 0,
        };
        this.#trader.actor.apps[this.id] = this;
    }

    static override DEFAULT_OPTIONS = {
        tag: "article",
        id: "trade-dialog",
        window: { icon: "fa-regular fa-money-bill-transfer" },
        position: { width: 854 },
    };

    /** Is the user currently trading or has a pending trade? */
    static #userTrading = false;

    /** Reusable localization shorthand function */
    static localize = localizer("PF2E.TradeDialog");

    protected root = Root;

    declare protected $state: TradeDialogState;

    /** The present user's side of the trade */
    #self: {
        actor: CreaturePF2e;
        /** Whether this side initiated the trade */
        initiator: boolean;
        /** The identifier of an initially-marked item */
        initialMarked: string | null;
        /** The number of items being gifted: a value greater than zero short-circuits the trade process. */
        gift: number;
    };

    /** The other user and their trade data */
    #trader: {
        user: UserPF2e;
        actor: CreaturePF2e;
        /** A clone of the trader's inventory at the time of trade initiation */
        items: PhysicalItemPF2e<CreaturePF2e>[];
        /** The identifier of an initially-marked item */
        initialMarked: string | null;
        /** The number of items being gifted: a value greater than zero short-circuits the trade process. */
        gift: number;
    };

    override get title(): string {
        const trader = TradeDialog.#getObfuscatedActorName(this.#trader.actor);
        return game.i18n.format("PF2E.TradeDialog.Title", { trader });
    }

    /** Can the current user trade utilizing the provided trade-initiation data? */
    static canTrade(args: MaybeTradeInitiationData, { checkReach = false } = {}): args is TradeRequestData {
        if (TradeDialog.#userTrading) return false;
        const { self, trader } = args;
        const traderActor = trader.actor;
        if (!traderActor?.isOfType("creature") || !trader.user?.active || trader.user.isSelf) return false;
        if (!self.actor?.isOwner || !self.actor.isOfType("character", "npc")) return false;
        if (!self.actor.testUserPermission(game.user, "OWNER")) return false;
        if (self.actor.uuid === traderActor?.uuid) return false;
        if (!self.actor.isOfType("character", "npc")) return false;
        if (!self.actor.isAllyOf(traderActor) && traderActor.alliance !== null) return false;
        if (self.gift && !self.item) return false;
        if (self.item) {
            if (!self.item.isOfType("physical") || !self.actor.inventory.has(self.item.id)) return false;
            if (self.item.quantity === 0) return false;
        }
        if (!checkReach || !canvas.grid.isSquare) return true;

        const traderTokens = traderActor.getActiveTokens(true, false);
        const selfReach = self.actor.system.attributes.reach.manipulate;
        const traderReach = traderActor.system.attributes.reach.manipulate;
        const inReach = self.actor.getActiveTokens(true, false).some((selfToken) =>
            traderTokens.some((traderToken) => {
                const distance = selfToken.distanceTo(traderToken);
                return selfReach >= distance && traderReach >= distance;
            }),
        );
        if (!inReach) {
            const formatArgs = { self: self.actor.name, trader: traderActor.name };
            const message = TradeDialog.localize("Error.OutOfReach", formatArgs);
            ui.notifications.error(message, { console: false });
            return false;
        }
        return true;
    }

    /** Request a trade via user query. */
    static async requestTrade({ self, trader }: TradeRequestData): Promise<void> {
        TradeDialog.#userTrading = true;

        // Check for resolution without rendering application
        const giftQuantity =
            self.gift && self.item
                ? (await ItemTransferDialog.wait({ recipient: trader.actor, item: self.item, mode: "gift" }))?.quantity
                : 0;
        if (self.gift && !giftQuantity) {
            // Gifting cancelled
            TradeDialog.#userTrading = false;
            return;
        }

        const queryData: RequestQueryData = {
            action: "request",
            initiator: { user: game.user.uuid, actor: self.actor.uuid, item: self.item?.id, gift: giftQuantity },
            target: { actor: trader.actor.uuid },
        };
        const traderName = TradeDialog.#getObfuscatedActorName(trader.actor);
        ui.notifications.info(TradeDialog.localize("Request.Requesting", { trader: traderName }));
        try {
            const response = await trader.user.query("pf2e.trade", queryData, { timeout: 30_000 });
            if (!response) throw ErrorPF2e("No response from other side.");
            if (response.ok) {
                const dialog = new TradeDialog({ self: { ...self, gift: giftQuantity, initiator: true }, trader });
                await (self.gift ? dialog.close({ success: true }) : dialog.render({ force: true }));
            } else {
                ui.notifications.error(response.message, { console: false });
                TradeDialog.#userTrading = false;
            }
        } catch {
            const message = TradeDialog.localize("Request.Timeout", { user: trader.user.name });
            ui.notifications.error(message, { console: false });
            TradeDialog.#userTrading = false;
        }
    }

    static #validateConstructorParams(data: MaybeValidConstructorParams): asserts data is ConstructorParams {
        const { self, trader } = data;
        const error = "Invalid trade construction data";
        if (!trader.user?.active || !trader.actor?.testUserPermission(trader.user, "OWNER")) throw ErrorPF2e(error);
        for (const side of [self, trader]) {
            if (side.actor?.inCompendium || !side.actor?.isOfType("character", "npc")) throw ErrorPF2e(error);
            if (side.gift && (!side.item || side.gift < 1)) throw ErrorPF2e(error);
            if (side.item && (!side.item.isOfType("physical") || side.item.actor?.uuid !== side.actor.uuid)) {
                throw ErrorPF2e(error);
            }
        }
    }

    /** Get an actor name appropriate for displaying to the current user. */
    static #getObfuscatedActorName(actor: ActorPF2e, user: UserPF2e = game.user): string {
        return actor.testUserPermission(user, "LIMITED")
            ? actor.name
            : (actor.token?.name ?? actor.prototypeToken.name);
    }

    #itemToData(item: PhysicalItemPF2e, marked: number): TradeItemData {
        const selfActor = this.#self.actor;
        const otherActor = this.#trader.actor;
        return {
            ...R.pick(item, ["id", "name", "img", "quantity"]),
            marked: Math.clamp(marked, 0, item.quantity),
            matchScore: 1,
            visible: item.actor === selfActor || game.user.isGM || (otherActor.isAllyOf(selfActor) && !item.isStowed),
        };
    }

    protected override async _prepareContext(options: fa.ApplicationRenderOptions): Promise<TradeDialogRenderContext> {
        const context = await super._prepareContext(options);
        const self = this.#self;
        const trader = this.#trader;
        const selfItems = this.#prepareItems(self, this.$state.self?.items ?? []);
        const wordSegmenter =
            "Segmenter" in Intl
                ? new Intl.Segmenter(game.i18n.lang, { granularity: "word" })
                : {
                      // Firefox >:(
                      segment(term: string): { segment: string }[] {
                          return [{ segment: term }];
                      },
                  };
        const searchEngine = new MiniSearch({
            fields: ["name", "originalName"],
            idField: "id",
            processTerm: (term): string[] | null => {
                if (term.length < 2 || CompendiumDirectoryPF2e.STOP_WORDS.has(term)) return null;
                return Array.from(wordSegmenter.segment(term))
                    .map((t) =>
                        fa.ux.SearchFilter.cleanQuery(t.segment.toLocaleLowerCase(game.i18n.lang)).replace(/['"]/g, ""),
                    )
                    .filter((t) => t.length >= 2);
            },
            searchOptions: { combineWith: "AND", prefix: true },
            storeFields: ["id", "name"],
        });
        searchEngine.addAll([...selfItems]);
        return Object.assign(context, {
            state: {
                self: {
                    actor: R.pick(self.actor, ["id", "img", "name"]),
                    items: selfItems,
                    accepted: false,
                },
                trader: {
                    actor: {
                        id: trader.actor.id,
                        img: trader.actor.img,
                        name: TradeDialog.#getObfuscatedActorName(trader.actor),
                    },
                    items: this.#prepareItems(trader, this.$state.trader?.items ?? []),
                    accepted: false,
                },
            },
            foundryApp: this,
            traderUser: trader.user,
            searchEngine,
            localize: TradeDialog.localize,
        });
    }

    #prepareItems(
        trader: { actor: CreaturePF2e; initialMarked: string | null },
        current: TradeItemData[],
    ): TradeItemData[] {
        const initial = trader.initialMarked;
        const data = trader.actor.inventory
            .filter((i) => i.quantity > 0)
            .map((item) => {
                const itemData = current.find((i) => i.id === item.id);
                const marked = itemData?.marked ?? (initial === item.id ? item.quantity : 0);
                return this.#itemToData(item, marked);
            });
        if (trader === this.#self) data.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
        else data.sort((a, b) => b.marked - a.marked || a.name.localeCompare(b.name, game.i18n.lang));
        return data;
    }

    async abortTrade(message: string): Promise<this> {
        if (message) ui.notifications.error(message, { console: false });
        this.#trader.user.query("pf2e.trade", { action: "abort" });
        return this.close({ aborted: true });
    }

    /** Create, update and/or delete items following a successful trade. */
    async #transact(): Promise<void> {
        const state = this.$state;
        const selfActor = this.#self.actor;
        if (!state.trader.accepted) throw ErrorPF2e(`${this.#trader.user.name} hasn't accepted the trade`);
        const receivedQuantities = R.mapToObj(
            state.trader.items.filter((i) => i.marked > 0),
            (i) => [i.id, i.marked],
        );

        // Deletions
        const toDelete = state.self.items.filter((i) => i.marked === i.quantity).map((i) => i.id);
        await selfActor.deleteEmbeddedDocuments("Item", toDelete, { render: false });

        // Creations and/or quantity increases)
        const toReceive = this.#trader.items
            .filter((i) => !!receivedQuantities[i.id])
            .map((i) =>
                i.clone({
                    system: { container: null, quantity: receivedQuantities[i.id] },
                    "_stats.duplicateSource": i.uuid,
                }),
            );
        await selfActor.inventory.add(toReceive, { stack: true, render: false });

        // Quantity deductions
        const toUpdate = state.self.items
            .filter((i) => selfActor.inventory.has(i.id) && i.marked > 0 && i.marked < i.quantity)
            .map((i) => {
                const quantity = Math.max(0, (selfActor.inventory.get(i.id)?.quantity ?? i.quantity) - i.marked);
                return { _id: i.id, "system.quantity": quantity };
            });
        await selfActor.updateEmbeddedDocuments("Item", toUpdate, { render: false });

        this.#trader.actor.render();
        selfActor.render();
    }

    /** Create a state object with gift data, to be used in lieu of data created during dialog render. */
    #setGiftData(): void {
        if (!this.#self.gift && !this.#trader.gift) {
            throw ErrorPF2e("Cannot perform gift transaction: nothing marked for gifting");
        }
        const traderActor = this.#trader.actor;
        this.$state = {
            self: {
                actor: R.pick(this.#self.actor, ["id", "img", "name"]),
                items: [this.#self.actor.inventory.get(this.#self.initialMarked ?? "")]
                    .filter(R.isDefined)
                    .map((i) => this.#itemToData(i, this.#self.gift)),
                accepted: true,
            },
            trader: {
                actor: {
                    id: traderActor.id,
                    img: traderActor.img,
                    name: TradeDialog.#getObfuscatedActorName(traderActor),
                },
                items: [traderActor.inventory.get(this.#trader.initialMarked ?? "")]
                    .filter(R.isDefined)
                    .map((i) => this.#itemToData(i, this.#trader.gift)),
                accepted: true,
            },
        };
    }

    /** Create and send an appropriate notification upon successful conclusion of a trade. */
    #notifySuccess(itemsExchanged: boolean): void {
        const self = this.#self;
        const selfName = self.actor.name;
        const trader = this.#trader;
        const traderName = TradeDialog.#getObfuscatedActorName(trader.actor);
        if (self.gift) {
            ui.notifications.success(TradeDialog.localize("Gift.Accepted", { trader: traderName }));
        } else if (trader.gift) {
            ui.notifications.success(TradeDialog.localize("Gift.Received", { self: selfName, trader: traderName }));
        } else if (itemsExchanged) {
            const message = TradeDialog.localize("Success.Finished", { self: selfName, trader: traderName });
            ui.notifications.success(message);
        } else {
            ui.notifications.info(TradeDialog.localize("Success.NoItems"));
        }
    }

    async #postMessage(itemsExchanged: boolean): Promise<void> {
        const self = this.#self;
        const trader = this.#trader;
        if (!self.initiator || !itemsExchanged || !self.actor.combatant?.combat.started) return;
        const receivedItems = !self.gift && this.$state.trader.items.some((i) => i.marked);
        const mutualExchange = receivedItems && !trader.gift && this.$state.self.items.some((i) => i.marked);
        const annotationKey = mutualExchange ? "ExchangeItems" : "GiveItem";
        const subtitle = `PF2E.Actions.Interact.${annotationKey}.Title`;
        const flavorData = {
            action: { title: "PF2E.Actions.Interact.Title", subtitle, glyph: mutualExchange ? 2 : 1 },
            traits: [traitSlugToObject("manipulate", CONFIG.PF2E.actionTraits)],
        };
        const templates = {
            flavor: `${SYSTEM_ROOT}/templates/chat/action/flavor.hbs`,
            content: `${SYSTEM_ROOT}/templates/chat/action/content.hbs`,
        };
        const itemExchanged = mutualExchange
            ? null
            : receivedItems
              ? trader.actor.inventory.get(this.$state.trader.items.find((i) => i.marked)?.id ?? "")
              : self.actor.inventory.get(this.$state.self.items.find((i) => i.marked)?.id ?? "");
        const flavor = await fa.handlebars.renderTemplate(templates.flavor, flavorData);
        const speakerActor = receivedItems && !mutualExchange ? trader.actor : self.actor;
        const speaker = ChatMessagePF2e.getSpeaker({
            actor: speakerActor,
            token: speakerActor.token ?? speakerActor.getActiveTokens(true, true)[0],
        });
        const other = speakerActor === self.actor ? trader.actor : self.actor;
        const content = await fa.handlebars.renderTemplate(templates.content, {
            imgPath: itemExchanged?.img ?? `${SYSTEM_ROOT}/icons/actions/interact/trade.webp`,
            message: game.i18n.format(`PF2E.Actions.Interact.${annotationKey}.Description`, {
                actor: speaker.alias,
                other: TradeDialog.#getObfuscatedActorName(other),
                item: itemExchanged?.name ?? game.i18n.localize("PF2E.Actions.Interact.GiveItem.AnItem"),
            }),
        });
        await ChatMessagePF2e.create({
            speaker,
            flavor,
            content,
            style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
            author: speakerActor === self.actor ? game.user.id : this.#trader.user.id,
        });
    }

    override async close(options: TradeDialogClosingOptions = {}): Promise<this> {
        if (options.success) {
            if (this.#self.gift || this.#trader.gift) this.#setGiftData();
            const itemsExchanged =
                this.$state.self.items.some((i) => i.marked) || this.$state.trader.items.some((i) => i.marked);
            this.#notifySuccess(itemsExchanged);
            await this.#postMessage(itemsExchanged);
            this.#transact();
        } else if (!options.aborted) {
            const trader = this.#trader;
            const message = TradeDialog.localize("Aborted", { user: trader.user.name });
            trader.user.query("pf2e.trade", { action: "abort", message });
        }
        TradeDialog.#userTrading = false;
        delete this.#self.actor.apps[this.id];
        delete this.#trader.actor.apps[this.id];
        return super.close(options);
    }

    /* -------------------------------------------- */
    /*  Query Handling                              */
    /* -------------------------------------------- */

    static handleQuery = async (data: TradeQueryData): Promise<TradeQueryResponse> => {
        switch (data.action) {
            case "request":
                return TradeDialog.#userTrading
                    ? { ok: false, message: TradeDialog.localize("Error.Engaged", { user: game.user.name }) }
                    : TradeDialog.#onRequest(data);
            case "update": {
                const dialog = foundry.applications.instances.get("trade-dialog");
                return dialog instanceof TradeDialog
                    ? dialog.#onUpdate(data)
                    : { ok: false, message: TradeDialog.localize("Error.NotTrading", { user: game.user.name }) };
            }
            case "abort":
                return TradeDialog.#onAbort(data);
            default:
                throw ErrorPF2e("Unrecognized trade query action");
        }
    };

    /** Handle a trade request from another user. */
    static async #onRequest(data: RequestQueryData): Promise<TradeQueryResponse> {
        const otherActor = fromUuidSync<ActorPF2e>(data.initiator.actor);
        const args: MaybeValidConstructorParams = {
            self: { actor: fromUuidSync<ActorPF2e>(data.target.actor) },
            trader: {
                user: fromUuidSync(data.initiator.user),
                actor: otherActor,
                item: otherActor?.inventory.get(data.initiator.item ?? "") ?? null,
                gift: data.initiator.gift ?? 0,
            },
        };
        TradeDialog.#validateConstructorParams(args);
        TradeDialog.#userTrading = true;
        const dialog = new TradeDialog(args);
        const initiatorName = TradeDialog.#getObfuscatedActorName(args.trader.actor);

        // Confirm to accept a gift
        if (args.trader.item && args.trader.gift) {
            const { user, item, gift: quantity } = args.trader;
            const title = TradeDialog.localize("Gift.Prompt.Title", { trader: initiatorName });
            const ok = await fa.api.DialogV2.confirm({
                window: { icon: "fa-solid fa-gift", title },
                content: TradeDialog.localize("Gift.Prompt.Content", {
                    trader: initiatorName,
                    user: user.name,
                    item: item.name,
                    quantity,
                    self: args.self.actor.name,
                }),
                yes: { default: true },
            });
            if (ok) {
                dialog.close({ success: true });
                return { ok };
            }
            dialog.close({ aborted: true });
            const selfName = TradeDialog.#getObfuscatedActorName(args.self.actor, args.trader.user);
            return { ok, message: TradeDialog.localize("Gift.Declined", { trader: selfName, user: user.name }) };
        }

        // Confirm with user before initiating
        const windowIcon = TradeDialog.DEFAULT_OPTIONS.window.icon;
        const title = TradeDialog.localize("Request.Prompt.Title", { trader: initiatorName });
        const ok = await fa.api.DialogV2.confirm({
            window: { icon: windowIcon, title },
            content: TradeDialog.localize("Request.Prompt.Content", {
                trader: initiatorName,
                user: args.trader.user.name,
                self: args.self.actor.name,
            }),
            yes: { default: true },
        });
        if (ok) {
            await dialog.render({ force: true });
            return { ok };
        }
        const selfName = TradeDialog.#getObfuscatedActorName(args.self.actor, args.trader.user);
        const message = TradeDialog.localize("Request.Declined", { trader: selfName, user: game.user.name });
        dialog.close({ aborted: true });
        return { ok, message };
    }

    /** Handle a trade-update query from another user. */
    async #onUpdate(data: UpdateQueryData): Promise<TradeQueryResponse> {
        const trader = this.$state.trader;
        if (typeof data.accepted === "boolean") trader.accepted = data.accepted;
        if (data.marked) {
            for (let i = 0; i < trader.items.length; i++) {
                const itemData = trader.items[i];
                const itemId = itemData.id;
                itemData.marked = data.marked[itemId] ?? 0;
            }
        }
        if (data.accepted && this.$state.self.accepted) this.close({ success: true });
        return { ok: true };
    }

    /** Handle a trade-end query from another user. */
    static async #onAbort(data: AbortQueryData): Promise<TradeQueryResponse> {
        const dialog = foundry.applications.instances.get("trade-dialog");
        if (dialog instanceof TradeDialog) {
            if (data.message) ui.notifications.warn(data.message);
            await dialog.close({ aborted: true });
            return { ok: true };
        }
        return { ok: false, message: TradeDialog.localize("Error.NotTrading", { user: game.user.name }) };
    }
}

type TradeActor = CharacterPF2e | NPCPF2e;

interface MaybeValidConstructorParams extends DeepPartial<fa.ApplicationConfiguration> {
    self: { actor: ActorPF2e | null; item?: PhysicalItemPF2e | null; gift?: number };
    trader: { user: User | null; actor: ActorPF2e | null; item?: PhysicalItemPF2e | null; gift?: number };
}

interface ConstructorParams extends MaybeValidConstructorParams {
    self: { actor: TradeActor; initiator?: boolean; item?: PhysicalItemPF2e<TradeActor> | null; gift?: number };
    trader: { user: UserPF2e; actor: TradeActor; item?: PhysicalItemPF2e<TradeActor> | null; gift?: number };
}

interface TradeItemData extends Pick<PhysicalItemPF2e, "id" | "name" | "img" | "quantity"> {
    readonly visible: boolean;
    marked: number;
    matchScore: number;
}

interface MaybeTradeInitiationData {
    self: { actor?: ActorPF2e | null; item?: ItemPF2e | null; gift?: boolean };
    trader: { actor?: ActorPF2e | null; user?: UserPF2e };
}

interface TradeRequestData extends MaybeTradeInitiationData {
    self: { actor: TradeActor; item?: PhysicalItemPF2e<TradeActor>; gift?: boolean };
    trader: { actor: TradeActor; user: UserPF2e };
}

interface TradeDialogState {
    self: {
        actor: Pick<ActorPF2e, "id" | "name" | "img">;
        items: TradeItemData[];
        accepted: boolean;
    };
    trader: {
        actor: Pick<ActorPF2e, "id" | "name" | "img">;
        items: TradeItemData[];
        accepted: boolean;
    };
}

interface TradeDialogRenderContext extends SvelteApplicationRenderContext {
    foundryApp: TradeDialog;
    state: TradeDialogState;
    traderUser: UserPF2e;
    searchEngine: MiniSearch;
    localize: ReturnType<typeof localizer>;
}

interface QueryResponseOK {
    ok: true;
}

interface QueryResponseNotOK {
    ok: false;
    message: string;
}

type TradeQueryResponse = QueryResponseOK | QueryResponseNotOK;

interface RequestQueryData {
    action: "request";
    initiator: { user: UserUUID; actor: ActorUUID; item?: string | null; gift?: number };
    target: { actor: ActorUUID };
}

interface UpdateQueryData {
    action: "update";
    marked?: Record<string, number>;
    accepted?: boolean;
}

interface AbortQueryData {
    action: "abort";
    message?: string;
}

type TradeQueryData = RequestQueryData | UpdateQueryData | AbortQueryData;

interface TradeDialogClosingOptions extends fa.ApplicationClosingOptions {
    aborted?: boolean;
    success?: boolean;
}

export { TradeDialog };
export type { TradeDialogRenderContext, TradeItemData, TradeQueryData, TradeQueryResponse, TradeRequestData };
