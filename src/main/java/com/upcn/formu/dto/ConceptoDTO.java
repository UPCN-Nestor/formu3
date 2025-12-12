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
    private String tiposLiquidacion;
    private Integer orden;
    private boolean definitivo;
    
    /**
     * Variables extraídas de la fórmula
     */
    private List<VariableDTO> variables;
    
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
     * Color calculado basado en hash del código
     */
    private String color;
}
