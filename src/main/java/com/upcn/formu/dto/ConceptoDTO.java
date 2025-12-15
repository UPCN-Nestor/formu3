package com.upcn.formu.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * DTO para transferir información de concepto al frontend.
 * Incluye las variables parseadas de la fórmula.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConceptoDTO {

    private String codigo;
    private String descripcion;
    private String formula;
    private String formulaCompleta;
    private String condicionFormula;
    private String tipoConcepto;
    private String tipoConceptoAbr;
    private String observacion;
    private String tiposLiquidacion;
    private Integer orden;
    private boolean definitivo;
    
    /**
     * Variables extraídas de la fórmula
     */
    private List<VariableDTO> variables;
    
    /**
     * Variables extraídas de la condición
     */
    private List<VariableDTO> variablesCondicion;
    
    /**
     * Conceptos de los cuales depende este concepto (referencias en la fórmula)
     */
    private List<String> dependencias;
    
    /**
     * Conceptos que dependen de este (lo referencian en sus fórmulas)
     */
    private List<String> dependientes;
    
    /**
     * Importe de la liquidación (si se cargó una)
     */
    private Double importeLiquidacion;
    
    /**
     * Valor informado de la liquidación (si se cargó una)
     */
    private Double valorInformado;
    
    /**
     * Valores propios del concepto (para VAL10000, VAL20000, VAL30000)
     */
    private Double val1;
    private Double val2;
    private Double val3;
    
    /**
     * Color de fondo calculado basado en hash del código
     */
    private String color;
    
    /**
     * Color de borde calculado basado en hash del código (coherente con color)
     */
    private String borderColor;
}
