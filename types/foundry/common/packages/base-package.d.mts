import { CompendiumDocumentType } from "@client/utils/helpers.mjs";
import { DataModelConstructionContext, DataSchema } from "@common/abstract/_types.mjs";
import { DocumentOwnershipLevel, PackageAvailabilityCode, PackageType, UserRole } from "@common/constants.mjs";
import { DataFieldOptions, ObjectFieldOptions } from "@common/data/_module.mjs";
import type DataModel from "../abstract/data.mjs";
import type * as fields from "../data/fields.mjs";
import { PackageManifestData } from "./_types.mjs";

/** A custom SchemaField for defining package compatibility versions. */
export class PackageCompatibility extends fields.SchemaField<PackageCompatibilitySchema> {
    constructor(options: DataFieldOptions<fields.SourceFromSchema<PackageCompatibilitySchema>, true, false, true>);
}

type PackageCompatibilitySchema = {
    /** The Package will not function before this version */
    minimum: fields.StringField<string, string, false, false, false>;
    /** Verified compatible up to this version */
    verified: fields.StringField<string, string, false, false, false>;
    /** The Package will not function after this version */
    maximum: fields.StringField<string, string, false, false, false>;
};

/** A custom SchemaField for defining package relationships. */
export class PackageRelationships extends fields.SchemaField<PackageRelationshipsSchema> {
    constructor(options?: DataFieldOptions<fields.SourceFromSchema<PackageRelationshipsSchema>, true, false, true>);
}

type PackageRelationshipsSchema = {
    /** Systems that this Package supports */
    systems: fields.SetField<RelatedPackage>;
    /** Packages that are required for base functionality */
    requires: fields.SetField<RelatedPackage>;
    /** Packages that are recommended for optimal functionality */
    recommends: fields.SetField<RelatedPackage>;
    conflicts: fields.SetField<RelatedPackage>;
    flags: fields.ObjectField<Record<string, JSONValue | undefined>, Record<string, unknown>>;
};

/**
 * A custom SchemaField for defining a related Package.
 * It may be required to be a specific type of package, by passing the packageType option to the constructor.
 */
export class RelatedPackage extends fields.SchemaField<RelatedPackageSchema> {
    constructor(options?: DataFieldOptions<fields.SourceFromSchema<RelatedPackageSchema>, true, false, true>);
}

type RelatedPackageSchema = {
    id: fields.StringField<string, string, true, false, false>;
    type: fields.StringField<PackageType>;
    manifest: fields.StringField<string, string, false, false, false>;
    compatibility: PackageCompatibility;
    reason: fields.StringField<string, string, false, false, false>;
};

/** A custom SchemaField for defining the folder structure of the included compendium packs. */
export class PackageCompendiumFolder extends fields.SchemaField<PackageCompendiumFolderSchema> {
    constructor(options?: DataFieldOptions<PackageCompendiumFolderSchema, true, false, true>);
}

type PackageCompendiumFolderSchema = {
    name: fields.StringField<string, string, true, false, false>;
    sorting: fields.StringField<"a" | "m">;
    color: fields.ColorField;
    packs: fields.SetField<fields.StringField<string, string, true, false, false>>;
};

/** A special ObjectField which captures a mapping of USER_ROLES to DOCUMENT_OWNERSHIP_LEVELS. */
export class CompendiumOwnershipField extends fields.ObjectField<Record<UserRole, DocumentOwnershipLevel>> {
    static override get _defaults(): ObjectFieldOptions<
        Record<UserRole, DocumentOwnershipLevel>,
        boolean,
        boolean,
        boolean
    >;

    protected override _validateType(value: unknown, options?: Record<string, unknown>): void;
}

/** A special SetField which provides additional validation and initialization behavior specific to compendium packs. */
export class PackageCompendiumPacks<TSchema extends PackageCompendiumSchema> extends fields.SetField<
    fields.SchemaField<TSchema>
> {
    protected override _cleanType(value: Record<string, unknown>[], options?: Record<string, unknown>): void;

    override initialize(
        value: fields.SourceFromSchema<TSchema>[],
        model: DataModel,
        options?: Record<string, unknown>,
    ): Set<fields.ModelPropsFromSchema<TSchema>>;

    /** Extend the logic for validating the complete set of packs to ensure uniqueness. */
    protected override _validateElements(value: unknown[], options?: Record<string, unknown>): void;

    /** Validate each individual compendium pack, ensuring its name and path are unique. */
    protected _validateElement(value: unknown, options?: Record<string, unknown>): void;
}

/**
 * The data schema used to define a Package manifest.
 * Specific types of packages extend this schema with additional fields.
 */
