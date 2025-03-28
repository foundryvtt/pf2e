import { ApplicationConfiguration } from "../../../../client-esm/applications/_types.js";
import type ApplicationV2 from "../../../../client-esm/applications/api/application.d.ts";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
} from "../../../../client-esm/applications/api/handlebars-application.ts";

declare global {
    /**
     * A SidebarTab for providing help messages and settings configurations.
     * The Settings sidebar is the furthest-to-right using a triple-cogs icon.
     */
    class Settings extends HandlebarsApplicationMixin(ApplicationV2) {
        static override DEFAULT_OPTIONS: Partial<ApplicationConfiguration>;

        override _prepareContext(options: HandlebarsRenderOptions): Promise<{
            user: User;
            system: object;
            coreVersion: string;
            canConfigure: boolean;
            canSetup: boolean;
            coreUpdate: boolean;
            modules: unknown;
        }>;

        /** Delegate different actions for different settings buttons */
        protected _onSettingsButton(event: MouseEvent): void;
    }
}
