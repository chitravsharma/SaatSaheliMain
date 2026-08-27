package com.SaatSaheli.spring.util;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The page shapes a book can be published in.
 *
 * <p>Historically every book was rendered in one hard-coded 550x700 reader frame, so
 * a page that was not roughly 0.79 wide-to-tall got cropped by the reader's
 * object-fit:cover — a square children's book lost about a quarter of its width. A
 * book now carries a shape, the reader builds its frame from that shape, and the
 * imported page is fitted inside the frame rather than filled to it, so nothing is
 * cut off.
 *
 * <p>Shapes are proportions, not exact trim sizes: an upload does not have to match
 * a shape's ratio to the millimetre, it just has to be shaped roughly like it. Any
 * small difference shows as a thin margin, never as lost artwork.
 *
 * <p>{@link #CLASSIC} is the original 550x700 frame. It is what a book with no stored
 * shape resolves to, which is why everything published before this feature renders
 * exactly as it always did, and it is deliberately not offered in the picker.
 *
 * <p>Mirrored in the frontend by {@code FrontEnd/src/constants/pageSizes.js} — the
 * keys and the frame maths must stay in step, so change both together.
 */
public final class PageSizes {

    private PageSizes() {}

    /**
     * A page shape and the reader frame it produces.
     *
     * @param widthUnits  proportion width (3 of 3:4) — a ratio, not a real dimension
     * @param heightUnits proportion height (4 of 3:4)
     */
    public record Spec(String key, String label, String description,
                       int widthUnits, int heightUnits,
                       int frameWidth, int frameHeight) {

        /** width / height — what the reader needs to shape its frame. */
        public double ratio() { return (double) frameWidth / (double) frameHeight; }
    }

    /** Applied to books with no stored shape: the legacy reader frame, unchanged. */
    public static final String DEFAULT_KEY = "CLASSIC";

    /** Ask the server to pick the shape that best fits the uploaded PDF. */
    public static final String AUTO_KEY = "AUTO";

    /**
     * Longest edge of a rendered frame, in px. Every shape is fitted into this so
     * books of different shapes occupy roughly equal screen area, and the reader's
     * responsive fit then scales the frame down to the viewport.
     */
    private static final int LONG_EDGE_PX = 700;

    private static final Map<String, Spec> SHAPES = new LinkedHashMap<>();

    private static void shape(String key, String label, String description, int w, int h) {
        int[] frame = frameFor(w, h);
        SHAPES.put(key, new Spec(key, label, description, w, h, frame[0], frame[1]));
    }

    static {
        shape("PORTRAIT", "Vertical rectangle (3:4)",
                "Standard books and magazines", 3, 4);
        shape("TALL", "Tall rectangle (2:3)",
                "Novels and chapter books", 2, 3);
        shape("SQUARE", "Square (1:1)",
                "Children's books and photo books", 1, 1);
        shape("LANDSCAPE", "Horizontal rectangle (4:3)",
                "Picture books and landscape albums", 4, 3);

        // Legacy frame — the shape every pre-existing book is rendered in. Kept out of
        // the picker: it exists to keep old books unchanged, not to be chosen.
        SHAPES.put(DEFAULT_KEY, new Spec(DEFAULT_KEY, "Classic (original reader size)",
                "The reader's original page shape", 55, 70, 550, 700));
    }

    /** Fit a shape into {@link #LONG_EDGE_PX} on its longer edge, preserving proportions. */
    private static int[] frameFor(int widthUnits, int heightUnits) {
        if (widthUnits >= heightUnits) {
            return new int[] { LONG_EDGE_PX, Math.round((float) LONG_EDGE_PX * heightUnits / widthUnits) };
        }
        return new int[] { Math.round((float) LONG_EDGE_PX * widthUnits / heightUnits), LONG_EDGE_PX };
    }

    /** The shapes the upload picker offers, in display order. Excludes {@link #CLASSIC}. */
    public static List<Spec> selectable() {
        List<Spec> out = new ArrayList<>();
        for (Spec spec : SHAPES.values()) {
            if (!DEFAULT_KEY.equals(spec.key())) out.add(spec);
        }
        return out;
    }

    /** Every shape including the legacy frame. */
    public static List<Spec> all() {
        return new ArrayList<>(SHAPES.values());
    }

    /**
     * Resolve a stored shape to a frame.
     *
     * @param value a shape key, or null for a book saved before shapes existed
     * @return the matching spec, never null — null or unknown falls back to CLASSIC
     */
    public static Spec resolve(String value) {
        if (value == null || value.isBlank()) return SHAPES.get(DEFAULT_KEY);
        Spec spec = SHAPES.get(value.trim().toUpperCase(Locale.ROOT));
        return spec != null ? spec : SHAPES.get(DEFAULT_KEY);
    }

    /**
     * Turn a requested shape into the value to store on the book.
     *
     * <p>{@code AUTO} (and any unrecognised value) uses the shape closest to the
     * uploaded file's own proportions, so an 8.625 × 8.75 in PDF lands in a square
     * frame with no user input. The shapes are far enough apart that "closest" is
     * never a close call, and being a little off only costs a thin margin.
     *
     * @param requested   what the client asked for; may be null, blank or {@code AUTO}
     * @param detectedWIn measured page width in inches, or 0 if unknown
     * @param detectedHIn measured page height in inches, or 0 if unknown
     * @return the shape key to persist, or null to leave the book on the default frame
     */
    public static String normalize(String requested, double detectedWIn, double detectedHIn) {
        String key = requested == null ? "" : requested.trim().toUpperCase(Locale.ROOT);
        if (!key.isEmpty() && !AUTO_KEY.equals(key) && SHAPES.containsKey(key)) return key;
        return closestTo(detectedWIn, detectedHIn);
    }

    /**
     * The selectable shape whose proportions are nearest the measured page, compared
     * on log ratio so that being twice as wide and half as wide count the same.
     * Returns null when there is nothing usable to measure.
     */
    private static String closestTo(double widthIn, double heightIn) {
        if (!(widthIn > 0) || !(heightIn > 0)) return null;
        double target = Math.log(widthIn / heightIn);
        String best = null;
        double bestDistance = Double.MAX_VALUE;
        for (Spec spec : selectable()) {
            double distance = Math.abs(Math.log((double) spec.widthUnits() / spec.heightUnits()) - target);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = spec.key();
            }
        }
        return best;
    }
}
