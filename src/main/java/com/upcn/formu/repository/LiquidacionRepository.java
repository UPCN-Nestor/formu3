package com.upcn.formu.repository;

import com.upcn.formu.domain.Liquidacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio para acceso a datos de liquidación.
 */
@Repository
public interface LiquidacionRepository extends JpaRepository<Liquidacion, Liquidacion.LiquidacionId> {

    /**
     * Busca liquidaciones por año, mes y tipo.
     * Si legajo es null, trae todos los legajos.
     */
    @Query(value = """
            SELECT
                LiqAno AS anio,
                LiqMes AS mes,
                LiqTpoLiq AS tipoLiquidacion,
                LiqLeg AS legajo,
                Liq1Cnc AS codigoConcepto,
                Liq1Cal AS importeCalculado,
                Liq1Inf AS valorInformado
            FROM LIQUID1
            WHERE LiqAno = :anio
                AND LiqMes = :mes
                AND LiqTpoLiq = :tipoLiq
                AND (:legajo IS NULL OR LiqLeg = :legajo)
            ORDER BY Liq1Cnc
            """, nativeQuery = true)
    List<LiquidacionProjection> findByPeriodo(
            @Param("anio") Integer anio,
            @Param("mes") Integer mes,
            @Param("tipoLiq") String tipoLiq,
            @Param("legajo") String legajo);

    /**
     * Busca la liquidación de un concepto específico.
     */
    @Query(value = """
            SELECT
                LiqAno AS anio,
                LiqMes AS mes,
                LiqTpoLiq AS tipoLiquidacion,
                LiqLeg AS legajo,
                Liq1Cnc AS codigoConcepto,
                Liq1Cal AS importeCalculado,
                Liq1Inf AS valorInformado
            FROM dbo.LIQUID1
            WHERE LiqAno = :anio
                AND LiqMes = :mes
                AND LiqTpoLiq = :tipoLiq
                AND Liq1Cnc = :concepto
                AND (:legajo IS NULL OR LiqLeg = :legajo)
            """, nativeQuery = true)
    List<Liquidacion> findByPeriodoYConcepto(
            @Param("anio") Integer anio,
            @Param("mes") Integer mes,
            @Param("tipoLiq") String tipoLiq,
            @Param("concepto") String concepto,
            @Param("legajo") String legajo);

    /**
     * Obtiene los tipos de liquidación disponibles.
     */
    @Query(value = "SELECT DISTINCT LiqTpoLiq FROM LIQUID1 ORDER BY LiqTpoLiq", nativeQuery = true)
    List<String> findTiposLiquidacion();

    /**
     * Obtiene los legajos disponibles para un período.
     */
    @Query(value = """
            SELECT DISTINCT LiqLeg
            FROM LIQUID1
            WHERE LiqAno = :anio AND LiqMes = :mes
            ORDER BY LiqLeg
            """, nativeQuery = true)
    List<String> findLegajosByPeriodo(
            @Param("anio") Integer anio,
            @Param("mes") Integer mes);

    /**
     * Suma los importes de un concepto para todos los legajos.
     * Útil cuando no se especifica legajo.
     */
    @Query(value = """
            SELECT
                SUM(Liq1Cal) AS importeCalculado,
                SUM(Liq1Inf) AS valorInformado
            FROM LIQUID1
            WHERE LiqAno = :anio
                AND LiqMes = :mes
                AND LiqTpoLiq = :tipoLiq
                AND Liq1Cnc = :concepto
            """, nativeQuery = true)
    Object[] sumByConcepto(
            @Param("anio") Integer anio,
            @Param("mes") Integer mes,
            @Param("tipoLiq") String tipoLiq,
            @Param("concepto") String concepto);
}
