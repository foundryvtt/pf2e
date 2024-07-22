import { ActorPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import { ItemType } from "@item/base/data/index.ts";
import { ActiveEffectPF2e } from "@module/active-effect.ts";
import { UserPF2e } from "@module/user/document.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene/index.ts";
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

    /** A user can see a loot actor in the actor directory only if they have at least Observer permission */
    override get visible(): boolean {
        return this.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    }

    /** Anyone with Limited ownership can update a loot actor. */
    override canUserModify(user: UserPF2e, action: UserAction): boolean {
        return (
            super.canUserModify(user, action) ||
            (action === "update" && this.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)
        );
    }

    /** Hide this actor's token(s) when in loot (rather than merchant) mode, empty, and configured thus */
    async toggleTokenHiding(): Promise<void> {
        if (!this.hiddenWhenEmpty || !this.isOwner) return;
        const hiddenStatus = this.items.size === 0;
        const scenesAndTokens: [ScenePF2e, TokenDocumentPF2e<ScenePF2e>[]][] = game.scenes.map((s) => [
            s,
            s.tokens.filter((t) => t.actor === this),
        ]);
        const promises = scenesAndTokens.map(([scene, tokenDocs]) =>
            scene.updateEmbeddedDocuments(
                "Token",
                tokenDocs.map((tokenDoc) => ({ _id: tokenDoc.id, hidden: hiddenStatus })),
            ),
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

    protected override _onCreate(data: LootSource, options: DatabaseCreateOperation<TParent>, userId: string): void {
        if (game.user.id === userId) {
            this.toggleTokenHiding();
        }
        super._onCreate(data, options, userId);
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void {
        if (game.user.id === userId && changed.system?.hiddenWhenEmpty !== undefined) {
            this.toggleTokenHiding();
        }
        super._onUpdate(changed, operation, userId);
    }

    protected override _onCreateDescendantDocuments(
        parent: this,
        collection: "effects" | "items",
        documents: ActiveEffectPF2e<this>[] | ItemPF2e<this>[],
        result: ActiveEffectPF2e<this>["_source"][] | ItemPF2e<this>["_source"][],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void {
        if (game.user.id === userId) {
            this.toggleTokenHiding();
        }
        super._onCreateDescendantDocuments(parent, collection, documents, result, operation, userId);
    }

    protected override _onDeleteDescendantDocuments(
        parent: this,
        collection: "items" | "effects",
        documents: ActiveEffectPF2e<this>[] | ItemPF2e<this>[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void {
        if (game.user.id === userId) {
            this.toggleTokenHiding();
        }
        super._onDeleteDescendantDocuments(parent, collection, documents, ids, operation, userId);
    }
}

interface LootPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: LootSource;
    system: LootSystemData;

    readonly saves?: never;

    get hitPoints(): null;
}

export { LootPF2e };
