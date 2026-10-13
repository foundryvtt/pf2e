import type { ActorPF2e } from "@actor";
import type { ImageFilePath } from "@common/constants.d.mts";
import type { Folder } from "@client/documents/_module.d.mts";
import type { PhysicalItemPF2e } from "@item";
import { ItemPF2e, SpellPF2e } from "@item";
import type { EffectTrait } from "@item/abstract-effect/types.ts";
import { SpellcastingItemCreator } from "@item/consumable/apps/spellcasting-item-creator/app.ts";
import { spellConsumableCategoriesFor } from "@item/consumable/spell-consumables.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { sizeItemForActor, transferCredits } from "@item/physical/helpers.ts";
import { TradeDialog } from "@module/apps/trade-dialog/app.svelte.ts";
import type { DropCanvasItemData } from "@module/canvas/drop-canvas-data.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { TagSelectorBasic, type SelectableTagField } from "@system/tag-selector/index.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { ErrorPF2e } from "@util";
import * as R from "remeda";
import { ItemTransferDialog } from "../popups/item-transfer-dialog.ts";
import { IWREditor } from "../popups/iwr-editor.ts";

/** A tab in the sheet's navigation */
interface SheetTabData {
    id: string;
    label: string;
    /** A Font Awesome icon class */
    icon?: string;
    /** Action glyph text, shown instead of an icon */
    glyph?: string;
}

interface SheetTabsConfiguration extends fa.ApplicationTabsConfiguration {
    tabs: SheetTabData[];
}

/** What the current user may do on this sheet. Components read these, never `game.user`. */
interface SheetPermissions {
    /** The sheet allows edits (core `isEditable`: owner, not in a locked compendium) */
    editable: boolean;
    owner: boolean;
    /** Limited permission and nothing higher */
    limited: boolean;
    /** Not an owner, but may take and deposit items */
    lootable: boolean;
    observer: boolean;
}

interface ActorSheetStateV2 {
    permissions: SheetPermissions;
    tabs: SheetTabData[];
    name: string;
    img: ImageFilePath;
}

interface ActorSheetContextV2<TActor extends ActorPF2e = ActorPF2e>
    extends fa.api.DocumentSheetRenderContext, SvelteApplicationRenderContext {
    foundryApp: ActorSheetPF2eV2<TActor>;
    state: ActorSheetStateV2;
}

/** Where on the sheet something was dropped. Drop zones supply it, so no DOM is read. */
interface SheetDropContext {
    /** A container to place a physical item in */
    containerId?: string | null;
    /** The drop landed on the inventory, which turns a dropped spell into a consumable */
    inventory?: boolean;
}

type IWRCategory = "immunities" | "weaknesses" | "resistances";

/** Base class for AppV2 actor sheets. Writes go through public methods, never the core form pipeline. */
abstract class ActorSheetPF2eV2<TActor extends ActorPF2e> extends SvelteApplicationMixin<
    AbstractConstructorOf<fa.sheets.ActorSheetV2<ActorPF2e>> & {
        DEFAULT_OPTIONS: DeepPartial<fa.api.DocumentSheetConfiguration>;
        TABS: Record<string, fa.ApplicationTabsConfiguration>;
    }
