/** Storefront geometry, all in inches, measured from the floor / left edge of the glass opening. */
export const WIN_W = 72;
export const WIN_H = 84;
export const GLASS_BOTTOM = 6;
export const BAR_Y0 = 38;
export const BAR_Y1 = 42;
export const BAR_X0 = 40;
export const BAR_X1 = 68;
/** Extra air kept around the push bar so a hand never lands on paint. */
export const BAR_CLEAR = 0.5;
/** Paint margin kept off the frame and the glass line. */
export const MARGIN = 1.5;
export const DOOR_X0 = 36;

export const LEAF_IN = 3.375;
export const LEAF_SQIN = LEAF_IN * LEAF_IN;
export const LEAVES_PER_BOOK = 25;
export const BOOK_SQIN = LEAF_SQIN * LEAVES_PER_BOOK;
