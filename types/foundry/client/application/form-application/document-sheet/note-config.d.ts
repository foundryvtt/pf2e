/**
 * Placeable Note configuration sheet
 * @param note    The Note object for which settings are being configured
 * @param options Additional Application options
 */
declare class NoteConfig<TDocument extends NoteDocument<Scene | null>> extends DocumentSheet<TDocument> {
    /**
     * Extend the logic applied when the application is closed to clear any preview notes
     */
    close(): Promise<void>;

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
