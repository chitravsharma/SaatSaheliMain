// The page shapes a book can be published in.
//
// Mirrors SaatSaheli/src/main/java/com/SaatSaheli/spring/util/PageSizes.java — the
// keys and the frame maths must stay identical in both, since the backend writes each
// imported page's image block in frame coordinates and the reader lays that block out
// in the frame it builds from the same catalogue. Change one, change the other.
//
// Shapes are proportions, not exact trim sizes. An upload is fitted inside the frame
// of the shape it is closest to, so a page whose real size is a little off — an
// 8.625 x 8.75 in book in a square frame, say — shows a hairline margin rather than
// losing its edges to a crop.
//
// CLASSIC is the original 550x700 reader frame. Books saved before shapes existed have
// no shape and resolve to it, so they render exactly as they always did; it is
// deliberately not offered in the picker.

// Longest edge of a frame in px. Every shape is fitted into this, so books of
// different shapes take up roughly the same screen area.
const LONG_EDGE_PX = 700;

export const DEFAULT_PAGE_SIZE_KEY = "CLASSIC";
export const AUTO_PAGE_SIZE_KEY = "AUTO";

function frameFor(widthUnits, heightUnits) {
  if (widthUnits >= heightUnits) {
    return { frameWidth: LONG_EDGE_PX, frameHeight: Math.round((LONG_EDGE_PX * heightUnits) / widthUnits) };
  }
  return { frameWidth: Math.round((LONG_EDGE_PX * widthUnits) / heightUnits), frameHeight: LONG_EDGE_PX };
}

function shape(key, label, description, widthUnits, heightUnits) {
  return { key, label, description, widthUnits, heightUnits, ...frameFor(widthUnits, heightUnits) };
}

/** Shapes offered in the upload picker, in display order. */
export const PAGE_SHAPES = [
  shape("PORTRAIT", "Vertical rectangle (3:4)", "Standard books and magazines", 3, 4),
  shape("TALL", "Tall rectangle (2:3)", "Novels and chapter books", 2, 3),
  shape("SQUARE", "Square (1:1)", "Children's books and photo books", 1, 1),
  shape("LANDSCAPE", "Horizontal rectangle (4:3)", "Picture books and landscape albums", 4, 3),
];

// The legacy frame. Not selectable — it exists so old books keep their old shape.
const CLASSIC = {
  key: DEFAULT_PAGE_SIZE_KEY,
  label: "Classic (original reader size)",
  description: "The reader's original page shape",
  widthUnits: 55,
  heightUnits: 70,
  frameWidth: 550,
  frameHeight: 700,
};

const BY_KEY = [...PAGE_SHAPES, CLASSIC].reduce((acc, s) => { acc[s.key] = s; return acc; }, {});

/**
 * Resolve a book's stored shape to the frame the reader should build.
 * Null or unknown (every book saved before shapes existed) resolves to CLASSIC, so
 * callers never have to null-check.
 */
export function resolvePageSize(value) {
  if (!value) return CLASSIC;
  return BY_KEY[String(value).trim().toUpperCase()] || CLASSIC;
}
