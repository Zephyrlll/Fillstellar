import * as THREE from 'three';

// Result型の定義
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// 天体の種類
export type CelestialType = 
  | 'star' 
  | 'planet' 
  | 'moon' 
  | 'asteroid' 
  | 'comet' 
  | 'dwarfPlanet' 
  | 'black_hole';

// 天体作成用の設定
export interface CelestialConfig {
  type: CelestialType;
  name?: string;
  position?: THREE.Vector3;
  velocity?: THREE.Vector3;
  parent?: any; // CelestialBody type from state.ts
  mass?: number;
  radius?: number;
  isLoading?: boolean;
  userData?: any;
}

// エラータイプの定義
export class CelestialCreationError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CelestialCreationError';
  }
}

// バリデーション結果
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}