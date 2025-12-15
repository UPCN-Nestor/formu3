package com.upcn.formu.service;

import com.upcn.formu.dto.VariableDTO;
import com.upcn.formu.dto.VariableDTO.TipoVariable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Servicio para parsear variables de las fórmulas de liquidación.
 * Extrae las referencias a conceptos y genera la información de visualización.
 * 
 * Este parser está diseñado para ser fácilmente extensible:
 * - Agregar nuevos patrones en initPatterns()
 * - Modificar descripcionesPatrones para cambiar textos de visualización
 */
@Service
public class VariableParser {

    /**
     * Mapa de patrones regex organizados por tipo de variable
     */
    private final Map<TipoVariable, List<PatronVariable>> patrones = new HashMap<>();

    /**
     * Descripciones de los patrones para mostrar al usuario
     */
    private final Map<String, String> descripcionesPatrones = new HashMap<>();

    /**
     * Expresión regular para encontrar variables entre %...%
     */
    private static final Pattern VARIABLE_PATTERN = Pattern.compile("%([A-Z0-9]+)%");

    public VariableParser() {
        initPatterns();
        initDescripciones();
    }

    /**
     * Inicializa los patrones de variables organizados por tipo.
     * MODIFICABLE: Agregar nuevos patrones aquí.
     */
    private void initPatterns() {
        // Patrones que referencian un solo concepto (nnnn)
        List<PatronVariable> singlePatterns = new ArrayList<>();

        // CALC, INFO, REDO, etc. - formato: PREFIXnnnn
        singlePatterns.add(new PatronVariable(
                "CALC",
                Pattern.compile("^CALC(\\d{4})$"),
                "Valor de {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "INFO",
                Pattern.compile("^INFO(\\d{4})$"),
                "Informado en {nnnn}",
                "Informado en este concepto"));
        singlePatterns.add(new PatronVariable(
                "REDO",
                Pattern.compile("^REDO(\\d{4})$"),
                "Redondeo de {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "VAL1",
                Pattern.compile("^VAL1(\\d{4})$"),
                "Valor 1 de {nnnn}",
                "Valor 1 de este concepto"));
        singlePatterns.add(new PatronVariable(
                "VAL2",
                Pattern.compile("^VAL2(\\d{4})$"),
                "Valor 2 de {nnnn}",
                "Valor 2 de este concepto"));
        singlePatterns.add(new PatronVariable(
                "VAL3",
                Pattern.compile("^VAL3(\\d{4})$"),
                "Valor 3 de {nnnn}",
                "Valor 3 de este concepto"));
        singlePatterns.add(new PatronVariable(
                "FVA1",
                Pattern.compile("^FVA1(\\d{4})$"),
                "Valor fijo 1 del legajo, del concepto {nnnn}",
                "Valor fijo 1 del legajo, de este concepto"));
        singlePatterns.add(new PatronVariable(
                "FVA2",
                Pattern.compile("^FVA2(\\d{4})$"),
                "Valor fijo 2 del legajo, del concepto {nnnn}",
                "Valor fijo 2 del legajo, de este concepto"));
        singlePatterns.add(new PatronVariable(
                "FVA3",
                Pattern.compile("^FVA3(\\d{4})$"),
                "Valor fijo 3 del legajo, del concepto {nnnn}",
                "Valor fijo 3 del legajo, de este concepto"));
        singlePatterns.add(new PatronVariable(
                "BASI",
                Pattern.compile("^BASI(\\d{4})$"),
                "Básico de comp. salarial {nnnn}",
                "Básico de su comp. salarial"));
        singlePatterns.add(new PatronVariable(
                "ADIC",
                Pattern.compile("^ADIC(\\d{4})$"),
                "Adicional de comp. salarial {nnnn}",
                "Adicional de su comp. salarial"));
        singlePatterns.add(new PatronVariable(
                "COMS",
                Pattern.compile("^COMS(\\d{4})$"),
                "Comp. salarial {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "PCON",
                Pattern.compile("^PCON(\\d{4})$"),
                "Concepto {nnnn} de comp. salarial"));
        singlePatterns.add(new PatronVariable(
                "PCOM",
                Pattern.compile("^PCOM(\\d{4})$"),
                "Concepto actual en comp. {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "CGAN",
                Pattern.compile("^CGAN(\\d{4})$"),
                "Calc. Ganancias de {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "PROVAC",
                Pattern.compile("^PROVAC(\\d{4})$"),
                "Provisión vacaciones de {nnnn}"));

        // Patrones con nnnn + otros parámetros (aún referencia concepto único)
        singlePatterns.add(new PatronVariable(
                "CALU",
                Pattern.compile("^CALU(\\d{4})([A-Z0-9])$"),
                "Valor de {nnnn} de última liq. tipo {l}"));
        singlePatterns.add(new PatronVariable(
                "CALX",
                Pattern.compile("^CALX(\\d{4})([A-Z0-9])$"),
                "Valor de {nnnn} de última liq. tipo {l}"));
        singlePatterns.add(new PatronVariable(
                "CSEM",
                Pattern.compile("^CSEM(\\d{4})\\d[A-Z]$"),
                "Semestre de {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "CSEP",
                Pattern.compile("^CSEP(\\d{4})\\d[A-Z]$"),
                "Semestre prev. de {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "MSEM",
                Pattern.compile("^MSEM(\\d{4})\\d[A-Z]$"),
                "Mayor en semestre de {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "CC",
                Pattern.compile("^CC(\\d{4})([A-Z0-9]{2})(\\d)(\\d)$"),
                "Valor de {nnnn}, liq. {l} de {mm} meses atrás"));
        singlePatterns.add(new PatronVariable(
                "CI",
                Pattern.compile("^CI(\\d{4})([A-Z0-9]{2})(\\d)(\\d)$"),
                "Inf. de {nnnn}, liq. {l} de {mm} meses atrás"));
        singlePatterns.add(new PatronVariable(
                "AC",
                Pattern.compile("^AC(\\d{4})\\d{2}\\d[A-Z]$"),
                "Acum. calc. de {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "AI",
                Pattern.compile("^AI(\\d{4})\\d{2}\\d[A-Z]$"),
                "Acum. inf. de {nnnn}"));

        // Variables de liquidación histórica: 0nnnnaammq, Lnnnnaammq, Annnnaammq,
        // Bnnnnaammq
        singlePatterns.add(new PatronVariable(
                "0",
                Pattern.compile("^0(\\d{4})\\d{5}$"),
                "Sueldo hist. de {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "L",
                Pattern.compile("^L(\\d{4})\\d{5}$"),
                "Liq. normal hist. de {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "A",
                Pattern.compile("^A(\\d{4})\\d{5}$"),
                "Aguinaldo hist. de {nnnn}"));
        singlePatterns.add(new PatronVariable(
                "B",
                Pattern.compile("^B(\\d{4})\\d{5}$"),
                "BAE hist. de {nnnn}"));

        patrones.put(TipoVariable.SINGLE_CONCEPT, singlePatterns);

        // Patrones que referencian rangos de conceptos (nnnn a xxxx)
        List<PatronVariable> rangePatterns = new ArrayList<>();

        rangePatterns.add(new PatronVariable(
                "SC",
                Pattern.compile("^SC(\\d{4})(\\d{4})$"),
                "Suma definitivos {nnnn}-{xxxx}"));
        rangePatterns.add(new PatronVariable(
                "ST",
                Pattern.compile("^ST(\\d{4})(\\d{4})$"),
                "Suma transitorios {nnnn}-{xxxx}"));
        rangePatterns.add(new PatronVariable(
                "SI",
                Pattern.compile("^SI(\\d{4})(\\d{4})$"),
                "Suma informados {nnnn}-{xxxx}"));
        rangePatterns.add(new PatronVariable(
                "S",
                Pattern.compile("^S(\\d{4})(\\d{4})[A-Z]$"),
                "Suma última liq. {nnnn}-{xxxx}"));
        rangePatterns.add(new PatronVariable(
                "E",
                Pattern.compile("^E(\\d{4})(\\d{4})\\d$"),
                "Especialización {nnnn}-{xxxx}"));
        rangePatterns.add(new PatronVariable(
                "MM",
                Pattern.compile("^MM(\\d{4})(\\d{4})$"),
                "Menor valor {nnnn} y {xxxx}"));

        patrones.put(TipoVariable.RANGE, rangePatterns);

        // Variables terminales (sin referencia a concepto)
        List<PatronVariable> terminalPatterns = new ArrayList<>();

        // Lista de variables terminales conocidas
        String[] terminales = {
                "AFILIADO", "ANTIGUEDAD", "ANTIGUEMES", "ANIOSCAT", "ANOLIQ",
                "ANTIBAE", "ANTICIPO", "ART", "BASICOANTI", "CANTADHE",
                "CATEGORIA", "CONCEPTO", "CONCEPTO2", "CONDCONTRA", "CONVENIO",
                "CTOCTO", "DIASGUAR", "DIASHABI", "DIASTRAB", "DIATRAMES",
                "DIATRAMESE", "EDAD", "FERIANT", "FERITRAB", "FRENTE",
                "GASTOSEDUC", "GENNETACU", "GRUPO", "GRUTRAB", "GUARDERIA",
                "INASISTEN", "MESANTIG", "MESCOBBAE", "MESLIQ", "MESNACIM",
                "MODCONT", "OBRASOC", "PERTOPE", "PRESTAMO", "PROMEDIO",
                "QUINCENA", "RDEDUC1", "RG5800", "RGCAFACO", "RGCAFACOFI",
                "RGCAFAHI", "RGCAFAHIFI", "RGCAFAOT", "RGCAFAOTFI", "RGDEDINA",
                "RGDEDIND", "RGGANOIM", "RGPRIMSE", "RGSEGSEP", "SACDIA",
                "SEXO", "TARDANZA", "TIPOEMP", "TIPOLIQ", "TOTEMBAR",
                "VACANOLIQ", "VACDIADCT", "VACDIADIG", "VACDIADL1", "VACDIADL2",
                "VACDIADLI", "VACDIALIQ", "VACDIAVAC", "VACMESLIQ",
                "F572DRE", "F572FACO", "F572FADI", "F572FAHI", "F572FAOT",
                "F572HOE", "F572HOR", "F572OGC", "F572ORE", "F572OSE",
                "F572OSI", "F572OSS", "F572SAC", "PBAEANTIGA", "PBAEANTIGC"
        };

        for (String terminal : terminales) {
            terminalPatterns.add(new PatronVariable(
                    terminal,
                    Pattern.compile("^" + Pattern.quote(terminal) + "$"),
                    terminal));
        }

        // Patrones con parámetros pero sin concepto específico
        terminalPatterns.add(new PatronVariable("ANOTRA", Pattern.compile("^ANOTRA\\d{3}$"), "Años trabajados"));
        terminalPatterns.add(new PatronVariable("ATENC", Pattern.compile("^ATENC\\d{4}$"), "Atención"));
        terminalPatterns.add(new PatronVariable("DIATRAANO", Pattern.compile("^DIATRAANO\\d$"), "Días trab. año"));
        terminalPatterns.add(new PatronVariable("DIATRASEI", Pattern.compile("^DIATRASEI\\d$"), "Días trab. semestre"));
        terminalPatterns.add(new PatronVariable("DIATRASEM", Pattern.compile("^DIATRASEM\\d$"), "Días trab. semestre"));
        terminalPatterns.add(new PatronVariable("DIAINASEM", Pattern.compile("^DIAINASEM\\d$"), "Días inas. semestre"));
        terminalPatterns.add(new PatronVariable("EMBARGO", Pattern.compile("^EMBARGO\\d$"), "Embargo"));
        terminalPatterns.add(new PatronVariable("ESPEC", Pattern.compile("^ESPEC\\d$"), "Especialización"));
        terminalPatterns.add(new PatronVariable("FAMI", Pattern.compile("^FAMI\\d{3}$"), "Salario familiar"));
        terminalPatterns.add(new PatronVariable("FERI", Pattern.compile("^FERI\\d$"), "Feriados"));
        terminalPatterns.add(new PatronVariable("F572DED", Pattern.compile("^F572DED\\d{2}$"), "Deducción F572"));
        terminalPatterns.add(new PatronVariable("F572MOT", Pattern.compile("^F572MOT\\d$"), "Motivo F572"));
        terminalPatterns.add(new PatronVariable("GCIA", Pattern.compile("^GCIA\\d{4}$"), "Ganancias"));
        terminalPatterns.add(new PatronVariable("GANP", Pattern.compile("^GANP\\d{4}[A-Z]\\d$"), "Promedio ganancias"));
        terminalPatterns.add(new PatronVariable("MESF", Pattern.compile("^MESF\\d{4}$"), "Mes fijos"));
        terminalPatterns.add(new PatronVariable("MESTRA", Pattern.compile("^MESTRA\\d{2}$"), "Meses trabajados"));
        terminalPatterns.add(new PatronVariable("MOT", Pattern.compile("^MOT\\d{6}$"), "Motivo ausencia"));
        terminalPatterns.add(new PatronVariable("TMO", Pattern.compile("^TMO\\d{6}$"), "Tipo motivo"));
        terminalPatterns.add(new PatronVariable("PARLIQ", Pattern.compile("^PARLIQ\\d{3}$"), "Parámetro liq."));
        terminalPatterns.add(new PatronVariable("PBAEACUM", Pattern.compile("^PBAEACUM\\d$"), "% BAE acum."));
        terminalPatterns.add(new PatronVariable("P572DED", Pattern.compile("^P572DED\\d{2}$"), "Deducción P572"));
        terminalPatterns.add(new PatronVariable("RCALIG", Pattern.compile("^RCALIG\\d{4}$"), "Recálculo gan."));
        terminalPatterns.add(new PatronVariable("CCTO", Pattern.compile("^CCTO\\d{4}$"), "Centro costo"));
        terminalPatterns.add(new PatronVariable("PCONX", Pattern.compile("^PCONX\\d{4}\\d$"), "Concepto comp. +"));

        // Totales históricos (sin concepto específico)
        terminalPatterns.add(new PatronVariable("TAP", Pattern.compile("^TAP\\d{6}$"), "Total aportes"));
        terminalPatterns.add(new PatronVariable("TCR", Pattern.compile("^TCR\\d{6}$"), "Total rem. c/aportes"));
        terminalPatterns.add(new PatronVariable("TDE", Pattern.compile("^TDE\\d{6}$"), "Total descuentos"));
        terminalPatterns.add(new PatronVariable("TRE", Pattern.compile("^TRE\\d{6}$"), "Total retenciones"));
        terminalPatterns.add(new PatronVariable("TSF", Pattern.compile("^TSF\\d{6}$"), "Total sal. familiar"));
        terminalPatterns.add(new PatronVariable("TSR", Pattern.compile("^TSR\\d{6}$"), "Total rem. s/aportes"));
        terminalPatterns.add(new PatronVariable("TTAP", Pattern.compile("^TTAP\\d{4}$"), "Total aportes patr."));
        terminalPatterns.add(new PatronVariable("TTCR", Pattern.compile("^TTCR\\d{4}$"), "Total rem. c/desc."));
        terminalPatterns.add(new PatronVariable("TTDE", Pattern.compile("^TTDE\\d{4}$"), "Total deducciones"));
        terminalPatterns.add(new PatronVariable("TTRE", Pattern.compile("^TTRE\\d{4}$"), "Total retenciones"));
        terminalPatterns.add(new PatronVariable("TTSF", Pattern.compile("^TTSF\\d{4}$"), "Total sal. fam."));
        terminalPatterns.add(new PatronVariable("TTSR", Pattern.compile("^TTSR\\d{4}$"), "Total rem. s/desc."));

        // Rango de totales
        terminalPatterns.add(new PatronVariable("ZAP", Pattern.compile("^ZAP\\d{8}$"), "Rango aportes"));
        terminalPatterns.add(new PatronVariable("ZCR", Pattern.compile("^ZCR\\d{8}$"), "Rango rem. c/ret."));
        terminalPatterns.add(new PatronVariable("ZDE", Pattern.compile("^ZDE\\d{8}$"), "Rango deducciones"));
        terminalPatterns.add(new PatronVariable("ZRE", Pattern.compile("^ZRE\\d{8}$"), "Rango retenciones"));
        terminalPatterns.add(new PatronVariable("ZSF", Pattern.compile("^ZSF\\d{8}$"), "Rango sal. fam."));
        terminalPatterns.add(new PatronVariable("ZSR", Pattern.compile("^ZSR\\d{8}$"), "Rango rem. s/ret."));

        // Mayor sueldo
        terminalPatterns.add(new PatronVariable("SUEMAANO", Pattern.compile("^SUEMAANO\\d[A-Z]$"), "Mayor sueldo año"));
        terminalPatterns
                .add(new PatronVariable("SUEMASEI", Pattern.compile("^SUEMASEI\\d[A-Z]$"), "Mayor sueldo 6 meses"));
        terminalPatterns
                .add(new PatronVariable("SUEMASEM", Pattern.compile("^SUEMASEM\\d[A-Z]$"), "Mayor sueldo sem."));

        patrones.put(TipoVariable.TERMINAL, terminalPatterns);
    }

