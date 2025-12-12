package com.upcn.formu.repository;

import com.upcn.formu.domain.Concepto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio para acceso a conceptos de liquidación.
 * Usa la vista ConceptoTipoLiqFormula para obtener datos consolidados.
 */
@Repository
public interface ConceptoRepository extends JpaRepository<Concepto, String> {

    /**
     * Obtiene todos los conceptos agrupados por código.
     * Concatena los tipos de liquidación disponibles para cada concepto.
     */
    @Query(value = """
            SELECT
                CodConcepto,
                CodFormula,
                MIN(DescripcionConcepto) AS DescripcionConcepto,
                MIN(DescripcionFormula) AS DescripcionFormula,
                MIN(CondicionFormula) AS CondicionFormula,
                MIN(TransitorioDefinitivo) AS TransitorioDefinitivo,
                STRING_AGG(TipoLiquidacion, '-') AS TipoLiquidacion,
                MIN(TipoConcepto) AS TipoConcepto,
                MIN(Orden) AS Orden,
                MIN(FormulaCompleta) AS FormulaCompleta
            FROM ConceptoTipoLiqFormula
            GROUP BY CodConcepto, CodFormula
            ORDER BY CodConcepto
            """, nativeQuery = true)
    List<ConceptoProjection> findAllConceptosAgrupados();

    /**
     * Busca un concepto por su código.
     */
    @Query(value = """
            SELECT
                CodConcepto,
                CodFormula,
                MIN(DescripcionConcepto) AS DescripcionConcepto,
                MIN(DescripcionFormula) AS DescripcionFormula,
                MIN(CondicionFormula) AS CondicionFormula,
                MIN(TransitorioDefinitivo) AS TransitorioDefinitivo,
                STRING_AGG(TipoLiquidacion, '-') AS TipoLiquidacion,
                MIN(TipoConcepto) AS TipoConcepto,
                MIN(Orden) AS Orden,
                MIN(FormulaCompleta) AS FormulaCompleta
            FROM ConceptoTipoLiqFormula
            WHERE CodConcepto = :codigo
            GROUP BY CodConcepto, CodFormula
            """, nativeQuery = true)
    Optional<ConceptoProjection> findByCodigo(@Param("codigo") String codigo);

    /**
     * Busca conceptos en un rango de códigos.
     * Útil para variables tipo SC, ST que referencian rangos.
     */
    @Query(value = """
            SELECT
                CodConcepto,
                CodFormula,
                MIN(DescripcionConcepto) AS DescripcionConcepto,
                MIN(DescripcionFormula) AS DescripcionFormula,
                MIN(CondicionFormula) AS CondicionFormula,
                MIN(TransitorioDefinitivo) AS TransitorioDefinitivo,
                STRING_AGG(TipoLiquidacion, '-') AS TipoLiquidacion,
                MIN(TipoConcepto) AS TipoConcepto,
                MIN(Orden) AS Orden,
                MIN(FormulaCompleta) AS FormulaCompleta
            FROM ConceptoTipoLiqFormula
            WHERE CodConcepto BETWEEN :codInicio AND :codFin
            GROUP BY CodConcepto, CodFormula
            ORDER BY CodConcepto
            """, nativeQuery = true)
    List<ConceptoProjection> findByCodigoRange(
            @Param("codInicio") String codInicio,
            @Param("codFin") String codFin);

    /**
     * Busca conceptos que contengan una variable específica en su fórmula.
     * Útil para construir el índice de dependencias inversas.
     */
    @Query(value = """
            SELECT DISTINCT CodConcepto
            FROM ConceptoTipoLiqFormula
            WHERE FormulaCompleta LIKE :patron
            """, nativeQuery = true)
    List<String> findConceptosQueReferencian(@Param("patron") String patron);

    /**
     * Obtiene solo los códigos de todos los conceptos.
     * Útil para construir el caché de dependencias.
     */
    @Query(value = "SELECT DISTINCT CodConcepto FROM ConceptoTipoLiqFormula ORDER BY CodConcepto", nativeQuery = true)
    List<String> findAllCodigos();
}
