import { ModifierPF2e } from "@actor/modifiers";
import { ActorDimensions } from "@actor/types";
import { extractModifiers, extractNotes } from "@module/rules/util";
import { UserPF2e } from "@module/user";
import { TokenDocumentPF2e } from "@scene";
import { Statistic } from "@system/statistic";
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

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        this.saves = this.prepareSaves();
        this.data.data.saves.fortitude = mergeObject(
            this.data.data.saves.fortitude,
            this.saves.fortitude.getCompatData()
        );
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
                modifier: this.data.data.saves.fortitude.value,
            }),
            ...extractModifiers(synthetics.statisticsModifiers, domains),
        ];
        const fortitude = new Statistic(this, {
            slug: "fortitude",
            label: CONFIG.PF2E.saves.fortitude,
            notes: extractNotes(synthetics.rollNotes, domains),
            modifiers,
            domains,
            check: {
                type: "saving-throw",
            },
            dc: {},
        });

        return { fortitude };
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

    saves: { fortitude: Statistic };
}