    /**
     * Inicializa las descripciones detalladas de los patrones.
     */
    private void initDescripciones() {
        descripcionesPatrones.put("CALC", "Importe calculado en el concepto indicado");
        descripcionesPatrones.put("INFO", "Valor informado en el parte de novedades");
        descripcionesPatrones.put("SC", "Sumatoria de conceptos definitivos del rango");
        descripcionesPatrones.put("ST", "Sumatoria de conceptos transitorios del rango");
        descripcionesPatrones.put("SI", "Sumatoria de valores informados del rango");
        // Agregar más descripciones según necesidad
    }

    /**
     * Parsea una fórmula y extrae todas las variables.
     * 
     * @param formula Fórmula a parsear
     * @return Lista de variables encontradas
     */
    public List<VariableDTO> parseFormula(String formula) {
        if (formula == null || formula.isBlank()) {
            return Collections.emptyList();
        }

        List<VariableDTO> variables = new ArrayList<>();
        Matcher matcher = VARIABLE_PATTERN.matcher(formula);

        while (matcher.find()) {
            String nombreVariable = matcher.group(1);
            int posInicio = matcher.start();
            int posFin = matcher.end();

            VariableDTO variable = parseVariable(nombreVariable);
            if (variable != null) {
                variable.setPosicionInicio(posInicio);
                variable.setPosicionFin(posFin);
                variables.add(variable);
            }
        }

        return variables;
    }

