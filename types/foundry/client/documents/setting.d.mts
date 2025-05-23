import SettingsConfig from "@client/applications/settings/config.mjs";
import { DatabaseCreateCallbackOptions, DatabaseUpdateCallbackOptions } from "@common/abstract/_types.mjs";
import { BaseSetting } from "./_module.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";

type BaseSettingStatic = typeof BaseSetting;
interface ClientBaseSettingStatic extends BaseSettingStatic, ClientDocumentStatic {}

declare const ClientBaseSetting: {
    new (...args: any): BaseSetting & ClientDocument<null>;
} & ClientBaseSettingStatic;

/**
 * The client-side Setting document which extends the common BaseSetting model.
 *
 * @see {@link WorldSettings}       The world-level collection of Setting documents
 */
export default class Setting extends ClientBaseSetting {
    /** The setting configuration for this setting document. */
    get config(): SettingsConfig | undefined;

    protected override _initialize(options?: object): void;

    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void;

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    /**
     * Cast the value of the Setting into its defined type.
     * The initialized type of the Setting document.
     */
    protected _castType(): unknown;
}

export {};
