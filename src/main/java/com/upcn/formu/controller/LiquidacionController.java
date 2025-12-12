package com.upcn.formu.controller;

import com.upcn.formu.dto.LiquidacionDTO;
import com.upcn.formu.service.LiquidacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller REST para operaciones con liquidaciones.
 * Permite cargar los importes reales para mostrar en los conceptos.
 */
@RestController
@RequestMapping("/api/liquidacion")
@RequiredArgsConstructor
@CrossOrigin(origins = "${cors.allowed-origins:http://localhost:5173}")
public class LiquidacionController {

    private final LiquidacionService liquidacionService;

    /**
     * Obtiene los importes de liquidación para un período.
     * GET /api/liquidacion?anio=2024&mes=12&tipo=1&legajo=12345
     * 
     * Parámetros:
     * - anio: Año de la liquidación (default: año actual)
     * - mes: Mes de la liquidación (default: mes actual)
     * - tipo: Tipo de liquidación (default: 1 - Normal)
     * - legajo: Legajo específico (opcional, si no se envía retorna suma de todos)
     */
    @GetMapping
    public ResponseEntity<Map<String, LiquidacionDTO>> getLiquidaciones(
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer tipo,
            @RequestParam(required = false) String legajo) {

        return ResponseEntity.ok(
                liquidacionService.getLiquidacionesPorPeriodo(anio, mes, tipo, legajo));
    }

    /**
     * Obtiene el importe de un concepto específico.
     * GET /api/liquidacion/concepto/{codigo}?anio=2024&mes=12&tipo=1&legajo=12345
     */
    @GetMapping("/concepto/{codigo}")
    public ResponseEntity<LiquidacionDTO> getLiquidacionConcepto(
            @PathVariable String codigo,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer tipo,
            @RequestParam(required = false) String legajo) {

        return liquidacionService.getLiquidacionPorConcepto(anio, mes, tipo, codigo, legajo)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Obtiene los tipos de liquidación disponibles.
     * GET /api/liquidacion/tipos
     */
    @GetMapping("/tipos")
    public ResponseEntity<Map<Integer, String>> getTiposLiquidacion() {
        return ResponseEntity.ok(liquidacionService.getTiposLiquidacion());
    }

    /**
     * Obtiene los legajos disponibles para un período.
     * GET /api/liquidacion/legajos?anio=2024&mes=12
     */
    @GetMapping("/legajos")
    public ResponseEntity<List<String>> getLegajos(
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes) {

        return ResponseEntity.ok(liquidacionService.getLegajos(anio, mes));
    }

    /**
     * Obtiene los años disponibles.
     * GET /api/liquidacion/anios
     */
    @GetMapping("/anios")
    public ResponseEntity<List<Integer>> getAnios() {
        return ResponseEntity.ok(liquidacionService.getAniosDisponibles());
    }
}