    /**
     * Parsea una variable individual.
     * 
     * @param nombreVariable Nombre de la variable (sin %)
     * @return VariableDTO con la información parseada
     */
    public VariableDTO parseVariable(String nombreVariable) {
        if (nombreVariable == null || nombreVariable.isBlank()) {
            return null;
        }

        // Primero intentar con patrones de rango
        for (PatronVariable patron : patrones.get(TipoVariable.RANGE)) {
            Matcher m = patron.pattern.matcher(nombreVariable);
            if (m.matches()) {
                String rangoInicio = m.group(1);
                String rangoFin = m.group(2);
                String textoMostrar = patron.textoMostrar
                        .replace("{nnnn}", rangoInicio)
                        .replace("{xxxx}", rangoFin);

                return VariableDTO.builder()
                        .nombre(nombreVariable)
                        .prefijo(patron.prefijo)
                        .tipo(TipoVariable.RANGE)
                        .rangoInicio(rangoInicio)
                        .rangoFin(rangoFin)
                        .textoMostrar(textoMostrar)
                        .color(ColorUtils.hashToColor(nombreVariable))
                        .descripcionPatron(descripcionesPatrones.get(patron.prefijo))
                        .build();
            }
        }

        // Luego intentar con patrones de concepto único
        for (PatronVariable patron : patrones.get(TipoVariable.SINGLE_CONCEPT)) {
            Matcher m = patron.pattern.matcher(nombreVariable);
            if (m.matches()) {
                String concepto = m.group(1);
                
                // Determinar texto a mostrar
                String textoMostrar;
                boolean esSiMismo = "0000".equals(concepto);
                
                if (esSiMismo && patron.textoMostrarSiMismo != null) {
                    textoMostrar = patron.textoMostrarSiMismo;
                } else {
                    textoMostrar = patron.textoMostrar.replace("{nnnn}", concepto);
                }
                
                // Para patrones CC y CI, reemplazar también {mm} y {l}
                if ((patron.prefijo.equals("CC") || patron.prefijo.equals("CI")) && m.groupCount() >= 4) {
                    String meses = m.group(2);
                    String tipoLiq = m.group(4);
                    textoMostrar = textoMostrar
                            .replace("{mm}", meses)
                            .replace("{l}", tipoLiq);
                }
                
                // Para patrones CALU y CALX, reemplazar {l} con el tipo de liquidación
                if ((patron.prefijo.equals("CALU") || patron.prefijo.equals("CALX")) && m.groupCount() >= 2) {
                    String tipoLiq = m.group(2);
                    textoMostrar = textoMostrar.replace("{l}", tipoLiq);
                }

                return VariableDTO.builder()
                        .nombre(nombreVariable)
                        .prefijo(patron.prefijo)
                        .tipo(TipoVariable.SINGLE_CONCEPT)
                        .conceptoReferenciado(concepto)
                        .textoMostrar(textoMostrar)
                        .color(ColorUtils.hashToColor(concepto))
                        .descripcionPatron(descripcionesPatrones.get(patron.prefijo))
                        .build();
            }
        }

        // Finalmente intentar con variables terminales
        for (PatronVariable patron : patrones.get(TipoVariable.TERMINAL)) {
            if (patron.pattern.matcher(nombreVariable).matches()) {
                return VariableDTO.builder()
                        .nombre(nombreVariable)
                        .prefijo(patron.prefijo)
                        .tipo(TipoVariable.TERMINAL)
                        .textoMostrar(patron.textoMostrar)
                        .color(ColorUtils.hashToColor(nombreVariable))
                        .descripcionPatron(descripcionesPatrones.get(patron.prefijo))
                        .build();
            }
        }

        // Variable no reconocida - tratarla como terminal
        return VariableDTO.builder()
                .nombre(nombreVariable)
                .prefijo(nombreVariable)
                .tipo(TipoVariable.TERMINAL)
                .textoMostrar(nombreVariable)
                .color(ColorUtils.hashToColor(nombreVariable))
                .descripcionPatron("Variable no reconocida")
                .build();
    }

