package com.upcn.formu.service;

/**
 * Utilidades para manejo de colores basados en hash.
 * Genera colores consistentes para un mismo input.
 */
public class ColorUtils {

    /**
     * Genera un color HSL basado en el hash del input.
     * El color es pastel para usar como fondo de rectángulos.
     * 
     * @param input String para generar el color
     * @return Color en formato "hsl(h, s%, l%)"
     */
    public static String hashToColor(String input) {
        if (input == null || input.isBlank()) {
            return "hsl(0, 0%, 90%)"; // Gris claro por defecto
        }

        // Calcular hash simple
        int hash = 0;
        for (char c : input.toCharArray()) {
            hash = 31 * hash + c;
        }
        hash = Math.abs(hash);

        // Usar el hash para generar hue (0-360)
        int hue = hash % 360;

        // Saturación y luminosidad fijas para colores pastel agradables
        int saturation = 65 + (hash % 20); // 65-85%
        int lightness = 80 + (hash % 10); // 80-90%

        return String.format("hsl(%d, %d%%, %d%%)", hue, saturation, lightness);
    }

    /**
     * Genera un color más oscuro para bordes basado en el color de fondo.
     * 
     * @param input String para generar el color
     * @return Color en formato "hsl(h, s%, l%)"
     */
    public static String hashToBorderColor(String input) {
        if (input == null || input.isBlank()) {
            return "hsl(0, 0%, 60%)";
        }

        int hash = 0;
        for (char c : input.toCharArray()) {
            hash = 31 * hash + c;
        }
        hash = Math.abs(hash);

        int hue = hash % 360;
        int saturation = 50 + (hash % 20); // 50-70%
        int lightness = 40 + (hash % 15); // 40-55%

        return String.format("hsl(%d, %d%%, %d%%)", hue, saturation, lightness);
    }

    /**
     * Genera un color de texto legible para el fondo dado.
     * 
     * @param input String para generar el color base
     * @return Color de texto oscuro o claro según el fondo
     */
    public static String hashToTextColor(String input) {
        // Para fondos pastel, el texto oscuro siempre es legible
        return "hsl(0, 0%, 20%)";
    }
}
