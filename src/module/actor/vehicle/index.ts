import { ActorDimensions } from "@actor/types";
import { ItemPF2e } from "@item/base";
import { ItemSourcePF2e } from "@item/data";
import { ActiveEffectPF2e } from "@module/active-effect";
import { UserPF2e } from "@module/user";
import { TokenDocumentPF2e } from "@scene";
import { ActorPF2e, HitPointsSummary } from "../base";
import { TokenDimensions, VehicleData, VehicleSource } from "./data";

export class VehiclePF2e extends ActorPF2e {
    /** Vehicle dimensions are specified for all three axes and usually do not form cubes */
    override get dimensions(): ActorDimensions {
        return {
            length: this.data.data.details.space.long,
            width: this.data.data.details.space.wide,
            height: this.data.data.details.space.high,
        };
    }

    getTokenDimensions(dimensions: Omit<ActorDimensions, "height"> = this.dimensions): TokenDimensions {
        return {
            width: Math.max(Math.round(dimensions.width / 5), 1),
            height: Math.max(Math.round(dimensions.length / 5), 1),
        };
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Vehicles never have negative healing
        const { attributes, details } = this.data.data;
        attributes.hp.negativeHealing = false;
        details.alliance = null;

        // Set the dimensions of this vehicle in its size object
        const { size } = this.data.data.traits;
        const { dimensions } = this;
        size.length = dimensions.length;
        size.width = dimensions.width;

        // Set the prototype token's dimensions according to the vehicle dimensions
        if (this.data.token.flags?.pf2e?.linkToActorSize) {
            const { width, height } = this.getTokenDimensions();
            this.data.token.width = width;
            this.data.token.height = height;
        }
    }

    override async createEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        data: PreCreate<foundry.data.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]> {
        for (const datum of data) {
            if (!("type" in datum)) continue;
            if (
                !["weapon", "armor", "equipment", "consumable", "treasure", "backpack", "kit", "action"].includes(
                    datum.type ?? ""
                )
            ) {
                ui.notifications.error(game.i18n.localize("PF2E.vehicle.ItemTypeError"));
                return [];
            }
        }

        return super.createEmbeddedDocuments(embeddedName, data, context);
    }

    protected override async _preUpdate(
        changed: DeepPartial<VehicleSource>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        await super._preUpdate(changed, options, user);
        if (this.data.token.flags?.pf2e?.linkToActorSize) {
            const { space } = this.data.data.details;
            const spaceUpdates = {
                width: changed.data?.details?.space?.wide ?? space.wide,
                length: changed.data?.details?.space?.long ?? space.long,
            };
            const tokenDimensions = this.getTokenDimensions(spaceUpdates);
            mergeObject(changed, { token: tokenDimensions });

            if (canvas.scene) {
                const updates = this.getActiveTokens()
                    .filter((token) => token.document.linkToActorSize)
                    .map((token) => ({ _id: token.id, ...tokenDimensions }));
                await TokenDocumentPF2e.updateDocuments(updates, { parent: canvas.scene });
            }
        }
    }
}

export interface VehiclePF2e {
    readonly data: VehicleData;

    get hitPoints(): HitPointsSummary;

    createEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        data: PreCreate<foundry.data.ActiveEffectSource>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: "Item",
        data: PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ItemPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        data: PreCreate<foundry.data.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;
}
