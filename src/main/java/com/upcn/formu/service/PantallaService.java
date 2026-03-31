package com.upcn.formu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.upcn.formu.domain.PantallaGuardada;
import com.upcn.formu.dto.PantallaGuardadaDTO;
import com.upcn.formu.repository.PantallaGuardadaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Servicio para gestión de pantallas guardadas.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PantallaService {

    private final PantallaGuardadaRepository repository;
    private final ObjectMapper objectMapper;
    
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /**
     * Obtiene todas las pantallas guardadas
     */
    @Transactional(readOnly = true)
    public List<PantallaGuardadaDTO> getAll() {
        return repository.findAllByOrderByFechaModificacionDesc()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene una pantalla por ID
     */
    @Transactional(readOnly = true)
    public Optional<PantallaGuardadaDTO> getById(String id) {
        return repository.findById(id).map(this::toDTO);
    }

    /**
     * Guarda una pantalla (crear o actualizar)
     */
    @Transactional
    public PantallaGuardadaDTO save(PantallaGuardadaDTO dto) {
        PantallaGuardada entity = toEntity(dto);
        
        // Si no tiene ID, generar uno nuevo
        if (entity.getId() == null || entity.getId().isBlank()) {
            entity.setId(generateId());
        }
        
        // Verificar si ya existe para mantener fecha de creación
        repository.findById(entity.getId()).ifPresent(existing -> {
            entity.setFechaCreacion(existing.getFechaCreacion());
        });
        
        PantallaGuardada saved = repository.save(entity);
        log.info("Pantalla guardada: id={}, nombre={}", saved.getId(), saved.getNombre());
        return toDTO(saved);
    }

    /**
     * Elimina una pantalla por ID
     */
    @Transactional
    public boolean delete(String id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            log.info("Pantalla eliminada: id={}", id);
            return true;
        }
        return false;
    }

    /**
     * Busca pantallas por nombre
     */
    @Transactional(readOnly = true)
    public List<PantallaGuardadaDTO> searchByNombre(String nombre) {
        return repository.findByNombreContainingIgnoreCase(nombre)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Genera un ID único
     */
    private String generateId() {
        return System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    /**
     * Convierte entidad a DTO
     */
    private PantallaGuardadaDTO toDTO(PantallaGuardada entity) {
        PantallaGuardadaDTO.PantallaGuardadaDTOBuilder builder = PantallaGuardadaDTO.builder()
                .id(entity.getId())
                .nombre(entity.getNombre())
                .conceptoRaiz(entity.getConceptoRaiz())
                .fechaCreacion(entity.getFechaCreacion() != null ? 
                        entity.getFechaCreacion().format(ISO_FORMATTER) : null)
                .fechaModificacion(entity.getFechaModificacion() != null ? 
                        entity.getFechaModificacion().format(ISO_FORMATTER) : null);

        // Parsear el JSON de datos
        if (entity.getDatosJson() != null && !entity.getDatosJson().isBlank()) {
            try {
                ObjectNode datos = (ObjectNode) objectMapper.readTree(entity.getDatosJson());
                
                if (datos.has("nodos")) {
                    builder.nodos(datos.get("nodos").toString());
                }
                if (datos.has("aristas")) {
                    builder.aristas(datos.get("aristas").toString());
                }
                if (datos.has("viewport")) {
                    builder.viewport(datos.get("viewport").toString());
                }
                if (datos.has("filtrosLiquidacion")) {
                    builder.filtrosLiquidacion(datos.get("filtrosLiquidacion").toString());
                }
                if (datos.has("liquidacionCargada")) {
                    builder.liquidacionCargada(datos.get("liquidacionCargada").asBoolean());
                }
                if (datos.has("liquidaciones")) {
                    builder.liquidaciones(datos.get("liquidaciones").toString());
                }
            } catch (JsonProcessingException e) {
                log.error("Error parseando datos JSON de pantalla {}: {}", entity.getId(), e.getMessage());
            }
        }

        return builder.build();
    }

    /**
     * Convierte DTO a entidad
     */
    private PantallaGuardada toEntity(PantallaGuardadaDTO dto) {
        PantallaGuardada entity = PantallaGuardada.builder()
                .id(dto.getId())
                .nombre(dto.getNombre())
                .conceptoRaiz(dto.getConceptoRaiz())
                .build();

        // Parsear fecha de creación si viene
        if (dto.getFechaCreacion() != null && !dto.getFechaCreacion().isBlank()) {
            try {
                entity.setFechaCreacion(LocalDateTime.parse(dto.getFechaCreacion(), ISO_FORMATTER));
            } catch (Exception e) {
                log.warn("No se pudo parsear fechaCreacion: {}", dto.getFechaCreacion());
            }
        }

        // Construir JSON de datos
        try {
            ObjectNode datos = objectMapper.createObjectNode();
            
            if (dto.getNodos() != null) {
                datos.set("nodos", objectMapper.readTree(dto.getNodos()));
            }
            if (dto.getAristas() != null) {
                datos.set("aristas", objectMapper.readTree(dto.getAristas()));
            }
            if (dto.getViewport() != null) {
                datos.set("viewport", objectMapper.readTree(dto.getViewport()));
            }
            if (dto.getFiltrosLiquidacion() != null) {
                datos.set("filtrosLiquidacion", objectMapper.readTree(dto.getFiltrosLiquidacion()));
            }
            if (dto.getLiquidacionCargada() != null) {
                datos.put("liquidacionCargada", dto.getLiquidacionCargada());
            }
            if (dto.getLiquidaciones() != null) {
                datos.set("liquidaciones", objectMapper.readTree(dto.getLiquidaciones()));
            }
            
            entity.setDatosJson(datos.toString());
        } catch (JsonProcessingException e) {
            log.error("Error construyendo JSON de datos: {}", e.getMessage());
            entity.setDatosJson("{}");
        }

        return entity;
    }
}
