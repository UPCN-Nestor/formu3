package com.upcn.formu.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.upcn.formu.dto.RawJsonDeserializer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para transferir pantallas guardadas entre frontend y backend.
 * Los datos del grafo se transfieren como JSON crudo para flexibilidad.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PantallaGuardadaDTO {
    
    private String id;
    private String nombre;
    private String conceptoRaiz;
    private String fechaCreacion;
    private String fechaModificacion;
    
    /**
     * Nodos del grafo (JSON array)
     */
    @JsonRawValue
    @JsonDeserialize(using = RawJsonDeserializer.class)
    private String nodos;
    
    /**
     * Aristas del grafo (JSON array)
     */
    @JsonRawValue
    @JsonDeserialize(using = RawJsonDeserializer.class)
    private String aristas;
    
    /**
     * Viewport del canvas (JSON object)
     */
    @JsonRawValue
    @JsonDeserialize(using = RawJsonDeserializer.class)
    private String viewport;
    
    /**
     * Filtros de liquidación aplicados (JSON object, opcional)
     */
    @JsonRawValue
    @JsonDeserialize(using = RawJsonDeserializer.class)
    private String filtrosLiquidacion;
    
    /**
     * Indica si hay datos de liquidación cargados
     */
    private Boolean liquidacionCargada;
    
    /**
     * Datos de liquidación por concepto (JSON object, opcional)
     */
    @JsonRawValue
    @JsonDeserialize(using = RawJsonDeserializer.class)
    private String liquidaciones;
}
