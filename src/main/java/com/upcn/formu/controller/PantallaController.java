package com.upcn.formu.controller;

import com.upcn.formu.dto.PantallaGuardadaDTO;
import com.upcn.formu.service.PantallaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para operaciones CRUD de pantallas guardadas.
 * Permite guardar y recuperar el estado del visualizador de fórmulas.
 */
@RestController
@RequestMapping("/api/pantallas")
@RequiredArgsConstructor
public class PantallaController {

    private final PantallaService pantallaService;

    /**
     * Obtiene todas las pantallas guardadas.
     * GET /api/pantallas
     */
    @GetMapping
    public ResponseEntity<List<PantallaGuardadaDTO>> getAll() {
        return ResponseEntity.ok(pantallaService.getAll());
    }

    /**
     * Obtiene una pantalla por ID.
     * GET /api/pantallas/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<PantallaGuardadaDTO> getById(@PathVariable String id) {
        return pantallaService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Guarda una pantalla (crear o actualizar).
     * POST /api/pantallas
     */
    @PostMapping
    public ResponseEntity<PantallaGuardadaDTO> save(@RequestBody PantallaGuardadaDTO dto) {
        PantallaGuardadaDTO saved = pantallaService.save(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Actualiza una pantalla existente.
     * PUT /api/pantallas/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<PantallaGuardadaDTO> update(
            @PathVariable String id,
            @RequestBody PantallaGuardadaDTO dto) {
        dto.setId(id);
        PantallaGuardadaDTO saved = pantallaService.save(dto);
        return ResponseEntity.ok(saved);
    }

    /**
     * Elimina una pantalla.
     * DELETE /api/pantallas/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (pantallaService.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Busca pantallas por nombre.
     * GET /api/pantallas/search?nombre=xxx
     */
    @GetMapping("/search")
    public ResponseEntity<List<PantallaGuardadaDTO>> search(@RequestParam String nombre) {
        return ResponseEntity.ok(pantallaService.searchByNombre(nombre));
    }
}
