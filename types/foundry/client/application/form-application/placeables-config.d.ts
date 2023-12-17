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

/**
 * Light Source Configuration Sheet
 *
 * @param light     The AmbientLight object for which settings are being configured
 * @param options   LightConfig ui options (see Application)
 */
declare class LightConfig<TDocument extends AmbientLightDocument<Scene | null>> extends DocumentSheet<TDocument> {
    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}

/**
 * Ambient Sound Config Sheet
 *
 * @param sound             The sound object being configured
 * @param options           Additional application rendering options
 * @param options.preview   Configure a preview version of a sound which is not yet saved
 */
declare class AmbientSoundConfig<
    TDocument extends AmbientSoundDocument<Scene | null>,
> extends DocumentSheet<TDocument> {
    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
