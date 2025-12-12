package com.upcn.formu.service;

import com.upcn.formu.repository.ConceptoProjection;
import com.upcn.formu.repository.ConceptoRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio de caché para las dependencias inversas.
 * Mantiene un mapa de qué conceptos dependen de cada concepto.
 * 
 * IMPORTANTE: Este servicio se construye al iniciar la aplicación
 * y se refresca periódicamente según configuración.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DependencyCacheService {

    private final ConceptoRepository conceptoRepository;
    private final VariableParser variableParser;

    /**
     * Mapa inverso: concepto → lista de conceptos que lo referencian
     */
    private final Map<String, Set<String>> dependientesCache = new ConcurrentHashMap<>();

    /**
     * Indica si el caché está construido
     */
    private volatile boolean cacheReady = false;

    @Value("${app.cache.expiration-minutes:60}")
    private int cacheExpirationMinutes;

    /**
     * Construye el caché al iniciar la aplicación.
     */
    @PostConstruct
    public void init() {
        log.info("Iniciando construcción del caché de dependencias...");
        buildCache();
    }

    /**
     * Reconstruye el caché periódicamente.
     * El intervalo se define en application.yml
     */
    @Scheduled(fixedRateString = "${app.cache.expiration-minutes:60}000")
    public void scheduledRefresh() {
        log.info("Refrescando caché de dependencias programado...");
        buildCache();
    }

    /**
     * Construye el mapa de dependencias inversas.
     * Para cada concepto, parsea su fórmula y registra las dependencias.
     */
    public synchronized void buildCache() {
        long startTime = System.currentTimeMillis();
        Map<String, Set<String>> nuevoCache = new HashMap<>();

        try {
            List<ConceptoProjection> conceptos = conceptoRepository.findAllConceptosAgrupados();
            log.info("Procesando {} conceptos para construir caché de dependencias", conceptos.size());

            for (ConceptoProjection concepto : conceptos) {
                String codigo = concepto.getCodConcepto();
                String formula = concepto.getFormulaCompleta();

                if (formula == null || formula.isBlank()) { 
                    continue;
                }

                // Extraer conceptos referenciados en la fórmula
                Set<String> referenciados = variableParser.extractConceptosReferenciados(formula);

                // Para cada concepto referenciado, agregar el concepto actual como dependiente
                for (String referenciado : referenciados) {
                    nuevoCache.computeIfAbsent(referenciado, k -> new HashSet<>())
                            .add(codigo);
                }

                // También procesar rangos
                for (String[] rango : variableParser.extractRangosReferenciados(formula)) {
                    // Marcar que hay un rango que depende de estos conceptos
                    // Usamos una key especial para rangos
                    String rangoKey = "RANGE:" + rango[0] + "-" + rango[1];
                    nuevoCache.computeIfAbsent(rangoKey, k -> new HashSet<>())
                            .add(codigo);
                }
            }

            // Reemplazar el caché atómicamente
            dependientesCache.clear();
            dependientesCache.putAll(nuevoCache);
            cacheReady = true;

            long elapsedTime = System.currentTimeMillis() - startTime;
            log.info("Caché de dependencias construido en {}ms. {} entradas.",
                    elapsedTime, dependientesCache.size());

        } catch (Exception e) {
            log.error("Error construyendo caché de dependencias", e);
        }
    }

    /**
     * Obtiene los conceptos que dependen del concepto indicado.
     * 
     * @param codigo Código del concepto
     * @return Lista de códigos de conceptos dependientes
     */
    @Cacheable(value = "dependientes", key = "#codigo")
    public List<String> getDependientes(String codigo) {
        if (!cacheReady) {
            log.warn("Caché no está listo, retornando lista vacía");
            return Collections.emptyList();
        }

        Set<String> dependientes = dependientesCache.get(codigo);
        if (dependientes == null) {
            return Collections.emptyList();
        }

        return new ArrayList<>(dependientes);
    }

    /**
     * Obtiene los conceptos que dependen de cualquier concepto en el rango.
     * 
     * @param inicio Código de inicio del rango
     * @param fin    Código de fin del rango
     * @return Lista de códigos de conceptos dependientes del rango
     */
    public List<String> getDependientesDeRango(String inicio, String fin) {
        String rangoKey = "RANGE:" + inicio + "-" + fin;
        Set<String> dependientes = dependientesCache.get(rangoKey);

        if (dependientes == null) {
            return Collections.emptyList();
        }

        return new ArrayList<>(dependientes);
    }

    /**
     * Verifica si el caché está listo.
     */
    public boolean isCacheReady() {
        return cacheReady;
    }

    /**
     * Obtiene estadísticas del caché.
     */
    public Map<String, Object> getCacheStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("ready", cacheReady);
        stats.put("entries", dependientesCache.size());
        stats.put("expirationMinutes", cacheExpirationMinutes);

        // Concepto con más dependientes
        String maxDependientes = dependientesCache.entrySet().stream()
                .max(Comparator.comparingInt(e -> e.getValue().size()))
                .map(Map.Entry::getKey)
                .orElse("N/A");
        stats.put("conceptoMasDependientes", maxDependientes);

        if (dependientesCache.containsKey(maxDependientes)) {
            stats.put("maxDependientes", dependientesCache.get(maxDependientes).size());
        }

        return stats;
    }

    /**
     * Limpia el caché.
     */
    @CacheEvict(value = "dependientes", allEntries = true)
    public void clearCache() {
        dependientesCache.clear();
        cacheReady = false;
        log.info("Caché de dependencias limpiado");
    }
}
