/**
 * Configuration sheet for the Drawing object
 *
 * @param drawing           The Drawing object being configured
 * @param options           Additional application rendering options
 * @param options.preview   Configure a preview version of the Drawing which is not yet saved
 */
declare class DrawingConfig<TDocument extends DrawingDocument<Scene | null>> extends DocumentSheet<TDocument> {
    /** Extend the application close method to clear any preview sound aura if one exists */
    close(): Promise<void>;

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
