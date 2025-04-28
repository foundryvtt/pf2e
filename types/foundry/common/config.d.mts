import DataModel from "./abstract/data.mjs";
import { SoftwareUpdateChannel } from "./constants.mjs";
import * as fields from "./data/fields.mjs";

/**
 * A data model definition which describes the application configuration options.
 * These options are persisted in the user data Config folder in the options.json file.
 * The server-side software extends this class and provides additional validations.
 */
declare class ServerSettings extends DataModel<null, ServerSettingsSchema> {
    static defineSchema(): ServerSettingsSchema;

    static LOCALIZATION_PREFIXES: string[];

    static override migrateData<T extends DataModel>(
        this: ConstructorOf<T>,
        source: Record<string, unknown>,
    ): T["_source"];
}

declare interface ServerSettings
    extends DataModel<null, ServerSettingsSchema>,
        fields.ModelPropsFromSchema<ServerSettingsSchema> {}

/**
 * @property {string|null} adminPassword
 * @property {string|null} awsConfig
 * @property {boolean} compressStatic
 * @property {string} dataPath
 * @property {boolean} fullscreen
 * @property {string|null} hostname
 * @property {string} language
 * @property {string|null} localHostname        A custom hostname applied to local invitation addresses
 * @property {string|null} passwordSalt         A custom salt used for hashing user passwords (obscured)
 * @property {number} port                      The port on which the server is listening
 * @property {number} [protocol]                The Internet Protocol version to use, either 4 or 6.
 * @property {number} proxyPort                 An external-facing proxied port used for invitation addresses and URLs
 * @property {boolean} proxySSL                 Is the application running in SSL mode at a reverse-proxy level?
 * @property {string|null} routePrefix          A URL path part which prefixes normal application routing
 * @property {string|null} sslCert              The relative path (to Config) of a used SSL certificate
 * @property {string|null} sslKey               The relative path (to Config) of a used SSL key
 * @property {string} updateChannel             The current application update channel
 * @property {boolean} upnp                     Is UPNP activated?
 * @property {number} upnpLeaseDuration         The duration in seconds of a UPNP lease, if UPNP is active
 * @property {string} world                     A default world name which starts automatically on launch
 */

type ServerSettingsSchema = {
    /** The server administrator password (obscured) */
    adminPassword: fields.StringField<string, string, true, true>;
    /** The relative path (to Config) of an AWS configuration file */
    awsConfig: fields.StringField<string, string, false, true, true>;
    /** Whether to compress static files? True by default */
    compressStatic: fields.BooleanField;
    compressSocket: fields.BooleanField;
    cssTheme: fields.StringField<"light" | "dark", "light" | "dark", false, false, true>;
    /** The absolute path of the user data directory (obscured) */
    dataPath: fields.StringField;
    deleteNEDB: fields.BooleanField;
    /** Whether the application should automatically start in fullscreen mode? */
    fullscreen: fields.BooleanField;
    /** A custom hostname applied to internet invitation addresses and URLs */
    hostname: fields.StringField<string, string, true>;
    hotReload: fields.BooleanField;
    /** The default language for the application */
    language: fields.StringField<string, string, true, false, false>;
    localHostname: fields.StringField<string, string, true>;
    passwordSalt: fields.StringField<string, string, true>;
    port: fields.NumberField<number, number, true, false, true>;
    protocol: fields.NumberField<4 | 6, 4 | 6, false, true, true>;
    proxyPort: fields.NumberField<number, number, true, true, true>;
    proxySSL: fields.BooleanField;
    routePrefix: fields.StringField<string, string, true>;
    sslCert: fields.StringField<string, string, false, true, false>;
    sslKey: fields.StringField<string, string, false, true, false>;
    telemetry: fields.BooleanField;
    updateChannel: fields.StringField<SoftwareUpdateChannel, SoftwareUpdateChannel, true, false, true>;
    upnp: fields.BooleanField;
    upnpLeaseDuration: fields.NumberField;
    world: fields.StringField<string, string, true>;
    noBackups: fields.BooleanField;
};

/**
 * A data object which represents the details of this Release of Foundry VTT
 *
 * @property {number} generation        The major generation of the Release
 * @property {number} [maxGeneration]   The maximum available generation of the software.
 * @property {number} [maxStableGeneration]  The maximum available stable generation of the software.
 * @property {string} channel           The channel the Release belongs to, such as "stable"
 * @property {string} suffix            An optional appended string display for the Release
 * @property {number} build             The internal build number for the Release
 * @property {number} time              When the Release was released
 * @property {number} [node_version]    The minimum required Node.js major version
 * @property {string} [notes]           Release notes for the update version
 * @property {string} [download]        A temporary download URL where this version may be obtained
 */
declare class ReleaseData extends DataModel {
    static override defineSchema(): {
        generation: fields.NumberField<number, number, true, false, true>;
        maxGeneration: fields.NumberField<any, any, false, false, true>;
        maxStableGeneration: fields.NumberField<any, any, false, false, true>;
        channel: fields.StringField<
            "stable" | "testing" | "development" | "prototype",
            "stable" | "testing" | "development" | "prototype",
            false,
            false,
            false
        >;
        suffix: fields.StringField<string, string, false, false, false>;
        build: fields.NumberField<number, number, true, false, true>;
        time: fields.NumberField<number, number, false, false, true>;
        node_version: fields.NumberField<number, number, true, false, true>;
        notes: fields.StringField<string, string, false, false, false>;
        download: fields.StringField<string, string, false, false, false>;
    };

    /**
     * A formatted string for shortened display, such as "Version 9"
     */
    get shortDisplay(): string;

    /**
     * A formatted string for general display, such as "V9 Prototype 1" or "Version 9"
     */
    get display(): string;

    /**
     * A formatted string for Version compatibility checking, such as "9.150"
     */
    get version(): string;

    override toString(): string;

    /**
     * Is this ReleaseData object newer than some other version?
     * @param other Some other version to compare against
     * @returns Is this ReleaseData a newer version?
     */
    isNewer(other: string | ReleaseData): boolean;

    /**
     * Is this ReleaseData object a newer generation than some other version?
     * @param other Some other version to compare against
     * @returns Is this ReleaseData a newer generation?
     */
    isGenerationalChange(other: string | ReleaseData): boolean;
}

export { ReleaseData, ServerSettings };
