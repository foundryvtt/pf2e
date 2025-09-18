import { SettingConfig, TrackedAttributesDescription } from "@client/_types.mjs";
import { TurnMarkerData } from "@client/canvas/placeables/tokens/_module.mjs";
import CombatConfiguration from "@client/data/combat-config.mjs";
import { ApplicationConfiguration, ApplicationRenderContext, FormFooterButton } from "../_types.mjs";
import {
    ApplicationV2,
    HandlebarsApplicationMixin,
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../api/_module.mjs";

export interface CombatTrackerContext extends ApplicationRenderContext {
    rootId: string;
    attributeChoices: TrackedAttributesDescription;
    canConfigure: boolean;
    combatTheme?: SettingConfig;
    fields: (typeof CombatConfiguration)["schema"]["fields"];
    selectedTheme?: SettingConfig;
    settings: SettingConfig;
    animationChoices: TurnMarkerData;
    buttons: FormFooterButton[];
}

/** The Application responsible for configuring the CombatTracker and its contents. */
export default class CombatTrackerConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    override _prepareContext(options: HandlebarsRenderOptions): Promise<CombatTrackerContext>;
}
