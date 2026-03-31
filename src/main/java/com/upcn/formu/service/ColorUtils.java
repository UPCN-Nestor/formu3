package com.upcn.formu.service;

/**
 * Utilidades para manejo de colores basados en hash.
 * Genera colores consistentes para un mismo input.
 */
public class ColorUtils {

    /**
     * Par de colores coherentes: fondo (pastel) y borde (más oscuro).
     */
    public record ColorPair(String background, String border) {}

    /**
     * Calcula el hash con bit mixing para mejor distribución.
     */
    private static int computeHash(String input) {
        int hash = 0;
        for (char c : input.toCharArray()) {
            hash = 31 * hash + c;
        }

        // Bit mixing para mejor distribución de colores
        hash = hash ^ (hash >>> 16);
        hash = hash * 0x85ebca6b;
        hash = hash ^ (hash >>> 13);
        hash = hash * 0xc2b2ae35;
        hash = hash ^ (hash >>> 16);
        return Math.abs(hash);
    }

    /**
     * Genera un par de colores coherentes (fondo y borde) desde el mismo hash.
     * Ambos colores tienen el mismo hue, diferente saturación y luminosidad.
     * 
     * @param input String para generar los colores
     * @return ColorPair con background (pastel) y border (más oscuro)
     */
    public static ColorPair hashToColors(String input) {
        if (input == null || input.isBlank()) {
            return new ColorPair("hsl(0, 0%, 90%)", "hsl(0, 0%, 60%)");
        }

        int hash = computeHash(input);
        int hue = hash % 360;

        // Fondo: pastel (saturación media-alta, luminosidad alta)
        int bgSaturation = 65 + (hash / 360 % 20); // 65-85%
        int bgLightness = 80 + (hash / 7200 % 10); // 80-90%
        String background = String.format("hsl(%d, %d%%, %d%%)", hue, bgSaturation, bgLightness);

        // Borde: mismo hue, más saturado y oscuro
        int borderSaturation = 50 + (hash / 360 % 20); // 50-70%
        int borderLightness = 40 + (hash / 7200 % 15); // 40-55%
        String border = String.format("hsl(%d, %d%%, %d%%)", hue, borderSaturation, borderLightness);

        return new ColorPair(background, border);
    }

    /**
     * Genera un color HSL basado en el hash del input.
     * El color es pastel para usar como fondo de rectángulos.
     * 
     * @param input String para generar el color
     * @return Color en formato "hsl(h, s%, l%)"
     */
    public static String hashToColor(String input) {
        return hashToColors(input).background();
    }

    /**
     * Genera un color más oscuro para bordes basado en el color de fondo.
     * 
     * @param input String para generar el color
     * @return Color en formato "hsl(h, s%, l%)"
     */
    public static String hashToBorderColor(String input) {
        return hashToColors(input).border();
    }
}
