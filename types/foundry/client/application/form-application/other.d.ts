/**
 * Configure the Combat tracker to display additional information as appropriate
 */
declare class CombatTrackerConfig extends FormApplication {
    protected override _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * Edit a folder, configuring its name and appearance
 */
declare class FolderConfig extends FormApplication {
    protected override _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * Template Measurement Config Sheet
 *
 * @param template          The template object being configured
 * @param options           Additional application rendering options
 * @param options.preview   Configure a preview version of a sound which is not yet saved
 */
declare class MeasuredTemplateConfig extends FormApplication {
    protected override _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * The player configuration menu
 * This form is used to allow the client to edit some preferences about their own User entity
 */
declare class UserConfig extends FormApplication {
    protected override _updateObject(event: Event, formData: {}): Promise<void>;
}
/**
 * Playlist Configuration Sheet
 *
 * @param object    The Playlist being edited
 * @param options   Additional application rendering options
 */
declare class PlaylistConfig extends FormApplication {
    protected override _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * Playlist Sound Configuration Sheet
 *
 * @param sound     The sound object being configured
 * @param options   Additional application rendering options
 */
declare class PlaylistSoundConfig extends FormApplication {
    protected override _updateObject(event: Event, formData: {}): Promise<void>;
}
