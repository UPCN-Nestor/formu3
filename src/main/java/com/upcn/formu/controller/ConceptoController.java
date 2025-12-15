package com.upcn.formu.controller;

import com.upcn.formu.dto.ConceptoDTO;
import com.upcn.formu.dto.RangoConceptosDTO;
import com.upcn.formu.service.ConceptoService;
import com.upcn.formu.service.DependencyCacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller REST para operaciones con conceptos.
 * Expone endpoints para el frontend de visualización.
 */
@RestController
@RequestMapping("/api/conceptos")
@RequiredArgsConstructor
@CrossOrigin(origins = "${cors.allowed-origins:http://localhost:5173}")
public class ConceptoController {

    private final ConceptoService conceptoService;
    private final DependencyCacheService dependencyCacheService;

    /**
     * Lista todos los conceptos (resumen).
     * GET /api/conceptos
     */
    @GetMapping
    public ResponseEntity<List<ConceptoDTO>> getAllConceptos() {
        return ResponseEntity.ok(conceptoService.getAllConceptos());
    }

    /**
     * Busca conceptos por código o descripción.
     * GET /api/conceptos/buscar?q=texto
     */
    @GetMapping("/buscar")
    public ResponseEntity<List<ConceptoDTO>> buscarConceptos(@RequestParam("q") String query) {
        return ResponseEntity.ok(conceptoService.buscarConceptos(query));
    }

    /**
     * Obtiene un concepto con sus dependencias.
     * GET /api/conceptos/{codigo}
     */
    @GetMapping("/{codigo}")
    public ResponseEntity<ConceptoDTO> getConcepto(@PathVariable String codigo) {
        return conceptoService.getConceptoConDependencias(codigo)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Obtiene múltiples conceptos con sus dependencias.
     * POST /api/conceptos/batch
     * Body: ["1234", "5678", ...]
     */
    @PostMapping("/batch")
    public ResponseEntity<List<ConceptoDTO>> getConceptosBatch(@RequestBody List<String> codigos) {
        return ResponseEntity.ok(conceptoService.getConceptosConDependencias(codigos));
    }

    /**
     * Obtiene los conceptos en un rango.
     * GET /api/conceptos/rango/{inicio}/{fin}
     */
    @GetMapping("/rango/{inicio}/{fin}")
    public ResponseEntity<RangoConceptosDTO> getConceptosEnRango(
            @PathVariable String inicio,
            @PathVariable String fin,
            @RequestParam(required = false, defaultValue = "") String tipoRango) {

        String rangoId = tipoRango + inicio + fin;
        return ResponseEntity.ok(conceptoService.getConceptosEnRango(rangoId, inicio, fin));
    }

    /**
     * Obtiene las dependencias de un concepto.
     * GET /api/conceptos/{codigo}/dependencias
     */
    @GetMapping("/{codigo}/dependencias")
    public ResponseEntity<List<String>> getDependencias(@PathVariable String codigo) {
        return conceptoService.getConceptoConDependencias(codigo)
                .map(dto -> ResponseEntity.ok(dto.getDependencias()))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Obtiene los conceptos que dependen de este.
     * GET /api/conceptos/{codigo}/dependientes
     */
    @GetMapping("/{codigo}/dependientes")
    public ResponseEntity<List<String>> getDependientes(@PathVariable String codigo) {
        return ResponseEntity.ok(dependencyCacheService.getDependientes(codigo));
    }

    /**
     * Fuerza la reconstrucción del caché de dependencias.
     * POST /api/conceptos/cache/refresh
     */
    @PostMapping("/cache/refresh")
    public ResponseEntity<Map<String, Object>> refreshCache() {
        conceptoService.refreshDependencyCache();
        return ResponseEntity.ok(dependencyCacheService.getCacheStats());
    }

    /**
     * Obtiene estadísticas del caché.
     * GET /api/conceptos/cache/stats
     */
    @GetMapping("/cache/stats")
    public ResponseEntity<Map<String, Object>> getCacheStats() {
        return ResponseEntity.ok(dependencyCacheService.getCacheStats());
    }

    /**
     * DEBUG: Muestra info de dependientes para un concepto.
     * GET /api/conceptos/debug/{codigo}
     */
    @GetMapping("/debug/{codigo}")
    public ResponseEntity<Map<String, Object>> debugConcepto(@PathVariable String codigo) {
        return ResponseEntity.ok(dependencyCacheService.getDebugInfo(codigo));
    }
}
