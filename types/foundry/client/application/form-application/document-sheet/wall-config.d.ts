export {};

declare global {
    /**
     * The Application responsible for configuring a single Wall document within a parent Scene.
     * @param object    The Wall object for which settings are being configured
     * @param [options] Additional options which configure the rendering of the configuration sheet.
     */
    class WallConfig<TDocument extends WallDocument<Scene | null>> extends DocumentSheet<TDocument, WallConfigOptions> {
        static override get defaultOptions(): WallConfigOptions;

        override get title(): string;

        protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
    }

    interface WallConfigOptions extends DocumentSheetOptions {
        id: "wall-config";
        editTargets: WallDocument<Scene | null>[];
    }
}
