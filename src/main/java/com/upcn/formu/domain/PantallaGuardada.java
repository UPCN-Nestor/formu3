package com.upcn.formu.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entidad que representa una pantalla guardada del visualizador de fórmulas.
 * Almacena el estado completo del grafo (nodos, aristas, viewport, filtros).
 */
@Entity
@Table(name = "formu3_pantallas", schema = "dbo", catalog = "UPCN_REPORTES")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PantallaGuardada {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "nombre", nullable = false, length = 200)
    private String nombre;

    @Column(name = "concepto_raiz", length = 20)
    private String conceptoRaiz;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_modificacion")
    private LocalDateTime fechaModificacion;

    /**
     * JSON con los datos completos de la pantalla:
     * - nodos: array de nodos del grafo
     * - aristas: array de aristas del grafo
     * - viewport: posición y zoom del canvas
     * - filtrosLiquidacion: filtros aplicados (opcional)
     * - liquidacionCargada: si hay datos de liquidación
     * - liquidaciones: datos de liquidación por concepto
     */
    @Column(name = "datos_json", columnDefinition = "NVARCHAR(MAX)")
    private String datosJson;

    @PrePersist
    protected void onCreate() {
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now();
        }
        fechaModificacion = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        fechaModificacion = LocalDateTime.now();
    }
}
