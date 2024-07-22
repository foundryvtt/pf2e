import type { ClientBaseSetting } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side Setting document which extends the common BaseSetting model.
     *
     * @see {@link WorldSettings}       The world-level collection of Setting documents
     */
    class Setting extends ClientBaseSetting {
        /** The setting configuration for this setting document. */
        get config(): SettingsConfig | undefined;

        protected override _initialize(options?: object): void;

        protected override _onCreate(
            data: this["_source"],
            options: DatabaseCreateOperation<null>,
            userId: string,
        ): void;

        protected override _onUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DatabaseUpdateOperation<null>,
            userId: string,
        ): void;

        /**
         * Cast the value of the Setting into its defined type.
         * The initialized type of the Setting document.
         */
        protected _castType(): unknown;
    }
}
