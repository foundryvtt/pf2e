import { ALLIANCES } from "@actor/creature/values";
import { createSheetOptions, SheetOptions } from "@module/sheet/helpers";
import { ErrorPF2e, setHasElement } from "@util";
import { NPCPF2e } from ".";

export class NPCConfig extends DocumentSheetConfig<NPCPF2e> {
    static override get defaultOptions(): FormApplicationOptions {
        return {
            ...super.defaultOptions,
            template: "systems/pf2e/templates/actors/npc/config.html",
        };
    }

    override get title(): string {
        return game.i18n.localize("PF2E.Actor.NPC.Configure.Title");
    }

    get actor(): NPCPF2e {
        return this.object;
    }

    override async getData(options: Partial<FormApplicationOptions> = {}): Promise<NPCConfigData> {
        const { actor } = this;
        const { alliance } = actor.data.data.details;
        const allianceOptions = {
            opposition: "PF2E.Actor.Creature.Alliance.Opposition",
            party: "PF2E.Actor.Creature.Alliance.Party",
            neutral: "PF2E.Actor.Creature.Alliance.Neutral",
        };

        const lootableDefault = game.settings.get("pf2e", "automation.lootableNPCs");
        const lootableOptions = {
            default: `PF2E.Actor.NPC.Configure.Lootable.${lootableDefault ? "DefaultLootable" : "DefaultNotLootable"}`,
            lootable: "PF2E.Actor.NPC.Configure.Lootable.Lootable",
            notLootable: "PF2E.Actor.NPC.Configure.Lootable.NotLootable",
        };
        const lootableSelection = (() => {
            const storedSelection = actor.data._source.flags.pf2e?.lootable;
            return typeof storedSelection === "boolean" ? (storedSelection ? "lootable" : "notLootable") : "default";
        })();

        return {
            ...(await super.getData(options)),
            alliances: createSheetOptions(allianceOptions, { value: [alliance ?? "neutral"] }),
            lootable: createSheetOptions(lootableOptions, { value: [lootableSelection] }),
        };
    }

    override activateListeners($html: JQuery): void {
        const menuLink = $html.get(0)?.querySelector("a");
        menuLink?.classList.add("foundry-href");
        menuLink?.addEventListener("click", () => {
            const menu = game.settings.menus.get("pf2e.automation");
            if (!menu) throw ErrorPF2e("Automation Settings application not found");
            const app = new menu.type();
            app.render(true);
        });
    }

    /** Remove stored properties if they're consistent with defaults; otherwise, store changes */
    override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        const { actor } = this;
        const { alliance, lootable } = formData;

        const allianceSelection = setHasElement(ALLIANCES, alliance) ? alliance : null;
        const newAlliance =
            (allianceSelection === "party" && actor.hasPlayerOwner) ||
            (allianceSelection === "opposition" && !actor.hasPlayerOwner)
                ? { "data.details.-=alliance": null }
                : { "data.details.alliance": allianceSelection };

        const lootableUpdates: Record<string, object | undefined> = {
            lootable: { "flags.pf2e.lootable": true },
            notLootable: { "flags.pf2e.lootable": true },
        };
        const newLootable = lootableUpdates[String(lootable)] ?? { "flags.pf2e.-=lootable": null };

        await actor.update({ ...newAlliance, ...newLootable }, { render: false });
    }
}

interface NPCConfigData extends DocumentSheetConfigData<NPCPF2e> {
    alliances: SheetOptions;
    lootable: SheetOptions;
}
