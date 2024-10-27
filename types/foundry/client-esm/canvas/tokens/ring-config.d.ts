/**
 * Token Ring configuration Singleton Class.
 */
export class TokenRingConfig {
    /**
     * Get the current effects.
     * @returns The current effects.
     */
    get effects(): Record<string, string>;

    /**
     * Get the current spritesheet.
     * @returns The current spritesheet path.
     */
    get spritesheet(): string;

    /** Is a custom fit mode active? */
    get isGridFitMode(): boolean;
}
