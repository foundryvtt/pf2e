declare module foundry {
    module data {
        interface TextureData {
            /** The URL of the texture source. */
            src: string | null;
            /** The scale of the texture in the X dimension. */
            scaleX: number;
            /** The scale of the texture in the Y dimension. */
            scaleY: number;
            /** The X offset of the texture with (0,0) in the top left. */
            offsetX: number;
            /** The Y offset of the texture with (0,0) in the top left. */
            offsetY: number;
            /** An angle of rotation by which this texture is rotated around its center. */
            rotation: number;
            /** An optional color string used to tint the texture. */
            tint: number | null;
        }
    }
}
