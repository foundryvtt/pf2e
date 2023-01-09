declare module foundry {
    module documents {
        /**
         * The Token document model.
         * @param data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseToken extends abstract.Document {
            readonly actorLink: boolean;

            displayName: TokenDisplayMode;

            disposition: TokenDisposition;

            width: number;

            height: number;

            texture: {
                src: VideoFilePath;
                scaleX: number;
                scaleY: number;
                offsetX: number;
                offsetY: number;
                rotation: number | null;
                tint: HexColorString;
            };

            light: foundry.data.LightData<this>;

            sight: {
                enabled: boolean;
                range: number | null;
                angle: number;
                color: HexColorString;
                attenuation: number;
                brightness: number;
                saturation: number;
                contrast: number;
                visionMode: string;
            };

            elevation: number;

            effects: VideoFilePath[];

            static override get schema(): typeof data.TokenData;

            static override get metadata(): TokenMetadata;

            /** Is a user able to update an existing Token? */
            protected static _canUpdate(user: BaseUser, doc: BaseToken, data: data.TokenData): boolean;
        }

        interface BaseToken extends abstract.Document {
            readonly data: data.TokenData<this>;

            readonly parent: BaseScene | null;
        }

        interface TokenMetadata extends abstract.DocumentMetadata {
            name: "Token";
            collection: "tokens";
            label: "DOCUMENT.Token";
            isEmbedded: true;
            permissions: Omit<abstract.DocumentMetadata["permissions"], "create"> & {
                create: "TOKEN_CREATE";
            };
        }
    }
}
