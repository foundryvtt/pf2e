import { ALLIANCES } from "@actor/creature/values.ts";
import { createSheetOptions, SheetOptions } from "@module/sheet/helpers.ts";
import { ErrorPF2e, setHasElement } from "@util";
import type { BaseCreatureSource, CreatureActorType, CreatureSystemSource } from "./data.ts";
import type { CreaturePF2e } from "./document.ts";

/** A DocumentSheet presenting additional, per-actor settings */
abstract class CreatureConfig<TActor extends CreaturePF2e> extends fa.api.HandlebarsApplicationMixin<
    AbstractConstructorOf<fa.api.DocumentSheetV2<fa.api.DocumentSheetConfiguration<CreaturePF2e>>> & {
        DEFAULT_OPTIONS: DeepPartial<fa.api.DocumentSheetConfiguration>;
    }
>(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS: DeepPartial<fa.api.DocumentSheetConfiguration> = {
        classes: ["creature-config"],
        position: { width: 450 },
        sheetConfig: false,
        window: { contentClasses: ["standard-form"] },
        form: { closeOnSubmit: true },
    };

    constructor(options: Omit<DeepPartial<fa.api.DocumentSheetConfiguration>, "document"> & { document: TActor }) {
        const existing = fa.instances.get(CreatureConfig.#uniqueId(options.document));
        if (existing instanceof CreatureConfig) return existing;
        super(options);
    }

    static #uniqueId(document: { uuid: string | null }): string {
        return `creature-config-${(document.uuid ?? fu.randomID()).replaceAll(".", "-")}`;
    }

    protected static configParts(settings: string): Record<string, fa.api.HandlebarsTemplatePart> {
        return {
            alliance: { template: `systems/${SYSTEM_ID}/templates/actors/creature/config-alliance.hbs` },
            settings: { template: settings },
            footer: { template: "templates/generic/form-footer.hbs" },
        };
    }

    get actor(): TActor {
        return this.document as TActor;
    }

    override get title(): string {
        const namespace = this.actor.isOfType("character") ? "Character" : "NPC";
        return _loc(`PF2E.Actor.${namespace}.Configure.Title`);
    }

    protected override _initializeApplicationOptions(
        options: DeepPartial<fa.api.DocumentSheetConfiguration<CreaturePF2e>>,
    ): fa.api.DocumentSheetConfiguration<CreaturePF2e> {
        const initialized = super._initializeApplicationOptions(options);
        initialized.uniqueId = CreatureConfig.#uniqueId(initialized.document);
        return initialized;
    }

    protected override async _prepareContext(
        options: fa.api.DocumentSheetRenderOptions,
    ): Promise<CreatureConfigContext<TActor>> {
        const actor = this.actor;
        const source: BaseCreatureSource<CreatureActorType, CreatureSystemSource> = actor._source;
        const alliance =
            source.system.details?.alliance === null ? "neutral" : (source.system.details?.alliance ?? "default");
        const defaultValue = _loc(
            actor.hasPlayerOwner ? "PF2E.Actor.Creature.Alliance.Party" : "PF2E.Actor.Creature.Alliance.Opposition",
        );

        const allianceOptions = {
            default: _loc("PF2E.Actor.Creature.Alliance.Default", { alliance: defaultValue }),
            opposition: "PF2E.Actor.Creature.Alliance.Opposition",
            party: "PF2E.Actor.Creature.Alliance.Party",
            neutral: "PF2E.Actor.Creature.Alliance.Neutral",
        };

        return {
            ...(await super._prepareContext(options)),
            document: actor,
            alliances: createSheetOptions(allianceOptions, { value: [alliance] }),
            buttons: [{ type: "submit", icon: "fa-solid fa-floppy-disk", label: "SETTINGS.Save" }],
            systemId: SYSTEM_ID,
        };
    }

    /** Remove the stored property if it's set to default; otherwise, update */
    protected override _processFormData(
        event: SubmitEvent | null,
        form: HTMLFormElement,
        formData: fa.ux.FormDataExtended,
    ): Record<string, unknown> {
        const data: Record<string, unknown> = super._processFormData(event, form, formData);
        const path = "system.details.alliance";
        const alliance = fu.getProperty(data, path);

        if (alliance === "default") {
            fu.setProperty(data, path, _del);
        } else if (alliance === "neutral") {
            fu.setProperty(data, path, null);
        } else if (!setHasElement(ALLIANCES, alliance)) {
            throw ErrorPF2e("Unrecognized alliance");
        }

        return data;
    }
}

/** DocumentSheetRenderContext<TActor>` causes TS depth errors */
interface CreatureConfigContext<TActor extends CreaturePF2e> extends fa.api.DocumentSheetRenderContext {
    document: TActor;
    alliances: SheetOptions;
    buttons: fa.FormFooterButton[];
    systemId: SystemId;
}

export { CreatureConfig, type CreatureConfigContext };
