package com.upcn.formu.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * DTO para representar un nodo de rango en el canvas.
 * Usado cuando una variable referencia múltiples conceptos (SC, ST, etc.)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RangoConceptosDTO {

    /**
     * Identificador único del rango (ej: "SC01003600")
     */
    private String id;

    /**
     * Tipo de rango (SC, ST, SI, E, etc.)
     */
    private String tipo;

    /**
     * Código de inicio del rango
     */
    private String codigoInicio;

    /**
     * Código de fin del rango
     */
    private String codigoFin;

    /**
     * Descripción del tipo de variable
     */
    private String descripcion;

    /**
     * Lista de conceptos en el rango
     */
    private List<ConceptoResumenDTO> conceptos;

    /**
     * Color calculado basado en hash del id
     */
    private String color;

    /**
     * DTO resumido de concepto para mostrar en lista
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConceptoResumenDTO {
        private String codigo;
        private String descripcion;
        private boolean definitivo;
        private String color;
    }
}
