declare module 'progressbar.js' {
  export const Line: any;
  export const Circle: any;
  export const SemiCircle: any;

  // Lower level API to use any SVG path
  export const Path: any;

  // Base-class for creating new custom shapes
  // to be in line with the API of built-in shapes
  // Undocumented.
  export const Shape: any;

  export const utils: any;
}
