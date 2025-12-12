package com.upcn.formu.service;

import com.upcn.formu.domain.Liquidacion;
import com.upcn.formu.dto.LiquidacionDTO;
import com.upcn.formu.repository.LiquidacionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Servicio para operaciones con liquidaciones.
 * Permite cargar los importes reales liquidados para mostrar en los conceptos.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiquidacionService {

    private final LiquidacionRepository liquidacionRepository;

    /**
     * Nombres de tipos de liquidación.
     * MODIFICABLE: Ajustar según los tipos reales del sistema.
     */
    private static final Map<Integer, String> TIPOS_LIQUIDACION = Map.of(
            1, "Normal",
            2, "SAC",
            3, "BAE",
            4, "Vacaciones",
            5, "Otros");

    /**
     * Obtiene los importes de liquidación para un período.
     * Si no se especifica legajo, retorna la suma de todos los legajos.
     * 
     * @param anio            Año de la liquidación
     * @param mes             Mes de la liquidación
     * @param tipoLiquidacion Tipo de liquidación
     * @param legajo          Legajo (opcional)
     * @return Mapa de código de concepto → importe
     */
    public Map<String, LiquidacionDTO> getLiquidacionesPorPeriodo(
            Integer anio, Integer mes, Integer tipoLiquidacion, String legajo) {

        // Usar valores por defecto si no se proporcionan
        if (anio == null) {
            anio = LocalDate.now().getYear();
        }
        if (mes == null) {
            mes = LocalDate.now().getMonthValue();
        }
        if (tipoLiquidacion == null) {
            tipoLiquidacion = 1; // Normal por defecto
        }

        log.info("Cargando liquidaciones: año={}, mes={}, tipo={}, legajo={}",
                anio, mes, tipoLiquidacion, legajo);

        List<Liquidacion> liquidaciones = liquidacionRepository.findByPeriodo(
                anio, mes, tipoLiquidacion, legajo);

        // Si no hay legajo específico, agrupar por concepto y sumar
        if (legajo == null || legajo.isBlank()) {
            return agruparPorConcepto(liquidaciones);
        }

        // Si hay legajo específico, retornar directamente
        return liquidaciones.stream()
                .collect(Collectors.toMap(
                        Liquidacion::getCodigoConcepto,
                        liq -> LiquidacionDTO.builder()
                                .codigoConcepto(liq.getCodigoConcepto())
                                .importeCalculado(liq.getImporteCalculado())
                                .valorInformado(liq.getValorInformado())
                                .legajo(liq.getLegajo())
                                .cantidadLegajos(1)
                                .build(),
                        (a, b) -> a // En caso de duplicados, tomar el primero
                ));
    }

    /**
     * Agrupa liquidaciones por concepto, sumando importes de todos los legajos.
     */
    private Map<String, LiquidacionDTO> agruparPorConcepto(List<Liquidacion> liquidaciones) {
        Map<String, List<Liquidacion>> porConcepto = liquidaciones.stream()
                .collect(Collectors.groupingBy(Liquidacion::getCodigoConcepto));

        Map<String, LiquidacionDTO> resultado = new HashMap<>();

        for (Map.Entry<String, List<Liquidacion>> entry : porConcepto.entrySet()) {
            String concepto = entry.getKey();
            List<Liquidacion> liqs = entry.getValue();

            double sumaCalculado = liqs.stream()
                    .filter(l -> l.getImporteCalculado() != null)
                    .mapToDouble(Liquidacion::getImporteCalculado)
                    .sum();

            double sumaInformado = liqs.stream()
                    .filter(l -> l.getValorInformado() != null)
                    .mapToDouble(Liquidacion::getValorInformado)
                    .sum();

            resultado.put(concepto, LiquidacionDTO.builder()
                    .codigoConcepto(concepto)
                    .importeCalculado(sumaCalculado)
                    .valorInformado(sumaInformado)
                    .cantidadLegajos(liqs.size())
                    .build());
        }

        return resultado;
    }

    /**
     * Obtiene el importe de un concepto específico.
     */
    public Optional<LiquidacionDTO> getLiquidacionPorConcepto(
            Integer anio, Integer mes, Integer tipoLiquidacion,
            String concepto, String legajo) {

        Map<String, LiquidacionDTO> liquidaciones = getLiquidacionesPorPeriodo(
                anio, mes, tipoLiquidacion, legajo);

        return Optional.ofNullable(liquidaciones.get(concepto));
    }

    /**
     * Obtiene los tipos de liquidación disponibles.
     */
    public Map<Integer, String> getTiposLiquidacion() {
        try {
            List<Integer> tipos = liquidacionRepository.findTiposLiquidacion();
            Map<Integer, String> resultado = new LinkedHashMap<>();

            for (Integer tipo : tipos) {
                resultado.put(tipo, TIPOS_LIQUIDACION.getOrDefault(tipo, "Tipo " + tipo));
            }

            return resultado;
        } catch (Exception e) {
            log.warn("Error obteniendo tipos de liquidación, usando valores por defecto", e);
            return TIPOS_LIQUIDACION;
        }
    }

    /**
     * Obtiene los legajos disponibles para un período.
     */
    public List<String> getLegajos(Integer anio, Integer mes) {
        if (anio == null)
            anio = LocalDate.now().getYear();
        if (mes == null)
            mes = LocalDate.now().getMonthValue();

        return liquidacionRepository.findLegajosByPeriodo(anio, mes);
    }

    /**
     * Obtiene los años disponibles en las liquidaciones.
     */
    public List<Integer> getAniosDisponibles() {
        // Por ahora retornamos los últimos 5 años
        int anioActual = LocalDate.now().getYear();
        List<Integer> anios = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            anios.add(anioActual - i);
        }
        return anios;
    }
}
