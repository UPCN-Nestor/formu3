package com.upcn.formu.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * DTO para representar una variable parseada de una fórmula.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VariableDTO {

    /**
     * Tipo de variable
     */
    public enum TipoVariable {
        /** Referencia un solo concepto (ej: CALC3498) */
        SINGLE_CONCEPT,
        /** Referencia un rango de conceptos (ej: SC01003600) */
        RANGE,
        /** Variable terminal sin referencia a concepto (ej: ANTIGUEDAD) */
        TERMINAL
    }

    /**
     * Nombre completo de la variable (ej: "CALC3498", "SC01003600")
     */
    private String nombre;

    /**
     * Prefijo de la variable (ej: "CALC", "SC", "INFO")
     */
    private String prefijo;

    /**
     * Tipo de variable
     */
    private TipoVariable tipo;

    /**
     * Concepto referenciado (para SINGLE_CONCEPT)
     */
    private String conceptoReferenciado;

    /**
     * Inicio del rango (para RANGE)
     */
    private String rangoInicio;

    /**
     * Fin del rango (para RANGE)
     */
    private String rangoFin;

    /**
     * Conceptos en el rango (para RANGE, cargado bajo demanda)
     */
    private List<String> conceptosEnRango;

    /**
     * Texto para mostrar al usuario (ej: "Valor de 3498")
     */
    private String textoMostrar;

    /**
     * Color calculado basado en hash
     */
    private String color;

    /**
     * Descripción completa del patrón (del diccionario)
     */
    private String descripcionPatron;

    /**
     * Posición inicial en la fórmula original
     */
    private int posicionInicio;

    /**
     * Posición final en la fórmula original
     */
    private int posicionFin;
}
