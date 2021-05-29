/**
 * Configuration sheet for the Drawing object
 *
 * @param drawing           The Drawing object being configured
 * @param options           Additional application rendering options
 * @param options.preview   Configure a preview version of the Drawing which is not yet saved
 */
declare class DrawingConfig extends FormApplication {
    /**
     * Extend the application close method to clear any preview sound aura if one exists
     */
    close(): Promise<void>;

    /** @override */
    protected _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * Light Source Configuration Sheet
 *
 * @param light     The AmbientLight object for which settings are being configured
 * @param options   LightConfig ui options (see Application)
 */
declare class LightConfig extends FormApplication {
    /** @override */
    protected _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * Ambient Sound Config Sheet
 *
 * @param sound             The sound object being configured
 * @param options           Additional application rendering options
 * @param options.preview   Configure a preview version of a sound which is not yet saved
 */
declare class AmbientSoundConfig extends FormApplication {
    /** @override */
    protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
