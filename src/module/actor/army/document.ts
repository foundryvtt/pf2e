import { ItemType } from "@item/base/data/index.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { ActorPF2e, HitPointsSummary } from "../base.ts";
import { ArmySource, ArmySystemData } from "./data.ts";
import { Statistic } from "@system/statistic/index.ts";
import { ARMY_STATS } from "./values.ts";
import { tupleHasValue } from "@util";
import { Kingdom } from "@actor/party/kingdom/model.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import * as R from "remeda";

class ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    declare scouting: Statistic;
    declare maneuver: Statistic;
    declare morale: Statistic;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return ["campaignFeature", "effect"];
    }

    get routed(): boolean {
        return this.system.attributes.hp.value < this.system.attributes.hp.routThreshold;
    }

    /** Gets the active kingdom. Later this should be configurable */
    get kingdom(): Kingdom | null {
        const campaign = game.actors.party?.campaign;
        return campaign instanceof Kingdom ? campaign : null;
    }

    get maxTactics(): number {
        return ARMY_STATS.maxTactics[this.level];
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.system.details.level.value = Math.clamped(this.system.details.level.value, 1, 20);
        this.system.resources.potions.max = 3;
    }

    override prepareDerivedData(): void {
        const baseScouting = ARMY_STATS.scouting[this.level];
        const scoutAdjustment = this.system.scouting - baseScouting;
        this.scouting = new Statistic(this, {
            slug: "scouting",
            label: "PF2E.Kingmaker.Army.Scouting",
            modifiers: R.compact([
                new ModifierPF2e({ slug: "base", label: "PF2E.Kingmaker.Army.Base", modifier: baseScouting }),
                scoutAdjustment
                    ? new ModifierPF2e({
                          slug: "adjustment",
                          label: "PF2E.Kingmaker.Army.Adjustment",
                          modifier: scoutAdjustment,
                      })
                    : null,
            ]),
        });

        const highSave = this.system.saves.maneuver >= this.system.saves.morale ? "maneuver" : "morale";
        for (const saveType of ["maneuver", "morale"] as const) {
            const table = highSave === saveType ? ARMY_STATS.strongSave : ARMY_STATS.weakSave;
            const baseValue = table[this.level];
            const adjustment = this.system.saves[saveType] - baseValue;

            this[saveType] = new Statistic(this, {
                slug: saveType,
                label: `PF2E.Kingmaker.Army.Save.${saveType}`,
                modifiers: R.compact([
                    new ModifierPF2e({ slug: "base", label: "PF2E.Kingmaker.Army.Base", modifier: baseValue }),
                    adjustment
                        ? new ModifierPF2e({
                              slug: "adjustment",
                              label: "PF2E.Kingmaker.Army.Adjustment",
                              modifier: adjustment,
                          })
                        : null,
                ]),
            });
        }
    }

    updateLevel(newLevel: number): Promise<this | undefined> {
        newLevel = Math.clamped(newLevel, 1, 20);
        const currentLevel = this.system.details.level.value;

        // strong save is merely weak + 6, so we don't have to compare
        const saveDifference = ARMY_STATS.strongSave[newLevel] - ARMY_STATS.strongSave[currentLevel];

        return this.update({
            system: {
                details: {
                    level: {
                        value: newLevel,
                    },
                },
                saves: {
                    morale: this.system.saves.morale + saveDifference,
                    maneuver: this.system.saves.maneuver + saveDifference,
                },
            },
        });
    }

    override getStatistic(slug: string): Statistic | null {
        if (tupleHasValue(["scouting", "morale", "maneuver"], slug)) {
            return this[slug];
        }

        return this.kingdom?.getStatistic(slug) ?? super.getStatistic(slug);
    }
}

interface ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: ArmySource;
    system: ArmySystemData;

    get hitPoints(): HitPointsSummary;
}

export { ArmyPF2e };
