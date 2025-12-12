import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { Concepto, Variable } from '../types';
import { hashToBorderColor, formatCurrency, truncate } from '../utils';

interface ConceptNodeData {
    concepto: Concepto;
    onExpand?: (codigo: string, direction: 'dependencias' | 'dependientes') => void;
    onVariableClick?: (variable: Variable) => void;
}

/**
 * Componente de nodo para visualizar un concepto.
 * Muestra código, descripción, fórmula con variables coloreadas e importe.
 */
const ConceptNode: React.FC<NodeProps<ConceptNodeData>> = ({ data }) => {
    const { concepto, onExpand, onVariableClick } = data;

    const borderColor = useMemo(() => hashToBorderColor(concepto.codigo), [concepto.codigo]);

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
                <span className="concept-node-code">{concepto.codigo}</span>
                <span className="concept-node-badge">
                    {concepto.definitivo ? 'DEF' : 'TRANS'}
                </span>
            </div>

            {/* Body */}
            <div className="concept-node-body">
                {/* Descripción */}
                <div className="concept-node-desc">
                    {truncate(concepto.descripcion, 80)}
                </div>

                {/* Fórmula con variables coloreadas y clickeables */}
                {concepto.formulaCompleta && (
                    <div className="concept-node-formula nodrag">
                        <FormulaConVariables
                            formula={concepto.formulaCompleta}
                            variables={concepto.variables || []}
                            onVariableClick={onVariableClick}
                        />
                    </div>
                )}

                {/* Importe de liquidación si existe */}
                {concepto.importeLiquidacion !== undefined && concepto.importeLiquidacion !== null && (
                    <div className="concept-node-importe">
                        <div className="concept-node-importe-value">
                            {formatCurrency(concepto.importeLiquidacion)}
                        </div>
                        <div className="concept-node-importe-label">
                            Importe calculado
                        </div>
                    </div>
                )}

                {/* Botón de dependientes (hacia abajo) */}
                <div className="nodrag" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {concepto.dependientes && concepto.dependientes.length > 0 && (
                        <button
                            className="btn btn-sm btn-secondary"
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
    onVariableClick?: (variable: Variable) => void;
}

const FormulaConVariables: React.FC<FormulaConVariablesProps> = ({ formula, variables, onVariableClick }) => {
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

        // Determinar si la variable es clickeable
        const isClickeable = variable.tipo === 'SINGLE_CONCEPT' || variable.tipo === 'RANGE';

        // La variable coloreada y clickeable
        parts.push(
            <span
                key={`var-${idx}`}
                className={`formula-var ${isClickeable ? 'clickeable' : ''}`}
                style={{ backgroundColor: variable.color }}
                title={`${variable.textoMostrar}${variable.descripcionPatron ? ` - ${variable.descripcionPatron}` : ''}`}
                onClick={isClickeable ? (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onVariableClick?.(variable);
                } : undefined}
                onMouseDown={isClickeable ? (e) => e.stopPropagation() : undefined}
            >
                {variable.textoMostrar}
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

