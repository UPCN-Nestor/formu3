import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { Concepto, Variable, DependencySource } from '../types';
import { formatCurrency } from '../utils';

interface ConceptNodeData {
    concepto: Concepto;
    onExpand?: (codigo: string, direction: 'dependencias' | 'dependientes') => void;
    onVariableClick?: (variable: Variable, source: DependencySource) => void;
    onDelete?: (codigo: string) => void;
}

/**
 * Componente de nodo para visualizar un concepto.
 * Muestra código, descripción, fórmula con variables coloreadas e importe.
 */
const ConceptNode: React.FC<NodeProps<ConceptNodeData>> = ({ data }) => {
    const { concepto, onExpand, onVariableClick, onDelete } = data;

    const borderColor = concepto.borderColor;

    const nodeClass = concepto.definitivo ? 'concept-node definitivo' : 'concept-node transitorio';

    const nodeStyle: React.CSSProperties = {
        '--node-bg-color': concepto.color,
        '--node-border-color': borderColor,
        '--node-text-color': '#1e293b',
    } as React.CSSProperties;

    return (
        <div className={nodeClass} style={nodeStyle}>
            {/* Handle superior para dependencias (conceptos de los que depende) */}
            <Handle
                type="target"
                position={Position.Top}
                style={{ background: borderColor }}
            />

            {/* Header */}
            <div className="concept-node-header">
                <span className="concept-node-title" title={`${concepto.codigo} - ${concepto.descripcion}`}>
                    {concepto.codigo} - {concepto.descripcion}
                </span>
                <div className="concept-node-header-actions nodrag">
                    {concepto.tipoConceptoAbr && (
                        <span className="concept-node-badge">
                            {concepto.tipoConceptoAbr}
                        </span>
                    )}
                    <button
                        className="concept-node-delete"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDelete?.(concepto.codigo);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Eliminar este concepto"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="concept-node-body">
                {/* Bloque de Orden, Fórmula y Condición */}
                {concepto.formulaCompleta && (
                    <div className="concept-node-formula">
                        <div className="concept-node-orden">Orden: {concepto.orden}</div>
                        <div className="concept-node-formula-row">
                            <span className="concept-node-formula-label">Fórmula: </span>
                            <FormulaConVariables
                                formula={concepto.formulaCompleta}
                                variables={concepto.variables || []}
                                onVariableClick={onVariableClick}
                                source="formula"
                                val1={concepto.val1}
                                val2={concepto.val2}
                                val3={concepto.val3}
                            />
                        </div>
                        {concepto.condicionFormula && concepto.condicionFormula.trim() !== '' && (
                            <div className="concept-node-formula-row concept-node-condicion-row">
                                <span className="concept-node-formula-label">Condición: </span>
                                <FormulaConVariables
                                    formula={concepto.condicionFormula}
                                    variables={concepto.variablesCondicion || []}
                                    onVariableClick={onVariableClick}
                                    source="condicion"
                                    val1={concepto.val1}
                                    val2={concepto.val2}
                                    val3={concepto.val3}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Observación (si existe) */}
                {concepto.observacion && (
                    <div className="concept-node-observacion">
                        {concepto.observacion}
                    </div>
                )}

                {/* Importe de liquidación - solo mostrar si hay liquidación cargada */}
                {concepto.liquidacionCargada && (
                    <div className="concept-node-importes">
                        <div className="concept-node-importe">
                            <div className="concept-node-importe-value concept-node-importe-calculado">
                                {concepto.importeLiquidacion !== null && concepto.importeLiquidacion !== 0
                                    ? formatCurrency(concepto.importeLiquidacion)
                                    : '-'}
                            </div>
                            <div className="concept-node-importe-label">
                                Calculado
                            </div>
                        </div>
                        {concepto.valorInformado !== undefined && concepto.valorInformado !== null && concepto.valorInformado !== 0 && (
                            <div className="concept-node-importe">
                                <div className="concept-node-importe-value concept-node-importe-informado">
                                    {concepto.valorInformado}
                                </div>
                                <div className="concept-node-importe-label">
                                    Informado
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Botones de dependencias (arriba) y dependientes (abajo) */}
                {(() => {
                    // Calcular variables clickeables únicas de fórmula y condición
                    const variablesFormula = (concepto.variables || []).filter(
                        v => (v.tipo === 'SINGLE_CONCEPT' && v.conceptoReferenciado && v.conceptoReferenciado !== '0000') ||
                            v.tipo === 'RANGE'
                    );
                    const variablesCondicion = (concepto.variablesCondicion || []).filter(
                        v => (v.tipo === 'SINGLE_CONCEPT' && v.conceptoReferenciado && v.conceptoReferenciado !== '0000') ||
                            v.tipo === 'RANGE'
                    );

                    // Contar conceptos únicos
                    const conceptosUnicos = new Set<string>();
                    const rangosUnicos = new Set<string>();

                    [...variablesFormula, ...variablesCondicion].forEach(v => {
                        if (v.tipo === 'SINGLE_CONCEPT' && v.conceptoReferenciado) {
                            conceptosUnicos.add(v.conceptoReferenciado);
                        } else if (v.tipo === 'RANGE' && v.rangoInicio && v.rangoFin) {
                            rangosUnicos.add(`${v.prefijo}-${v.rangoInicio}-${v.rangoFin}`);
                        }
                    });

                    const totalDependencias = conceptosUnicos.size + rangosUnicos.size;

                    return (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            {totalDependencias > 0 && (
                                <button
                                    className="btn btn-sm btn-secondary nodrag"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        onExpand?.(concepto.codigo, 'dependencias');
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    title={`Ver ${totalDependencias} dependencias (${conceptosUnicos.size} conceptos, ${rangosUnicos.size} rangos)`}
                                >
                                    ↑ {totalDependencias}
                                </button>
                            )}
                            {concepto.dependientes && concepto.dependientes.length > 0 && (
                                <button
                                    className="btn btn-sm btn-secondary nodrag"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        onExpand?.(concepto.codigo, 'dependientes');
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    title={`Ver ${concepto.dependientes.length} conceptos que dependen de este`}
                                >
                                    ↓ {concepto.dependientes.length}
                                </button>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Handle inferior para dependientes (conceptos que dependen de este) */}
            <Handle
                type="source"
                position={Position.Bottom}
                style={{ background: borderColor }}
            />
        </div>
    );
};

/**
 * Componente para renderizar la fórmula con variables coloreadas y clickeables
 */
interface FormulaConVariablesProps {
    formula: string;
    variables: Variable[];
    onVariableClick?: (variable: Variable, source: DependencySource) => void;
    source: DependencySource;
    val1?: number | null;
    val2?: number | null;
    val3?: number | null;
}

const FormulaConVariables: React.FC<FormulaConVariablesProps> = ({
    formula, variables, onVariableClick, source, val1, val2, val3
}) => {
    if (!variables || variables.length === 0) {
        return <>{formula}</>;
    }

    // Ordenar variables por posición de inicio
    const sortedVars = [...variables].sort((a, b) => a.posicionInicio - b.posicionInicio);

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedVars.forEach((variable, idx) => {
        // Texto antes de la variable
        if (variable.posicionInicio > lastIndex) {
            parts.push(
                <span key={`text-${idx}`}>
                    {formula.substring(lastIndex, variable.posicionInicio)}
                </span>
            );
        }

        // Determinar si la variable es clickeable (no si es "sí mismo" = 0000)
        const esSiMismo = variable.conceptoReferenciado === '0000';
        const isClickeable = !esSiMismo && (variable.tipo === 'SINGLE_CONCEPT' || variable.tipo === 'RANGE');

        // Determinar si es una variable "sí mismo" y obtener su valor
        let valorMostrar: string | null = null;
        if (esSiMismo) {
            if (variable.prefijo === 'VAL1' && val1 != null) {
                valorMostrar = ` (${val1})`;
            } else if (variable.prefijo === 'VAL2' && val2 != null) {
                valorMostrar = ` (${val2})`;
            } else if (variable.prefijo === 'VAL3' && val3 != null) {
                valorMostrar = ` (${val3})`;
            }
        }

        // La variable coloreada y clickeable
        parts.push(
            <span
                key={`var-${idx}`}
                className={`formula-var ${isClickeable ? 'clickeable nodrag' : ''}`}
                style={{ backgroundColor: variable.color }}
                title={`${variable.textoMostrar}${variable.descripcionPatron ? ` - ${variable.descripcionPatron}` : ''}`}
                onClick={isClickeable ? (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onVariableClick?.(variable, source);
                } : undefined}
                onMouseDown={isClickeable ? (e) => e.stopPropagation() : undefined}
            >
                {variable.textoMostrar}{valorMostrar}
            </span>
        );

        lastIndex = variable.posicionFin;
    });

    // Texto después de la última variable
    if (lastIndex < formula.length) {
        parts.push(
            <span key="text-end">
                {formula.substring(lastIndex)}
            </span>
        );
    }

    return <>{parts}</>;
};

export default memo(ConceptNode);

