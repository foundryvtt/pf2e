import { ItemType } from "@item/data/index.ts";
import { PhysicalItemPF2e } from "@item/physical/document.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { ActiveEffectPF2e } from "@module/active-effect.ts";
import { ActorPF2e, ItemPF2e } from "@module/documents.ts";
import { UserPF2e } from "@module/user/document.ts";
import { ScenePF2e, TokenDocumentPF2e } from "@scene/index.ts";
import { ErrorPF2e } from "@util";
import { LootSource, LootSystemData } from "./data.ts";

class LootPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    override armorClass = null;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return ["physical"];
    }

    get isLoot(): boolean {
        return this.system.lootSheetType === "Loot";
    }

    get isMerchant(): boolean {
        return this.system.lootSheetType === "Merchant";
    }

    /** Should this actor's token(s) be hidden when there are no items in its inventory? */
    get hiddenWhenEmpty(): boolean {
        return this.isLoot && this.system.hiddenWhenEmpty;
    }

    /** Loot actors can never benefit from rule elements */
    override get canHostRuleElements(): boolean {
        return false;
    }

    /** It's a box. */
    override get canAct(): false {
        return false;
    }

    /** It's a sturdy box. */
    override isAffectedBy(): false {
        return false;
    }

    /** Anyone with Limited permission can update a loot actor */
    override canUserModify(user: UserPF2e, action: UserAction): boolean {
        if (action === "update") {
            return this.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
        }
        return super.canUserModify(user, action);
    }

    /** A user can see a loot actor in the actor directory only if they have at least Observer permission */
    override get visible(): boolean {
        return this.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    }

    override async transferItemToActor(
        targetActor: ActorPF2e,
        item: ItemPF2e<ActorPF2e>,
        quantity: number,
        containerId?: string,
        newStack = false
    ): Promise<PhysicalItemPF2e<ActorPF2e> | null> {
        // If we don't have permissions send directly to super to prevent removing the coins twice or reject as needed
        if (!(this.isOwner && targetActor.isOwner)) {
            return super.transferItemToActor(targetActor, item, quantity, containerId, newStack);
        }
        if (this.isMerchant && item.isOfType("physical")) {
            const itemValue = CoinsPF2e.fromPrice(item.price, quantity);
            if (await targetActor.inventory.removeCoins(itemValue)) {
                await item.actor.inventory.addCoins(itemValue);
                return super.transferItemToActor(targetActor, item, quantity, containerId, newStack);
            } else if (this.isLoot) {
                throw ErrorPF2e("Loot transfer failed");
            } else {
                return null;
            }
        }

        return super.transferItemToActor(targetActor, item, quantity, containerId, newStack);
    }

    /** Hide this actor's token(s) when in loot (rather than merchant) mode, empty, and configured thus */
    async toggleTokenHiding(): Promise<void> {
        if (!this.hiddenWhenEmpty) return;
        const hiddenStatus = this.items.size === 0;
        const scenesAndTokens: [ScenePF2e, TokenDocumentPF2e<ScenePF2e>[]][] = game.scenes.map((s) => [
            s,
            s.tokens.filter((t) => t.actor === this),
        ]);
        const promises = scenesAndTokens.map(([scene, tokenDocs]) =>
            scene.updateEmbeddedDocuments(
                "Token",
                tokenDocs.map((tokenDoc) => ({ _id: tokenDoc.id, hidden: hiddenStatus }))
            )
        );
        await Promise.allSettled(promises);
    }

    /** Never process rules elements on loot actors */
    override prepareDerivedData(): void {
        this.rules = [];
        super.prepareDerivedData();
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: LootSource,
        options: DocumentModificationContext<TParent>,
        userId: string
    ): void {
        this.toggleTokenHiding();
        super._onCreate(data, options, userId);
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<TParent>,
        userId: string
    ): void {
        if (changed.system?.hiddenWhenEmpty !== undefined) {
            this.toggleTokenHiding();
        }
        super._onUpdate(changed, options, userId);
    }

    protected override _onCreateDescendantDocuments(
        parent: this,
        collection: "effects" | "items",
        documents: ActiveEffectPF2e<this>[] | ItemPF2e<this>[],
        result: ActiveEffectPF2e<this>["_source"][] | ItemPF2e<this>["_source"][],
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        this.toggleTokenHiding();
        super._onCreateDescendantDocuments(parent, collection, documents, result, options, userId);
    }

    protected override _onDeleteDescendantDocuments(
        parent: this,
        collection: "items" | "effects",
        documents: ActiveEffectPF2e<this>[] | ItemPF2e<this>[],
        ids: string[],
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        this.toggleTokenHiding();
        super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);
    }
}

interface LootPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: LootSource;
    readonly abilities?: never;
    system: LootSystemData;

    readonly saves?: never;

    get hitPoints(): null;
}

export { LootPF2e };
