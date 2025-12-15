package com.upcn.formu.repository;

/**
 * Proyección para resultados native query de Liquidacion.
 */
public interface LiquidacionProjection {
    Integer getAnio();
    Integer getMes();
    String getTipoLiquidacion();
    String getLegajo();
    String getCodigoConcepto();
    Double getImporteCalculado();
    Double getValorInformado();
}
