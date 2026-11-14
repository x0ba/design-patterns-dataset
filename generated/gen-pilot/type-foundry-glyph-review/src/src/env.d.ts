declare module '*.css';
declare module '@fontsource/*';

declare module 'opentype.js' {
  namespace opentype {
    interface Glyph {
      index: number;
      name: string;
      advanceWidth?: number;
      unicode?: number;
      getPath(): unknown;
    }
    interface Font {
      numGlyphs: number;
      unitsPerEm: number;
      glyphs: { get(i: number): Glyph };
      charToGlyph(ch: string): Glyph;
    }
    function parse(buf: ArrayBuffer): Font;
  }
  export default opentype;
}
