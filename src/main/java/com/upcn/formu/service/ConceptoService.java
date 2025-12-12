package com.upcn.formu.service;

import com.upcn.formu.domain.Concepto;
import com.upcn.formu.dto.ConceptoDTO;
import com.upcn.formu.dto.RangoConceptosDTO;
import com.upcn.formu.dto.RangoConceptosDTO.ConceptoResumenDTO;
import com.upcn.formu.dto.VariableDTO;
import com.upcn.formu.repository.ConceptoProjection;
import com.upcn.formu.repository.ConceptoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Servicio principal para operaciones con conceptos.
 * Provee métodos para obtener conceptos con sus dependencias parseadas.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConceptoService {

    private final ConceptoRepository conceptoRepository;
    private final VariableParser variableParser;
    private final DependencyCacheService dependencyCacheService;

    /**
     * Obtiene todos los conceptos (solo resumen).
     * Útil para listados y búsquedas.
     */
    public List<ConceptoDTO> getAllConceptos() {
        return conceptoRepository.findAllConceptosAgrupados().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Busca conceptos por código parcial.
     */
    public List<ConceptoDTO> buscarConceptos(String query) {
        if (query == null || query.length() < 2) {
            return Collections.emptyList();
        }

        return conceptoRepository.findAllConceptosAgrupados().stream()
                .filter(c -> c.getCodConcepto().contains(query)
                        || (c.getDescripcionConcepto() != null
                                && c.getDescripcionConcepto().toLowerCase().contains(query.toLowerCase())))
                .map(this::toDTO)
                .limit(20)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene un concepto con todas sus dependencias parseadas.
     * 
     * @param codigo Código del concepto
     * @return ConceptoDTO con variables parseadas y dependencias
     */
    public Optional<ConceptoDTO> getConceptoConDependencias(String codigo) {
        return conceptoRepository.findByCodigo(codigo)
                .map(concepto -> {
                    ConceptoDTO dto = toDTO(concepto);

                    // Parsear variables de la fórmula
                    List<VariableDTO> variables = variableParser.parseFormula(concepto.getFormulaCompleta());
                    dto.setVariables(variables);

                    // Extraer dependencias (conceptos que este concepto referencia)
                    Set<String> dependencias = variableParser
                            .extractConceptosReferenciados(concepto.getFormulaCompleta());
                    dto.setDependencias(new ArrayList<>(dependencias));

                    // Obtener dependientes del caché (conceptos que referencian a este)
                    List<String> dependientes = dependencyCacheService.getDependientes(codigo);
                    dto.setDependientes(dependientes);

                    return dto;
                });
    }

    /**
     * Obtiene múltiples conceptos con sus dependencias.
     * Optimizado para carga batch.
     */
    public List<ConceptoDTO> getConceptosConDependencias(List<String> codigos) {
        return codigos.stream()
                .map(this::getConceptoConDependencias)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene los conceptos en un rango para variables tipo SC, ST, etc.
     * 
     * @param rangoId Identificador del rango (ej: "SC01003600")
     * @param inicio  Código de inicio del rango
     * @param fin     Código de fin del rango
     * @return RangoConceptosDTO con la lista de conceptos
     */
    public RangoConceptosDTO getConceptosEnRango(String rangoId, String inicio, String fin) {
        List<ConceptoProjection> conceptos = conceptoRepository.findByCodigoRange(inicio, fin);

        List<ConceptoResumenDTO> resumen = conceptos.stream()
                .map(c -> ConceptoResumenDTO.builder()
                        .codigo(c.getCodConcepto())
                        .descripcion(c.getDescripcionConcepto())
                        .definitivo("D".equalsIgnoreCase(c.getTransitorioDefinitivo()))
                        .color(ColorUtils.hashToColor(c.getCodConcepto()))
                        .build())
                .collect(Collectors.toList());

        // Determinar tipo de rango (SC, ST, etc.)
        String tipo = rangoId.replaceAll("\\d", "");
        String descripcion = switch (tipo) {
            case "SC" -> "Suma de conceptos definitivos";
            case "ST" -> "Suma de conceptos transitorios";
            case "SI" -> "Suma de valores informados";
            case "S" -> "Suma de última liquidación";
            case "E" -> "Especialización";
            default -> "Rango de conceptos";
        };

        return RangoConceptosDTO.builder()
                .id(rangoId)
                .tipo(tipo)
                .codigoInicio(inicio)
                .codigoFin(fin)
                .descripcion(descripcion)
                .conceptos(resumen)
                .color(ColorUtils.hashToColor(rangoId))
                .build();
    }

    /**
     * Convierte una proyección Concepto a DTO.
     */
    private ConceptoDTO toDTO(ConceptoProjection concepto) {
        boolean esDefinitivo = "D".equalsIgnoreCase(concepto.getTransitorioDefinitivo());
        return ConceptoDTO.builder()
                .codigo(concepto.getCodConcepto())
                .descripcion(concepto.getDescripcionConcepto())
                .formula(concepto.getCodFormula())
                .formulaCompleta(concepto.getFormulaCompleta())
                .condicionFormula(concepto.getCondicionFormula())
                .tipoConcepto(concepto.getTipoConcepto())
                .tiposLiquidacion(concepto.getTipoLiquidacion())
                .orden(concepto.getOrden())
                .definitivo(esDefinitivo)
                .color(ColorUtils.hashToColor(concepto.getCodConcepto()))
                .build();
    }

    /**
     * Convierte una entidad Concepto a DTO (para compatibilidad).
     */
    private ConceptoDTO toDTO(Concepto concepto) {
        return ConceptoDTO.builder()
                .codigo(concepto.getId())
                .descripcion(concepto.getDescripcionConcepto())
                .formula(concepto.getFormula())
                .formulaCompleta(concepto.getFormulaCompleta())
                .condicionFormula(concepto.getCondicionFormula())
                .tipoConcepto(concepto.getTipoConcepto())
                .tiposLiquidacion(concepto.getTipoLiquidacion())
                .orden(concepto.getOrden())
                .definitivo(concepto.esDefinitivo())
                .color(ColorUtils.hashToColor(concepto.getId()))
                .build();
    }

    /**
     * Fuerza la reconstrucción del caché de dependencias.
     */
    public void refreshDependencyCache() {
        dependencyCacheService.buildCache();
    }
}
