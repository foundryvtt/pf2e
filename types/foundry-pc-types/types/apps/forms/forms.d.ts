// @TODO:

/**
 * Configure the Combat tracker to display additional information as appropriate
 */
declare class CombatTrackerConfig extends FormApplication {
    /** @override */
    protected _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * Edit a folder, configuring its name and appearance
 */
declare class FolderConfig extends FormApplication {
    /** @override */
    protected _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * An Image Popout Application
 * Provides optional support to edit the image path being viewed
 * @params image {String}       The image being viewed
 * @params options {Object}     Standard Application rendering options
 * @params onUpdate {Function}  An optional callback function which should be triggered if the Image path is edited
 */
declare class ImagePopout extends FormApplication {
    /** @override */
    protected _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * Template Measurement Config Sheet
 *
 * @param template			The template object being configured
 * @param options			Additional application rendering options
 * @param options.preview	Configure a preview version of a sound which is not yet saved
 */
declare class MeasuredTemplateConfig extends FormApplication {
    /** @override */
    protected _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * The player configuration menu
 * This form is used to allow the client to edit some preferences about their own User entity
 */
declare class PlayerConfig extends FormApplication {
    /** @override */
    protected _updateObject(event: Event, formData: {}): Promise<void>;
}
/**
 * Playlist Configuration Sheet
 *
 * @param object	The Playlist being edited
 * @param options	Additional application rendering options
 */
declare class PlaylistConfig extends FormApplication {
    /** @override */
    protected _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * Playlist Sound Configuration Sheet
 *
 * @param sound		The sound object being configured
 * @param options	Additional application rendering options
 */
declare class PlaylistSoundConfig extends FormApplication {
    /** @override */
    protected _updateObject(event: Event, formData: {}): Promise<void>;
}

/**
 * Entity Sheet Configuration Application
 *
 * @param entity	The Entity object for which the sheet is being configured
 * @param options	Additional Application options
 */
declare class EntitySheetConfig extends FormApplication {
    /** @override */
    protected _updateObject(event: Event, formData: {}): Promise<void>;
}