>(fa.sheets.ActorSheetV2) {
    static override DEFAULT_OPTIONS: DeepPartial<fa.api.DocumentSheetConfiguration> = {
        classes: ["actor"],
        window: { resizable: true },
    };

    /** Subclasses define their navigation in the `primary` group */
    static override TABS: Record<string, SheetTabsConfiguration> = {};

    constructor(options?: DeepPartial<fa.api.DocumentSheetConfiguration>) {
        super(options);
        // A reactive copy, allowing Svelte to see tab changes without a render
        const tabGroups = $state({ ...this.tabGroups });
        this.tabGroups = tabGroups;
    }

    /** Mark unlinked token sheets, which otherwise share the world actor's title */
    override get title(): string {
        const title = super.title;
        return this.actor.isToken ? `[${_loc(foundry.documents.TokenDocument.metadata.label)}] ${title}` : title;
    }

    get sheetTabs(): SheetTabData[] {
        return (this.constructor as typeof ActorSheetPF2eV2).TABS.primary?.tabs ?? [];
    }

    /** The active primary tab, falling back to the first for an unknown id from `render({ tab })` */
    get activeTab(): string {
        const tabs = this.sheetTabs;
        const active = this.tabGroups.primary;
        return tabs.some((t) => t.id === active) ? active : (tabs.at(0)?.id ?? "");
    }

    /** Is the user not an owner, but able to take and deposit items? */
    get isLootSheet(): boolean {
        return !this.actor.isOwner && this.actor.isLootableBy(game.user);
    }

    /** Sets the active tab and leaves the DOM to Svelte */
    override changeTab(tab: string, group: string): void {
        if (this._getTabsConfig(group)?.tabs.some((t) => t.id === tab)) this.tabGroups[group] = tab;
    }

    protected override async _prepareContext(
        options: fa.api.DocumentSheetRenderOptions,
    ): Promise<ActorSheetContextV2<TActor>> {
        const context = (await super._prepareContext(options)) as fa.api.DocumentSheetRenderContext;
        const actor = this.actor;
        const permissions: SheetPermissions = {
            editable: this.isEditable,
            owner: actor.isOwner,
            limited: actor.limited,
            lootable: this.isLootSheet,
            observer: actor.testUserPermission(game.user, "OBSERVER"),
        };
        return {
            ...context,
            foundryApp: this,
            state: { permissions, tabs: this.sheetTabs, name: actor.name, img: actor.img },
        };
    }

    /** Writes go through sheet methods, a submit does nothing */
    protected override async _onSubmitForm(_config: fa.ApplicationFormConfiguration, event: Event): Promise<void> {
        event.preventDefault();
    }

    /** Components disable their own inputs: core's DOM walk after render misses anything Svelte mounts later */
    protected override _toggleDisabled(): void {}

    protected override _canDragDrop(selector: string): boolean {
        return this.isLootSheet || super._canDragDrop(selector);
    }

    /* -------------------------------------------- */
    /*  Writes                                      */
    /* -------------------------------------------- */

    /** Update an actor field and return its stored value, for inputs to reset from */
    async updateField(path: string, value: unknown): Promise<unknown> {
        try {
            if (this.isEditable) await this.actor.update({ [path]: value });
        } catch (error) {
            ui.notifications.error(error instanceof Error ? error.message : String(error), { console: true });
        }
        return fu.getProperty(this.actor._source, path);
    }

    async editImage(): Promise<void> {
        if (!this.isEditable) return;
        const actor = this.actor;
        const defaultImage = (actor.constructor as typeof fd.Actor).getDefaultArtwork(actor._source).img;
        await new fa.apps.FilePicker.implementation({
            type: "image",
            current: actor._source.img,
            redirectToRoot: defaultImage ? [defaultImage] : [],
            callback: (path: string) => actor.update({ img: path }),
            position: { top: this.position.top + 40, left: this.position.left + 10 },
            document: actor,
        }).browse();
    }

    showImage(): Promise<unknown> {
        const actor = this.actor;
        const window = { title: actor.token?.name ?? actor.prototypeToken?.name ?? actor.name };
        return new fa.apps.ImagePopout({ src: actor.img, window, uuid: actor.uuid }).render({ force: true });
    }

    rollStatistic(slug: string, event: MouseEvent): void {
        this.actor.getStatistic(slug)?.roll(eventToRollParams(event, { type: "check" }));
    }

    openIWREditor(category: IWRCategory): void {
        new IWREditor(this.actor, { category }).render(true);
    }

    openTagSelector(objectProperty: string, configTypes: SelectableTagField[]): void {
        new TagSelectorBasic(this.actor, { objectProperty, configTypes }).render(true);
    }

    /* -------------------------------------------- */
    /*  Drops                                       */
    /* -------------------------------------------- */

    /** Core reads the drop data too late for uncached compendium items and doesn't pass drop zone context */
    protected override async _onDrop(event: DragEvent): Promise<void> {
        const data = TextEditorPF2e.getDragEventData(event);
        await this.handleDrop(R.isPlainObject(data) ? data : {}, event);
    }

    /** Handle drop data, from the root drop target or a zone inside the sheet */
    async handleDrop(data: Record<string, unknown>, event: DragEvent, context: SheetDropContext = {}): Promise<void> {
        const actor = this.actor;
        if (Hooks.call("dropActorSheetData", actor, this, data) === false) return;

        if (data.type === "PersistentDamage" && typeof data.formula === "string") {
            await this.#createPersistentDamage(data.formula);
        } else if (data.type === "Item") {
            const item = await ItemPF2e.fromDropData(data);
            if (item) await this.#onDropItem(event, item, data as Partial<DropCanvasItemData>, context);
        } else if (data.type === "Folder") {
            const folder = await fd.Folder.fromDropData(data);
            if (folder) await this.#onDropFolder(folder);
        }
    }

    async #createPersistentDamage(formula: string): Promise<void> {
        const roll = new DamageRoll(formula);
        if (roll.instances.length === 0 || roll.instances.some((i) => !i.persistent)) {
            throw ErrorPF2e("Unexpected error adding persistent damage: all instances must be persistent");
        }
        if (!this.actor.isOwner) return;
        const baseConditionSource = game.pf2e.ConditionManager.getCondition("persistent-damage").toObject();
        const conditions = roll.instances.map((i) =>
            fu.mergeObject(
                baseConditionSource,
                { system: { persistent: { formula: i.head.expression, damageType: i.type, dc: 15 } } },
                { inplace: false },
            ),
        );
        await this.actor.createEmbeddedDocuments("Item", conditions);
    }

    /** Stands in for core's `_onDropItem`, which only receives the document */
    async #onDropItem(
        event: DragEvent,
        item: ItemPF2e<ActorPF2e | null>,
        data: Partial<DropCanvasItemData>,
        context: SheetDropContext,
    ): Promise<void> {
        // Reordering needs a drop zone with row positions
        if (item.actor?.uuid === this.actor.uuid) return;

        if (item.actor && item.isOfType("physical")) {
            return this.moveItemBetweenActors(event, item, context);
        }

        const actor = this.actor;
        const fromCompendium =
            !!data.uuid?.startsWith("Compendium.") || !!event.dataTransfer?.types.includes("from-browser");
        const itemSource = (
            item.isOfType("physical") && fromCompendium ? sizeItemForActor(item, actor) : item
        ).toObject();

        const mystified = game.user.isGM && event.altKey;
        if (mystified && itemSource.type === "effect") {
            itemSource.system.unidentified = true;
        }
        if (mystified && item.isOfType("physical") && itemIsOfType(itemSource, "physical")) {
            itemSource.system.identification.unidentified = item.getMystifiedData("unidentified");
            itemSource.system.identification.status = "unidentified";
        }

        if (item.isOfType("spell") && itemSource.type === "spell") {
            if (item.isRitual) return this.#createItems([item.clone().toObject()]);
            if (context.inventory && itemSource.system.level.value > 0) {
                if (Object.keys(spellConsumableCategoriesFor(item)).length === 0) return;
                new SpellcastingItemCreator({ actor, spell: item, mystified }).render({ force: true });
            }
            return;
        } else if (itemSource.type === "spellcastingEntry") {
            return;
        } else if (itemSource.type === "condition") {
            const value = data.value;
            if (typeof value === "number" && itemSource.system.value.isValued) {
                itemSource.system.value.value = value;
            }
            if (!actor.canUserModify(game.user, "update")) {
                ui.notifications.error("PF2E.ErrorMessage.NoUpdatePermission", { localize: true });
                return;
            }
            await actor.increaseCondition(itemSource.system.slug, { value });
            return;
        } else if (itemIsOfType(itemSource, "affliction", "effect")) {
            // Pass along level, badge value, and traits to an effect dragged from a spell
            const { level, value, context: effectContext } = data;
            if (typeof level === "number" && level >= 0) {
                itemSource.system.level.value = Math.floor(level);
            }
            if (
                itemSource.type === "effect" &&
                itemSource.system.badge?.type === "counter" &&
                typeof value === "number"
            ) {
                itemSource.system.badge.value = value;
            }
            itemSource.system.context = effectContext ?? null;
            const originItem = fromUuidSync(effectContext?.origin.item ?? "");
            if (itemSource.system.traits?.value.length === 0 && originItem instanceof SpellPF2e) {
                const spellTraits: string[] = originItem.system.traits.value;
                const effectTraits = spellTraits.filter((t): t is EffectTrait => t in CONFIG.PF2E.effectTraits);
                itemSource.system.traits.value.push(...effectTraits);
            }
        }

        if (item.isOfType("physical") && itemIsOfType(itemSource, "physical")) {
            const container = actor.itemTypes.backpack.find((c) => c.id === context.containerId);
            itemSource.system.containerId = container?.id ?? null;
            itemSource.system.equipped.carryType = container ? "stowed" : "worn";
        }

        // Cloning clears the _id
        await this.#createItems([new Item.implementation(itemSource).clone().toObject()]);
    }

    async #onDropFolder(folder: Folder): Promise<void> {
        if (folder.type !== "Item") return;
        const folders = [folder, ...folder.getSubfolders()] as Folder<ItemPF2e<null>>[];
        await this.#createItems(folders.flatMap((f) => f.contents).map((i) => i.toObject()));
    }

    async #createItems(sources: foundry.documents.ItemSource[]): Promise<void> {
        if (!this.actor.isOwner || sources.length === 0) return;
        await this.actor.createEmbeddedDocuments("Item", sources);
    }

    /** Move a physical item here from another actor, trading or purchasing where that applies */
    async moveItemBetweenActors(event: DragEvent, item: PhysicalItemPF2e, context: SheetDropContext): Promise<void> {
        const sourceActor = item.actor;
        const recipient = this.actor;
        if (!sourceActor) throw ErrorPF2e("Unexpected missing actor");
        if (await this.#attemptTrade(event, item)) return;

        const containerId = context.containerId ?? undefined;
        const stackable = !!recipient.inventory.findStackableItem(item._source, { containerId });
        const mode = sourceActor.isOfType("loot") && sourceActor.isMerchant ? "purchase" : "move";
        if (mode === "purchase" && item.isOfType("backpack") && item.contents.size) {
            ui.notifications.error("PF2E.ErrorMessage.CantPurchaseContainerWithItems", { localize: true });
            return;
        }

        const result = await ItemTransferDialog.wait({ item, recipient, lockStack: !stackable, mode });
        if (!result) return;

        // Moving all of a non-credstick's credits moves the item instead
        const [resultMode, quantity] =
            result.mode === "credits" &&
            item.system.slug !== "credstick" &&
            result.quantity >= item.system.price.value.credits
                ? ["move", 1]
                : [result.mode, result.quantity];

        if (resultMode === "credits") {
            transferCredits({ targetActor: recipient, item, quantity });
        } else {
            sourceActor.transferItemToActor(
                recipient,
                item as PhysicalItemPF2e<ActorPF2e>,
                quantity,
                containerId,
                result.newStack,
                resultMode === "purchase",
            );
        }
    }

    /** Returns whether a trade request was sent, or the trade is blocked by reach */
    async #attemptTrade(event: DragEvent, item: PhysicalItemPF2e): Promise<boolean> {
        const recipient = this.actor;
        if (game.user.isGM || recipient.isLootableBy(game.user)) return false;
        const selfActor = item.actor;
        if (!selfActor?.isOfType("character", "npc")) return false;
        const traderUser = game.users
            .filter((u) => u.active && !u.isSelf && recipient.testUserPermission(u, "OWNER"))
            .sort((a, b) => Number(a.isGM) - Number(b.isGM))[0];

        const args = {
            self: { actor: selfActor, item, gift: event.shiftKey },
            trader: { user: traderUser, actor: recipient },
        };
        if (!TradeDialog.canTrade(args)) return false;
        if (game.pf2e.settings.automation.reachEnforcement.has("merchants")) {
            const traderTokens = recipient.getActiveTokens(true, false);
            const selfReach = selfActor.system.attributes.reach.manipulate;
            const traderReach = args.trader.actor.system.attributes.reach.manipulate;
            const inReach = selfActor.getActiveTokens(true, false).some((selfToken) =>
                traderTokens.some((traderToken) => {
                    const distance = selfToken.distanceTo(traderToken);
                    return selfReach >= distance && traderReach >= distance;
                }),
            );
            if (!inReach) return true;
        }
        TradeDialog.requestTrade(args);
        return true;
    }
}

interface ActorSheetPF2eV2<TActor extends ActorPF2e> {
    get actor(): TActor;
}

export { ActorSheetPF2eV2 };
export type {
    ActorSheetContextV2,
    ActorSheetStateV2,
    IWRCategory,
    SheetDropContext,
    SheetPermissions,
    SheetTabData,
    SheetTabsConfiguration,
};
