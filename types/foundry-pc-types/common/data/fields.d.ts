export {};

declare global {
    module foundry {
        module data {
            type ImageField = `${string}.${ImageFileExtension}`;
            type VideoField = `${string}.${VideoFileExtension}`;
            type ColorField = `#${string}`;
            type GridType = typeof CONST.GRID_TYPES[keyof typeof CONST.GRID_TYPES];
        }
    }
}
type ImageFileExtension = typeof CONST.IMAGE_FILE_EXTENSIONS[number];
type VideoFileExtension = typeof CONST.VIDEO_FILE_EXTENSIONS[number];
