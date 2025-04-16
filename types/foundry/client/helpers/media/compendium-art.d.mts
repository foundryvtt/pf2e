import { CompendiumArtDescriptor, CompendiumArtInfo } from "../_types.mjs";

/**
 * A class responsible for managing package-provided art and applying it to Documents in compendium packs.
 */
export default class CompendiumArt extends Map<string, CompendiumArtInfo> {
    constructor(entries: readonly (readonly [string, CompendiumArtInfo])[] | null);

    /** The key for the package manifest flag used to store the mapping information. */
    FLAG: "compendiumArtMappings";

    /** The key for the setting used to store the World's art preferences. */
    SETTING: "compendiumArtConfiguration";

    /**
     * Whether art application is enabled. This should be switched off when performing client-side compendium migrations
     * in order to avoid persisting injected data.
     */
    enabled: boolean;

    /** Retrieve all active packages that provide art mappings in priority order. */
    getPackages(): CompendiumArtDescriptor[];

    /**
     * Collate Document art mappings from active packages.
     * @internal
     */
    _registerArt(): Promise<void>;
}
