export interface CompendiumArtInfo {
    /** The path to the Actor's portrait image. */
    actor?: ImageFilePath;
    /** The path to the token image, or an object to merge into the Actor's prototype token. */
    token?: ImageFilePath | object;
    /** An optional credit string for use by the game system to apply in an appropriate place. */
    credit?: string;
}

/** A mapping of compendium pack IDs to Document IDs to art information. */
export type CompendiumArtMapping = Record<string, Record<string, CompendiumArtInfo>>;

export interface CompendiumArtDescriptor {
    /** The ID of the package providing the art. */
    packageId: string;
    /** The title of the package providing the art. */
    title: string;
    /** The path to the art mapping file. */
    mapping: string;
    /** An optional credit string for use by the game system to apply in an appropriate place. */
    credit?: string;
    /** The package's user-configured priority. */
    priority: number;
}
