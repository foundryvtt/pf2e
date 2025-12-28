import { ALLIANCES } from "@actor/creature/values.ts";
import type { ActorFlagsPF2e } from "@actor/data/base.ts";
import { createSheetOptions, SheetOptions } from "@module/sheet/helpers.ts";
import { ErrorPF2e, setHasElement } from "@util";
import type { BaseCreatureSource, CreatureActorType, CreatureSystemSource } from "./data.ts";
import type { CreaturePF2e } from "./document.ts";

/** A DocumentSheet presenting additional, per-actor settings */
abstract class CreatureConfig<TActor extends CreaturePF2e> extends fav1.api.DocumentSheet<TActor> {
    override get title(): string {
        const namespace = this.actor.isOfType("character") ? "Character" : "NPC";
        return game.i18n.localize(`PF2E.Actor.${namespace}.Configure.Title`);
    }

    override get template(): string {
        return `systems/${SYSTEM_ID}/templates/actors/${this.actor.type}/config.hbs`;
    }

    get actor(): TActor {
        return this.object;
    }

    static override get defaultOptions(): fav1.api.DocumentSheetV1Options {
        const options = super.defaultOptions;
        options.sheetConfig = false;
        options.width = 450;
        return options;
    }

    override async getData(
        options: Partial<fav1.api.DocumentSheetV1Options> = {},
    ): Promise<CreatureConfigData<TActor>> {
        const actor = this.actor;
        const source: BaseCreatureSource<CreatureActorType, CreatureSystemSource> = actor._source;
        const alliance =
            source.system.details?.alliance === null ? "neutral" : (source.system.details?.alliance ?? "default");
        const defaultValue = game.i18n.localize(
            actor.hasPlayerOwner ? "PF2E.Actor.Creature.Alliance.Party" : "PF2E.Actor.Creature.Alliance.Opposition",
        );

        const allianceOptions = {
            default: game.i18n.format("PF2E.Actor.Creature.Alliance.Default", { alliance: defaultValue }),
            opposition: "PF2E.Actor.Creature.Alliance.Opposition",
            party: "PF2E.Actor.Creature.Alliance.Party",
            neutral: "PF2E.Actor.Creature.Alliance.Neutral",
        };

        return {
            ...(await super.getData(options)),
            alliances: createSheetOptions(allianceOptions, { value: [alliance] }),
            systemId: SYSTEM_ID,
            systemFlags: actor.flags[SYSTEM_ID],
        };
    }

    /** Remove stored property if it's set to default; otherwise, update */
    override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const key = "system.details.alliance";
        const alliance = formData[key];

        if (alliance === "default") {
            delete formData[key];
            formData["system.details.-=alliance"] = null;
        } else if (alliance === "neutral") {
            formData[key] = null;
        } else if (!setHasElement(ALLIANCES, alliance)) {
            throw ErrorPF2e("Unrecognized alliance");
        }

        return super._updateObject(event, formData);
    }
}

interface CreatureConfigData<TActor extends CreaturePF2e> extends fav1.api.DocumentSheetData<TActor> {
    alliances: SheetOptions;
    systemId: SystemId;
    systemFlags: ActorFlagsPF2e[SystemId];
}

export { CreatureConfig, type CreatureConfigData };
