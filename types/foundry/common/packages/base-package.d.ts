import type DataModel from "../abstract/data.d.ts";
import type * as fields from "../data/fields.d.ts";

/** A custom SchemaField for defining package compatibility versions. */
export class PackageCompatibility extends fields.SchemaField<PackageCompatibilitySchema> {
    constructor(options: fields.DataFieldOptions<SourceFromSchema<PackageCompatibilitySchema>, true, false, true>);
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
    constructor(options?: fields.DataFieldOptions<SourceFromSchema<PackageRelationshipsSchema>, true, false, true>);
}

type PackageRelationshipsSchema = {
    /** Systems that this Package supports */
    systems: fields.SetField<RelatedPackage>;
    /** Packages that are required for base functionality */
    requires: fields.SetField<RelatedPackage>;
    /** Packages that are recommended for optimal functionality */
    recommends: fields.SetField<RelatedPackage>;
    conflicts: fields.SetField<RelatedPackage>;
    flags: fields.ObjectField<DocumentFlags>;
};

/**
 * A custom SchemaField for defining a related Package.
 * It may be required to be a specific type of package, by passing the packageType option to the constructor.
 */
export class RelatedPackage extends fields.SchemaField<RelatedPackageSchema> {
    constructor(options?: fields.DataFieldOptions<SourceFromSchema<RelatedPackageSchema>, true, false, true>);
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
    constructor(options?: fields.DataFieldOptions<PackageCompendiumFolderSchema, true, false, true>);
}

type PackageCompendiumFolderSchema = {
    name: fields.StringField<string, string, true, false, false>;
    sorting: fields.StringField<"a" | "m">;
    color: fields.ColorField;
    packs: fields.SetField<fields.StringField<string, string, true, false, false>>;
};

/** A special ObjectField which captures a mapping of USER_ROLES to DOCUMENT_OWNERSHIP_LEVELS. */
export class CompendiumOwnershipField extends fields.ObjectField<Record<UserRole, DocumentOwnershipLevel>> {
    static override get _defaults(): fields.ObjectFieldOptions<
        Record<UserRole, DocumentOwnershipLevel>,
        boolean,
        boolean,
        boolean
    >;

    protected override _validateType(value: unknown, options?: Record<string, unknown>): void;
}

/** A special SetField which provides additional validation and initialization behavior specific to compendium packs. */
export class PackageCompendiumPacks<TSchema extends CompendiumPackSchema> extends fields.SetField<
    fields.SchemaField<TSchema>
> {
    protected override _cleanType(value: Record<string, unknown>[], options?: Record<string, unknown>): void;

    override initialize(
        value: SourceFromSchema<TSchema>[],
        model?: ConstructorOf<DataModel>,
        options?: Record<string, unknown>
    ): Set<SourceFromSchema<TSchema>>;

    /** Extend the logic for validating the complete set of packs to ensure uniqueness. */
    protected override _validateElements(value: unknown[], options?: Record<string, unknown>): void;

    /** Validate each individual compendium pack, ensuring its name and path are unique. */
    protected _validateElement(value: unknown, options?: Record<string, unknown>): void;
}

/**
 * The data schema used to define a Package manifest.
 * Specific types of packages extend this schema with additional fields.
 */
export default abstract class BasePackage<TDataSchema extends BasePackageSchema> extends DataModel<null, TDataSchema> {
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
     * @param {PackageManifestData} data  Source data for the package
     * @param [options={}] Options which affect DataModel construction
     */
    constructor(data: object, options?: DataModelConstructionOptions<null>);

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
     * @param {Partial<PackageManifestData>} data  The compatibility data to test.
     * @param {ReleaseData} [release]              A specific software release for which to test availability.
     *                                             Tests against the current release by default.
     */
    static testAvailability(data?: Record<string, unknown>, release?: object): PackageAvailabilityCode;

    /**
     *
     * @param compatibility The compatibility range declared for the dependency, if any
     * @param dependency    The known dependency package
     * @returns Is the dependency compatible with the required range?
     */
    static testDependencyCompatibility(
        compatibility: PackageCompatibility,
        dependency: BasePackage<BasePackageSchema>
    ): boolean;

