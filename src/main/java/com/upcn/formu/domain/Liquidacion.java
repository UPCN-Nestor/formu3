package com.upcn.formu.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

/**
 * Entidad que representa una línea de liquidación.
 * Mapeada a la tabla LIQUID1.
 */
@Entity
@Table(name = "LIQUID1")
@IdClass(Liquidacion.LiquidacionId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Liquidacion {

    @Id
    @Column(name = "LiqAno")
    private Integer anio;

    @Id
    @Column(name = "LiqMes")
    private Integer mes;

    @Id
    @Column(name = "LiqTpoLiq")
    private String tipoLiquidacion;

    @Id
    @Column(name = "LiqLeg")
    private String legajo;

    @Id
    @Column(name = "Liq1Cnc")
    private String codigoConcepto;

    @Column(name = "Liq1Cal")
    private Double importeCalculado;

    @Column(name = "Liq1Inf")
    private Double valorInformado;

    /**
     * Clave compuesta para la liquidación
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LiquidacionId implements Serializable {
        private Integer anio;
        private Integer mes;
        private String tipoLiquidacion;
        private String legajo;
        private String codigoConcepto;
    }
}
