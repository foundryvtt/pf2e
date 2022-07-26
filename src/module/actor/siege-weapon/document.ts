import { ModifierPF2e, MODIFIER_TYPE } from "@actor/modifiers";
import { SaveType } from "@actor/types";
import { SAVE_TYPES } from "@actor/values";
import { ActorDimensions } from "@actor/types";
import { ItemType } from "@item/data";
import { extractModifiers } from "@module/rules/helpers";
import { UserPF2e } from "@module/user";
import { TokenDocumentPF2e } from "@scene";
import { Statistic } from "@system/statistic";
import { ActorPF2e, HitPointsSummary } from "../base";
import { TokenDimensions, SiegeWeaponData, SiegeWeaponSource } from "./data";

export class SiegeWeaponPF2e extends ActorPF2e {
    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "action"];
    }

    /** SiegeWeapon dimensions are specified for all three axes and usually do not form cubes */
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

        // SiegeWeapons never have negative healing
        const { attributes, details } = this.system;

        attributes.hp.negativeHealing = false;
        attributes.hp.brokenThreshold = Math.floor(attributes.hp.max / 2);

        details.alliance = null;

        // Set the dimensions of this siege weapon in its size object
        const { size } = this.system.traits;
        const { dimensions } = this;
        size.length = dimensions.length;
        size.width = dimensions.width;

        // Set the prototype token's dimensions according to the siege weapon's dimensions
        if (this.prototypeToken.flags?.pf2e?.linkToActorSize) {
            const { width, height } = this.getTokenDimensions();
            this.prototypeToken.width = width;
            this.prototypeToken.height = height;
        }
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        this.saves = this.prepareSaves();
    }

    protected prepareSaves(): { [K in SaveType]?: Statistic } {
        // Saving Throws
        return SAVE_TYPES.reduce((saves: { [K in SaveType]?: Statistic }, saveType) => {
            const save = this.system.saves[saveType];
            const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const base = save.value;

            // Saving Throws with a value of 0 are not usable by the siege weapon (portable)
            // Later on we'll need to explicitly check for null, since 0 is supposed to be valid
            if (!base) return saves;

            const selectors = [saveType, "saving-throw", "all"];
            const stat = new Statistic(this, {
                slug: saveType,
                label: saveName,
                domains: selectors,
                modifiers: [
                    new ModifierPF2e({
                        label: "PF2E.ModifierTitle",
                        slug: saveType,
                        type: MODIFIER_TYPE.UNTYPED,
                        modifier: this.system.saves[saveType].value,
                    }),
                    ...extractModifiers(this.synthetics, selectors),
                ],
                check: {
                    type: "saving-throw",
                },
            });

            mergeObject(this.system.saves[saveType], stat.getTraceData());

            saves[saveType] = stat;
            return saves;
        }, {});
    }

    protected override async _preUpdate(
        changed: DeepPartial<SiegeWeaponSource>,
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

export interface SiegeWeaponPF2e {
    readonly data: SiegeWeaponData;

    get hitPoints(): HitPointsSummary;

    saves: { [K in SaveType]?: Statistic };
}
