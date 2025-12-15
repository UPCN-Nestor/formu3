package com.upcn.formu.repository;

/**
 * Proyección para resultados de consultas nativas de Concepto.
 * Spring Data JPA mapea automáticamente las columnas a estos métodos getter.
 */
public interface ConceptoProjection {
    
    String getCodConcepto();
    String getCodFormula();
    String getDescripcionConcepto();
    String getDescripcionFormula();
    String getCondicionFormula();
    String getTransitorioDefinitivo();
    String getTipoLiquidacion();
    String getTipoConcepto();
    String getTipoConceptoAbr();
    String getObservacion();
    Integer getOrden();
    String getFormulaCompleta();
    Double getVal1();
    Double getVal2();
    Double getVal3();
}
