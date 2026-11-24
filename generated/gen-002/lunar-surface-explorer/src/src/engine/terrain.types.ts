export interface GenCrater {
  lat: number; lon: number; d: number; depth: number;
  psr?: number; rays?: boolean; dark?: boolean; named?: boolean;
}
export interface GenMare { lat: number; lon: number; rx: number; ry: number }
export interface GenRequest {
  kind: 'polar' | 'global';
  size: number; // polar: N×N ; global: width (height = width/2)
  capDeg: number;
  craters: GenCrater[];
  mares: GenMare[];
}

