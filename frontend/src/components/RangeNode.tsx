import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { RangoConceptos } from '../types';
import { hashToBorderColor, truncate } from '../utils';

interface RangeNodeData {
    rango: RangoConceptos;
    onExpandConcepto?: (codigo: string) => void;
}

/**
 * Componente de nodo para visualizar un rango de conceptos (SC, ST, etc.)
 * Muestra lista de conceptos con botón para expandir cada uno.
 */
const RangeNode: React.FC<NodeProps<RangeNodeData>> = ({ data }) => {
    const { rango, onExpandConcepto } = data;

    const borderColor = hashToBorderColor(rango.id);

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
                <div>{rango.tipo}: {rango.codigoInicio} - {rango.codigoFin}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                    {rango.descripcion}
                </div>
            </div>

            {/* Lista de conceptos */}
            <div className="range-node-list nodrag">
                {rango.conceptos.map((concepto) => (
                    <div
                        key={concepto.codigo}
                        className="range-node-item"
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
                            {truncate(concepto.descripcion, 25)}
                        </span>
                    </div>
                ))}

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
