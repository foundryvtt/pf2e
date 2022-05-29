import { ActorPF2e } from "@actor/base";
import { PhysicalItemPF2e } from "@item/physical";
import { ItemPF2e } from "@item/base";
import { ErrorPF2e } from "@util";
import { UserPF2e } from "@module/user";
import { LootData, LootSource } from "./data";
import { ActiveEffectPF2e } from "@module/active-effect";
import { ItemSourcePF2e } from "@item/data";
import { TokenDocumentPF2e } from "@module/scene/token-document";
import { ScenePF2e } from "@module/scene";
import { CoinsPF2e } from "@item/physical/helpers";

export class LootPF2e extends ActorPF2e {
    get isLoot(): boolean {
        return this.data.data.lootSheetType === "Loot";
    }

    get isMerchant(): boolean {
        return this.data.data.lootSheetType === "Merchant";
    }

    /** Should this actor's token(s) be hidden when there are no items in its inventory? */
    get hiddenWhenEmpty(): boolean {
        return this.isLoot && this.data.data.hiddenWhenEmpty;
    }

    /** Loot actors can never benefit from rule elements */
    override get canHostRuleElements(): boolean {
        return false;
    }

    /** Come on, it's a box. */
    override get canAct(): false {
        return false;
    }

    /** Anyone with Limited permission can update a loot actor */
    override canUserModify(user: UserPF2e, action: UserAction): boolean {
        if (action === "update") {
            return this.permission >= CONST.DOCUMENT_PERMISSION_LEVELS.LIMITED;
        }
        return super.canUserModify(user, action);
    }

    /** A user can see a loot actor in the actor directory only if they have at least Observer permission */
    override get visible(): boolean {
        return this.permission >= CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER;
    }

    override async transferItemToActor(
        targetActor: ActorPF2e,
        item: Embedded<ItemPF2e>,
        quantity: number,
        containerId?: string,
        newStack = false
    ): Promise<Embedded<PhysicalItemPF2e> | null> {
        // If we don't have permissions send directly to super to prevent removing the coins twice or reject as needed
        if (!(this.isOwner && targetActor.isOwner)) {
            return super.transferItemToActor(targetActor, item, quantity, containerId, newStack);
        }
        if (this.isMerchant && item instanceof PhysicalItemPF2e) {
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
        const scenesAndTokens: [ScenePF2e, TokenDocumentPF2e[]][] = game.scenes.contents.map((scene) => [
            scene,
            scene.tokens.filter((tokenDoc) => tokenDoc.actor === this),
        ]);
        const promises = scenesAndTokens.map(([scene, tokenDocs]) =>
            scene.updateEmbeddedDocuments(
                "Token",
                tokenDocs.map((tokenDoc) => ({ _id: tokenDoc.id, hidden: hiddenStatus }))
            )
        );
        await Promise.allSettled(promises);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onCreate(data: LootSource, options: DocumentModificationContext<this>, userId: string): void {
        this.toggleTokenHiding();
        super._onCreate(data, options, userId);
    }

    protected override _onUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentUpdateContext<this>,
        userId: string
    ): void {
        if (changed.data?.hiddenWhenEmpty !== undefined) {
            this.toggleTokenHiding();
        }
        super._onUpdate(changed, options, userId);
    }

    protected override _onCreateEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        documents: ActiveEffectPF2e[] | ItemPF2e[],
        result: foundry.data.ActiveEffectSource[] | ItemSourcePF2e[],
        options: DocumentModificationContext<ActiveEffectPF2e | ItemPF2e>,
        userId: string
    ): void {
        this.toggleTokenHiding();
        super._onCreateEmbeddedDocuments(embeddedName, documents, result, options, userId);
    }

    protected override _onDeleteEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        documents: ActiveEffectPF2e[] | ItemPF2e[],
        result: foundry.data.ActiveEffectSource[] | ItemSourcePF2e[],
        options: DocumentModificationContext<ActiveEffectPF2e | ItemPF2e>,
        userId: string
    ): void {
        this.toggleTokenHiding();
        super._onDeleteEmbeddedDocuments(embeddedName, documents, result, options, userId);
    }
}

export interface LootPF2e extends ActorPF2e {
    readonly data: LootData;

    get hitPoints(): null;
}