export default abstract class BasePackage<TDataSchema extends BasePackageSchema = BasePackageSchema> extends DataModel<
    null,
    TDataSchema
> {
    /** An availability code in PACKAGE_AVAILABILITY_CODES which defines whether this package can be used. */
    availability: PackageAvailabilityCode;

    /** A flag which tracks whether this package is currently locked. */
    locked: boolean;

    /** A flag which tracks whether this package is a free Exclusive pack */
    exclusive: boolean;

    /** A flag which tracks whether this package is owned, if it is protected. */
    owned: boolean | null;

    /** A set of Tags that indicate what kind of Package this is, provided by the Website */
    tags: string[];

    /** A flag which tracks if this package has files stored in the persistent storage folder */
    hasStorage: boolean;

    /**
     * @param data         Source data for the package
     * @param [options={}] Options which affect DataModel construction
     */
    constructor(data: PackageManifestData, options?: DataModelConstructionContext<null>);

    /**
     * Define the package type in CONST.PACKAGE_TYPES that this class represents.
     * Each BasePackage subclass must define this attribute.
     */
    static type: PackageType;

    /** The type of this package instance. A value in CONST.PACKAGE_TYPES. */
    get type(): PackageType;

    /** A flag which defines whether this package is unavailable to be used. */
    get unavailable(): boolean;

    /** Is this Package incompatible with the currently installed core Foundry VTT software version? */
    get incompatibleWithCoreVersion(): boolean;

    /**
     * Test if a given availability is incompatible with the core version.
     * @param availability The availability value to test.
     */
    static isIncompatibleWithCoreVersion(availability: PackageAvailabilityCode): boolean;

    /** The named collection to which this package type belongs */
    static get collection(): string;

    static override defineSchema(): BasePackageSchema;

    /**
     * Check the given compatibility data against the current installation state and determine its availability.
     * @param data      The compatibility data to test.
     * @param [release] A specific software release for which to test availability.
     *                  Tests against the current release by default.
     */
    static testAvailability(data?: Partial<PackageManifestData>, release?: ReleaseData): PackageAvailabilityCode;

    /**
     *
     * @param compatibility The compatibility range declared for the dependency, if any
     * @param dependency    The known dependency package
     * @returns Is the dependency compatible with the required range?
     */
    static testDependencyCompatibility(
        compatibility: PackageCompatibility,
        dependency: BasePackage<BasePackageSchema>,
    ): boolean;

    static override cleanData(
        source?: Record<string, unknown>,
        options?: Record<string, unknown>,
    ): fields.SourceFromSchema<BasePackageSchema>;

    /**
     * Validate that a Package ID is allowed.
     * @param id The candidate ID
     * @throws An error if the candidate ID is invalid
     */
    static validateId(id: string): void;

    static override migrateData(source: Record<string, unknown>): fields.SourceFromSchema<DataSchema>;

    /**
     * Retrieve the latest Package manifest from a provided remote location.
     * @param manifestUrl A remote manifest URL to load
     * @param options     Additional options which affect package construction
     * @param [options.strict=true]   Whether to construct the remote package strictly
     * @return A Promise which resolves to a constructed ServerPackage instance
     * @throws An error if the retrieved manifest data is invalid
     */
    static fromRemoteManifest<T extends BasePackage<BasePackageSchema>>(
        this: ConstructorOf<T>,
        manifestUrl: string,
        options?: { strict?: boolean },
    ): Promise<T | null>;
}

export default interface BasePackage<TDataSchema extends BasePackageSchema>
    extends DataModel<null, TDataSchema>,
        fields.ModelPropsFromSchema<BasePackageSchema> {}

/**
 * The data structure of a package manifest. This data structure is extended by BasePackage subclasses to add additional
 * type-specific fields.
 */
