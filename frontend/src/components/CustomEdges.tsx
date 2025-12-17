import React from 'react';
import { EdgeProps, getSmoothStepPath } from 'reactflow';

/**
 * Genera un path SVG con forma de serpentina/ondulante
 * Usa curvas de Bezier para crear el efecto sinusoidal
 */
function getSerpentinePath(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    waves: number = 3,
    amplitude: number = 12
): string {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;

    // Calcular el ángulo de la línea
    const angle = Math.atan2(dy, dx);

    // Vector perpendicular normalizado
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    // Número de segmentos (cada onda tiene 2 segmentos)
    const segments = waves * 2;

    // Comenzar el path
    let path = `M ${sourceX},${sourceY}`;

    for (let i = 0; i < segments; i++) {
        const t1 = (i + 0.5) / segments;
        const t2 = (i + 1) / segments;

        // Puntos a lo largo de la línea recta
        const midX = sourceX + dx * t1;
        const midY = sourceY + dy * t1;
        const endX = sourceX + dx * t2;
        const endY = sourceY + dy * t2;

        // Alternar la dirección de la ondulación
        const direction = (i % 2 === 0) ? 1 : -1;

        // Punto de control para la curva de Bezier
        const ctrlX = midX + perpX * amplitude * direction;
        const ctrlY = midY + perpY * amplitude * direction;

        // Curva cuadrática de Bezier
        path += ` Q ${ctrlX},${ctrlY} ${endX},${endY}`;
    }

    return path;
}

/**
 * Edge con estilo serpentina para dependencias de condición
 */
export const SerpentineEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    markerEnd,
}) => {
    // Generar path serpentina directamente entre source y target
    const serpentinePath = getSerpentinePath(sourceX, sourceY, targetX, targetY, 4, 10);

    return (
        <>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={serpentinePath}
                markerEnd={markerEnd}
                fill="none"
            />
        </>
    );
};

/**
 * Edge combinado para dependencias de "ambas" (fórmula + condición)
 * Muestra dos líneas: una sólida y una serpentina
 */
export const CombinedEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}) => {
    // Path base para línea sólida
    const [smoothPath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Path serpentina con offset
    const serpentinePath = getSerpentinePath(sourceX, sourceY, targetX, targetY, 4, 8);

    return (
        <>
            {/* Línea sólida principal */}
            <path
                style={{
                    ...style,
                    strokeWidth: 2.5,
                }}
                className="react-flow__edge-path"
                d={smoothPath}
                fill="none"
            />
            {/* Línea serpentina superpuesta */}
            <path
                id={id}
                style={{
                    ...style,
                    strokeWidth: 2.5,
                    strokeOpacity: 0.6,
                }}
                className="react-flow__edge-path"
                d={serpentinePath}
                markerEnd={markerEnd}
                fill="none"
            />
        </>
    );
};

/**
 * Tipos de edges personalizados para usar en ReactFlow
 */
export const customEdgeTypes = {
    serpentine: SerpentineEdge,
    combined: CombinedEdge,
};
