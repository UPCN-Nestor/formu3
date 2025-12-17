package com.upcn.formu.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entidad que representa un concepto de liquidación.
 * Mapeada a la vista ConceptoTipoLiqFormula.
 * 
 * NOTA: Esta entidad es de solo lectura ya que viene de una vista.
 */
@Entity
@Table(name = "ConceptoTipoLiqFormula")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Concepto {

    @Id
    @Column(name = "CodConcepto")
    private String id;

    @Column(name = "CodFormula")
    private String formula;

    /**
     * Alias para mantener compatibilidad con código existente
     */
    public String getConcepto() {
        return this.id;
    }

    @Column(name = "DescripcionConcepto")
    private String descripcionConcepto;

    @Column(name = "DescripcionFormula")
    private String descripcionFormula;

    @Column(name = "CondicionFormula")
    private String condicionFormula;

    @Column(name = "TransitorioDefinitivo")
    private String td;

    @Column(name = "TipoLiquidacion")
    private String tipoLiquidacion;

    @Column(name = "TipoConcepto")
    private String tipoConcepto;

    @Column(name = "Orden")
    private Integer orden;

    @Column(name = "FormulaCompleta")
    private String formulaCompleta;

    /**
     * Indica si el concepto es definitivo (D) o transitorio (T)
     */
    public boolean esDefinitivo() {
        return "D".equalsIgnoreCase(this.td);
    }
}
