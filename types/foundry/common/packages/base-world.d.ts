import type * as packages from "./module.d.ts";
import type * as fields from "../data/fields.d.ts";

export default class BaseWorld extends packages.BasePackage<WorldSchema> {
    static override defineSchema(): WorldSchema;

    static override type: "world";

    /** The default icon used for this type of Package. */
    static icon: string;

    static override migrateData(data: Record<string, unknown>): SourceFromSchema<WorldSchema>;

    static testAvailability(
        data?: Partial<packages.PackageManifestData>,
        release?: packages.ReleaseData,
    ): PackageAvailabilityCode;
}

export default interface BaseWorld extends packages.BasePackage<WorldSchema>, ModelPropsFromSchema<WorldSchema> {}

/**
 * The data schema used to define World manifest files.
 * Extends the basic PackageData schema with some additional world-specific fields.
 */
type WorldSchema = Omit<packages.BasePackageSchema, "version"> & {
    /** The game system name which this world relies upon */
    system: fields.StringField<string, string, true, false, false>;
    /** A web URL or local file path which provides a background banner image */
    background: fields.StringField<string, string, false, false, false>;
    /** The theme to use for this world's join page. */
    joinTheme: fields.StringField<string, string, false, false, false>;
    /** The version of the core software for which this world has been migrated */
    coreVersion: fields.StringField<string, string, true, false, false>;
    /** The version of the game system for which this world has been migrated */
    systemVersion: fields.StringField<string, string, true>;
    lastPlayed: fields.StringField;
    playtime: fields.NumberField;
    /** An ISO datetime string when the next game session is scheduled to occur */
    nextSession: fields.StringField<string, string, false, true, true>;
    /** Should user access keys be reset as part of the next launch? */
    resetKeys: fields.BooleanField<boolean, boolean, false, false, false>;
    /** Should the world launch in safe mode? */
    safeMode: fields.BooleanField<boolean, boolean, false, false, false>;
    version: fields.StringField<string, string, true, true, true>;
};
