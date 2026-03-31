package com.upcn.formu.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para información de liquidación de un concepto.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiquidacionDTO {

    private String codigoConcepto;
    private Double importeCalculado;
    private Double valorInformado;
    private String legajo;

    /**
     * Cantidad de legajos sumados (cuando se agrupa por concepto sin legajo
     * específico)
     */
    private Integer cantidadLegajos;
}
