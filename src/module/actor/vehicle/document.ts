import { ModifierPF2e } from "@actor/modifiers";
import { ActorDimensions } from "@actor/types";
import { ItemType } from "@item/data";
import { extractModifiers } from "@module/rules/helpers";
import { UserPF2e } from "@module/user";
import { TokenDocumentPF2e } from "@scene";
import { Statistic } from "@system/statistic";
import { ActorPF2e, HitPointsSummary } from "../base";
import { TokenDimensions, VehicleData, VehicleSource } from "./data";

class VehiclePF2e extends ActorPF2e {
    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "physical", "action"];
    }

    /** Vehicle dimensions are specified for all three axes and usually do not form cubes */
    override get dimensions(): ActorDimensions {
        return {
            length: this.system.details.space.long,
            width: this.system.details.space.wide,
            height: this.system.details.space.high,
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
        const { attributes, details } = this.system;

        attributes.hp.negativeHealing = false;
        attributes.hp.brokenThreshold = Math.floor(attributes.hp.max / 2);

        details.alliance = null;

        // Set the dimensions of this vehicle in its size object
        const { size } = this.system.traits;
        const { dimensions } = this;
        size.length = dimensions.length;
        size.width = dimensions.width;

        // Set the prototype token's dimensions according to the vehicle dimensions
        if (this.prototypeToken.flags?.pf2e?.linkToActorSize) {
            const { width, height } = this.getTokenDimensions();
            this.prototypeToken.width = width;
            this.prototypeToken.height = height;
        }
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        this.saves = this.prepareSaves();
        this.system.saves.fortitude = mergeObject(this.system.saves.fortitude, this.saves.fortitude.getTraceData());
    }

    private prepareSaves(): { fortitude: Statistic } {
        const { synthetics } = this;

        const slug = "fortitude";
        const domains = [slug, "saving-throw", "all"];
        const modifiers = [
            new ModifierPF2e({
                label: "PF2E.ModifierTitle",
                slug,
                type: "untyped",
                modifier: this.system.saves.fortitude.value,
            }),
            ...extractModifiers(synthetics, domains),
        ];
        const fortitude = new Statistic(this, {
            slug: "fortitude",
            label: CONFIG.PF2E.saves.fortitude,
            modifiers,
            domains,
            check: {
                type: "saving-throw",
            },
        });

        return { fortitude };
    }

    protected override async _preUpdate(
        changed: DeepPartial<VehicleSource>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        await super._preUpdate(changed, options, user);
        if (this.prototypeToken.flags?.pf2e?.linkToActorSize) {
            const { space } = this.system.details;
            const spaceUpdates = {
                width: changed.system?.details?.space?.wide ?? space.wide,
                length: changed.system?.details?.space?.long ?? space.long,
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

interface VehiclePF2e {
    readonly data: VehicleData;

    get hitPoints(): HitPointsSummary;

    saves: { fortitude: Statistic };
}

export { VehiclePF2e };
