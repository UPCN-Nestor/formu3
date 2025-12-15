/**
 * Tipos compartidos para el frontend del visualizador de fórmulas.
 * Corresponden a los DTOs del backend.
 */

/** Tipo de variable en una fórmula */
export type TipoVariable = 'SINGLE_CONCEPT' | 'RANGE' | 'TERMINAL';

/** Variable extraída de una fórmula */
export interface Variable {
    nombre: string;
    prefijo: string;
    tipo: TipoVariable;
    conceptoReferenciado?: string;
    rangoInicio?: string;
    rangoFin?: string;
    conceptosEnRango?: string[];
    textoMostrar: string;
    color: string;
    descripcionPatron?: string;
    posicionInicio: number;
    posicionFin: number;
}

/** Concepto de liquidación */
export interface Concepto {
    codigo: string;
    descripcion: string;
    formula: string;
    formulaCompleta: string;
    condicionFormula?: string;
    tipoConcepto: string;
    tipoConceptoAbr?: string;
    observacion?: string;
    tiposLiquidacion: string;
    orden: number;
    definitivo: boolean;
    variables?: Variable[];
    variablesCondicion?: Variable[];
    dependencias?: string[];
    dependientes?: string[];
    importeLiquidacion?: number | null;
    valorInformado?: number | null;
    liquidacionCargada?: boolean;
    val1?: number | null;
    val2?: number | null;
    val3?: number | null;
    color: string;
}

/** Resumen de concepto para listas */
export interface ConceptoResumen {
    codigo: string;
    descripcion: string;
    definitivo: boolean;
    color: string;
}

/** Rango de conceptos (para SC, ST, etc.) */
export interface RangoConceptos {
    id: string;
    tipo: string;
    codigoInicio: string;
    codigoFin: string;
    descripcion: string;
    conceptos: ConceptoResumen[];
    color: string;
}

/** Información de liquidación */
export interface Liquidacion {
    codigoConcepto: string;
    importeCalculado: number;
    valorInformado: number;
    legajo?: string;
    cantidadLegajos?: number;
}

/** Filtros de liquidación */
export interface FiltrosLiquidacion {
    anio: number;
    mes: number;
    tipo: string;
    legajo?: string;
}

/** Pantalla guardada */
export interface PantallaGuardada {
    id: string;
    nombre: string;
    conceptoRaiz: string;
    fechaCreacion: string;
    nodos: SavedNode[];
    aristas: SavedEdge[];
    viewport: { x: number; y: number; zoom: number };
    filtrosLiquidacion?: FiltrosLiquidacion;
}

/** Nodo guardado (simplificado para storage) */
export interface SavedNode {
    id: string;
    type: string;
    data: {
        codigo?: string;
        rangoId?: string;
    };
    position: { x: number; y: number };
}

/** Arista guardada */
export interface SavedEdge {
    id: string;
    source: string;
    target: string;
    type?: string;
}

/** Estado del canvas */
export interface CanvasState {
    conceptosVisibles: Set<string>;
    rangosCargados: Set<string>;
    conceptoRaiz?: string;
}
