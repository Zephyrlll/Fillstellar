export function Ok(value) {
    return { ok: true, value };
}
export function Err(error) {
    return { ok: false, error };
}
// エラータイプの定義
export class CelestialCreationError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'CelestialCreationError';
    }
}
