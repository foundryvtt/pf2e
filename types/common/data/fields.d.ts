export {};

declare global {
    module foundry {
        module data {
            type AudioField = `${string}.${AudioFileExtension}`;
            type ColorField = `#${string}`;
            type GridType = typeof CONST.GRID_TYPES[keyof typeof CONST.GRID_TYPES];
            type ImageField = `${string}.${ImageFileExtension}`;
            type VideoField = `${string}.${VideoFileExtension}` | ImageField;
        }
    }
}
type ImageFileExtension = typeof CONST.IMAGE_FILE_EXTENSIONS[number];
type VideoFileExtension = typeof CONST.VIDEO_FILE_EXTENSIONS[number];
type AudioFileExtension = typeof CONST.AUDIO_FILE_EXTENSIONS[number];