type BasePackageSchema = {
    /** The machine-readable unique package id, should be lower-case with no spaces or special characters */
    id: fields.StringField<string, string, true, false, false>;
    /** The human-readable package title, containing spaces and special characters */
    title: fields.StringField<string, string, true, false, false>;
    /** An optional package description, may contain HTML */
    description: fields.StringField<string, string, true, false, true>;
    /** An array of author objects who are co-authors of this package. Preferred to the singular author field. */
    authors: fields.SetField<fields.SchemaField<PackageAuthorSchema>>;
    /** A web url where more details about the package may be found */
    url: fields.StringField<string, string, false, false, false>;
    /** A web url or relative file path where license details may be found */
    license: fields.StringField<string, string, false, false, false>;
    /** A web url or relative file path where readme instructions may be found */
    readme: fields.StringField<string, string, false, false, false>;
    /** A web url where bug reports may be submitted and tracked */
    bugs: fields.StringField<string, string, false, false, false>;
    /** A web url where notes detailing package updates are available */
    changelog: fields.StringField<string, string, false, false, false>;
    flags: fields.ObjectField<Record<string, JSONValue | undefined>, Record<string, unknown>>;
    media: fields.SetField<
        fields.SchemaField<{
            type: fields.StringField<string, string, false, false, false>;
            url: fields.StringField<string, string, false, false, false>;
            caption: fields.StringField<string, string, false, false, false>;
            loop: fields.BooleanField;
            thumbnail: fields.StringField<string, string, false, false, false>;
            flags: fields.ObjectField<Record<string, JSONValue | undefined>, Record<string, unknown>>;
        }>
    >;

    /** The current package version */
    version: fields.StringField<string, string, true, boolean, true>;
    /** The compatibility of this version with the core Foundry software */
    compatibility: PackageCompatibility;
    /** An array of urls or relative file paths for JavaScript files which should be included */
    scripts: fields.SetField<fields.StringField<string, string, true, false, false>>;
    /** An array of urls or relative file paths for ESModule files which should be included */
    esmodules: fields.SetField<fields.StringField<string, string, true, false, false>>;
    /** An array of urls or relative file paths for CSS stylesheet files which should be included */
    styles: fields.SetField<fields.StringField<string, string, true, false, false>>;
    /** An array of language data objects which are included by this package */
    languages: fields.SetField<fields.SchemaField<PackageLanguageSchema>>;
    /** An array of compendium packs which are included by this package */
    packs: PackageCompendiumPacks<PackageCompendiumSchema>;
    packFolders: fields.SetField<PackageCompendiumFolder>;
    /** An organized object of relationships to other Packages */
    relationships: PackageRelationships;
    /** Whether to require a package-specific socket namespace for this package */
    socket: fields.BooleanField;
    /** A publicly accessible web URL which provides the latest available package manifest file. Required in order to support module updates. */
    manifest: fields.StringField;
    /** A publicly accessible web URL where the source files for this package may be downloaded. Required in order to support module installation. */
    download: fields.StringField<string, string, false, false, false>;
    /** Whether this package uses the protected content access system. */
    protected: fields.BooleanField;
    exclusive: fields.BooleanField;
    persistentStorage: fields.BooleanField;
};

type PackageAuthorSchema = {
    /** The author name */
    name: fields.StringField<string, string, true, false, false>;
    /** The author email address */
    email: fields.StringField<string, string, false, false, false>;
    /** A website url for the author */
    url: fields.StringField<string, string, false, false, false>;
    /** A Discord username for the author */
    discord: fields.StringField<string, string, false, false, false>;
    flags: fields.ObjectField<Record<string, JSONValue | undefined>, Record<string, unknown>>;
};

type PackageCompendiumSchema = {
    /** The canonical compendium name. This should contain no spaces or special characters */
    name: fields.StringField<string, string, true, false, false>;
    /** The human-readable compendium name */
    label: fields.StringField<string, string, true, false, false>;
    banner: fields.StringField<string, string, false, false, false>;
    /** The local relative path to the compendium source directory. The filename should match the name attribute */
    path: fields.StringField<string, string, false, false, true>;
    /** The specific document type that is contained within this compendium pack */
    type: fields.StringField<CompendiumDocumentType, CompendiumDocumentType, true, false, false>;
    /** Denote that this compendium pack requires a specific game system to function properly */
    system: fields.StringField<string, string, false, false, false>;
    ownership: CompendiumOwnershipField;
    flags: fields.ObjectField<Record<string, JSONValue | undefined>, Record<string, unknown>>;
};
export type PackageCompendiumData = fields.ModelPropsFromSchema<PackageCompendiumSchema>;

type PackageLanguageSchema = {
    /** A string language code which is validated by Intl.getCanonicalLocales */
    lang: fields.StringField<string, string, true, false, false>;
    /** The human-readable language name */
    name: fields.StringField<string, string, false, false, true>;
    /** The relative path to included JSON translation strings */
    path: fields.StringField<string, string, true, false, false>;
    /** Only apply this set of translations when a specific system is being used */
    system: fields.StringField<string, string, false, false, false>;
    /** Only apply this set of translations when a specific module is active */
    module: fields.StringField<string, string, false, false, false>;
    flags: fields.ObjectField<Record<string, JSONValue | undefined>, Record<string, unknown>>;
};
export type ReleaseData = object;
