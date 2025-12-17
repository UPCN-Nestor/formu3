import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { RangoConceptos, Liquidacion } from '../types';
import { truncate, formatCurrency } from '../utils';

interface RangeNodeData {
    rango: RangoConceptos;
    onExpandConcepto?: (codigo: string) => void;
    onDelete?: (rangoId: string) => void;
    liquidaciones?: Map<string, Liquidacion>;
    liquidacionCargada?: boolean;
}

/**
 * Componente de nodo para visualizar un rango de conceptos (SC, ST, etc.)
 * Muestra lista de conceptos con botón para expandir cada uno.
 */
const RangeNode: React.FC<NodeProps<RangeNodeData>> = ({ data, id }) => {
    const { rango, onExpandConcepto, onDelete, liquidaciones, liquidacionCargada } = data;

    const borderColor = rango.borderColor;

    // Obtener importe de un concepto
    const getImporte = (codigo: string): number | null => {
        if (!liquidacionCargada || !liquidaciones) return null;
        // liquidaciones puede ser un Map o un objeto serializado
        if (liquidaciones instanceof Map) {
            const liq = liquidaciones.get(codigo);
            return liq?.importeCalculado ?? null;
        } else {
            // Si es un objeto (después de serialización/deserialización)
            const liqObj = liquidaciones as unknown as Record<string, Liquidacion>;
            const liq = liqObj[codigo];
            return liq?.importeCalculado ?? null;
        }
    };

    // Calcular suma de importes si hay liquidación cargada
    const sumaImportes = useMemo(() => {
        if (!liquidacionCargada || !liquidaciones) return null;

        let suma = 0;
        rango.conceptos.forEach((concepto) => {
            const importe = getImporte(concepto.codigo);
            if (importe !== null && importe !== undefined) {
                suma += importe;
            }
        });
        return suma;
    }, [liquidacionCargada, liquidaciones, rango.conceptos]);

    const nodeStyle: React.CSSProperties = {
        '--node-bg-color': rango.color,
        '--node-border-color': borderColor,
        '--node-text-color': '#1e293b',
    } as React.CSSProperties;

    return (
        <div className="range-node" style={nodeStyle}>
            {/* Handle superior */}
            <Handle
                type="target"
                position={Position.Top}
                style={{ background: borderColor }}
            />

            {/* Header */}
            <div className="range-node-header">
                <div className="range-node-header-content">
                    <div>{rango.tipo}: {rango.codigoInicio} - {rango.codigoFin}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                        {rango.descripcion}
                    </div>
                </div>
                <button
                    className="concept-node-delete nodrag"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onDelete?.(id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Eliminar este rango"
                >
                    🗑️
                </button>
            </div>
            {/* Suma de importes si hay liquidación cargada */}
            {liquidacionCargada && sumaImportes !== null && (
                <div style={{
                    margin: '8px 10px 8px 10px',
                    padding: '6px 10px',
                    background: 'rgba(0,0,0,0.1)',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                }}>
                    <span style={{ color: '#1e293b' }}>Suma:</span> <span style={{ color: '#15803d' }}>{formatCurrency(sumaImportes)}</span>
                </div>
            )}

            {/* Lista de conceptos */}
            <div
                className="range-node-list nodrag nowheel"
                onWheel={(e) => e.stopPropagation()}
            >
                {rango.conceptos.map((concepto) => {
                    const importe = getImporte(concepto.codigo);
                    return (
                        <div
                            key={concepto.codigo}
                            className="range-node-item"
                            title={`${concepto.codigo} - ${concepto.descripcion}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onExpandConcepto?.(concepto.codigo);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div className="range-node-item-expand">+</div>
                            <span className="range-node-item-code">{concepto.codigo}</span>
                            <span className="range-node-item-desc">
                                {truncate(concepto.descripcion, liquidacionCargada ? 18 : 25)}
                            </span>
                            {liquidacionCargada && (
                                <span className="range-node-item-importe">
                                    {importe !== null ? formatCurrency(importe) : '-'}
                                </span>
                            )}
                        </div>
                    );
                })}

                {rango.conceptos.length === 0 && (
                    <div style={{ padding: '10px', opacity: 0.7, fontSize: '0.8rem' }}>
                        Sin conceptos en este rango
                    </div>
                )}
            </div>

            {/* Handle inferior */}
            <Handle
                type="source"
                position={Position.Bottom}
                style={{ background: borderColor }}
            />
        </div>
    );
};

export default memo(RangeNode);
