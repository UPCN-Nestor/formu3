package com.upcn.formu.repository;

import com.upcn.formu.domain.PantallaGuardada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio para operaciones CRUD de pantallas guardadas.
 */
@Repository
public interface PantallaGuardadaRepository extends JpaRepository<PantallaGuardada, String> {
    
    /**
     * Busca pantallas por nombre (parcial, case insensitive)
     */
    List<PantallaGuardada> findByNombreContainingIgnoreCase(String nombre);
    
    /**
     * Busca pantallas por concepto raíz
     */
    List<PantallaGuardada> findByConceptoRaiz(String conceptoRaiz);
    
    /**
     * Obtiene todas las pantallas ordenadas por fecha de modificación descendente
     */
    List<PantallaGuardada> findAllByOrderByFechaModificacionDesc();
}
