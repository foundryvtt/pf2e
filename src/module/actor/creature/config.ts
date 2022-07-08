import { ALLIANCES } from "@actor/creature/values";
import { createSheetOptions, SheetOptions } from "@module/sheet/helpers";
import { ErrorPF2e, setHasElement } from "@util";
import { CreaturePF2e } from ".";
import { BaseCreatureSource } from "./data";

abstract class CreatureConfig<TActor extends CreaturePF2e> extends DocumentSheetConfig<TActor> {
    override get title(): string {
        const namespace = this.actor.isOfType("character") ? "Character" : "NPC";
        return game.i18n.localize(`PF2E.Actor.${namespace}.Configure.Title`);
    }

    override get template(): string {
        return `systems/pf2e/templates/actors/${this.actor.type}/config.html`;
    }

    get actor(): TActor {
        return this.object;
    }

    override async getData(options: Partial<FormApplicationOptions> = {}): Promise<CreatureConfigData<TActor>> {
        const source: BaseCreatureSource = this.actor.data._source;
        const alliance = source.data.details?.alliance ?? "default";
        const defaultValue = game.i18n.localize(
            this.actor.hasPlayerOwner ? "PF2E.Actor.Creature.Alliance.Party" : "PF2E.Actor.Creature.Alliance.Opposition"
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
        };
    }

    /** Remove stored property if it's set to default; otherwise, update */
    override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        const key = "data.details.alliance";
        const alliance = formData[key] || null;

        if (alliance === "default") {
            delete formData[key];
            formData["data.details.-=alliance"] = null;
        } else if (alliance === "neutral") {
            formData[key] = null;
        } else if (!setHasElement(ALLIANCES, alliance)) {
            throw ErrorPF2e("Unrecognized alliance");
        }

        await this.actor.update(formData);
    }
}

interface CreatureConfigData<TActor extends CreaturePF2e> extends DocumentSheetConfigData<TActor> {
    alliances: SheetOptions;
}

export { CreatureConfig, CreatureConfigData };
