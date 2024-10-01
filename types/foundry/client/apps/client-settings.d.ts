/**
 * A game settings configuration application
 * This form renders the settings defined via the game.settings.register API which have config = true
 *
 */
declare class SettingsConfig extends FormApplication {
    // @TODO: Declare
    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