    static override cleanData(
        source?: Record<string, unknown>,
        options?: Record<string, unknown>
    ): SourceFromSchema<BasePackageSchema>;

    /**
     * Validate that a Package ID is allowed.
     * @param id The candidate ID
     * @throws An error if the candidate ID is invalid
     */
    static validateId(id: string): void;

    static override migrateData(source: Record<string, unknown>): SourceFromSchema<fields.DataSchema>;

    /**
     * Retrieve the latest Package manifest from a provided remote location.
     * @param manifestUrl A remote manifest URL to load
     * @param options     Additional options which affect package construction
     * @param [options.strict=true]   Whether to construct the remote package strictly
     * @return A Promise which resolves to a constructed ServerPackage instance
     * @throws An error if the retrieved manifest data is invalid
     */
    static fromRemoteManifest(manifestUrl: string, options?: { strict?: boolean }): Promise<object>;
}

export default interface BasePackage<TDataSchema extends BasePackageSchema>
    extends DataModel<null, TDataSchema>,
        ModelPropsFromSchema<BasePackageSchema> {}

type BasePackageSchema = {
    // Package metadata
    id: fields.StringField<string, string, true, false, false>;
    title: fields.StringField<string, string, true, false, false>;
    description: fields.StringField<string, string, true, false, true>;
    authors: fields.SetField<
        fields.SchemaField<{
            name: fields.StringField<string, string, true, false, false>;
            email: fields.StringField<string, string, false, false, false>;
            url: fields.StringField<string, string, false, false, false>;
            discord: fields.StringField<string, string, false, false, false>;
            flags: fields.ObjectField<DocumentFlags>;
        }>
    >;
    url: fields.StringField<string, string, false, false, false>;
    license: fields.StringField<string, string, false, false, false>;
    readme: fields.StringField<string, string, false, false, false>;
    bugs: fields.StringField<string, string, false, false, false>;
    changelog: fields.StringField<string, string, false, false, false>;
    flags: fields.ObjectField<DocumentFlags>;
    media: fields.SetField<
        fields.SchemaField<{
            type: fields.StringField<string, string, false, false, false>;
            url: fields.StringField<string, string, false, false, false>;
            caption: fields.StringField<string, string, false, false, false>;
            loop: fields.BooleanField;
            thumbnail: fields.StringField<string, string, false, false, false>;
            flags: fields.ObjectField<DocumentFlags>;
        }>
    >;

    // Package versioning
    version: fields.StringField<string, string, true, false, true>;
    compatibility: PackageCompatibility;

    // Included content
    scripts: fields.SetField<fields.StringField<string, string, true, false, false>>;
    esmodules: fields.SetField<fields.StringField<string, string, true, false, false>>;
    styles: fields.SetField<fields.StringField<string, string, true, false, false>>;
    languages: fields.SetField<
        fields.SchemaField<{
            lang: fields.StringField<string, string, true, false, false>;
            name: fields.StringField<string, string, false, false, true>;
            path: fields.StringField<string, string, true, false, false>;
            system: fields.StringField<string, string, false, false, false>;
            module: fields.StringField<string, string, false, false, false>;
            flags: fields.ObjectField<DocumentFlags>;
        }>
    >;
    packs: PackageCompendiumPacks<CompendiumPackSchema>;
    packFolders: fields.SetField<PackageCompendiumFolder>;

    // Package relationships
    relationships: PackageRelationships;
    socket: fields.BooleanField;

    // Package downloading
    manifest: fields.StringField;
    download: fields.StringField<string, string, false, false, false>;
    protected: fields.BooleanField;
    exclusive: fields.BooleanField;
    persistentStorage: fields.BooleanField;
};

type CompendiumPackSchema = {
    name: fields.StringField<string, string, true, false, false>;
    label: fields.StringField<string, string, true, false, false>;
    banner: fields.StringField<string, string, false, false, false>;
    path: fields.StringField<string, string, false, false, true>;
    type: fields.StringField<CompendiumDocumentType, CompendiumDocumentType, true, false, false>;
    system: fields.StringField<string, string, false, false, false>;
    ownership: CompendiumOwnershipField;
    flags: fields.ObjectField<DocumentFlags>;
};