    /**
     * Extrae los códigos de concepto referenciados por una fórmula.
     * Solo retorna conceptos únicos (no rangos).
     * 
     * @param formula Fórmula a analizar
     * @return Set de códigos de concepto
     */
    public Set<String> extractConceptosReferenciados(String formula) {
        Set<String> conceptos = new HashSet<>();

        for (VariableDTO variable : parseFormula(formula)) {
            if (variable.getTipo() == TipoVariable.SINGLE_CONCEPT
                    && variable.getConceptoReferenciado() != null) {
                conceptos.add(variable.getConceptoReferenciado());
            }
        }

        return conceptos;
    }

    /**
     * Extrae los rangos de conceptos referenciados por una fórmula.
     * 
     * @param formula Fórmula a analizar
     * @return Lista de arrays [inicio, fin] de rangos
     */
    public List<String[]> extractRangosReferenciados(String formula) {
        List<String[]> rangos = new ArrayList<>();

        for (VariableDTO variable : parseFormula(formula)) {
            if (variable.getTipo() == TipoVariable.RANGE) {
                rangos.add(new String[] { variable.getRangoInicio(), variable.getRangoFin() });
            }
        }

        return rangos;
    }

    /**
     * Clase interna para definir patrones de variables.
     */
    private static class PatronVariable {
        final String prefijo;
        final Pattern pattern;
        final String textoMostrar;
        final String textoMostrarSiMismo; // Para cuando el código es 0000 (sí mismo)

        PatronVariable(String prefijo, Pattern pattern, String textoMostrar) {
            this(prefijo, pattern, textoMostrar, null);
        }
        
        PatronVariable(String prefijo, Pattern pattern, String textoMostrar, String textoMostrarSiMismo) {
            this.prefijo = prefijo;
            this.pattern = pattern;
            this.textoMostrar = textoMostrar;
            this.textoMostrarSiMismo = textoMostrarSiMismo;
        }
    }
}
