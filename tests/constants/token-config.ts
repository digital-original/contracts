export const TOKEN_CONFIG_TYPE = {
    TokenConfig: [
        { name: 'creator', type: 'address' },
        { name: 'regulationMode', type: 'uint8' },
    ],
};

export const REGULATION_MODE_NONE = 0;
export const REGULATION_MODE_UNREGULATED = 1;
export const REGULATION_MODE_REGULATED = 2;
