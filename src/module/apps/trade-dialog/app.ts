import type { ActorPF2e, CharacterPF2e, CreaturePF2e, NPCPF2e } from "@actor";
import type { ActorInventory } from "@actor/inventory/index.ts";
import { ItemTransferDialog } from "@actor/sheet/popups/item-transfer-dialog.ts";
import type { ActorUUID, UserUUID } from "@common/documents/_module.d.mts";
import type { ItemPF2e, PhysicalItemPF2e } from "@item";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import type { UserPF2e } from "@module/user/document.ts";
import { ErrorPF2e, localizer } from "@util";
import MiniSearch from "minisearch";
import * as R from "remeda";
import { CompendiumDirectoryPF2e } from "../sidebar/compendium-directory.ts";
import Root from "./app.svelte";

/** An application to facilitate trading between two creature actors */
class TradeDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    constructor({ self, trader, ...options }: ConstructorParams) {
        super(options);
        this.#self = { actor: self.actor, initialMarked: self.item?.id ?? null, gift: self.gift ?? 0 };
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
        actor: TradeActor;
        /** The identifier of an initially-marked item */
        initialMarked: string | null;
        /** The number of items being gifted: a value greater than zero short-circuits the trade process. */
        gift: number;
    };

    /** The other user and their trade data */
    #trader: {
        user: UserPF2e;
        actor: TradeActor;
        /** A clone of the trader's inventory at the time of trade initiation */
        items: PhysicalItemPF2e<TradeActor>[];
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
    static canTrade(args: MaybeTradeInitiationData): args is TradeRequestData {
        if (TradeDialog.#userTrading) return false;
        if (game.paused && !game.user.isGM) return false;
        const { self, trader } = args;
        if (foundry.applications.instances.has("trade-dialog")) return false;
        if (!trader.user?.active || trader.user.isSelf) return false;
        if (!self.actor?.isOwner || !self.actor.isOfType("character", "npc")) return false;
        if (!self.actor.testUserPermission(game.user, "OWNER")) return false;
        if (self.actor.uuid === trader.actor?.uuid) return false;
        if (!trader.actor?.isOfType("character", "npc")) return false;
        if (!self.actor.isAllyOf(trader.actor) && trader.actor.alliance !== null) return false;
        if (self.gift && !self.item) return false;
        if (self.item && (!self.item.isOfType("physical") || !self.actor.inventory.has(self.item.id))) return false;
        return true;
    }

    /** Initiate a trade via user query. */
    static async initiateTrade({ self, trader }: TradeRequestData): Promise<void> {
        TradeDialog.#userTrading = true;
        self.actor.render();
        const giftQuantity =
            self.gift && self.item
                ? (await new ItemTransferDialog({ recipient: trader.actor, item: self.item, mode: "gift" }).resolve())
                      ?.quantity
                : 0;
        if (self.gift && !giftQuantity) return; // Gifting cancelled
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
                const dialog = new TradeDialog({ self: { ...self, gift: giftQuantity }, trader });
                if (self.gift) return dialog.transact();
                await dialog.render({ force: true });
            } else {
                ui.notifications.error(response.message);
                TradeDialog.#userTrading = false;
            }
        } catch {
            ui.notifications.error(TradeDialog.localize("Request.Timeout", { user: trader.user.name }));
            TradeDialog.#userTrading = false;
        }
    }

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
            visible:
                item.actor === selfActor ||
                game.user.isGM ||
                ((otherActor.alliance === null || otherActor.isAllyOf(selfActor)) && !item.isStowed),
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
        trader: { actor: TradeActor; initialMarked: string | null },
        current: TradeItemData[],
    ): TradeItemData[] {
        const initial = trader.initialMarked;
        const inventory: ActorInventory<CreaturePF2e> = trader.actor.inventory;
        const data = inventory
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
        if (message) ui.notifications.error(message);
        this.#trader.user.query("pf2e.trade", { action: "abort" });
        return this.close({ aborted: true });
    }

    /** Create, update and/or delete items following a successful trade. */
    async transact(state = this.$state): Promise<void> {
        if (R.isEmpty(state)) return this.#transactGift();
        const selfActor: CreaturePF2e = this.#self.actor;
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
        this.close({ success: true });
    }

    /** Create a state object with gift data, to be used in lieu of data created during dialog render. */
    #transactGift(): Promise<void> {
        const selfActor: CreaturePF2e = this.#self.actor;
        const traderActor: CreaturePF2e = this.#trader.actor;
        if (!this.#self.gift && !this.#trader.gift) {
            throw ErrorPF2e("Cannot perform gift transaction: nothing marked for gifting");
        }
        return this.transact({
            self: {
                actor: R.pick(selfActor, ["id", "img", "name"]),
                items: [selfActor.inventory.get(this.#self.initialMarked ?? "")]
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
        });
    }

    override close(options: TradeDialogClosingOptions = {}): Promise<this> {
        const self = this.#self;
        const trader = this.#trader;
        if (options.success) {
            const traderName = TradeDialog.#getObfuscatedActorName(trader.actor);
            const message = self.gift
                ? TradeDialog.localize("Gift.Accepted", { trader: traderName })
                : trader.gift && trader.initialMarked
                  ? TradeDialog.localize("Gift.Received", { self: self.actor.name, trader: traderName })
                  : TradeDialog.localize("Success", { self: self.actor.name, trader: traderName });
            ui.notifications.success(message);
        } else if (!options.aborted) {
            const message = TradeDialog.localize("Aborted", { user: trader.user.name });
            trader.user.query("pf2e.trade", { action: "abort", message });
        }
        TradeDialog.#userTrading = false;
        return super.close(options);
    }

    /* -------------------------------------------- */
    /*  Query Handlers                              */
    /* -------------------------------------------- */

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

        // Prompt to transfer a gift
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
                dialog.transact();
                return { ok };
            }
            TradeDialog.#userTrading = false;
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
            await new TradeDialog(args).render({ force: true });
            return { ok };
        } else {
            const selfName = TradeDialog.#getObfuscatedActorName(args.self.actor, args.trader.user);
            const message = TradeDialog.localize("Request.Declined", { trader: selfName, user: game.user.name });
            return { ok, message };
        }
    }

    /** Handle a trade-update query from another user. */
    async #onUpdate(data: UpdateQueryData): Promise<TradeQueryResponse> {
        const dialog = foundry.applications.instances.get("trade-dialog");
        if (!dialog) return { ok: false, message: TradeDialog.localize("Error.NotTrading", { user: game.user.name }) };
        const trader = this.$state.trader;
        if (typeof data.accepted === "boolean") trader.accepted = data.accepted;
        if (data.marked) {
            for (let i = 0; i < trader.items.length; i++) {
                const itemData = trader.items[i];
                const itemId = itemData.id;
                itemData.marked = data.marked[itemId] ?? 0;
            }
        }
        if (data.accepted && this.$state.self.accepted) this.transact();
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
        TradeDialog.#userTrading = false;
        return { ok: false, message: TradeDialog.localize("Error.NotTrading", { user: game.user.name }) };
    }
}

type TradeActor = CharacterPF2e | NPCPF2e;

interface MaybeValidConstructorParams extends DeepPartial<fa.ApplicationConfiguration> {
    self: { actor: ActorPF2e | null; item?: PhysicalItemPF2e | null; gift?: number };
    trader: { user: User | null; actor: ActorPF2e | null; item?: PhysicalItemPF2e | null; gift?: number };
}

interface ConstructorParams extends MaybeValidConstructorParams {
    self: { actor: TradeActor; item?: PhysicalItemPF2e<TradeActor> | null; gift?: number };
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
