import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    NodeTypes,
    EdgeTypes,
    useReactFlow,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { customEdgeTypes } from './components/CustomEdges';

import ConceptNode from './components/ConceptNode';
import RangeNode from './components/RangeNode';
import CommentNode from './components/CommentNode';
import { conceptoApi, liquidacionApi } from './api';
import { pantallaStorage, generateId, calculateNodePosition, hashToColor, findAvailablePosition } from './utils';
import type { Concepto, FiltrosLiquidacion, Liquidacion, PantallaGuardada, Variable, RangoConceptos, DependencySource } from './types';

// Tipos de nodos personalizados
const nodeTypes: NodeTypes = {
    concept: ConceptNode,
    range: RangeNode,
    comment: CommentNode,
};

// Tipos de edges personalizados
const edgeTypes: EdgeTypes = {
    ...customEdgeTypes,
};

// Colores para edges según estado de liquidación
const EDGE_COLOR_WITH_VALUE = '#16a34a';  // Verde - tiene valor
const EDGE_COLOR_NO_VALUE = '#9ca3af';    // Gris - sin valor

/**
 * Determina el color del edge según el estado de liquidación
 * @param defaultColor Color por defecto (basado en el concepto)
 * @param liquidacionCargada Si hay una liquidación cargada
 * @param tieneValor Si el concepto origen tiene valor calculado o informado
 */
const getEdgeColor = (
    defaultColor: string,
    liquidacionCargada: boolean,
    tieneValor: boolean
): string => {
    if (!liquidacionCargada) {
        return defaultColor;
    }
    return tieneValor ? EDGE_COLOR_WITH_VALUE : EDGE_COLOR_NO_VALUE;
};

/**
 * Obtiene la configuración del edge según el origen de la dependencia
 * Retorna tanto el estilo como el tipo de edge a usar
 * @param source Tipo de dependencia (formula, condicion, ambas)
 * @param color Color base del edge
 * @param liquidacionCargada Si hay liquidación cargada
 * @param tieneValor Si el concepto origen tiene valor
 */
const getEdgeConfig = (
    source: DependencySource,
    color: string,
    liquidacionCargada: boolean = false,
    tieneValor: boolean = false
): { style: React.CSSProperties; type: string } => {
    const finalColor = getEdgeColor(color, liquidacionCargada, tieneValor);

    switch (source) {
        case 'formula':
            return {
                style: { stroke: finalColor, strokeWidth: 2.5 },
                type: 'smoothstep'
            };
        case 'condicion':
            return {
                style: { stroke: finalColor, strokeWidth: 2.5 },
                type: 'serpentine'
            };
        case 'ambas':
            return {
                style: { stroke: finalColor, strokeWidth: 3.5 },
                type: 'combined'
            };
        default:
            return {
                style: { stroke: finalColor, strokeWidth: 2.5 },
                type: 'smoothstep'
            };
    }
};

/**
 * Componente principal del visualizador
 */
const FlowCanvas: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView, getNode, setCenter } = useReactFlow();

    // Estado de búsqueda y conceptos
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Concepto[]>([]);
    const [conceptoRaiz, setConceptoRaiz] = useState<string>('');
    const [conceptosCargados, setConceptosCargados] = useState<Map<string, Concepto>>(new Map());

    // Estado de carga
    const [isLoading, setIsLoading] = useState(false);

    // Referencia para mantener la función expandirConcepto actualizada
    const expandirConceptoRef = useRef<(codigo: string, direccion: 'dependencias' | 'dependientes') => void>();

    // Referencia para manejar clicks en variables
    const onVariableClickRef = useRef<(variable: Variable, sourceNodeId: string, depSource: DependencySource) => void>();

    // Referencia para manejar expansión de conceptos desde nodos de rango
    const onExpandConceptoFromRangeRef = useRef<(codigo: string, rangoNodeId: string) => void>();

    // Referencia para eliminar un concepto del canvas
    const onDeleteConceptoRef = useRef<(codigo: string) => void>();

    // Estado de liquidación
    const [filtrosLiq, setFiltrosLiq] = useState<FiltrosLiquidacion>({
        anio: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
        tipo: '0',
    });
    const [liquidaciones, setLiquidaciones] = useState<Map<string, Liquidacion>>(new Map());

    // Pantallas guardadas
    const [pantallasGuardadas, setPantallasGuardadas] = useState<PantallaGuardada[]>([]);
    const [nombrePantalla, setNombrePantalla] = useState('');

    // Cargar datos iniciales
    useEffect(() => {
        setPantallasGuardadas(pantallaStorage.getAll());
    }, []);

    // Buscar conceptos
    useEffect(() => {
        if (searchQuery.length >= 2) {
            conceptoApi.buscar(searchQuery)
                .then(setSearchResults)
                .catch(console.error);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    // Agregar concepto al canvas
    const agregarConcepto = useCallback(async (codigo: string, position?: { x: number; y: number }) => {
        // Si ya está cargado, solo hacer fitView
        if (conceptosCargados.has(codigo)) {
            const node = getNode(`concept-${codigo}`);
            if (node) {
                return;
            }
            return;
        }

        setIsLoading(true);
        try {
            const concepto = await conceptoApi.getById(codigo);

            // Agregar importe si hay liquidaciones cargadas
            if (liquidaciones.size > 0) {
                const liq = liquidaciones.get(codigo);
                concepto.liquidacionCargada = true;
                concepto.importeLiquidacion = liq?.importeCalculado ?? null;
                concepto.valorInformado = liq?.valorInformado ?? null;
            }

            // Guardar en caché
            setConceptosCargados(prev => new Map(prev).set(codigo, concepto));

            // Calcular posición: si no se proporciona, encontrar un espacio vacío
            const finalPosition = position || findAvailablePosition(
                nodes.map(n => n.position),
                { x: 0, y: 0 }
            );

            // Crear nodo
            const newNode: Node = {
                id: `concept-${codigo}`,
                type: 'concept',
                position: finalPosition,
                data: {
                    concepto,
                    onExpand: (codigo: string, direccion: 'dependencias' | 'dependientes') => {
                        expandirConceptoRef.current?.(codigo, direccion);
                    },
                    onVariableClick: (variable: Variable, depSource: DependencySource) => {
                        onVariableClickRef.current?.(variable, `concept-${codigo}`, depSource);
                    },
                    onDelete: (codigo: string) => {
                        onDeleteConceptoRef.current?.(codigo);
                    },
                },
            };

            setNodes(prev => [...prev, newNode]);

            // Si es el primer concepto, marcarlo como raíz
            if (!conceptoRaiz) {
                setConceptoRaiz(codigo);
                setNombrePantalla(`Concepto ${codigo}`);
            }

        } catch (error) {
            console.error('Error cargando concepto:', error);
        } finally {
            setIsLoading(false);
        }
    }, [conceptosCargados, liquidaciones, conceptoRaiz, getNode, setNodes, nodes]);

    // Expandir dependencias o dependientes de un concepto
    const expandirConcepto = useCallback(async (
        codigo: string,
        direccion: 'dependencias' | 'dependientes'
    ) => {
        const concepto = conceptosCargados.get(codigo);
        if (!concepto) return;

        const codigos = direccion === 'dependencias'
            ? concepto.dependencias || []
            : concepto.dependientes || [];

        if (codigos.length === 0) return;

        const sourceNode = getNode(`concept-${codigo}`);
        if (!sourceNode) return;

        setIsLoading(true);
        try {
            // Cargar cada concepto y crear edges
            for (let i = 0; i < codigos.length; i++) {
                const targetCodigo = codigos[i];

                // Calcular posición
                const initialPosition = calculateNodePosition(
                    sourceNode.position,
                    direccion === 'dependencias' ? 'up' : 'down',
                    i,
                    codigos.length
                );

                const position = findAvailablePosition(
                    nodes.map(n => n.position),
                    initialPosition
                );

                await agregarConcepto(targetCodigo, position);

                // Crear edge
                const edgeId = direccion === 'dependencias'
                    ? `edge-${targetCodigo}-${codigo}`
                    : `edge-${codigo}-${targetCodigo}`;

                const newEdge: Edge = {
                    id: edgeId,
                    source: direccion === 'dependencias' ? `concept-${targetCodigo}` : `concept-${codigo}`,
                    target: direccion === 'dependencias' ? `concept-${codigo}` : `concept-${targetCodigo}`,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: hashToColor(targetCodigo) },
                };

                setEdges(prev => {
                    if (prev.find(e => e.id === edgeId)) return prev;
                    return [...prev, newEdge];
                });
            }
        } finally {
            setIsLoading(false);
        }

    }, [conceptosCargados, getNode, agregarConcepto, setEdges, nodes]);

    // Actualizar la referencia cuando expandirConcepto cambia
    useEffect(() => {
        expandirConceptoRef.current = expandirConcepto;
    }, [expandirConcepto]);

    // Eliminar un concepto del canvas (solo el nodo, no las dependencias)
    const eliminarConcepto = useCallback((codigo: string) => {
        const nodeId = `concept-${codigo}`;
        setNodes(prev => prev.filter(n => n.id !== nodeId));
    }, [setNodes]);

    // Actualizar la referencia cuando eliminarConcepto cambia
    useEffect(() => {
        onDeleteConceptoRef.current = eliminarConcepto;
    }, [eliminarConcepto]);

    // Eliminar un rango del canvas
    const eliminarRango = useCallback((rangoNodeId: string) => {
        setNodes(prev => prev.filter(n => n.id !== rangoNodeId));
    }, [setNodes]);

    // Manejar click en una variable de la fórmula
    const manejarClickVariable = useCallback(async (variable: Variable, sourceNodeId: string, depSource: DependencySource) => {
        const sourceNode = getNode(sourceNodeId);
        if (!sourceNode) return;

        setIsLoading(true);
        try {
            if (variable.tipo === 'SINGLE_CONCEPT' && variable.conceptoReferenciado) {
                const conceptNodeId = `concept-${variable.conceptoReferenciado}`;
                const existingNode = getNode(conceptNodeId);

                // Si el nodo ya existe, centrar la vista en él
                if (existingNode) {
                    // Centrar con animación suave
                    const nodeWidth = 320; // Ancho aproximado del nodo
                    const nodeHeight = 200; // Alto aproximado del nodo
                    setCenter(
                        existingNode.position.x + nodeWidth / 2,
                        existingNode.position.y + nodeHeight / 2,
                        { duration: 500, zoom: 1 }
                    );
                } else {
                    // Para variables que referencian un solo concepto (CALC, INFO, etc.)
                    const initialPos = calculateNodePosition(sourceNode.position, 'up', 0, 1);
                    const position = findAvailablePosition(nodes.map(n => n.position), initialPos);
                    await agregarConcepto(variable.conceptoReferenciado, position);
                }

                // Crear edge desde el concepto referenciado hacia el concepto actual (siempre)
                const edgeId = `edge-${variable.conceptoReferenciado}-${sourceNode.data.concepto.codigo}`;

                // Obtener información de liquidación del concepto referenciado (source del edge)
                const liqCargada = liquidaciones.size > 0;
                const liqConcepto = liquidaciones.get(variable.conceptoReferenciado);
                const tieneValor = !!(liqConcepto?.importeCalculado || liqConcepto?.valorInformado);

                const edgeConfig = getEdgeConfig(depSource, variable.color, liqCargada, tieneValor);
                const newEdge: Edge = {
                    id: edgeId,
                    source: conceptNodeId,
                    target: sourceNodeId,
                    type: edgeConfig.type,
                    animated: true,
                    style: edgeConfig.style,
                    data: { depSource, conceptoOrigen: variable.conceptoReferenciado },
                };

                setEdges(prev => {
                    const existingEdge = prev.find(e => e.id === edgeId);
                    if (existingEdge) {
                        // Si ya existe y viene de otra fuente, actualizar a "ambas"
                        if (existingEdge.data?.depSource && existingEdge.data.depSource !== depSource) {
                            const ambasConfig = getEdgeConfig('ambas', variable.color, liqCargada, tieneValor);
                            return prev.map(e => e.id === edgeId ? {
                                ...e,
                                type: ambasConfig.type,
                                style: ambasConfig.style,
                                data: { ...e.data, depSource: 'ambas' },
                            } : e);
                        }
                        return prev;
                    }
                    return [...prev, newEdge];
                });

            } else if (variable.tipo === 'RANGE' && variable.rangoInicio && variable.rangoFin) {
                // Para variables de rango (SC, ST, etc.) - crear nodo de rango
                try {
                    const rango: RangoConceptos = await conceptoApi.getRango(
                        variable.rangoInicio,
                        variable.rangoFin,
                        variable.prefijo
                    );

                    const rangoNodeId = `range-${variable.nombre}`;

                    // Si ya existe el nodo de rango, centrar la vista y actualizar edge si viene de otra fuente
                    if (getNode(rangoNodeId)) {
                        // Centrar la vista en el nodo de rango existente
                        const existingRangeNode = getNode(rangoNodeId)!;
                        const nodeWidth = 300;
                        const nodeHeight = 150;
                        setCenter(
                            existingRangeNode.position.x + nodeWidth / 2,
                            existingRangeNode.position.y + nodeHeight / 2,
                            { duration: 500, zoom: 1 }
                        );

                        const edgeId = `edge-${rangoNodeId}-${sourceNode.data.concepto.codigo}`;
                        setEdges(prev => {
                            const existingEdge = prev.find(e => e.id === edgeId);
                            if (existingEdge && existingEdge.data?.depSource && existingEdge.data.depSource !== depSource) {
                                // Para rangos, mantener el color por defecto (no tenemos un concepto específico)
                                const ambasConfig = getEdgeConfig('ambas', variable.color, liquidaciones.size > 0, false);
                                return prev.map(e => e.id === edgeId ? {
                                    ...e,
                                    type: ambasConfig.type,
                                    style: ambasConfig.style,
                                    data: { ...e.data, depSource: 'ambas' },
                                } : e);
                            }
                            return prev;
                        });
                        return;
                    }

                    const initialPos = calculateNodePosition(sourceNode.position, 'up', 0, 1);
                    const position = findAvailablePosition(nodes.map(n => n.position), initialPos);

                    const rangoNode: Node = {
                        id: rangoNodeId,
                        type: 'range',
                        position,
                        data: {
                            rango,
                            onExpandConcepto: (codigo: string) => {
                                onExpandConceptoFromRangeRef.current?.(codigo, rangoNodeId);
                            },
                            onDelete: (rangoId: string) => {
                                eliminarRango(rangoId);
                            },
                            liquidaciones,
                            liquidacionCargada: liquidaciones.size > 0,
                        },
                    };

                    setNodes(prev => [...prev, rangoNode]);

                    // Crear edge desde el rango hacia el concepto actual
                    const edgeId = `edge-${rangoNodeId}-${sourceNode.data.concepto.codigo}`;
                    // Para rangos, el color depende de si la suma de importes es > 0
                    const liqCargadaRango = liquidaciones.size > 0;
                    const sumaRango = rango.conceptos.reduce((sum, c) => {
                        const liq = liquidaciones.get(c.codigo);
                        return sum + (liq?.importeCalculado || 0) + (liq?.valorInformado || 0);
                    }, 0);
                    const rangeEdgeConfig = getEdgeConfig(depSource, variable.color, liqCargadaRango, sumaRango > 0);
                    const newEdge: Edge = {
                        id: edgeId,
                        source: rangoNodeId,
                        target: sourceNodeId,
                        type: rangeEdgeConfig.type,
                        animated: true,
                        style: rangeEdgeConfig.style,
                        data: { depSource, rangoId: rangoNodeId },
                    };

                    setEdges(prev => {
                        if (prev.find(e => e.id === edgeId)) return prev;
                        return [...prev, newEdge];
                    });

                } catch (error) {
                    console.error('Error cargando rango:', error);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [getNode, agregarConcepto, setEdges, setNodes, nodes]);

    // Actualizar la referencia cuando manejarClickVariable cambia
    useEffect(() => {
        onVariableClickRef.current = manejarClickVariable;
    }, [manejarClickVariable]);

    // Función para expandir concepto desde nodo de rango (usa nodes actuales)
    const expandirConceptoDesdeRango = useCallback(async (codigo: string, rangoNodeId: string) => {
        const rangeNode = getNode(rangoNodeId);
        if (!rangeNode) return;

        const conceptNodeId = `concept-${codigo}`;
        const existingNode = getNode(conceptNodeId);

        // Si el concepto ya existe, centrar la vista en él
        if (existingNode) {
            const nodeWidth = 320;
            const nodeHeight = 200;
            setCenter(
                existingNode.position.x + nodeWidth / 2,
                existingNode.position.y + nodeHeight / 2,
                { duration: 500, zoom: 1 }
            );
        } else {
            // Si no existe, crear el nodo
            const initialPos = calculateNodePosition(rangeNode.position, 'up', 0, 1);
            const pos = findAvailablePosition(nodes.map(n => n.position), initialPos);
            await agregarConcepto(codigo, pos);
        }

        // Crear edge desde el concepto hacia el rango
        const edgeToRange = `edge-${codigo}-${rangoNodeId}`;

        // Obtener información de liquidación del concepto
        const liqCargada = liquidaciones.size > 0;
        const liq = liquidaciones.get(codigo);
        const tieneValor = !!(liq?.importeCalculado || liq?.valorInformado);
        const edgeConfig = getEdgeConfig('formula', hashToColor(codigo), liqCargada, tieneValor);

        setEdges(prev => {
            if (prev.find(e => e.id === edgeToRange)) return prev;
            return [...prev, {
                id: edgeToRange,
                source: `concept-${codigo}`,
                target: rangoNodeId,
                type: edgeConfig.type,
                animated: true,
                style: edgeConfig.style,
                data: { conceptoOrigen: codigo },
            }];
        });
    }, [getNode, nodes, agregarConcepto, setEdges, liquidaciones, setCenter]);

    // Actualizar la referencia cuando expandirConceptoDesdeRango cambia
    useEffect(() => {
        onExpandConceptoFromRangeRef.current = expandirConceptoDesdeRango;
    }, [expandirConceptoDesdeRango]);

    // Cargar liquidaciones
    const cargarLiquidaciones = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await liquidacionApi.getByPeriodo(filtrosLiq);
            const map = new Map(Object.entries(data));
            setLiquidaciones(map);

            // Actualizar importes en conceptos y rangos ya cargados
            setNodes(prev => prev.map(node => {
                if (node.type === 'concept' && node.data.concepto) {
                    const liq = map.get(node.data.concepto.codigo);
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            concepto: {
                                ...node.data.concepto,
                                liquidacionCargada: true,
                                importeLiquidacion: liq?.importeCalculado ?? null,
                                valorInformado: liq?.valorInformado ?? null,
                            },
                        },
                    };
                }
                if (node.type === 'range' && node.data.rango) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            liquidaciones: map,
                            liquidacionCargada: true,
                        },
                    };
                }
                return node;
            }));

            // Actualizar colores de edges según valores de liquidación
            setEdges(prev => prev.map(edge => {
                // Obtener el código del concepto origen del edge
                let conceptoOrigen: string | undefined;

                if (edge.source.startsWith('concept-')) {
                    conceptoOrigen = edge.source.replace('concept-', '');
                } else if (edge.data?.conceptoOrigen) {
                    conceptoOrigen = edge.data.conceptoOrigen;
                }

                if (conceptoOrigen) {
                    const liq = map.get(conceptoOrigen);
                    const tieneValor = !!(liq?.importeCalculado || liq?.valorInformado);
                    const depSource = edge.data?.depSource || 'formula';

                    // Obtener el color original (lo recalculamos basado en el concepto)
                    const colorOriginal = hashToColor(conceptoOrigen);
                    const newConfig = getEdgeConfig(depSource, colorOriginal, true, tieneValor);

                    return {
                        ...edge,
                        style: newConfig.style,
                    };
                }

                // Para edges de rangos, calcular la suma de importes del rango
                if (edge.source.startsWith('range-')) {
                    // Buscar el nodo de rango correspondiente para obtener sus conceptos
                    const rangeNodeId = edge.source;
                    const rangeNode = nodes.find(n => n.id === rangeNodeId);

                    let sumaRango = 0;
                    if (rangeNode?.data?.rango?.conceptos) {
                        sumaRango = rangeNode.data.rango.conceptos.reduce((sum: number, c: { codigo: string }) => {
                            const liq = map.get(c.codigo);
                            return sum + (liq?.importeCalculado || 0) + (liq?.valorInformado || 0);
                        }, 0);
                    }

                    const depSource = edge.data?.depSource || 'formula';
                    const colorOriginal = (edge.style as React.CSSProperties)?.stroke as string || '#666';
                    const newConfig = getEdgeConfig(depSource, colorOriginal, true, sumaRango > 0);

                    return {
                        ...edge,
                        style: newConfig.style,
                    };
                }

                return edge;
            }));
        } catch (error) {
            console.error('Error cargando liquidaciones:', error);
        } finally {
            setIsLoading(false);
        }
    }, [filtrosLiq, setNodes, setEdges, nodes]);

    // Guardar pantalla
    const guardarPantalla = useCallback(() => {
        // Convertir Map de liquidaciones a objeto para serialización
        const liquidacionesObj: Record<string, Liquidacion> = {};
        liquidaciones.forEach((liq, codigo) => {
            liquidacionesObj[codigo] = liq;
        });

        const pantalla: PantallaGuardada = {
            id: generateId(),
            nombre: nombrePantalla || `Concepto ${conceptoRaiz}`,
            conceptoRaiz,
            fechaCreacion: new Date().toISOString(),
            nodos: nodes.map(n => ({
                id: n.id,
                type: n.type || 'concept',
                data: {
                    codigo: n.data?.concepto?.codigo,
                    rangoId: n.data?.rango?.id,
                    rango: n.data?.rango,
                    comentarioTexto: n.type === 'comment' ? n.data?.texto : undefined,
                },
                position: n.position,
            })),
            aristas: edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                type: e.type,
                style: e.style,
                data: e.data,
            })),
            viewport: { x: 0, y: 0, zoom: 1 },
            filtrosLiquidacion: filtrosLiq,
            liquidacionCargada: liquidaciones.size > 0,
            liquidaciones: liquidaciones.size > 0 ? liquidacionesObj : undefined,
        };

        pantallaStorage.save(pantalla);
        setPantallasGuardadas(pantallaStorage.getAll());
        alert('Pantalla guardada!');
    }, [nombrePantalla, conceptoRaiz, nodes, edges, filtrosLiq, liquidaciones]);

    // Cargar pantalla guardada
    const cargarPantalla = useCallback(async (id: string) => {
        const pantalla = pantallaStorage.getById(id);
        if (!pantalla) return;

        setIsLoading(true);
        // Limpiar canvas actual
        setNodes([]);
        setEdges([]);
        setConceptosCargados(new Map());

        // Cargar conceptos de la pantalla
        const codigosConceptos = pantalla.nodos
            .filter(n => n.type === 'concept')
            .map(n => n.data.codigo)
            .filter((c): c is string => !!c);

        try {
            const conceptos = await conceptoApi.getBatch(codigosConceptos);
            const conceptosMap = new Map<string, Concepto>();
            conceptos.forEach(c => conceptosMap.set(c.codigo, c));
            setConceptosCargados(conceptosMap);

            // Restaurar liquidaciones como Map
            const restoredLiquidaciones = new Map<string, Liquidacion>();
            if (pantalla.liquidaciones) {
                Object.entries(pantalla.liquidaciones).forEach(([codigo, liq]) => {
                    restoredLiquidaciones.set(codigo, liq);
                });
            }

            // Aplicar datos de liquidación a los conceptos
            if (pantalla.liquidacionCargada) {
                conceptosMap.forEach((concepto, codigo) => {
                    const liq = restoredLiquidaciones.get(codigo);
                    // Marcar como cargada para todos los conceptos (para mostrar "-" si no hay valor)
                    concepto.liquidacionCargada = true;
                    if (liq) {
                        concepto.importeLiquidacion = liq.importeCalculado;
                        concepto.valorInformado = liq.valorInformado;
                    } else {
                        concepto.importeLiquidacion = null;
                        concepto.valorInformado = null;
                    }
                });
            }

            // Recrear nodos de concepto
            const conceptNodes: Node[] = pantalla.nodos
                .filter(n => n.type === 'concept')
                .map(n => ({
                    id: n.id,
                    type: n.type,
                    position: n.position,
                    data: {
                        concepto: n.data.codigo ? conceptosMap.get(n.data.codigo) : undefined,
                        onExpand: (codigo: string, direccion: 'dependencias' | 'dependientes') => {
                            expandirConceptoRef.current?.(codigo, direccion);
                        },
                        onVariableClick: (variable: Variable, depSource: DependencySource) => {
                            onVariableClickRef.current?.(variable, n.id, depSource);
                        },
                        onDelete: (codigo: string) => {
                            onDeleteConceptoRef.current?.(codigo);
                        },
                    },
                }));

            // Recrear nodos de rango con sus datos guardados
            const rangeNodes: Node[] = pantalla.nodos
                .filter(n => n.type === 'range' && n.data.rango)
                .map(n => ({
                    id: n.id,
                    type: n.type,
                    position: n.position,
                    data: {
                        rango: n.data.rango,
                        onExpandConcepto: (codigo: string) => {
                            onExpandConceptoFromRangeRef.current?.(codigo, n.id);
                        },
                        onDelete: (rangoId: string) => {
                            eliminarRango(rangoId);
                        },
                        liquidaciones: restoredLiquidaciones,
                        liquidacionCargada: pantalla.liquidacionCargada || false,
                    },
                }));

            // Recrear nodos de comentario
            const commentNodes: Node[] = pantalla.nodos
                .filter(n => n.type === 'comment')
                .map(n => ({
                    id: n.id,
                    type: n.type,
                    position: n.position,
                    data: {
                        texto: n.data.comentarioTexto || '',
                        onTextoChange: (nodeId: string, nuevoTexto: string) => {
                            actualizarComentarioRef.current?.(nodeId, nuevoTexto);
                        },
                        onDelete: (nodeId: string) => {
                            eliminarComentarioRef.current?.(nodeId);
                        },
                        onCreated: (nodeId: string) => {
                            marcarComentarioCreadoRef.current?.(nodeId);
                        },
                    },
                }));

            const newNodes: Node[] = [...conceptNodes, ...rangeNodes, ...commentNodes];

            // Recrear edges con sus estilos guardados
            const newEdges: Edge[] = pantalla.aristas.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                type: e.type || 'smoothstep',
                animated: true,
                style: e.style,
                data: e.data,
            }));

            setNodes(newNodes);
            setEdges(newEdges);
            setConceptoRaiz(pantalla.conceptoRaiz);
            setNombrePantalla(pantalla.nombre);

            // Restaurar filtros de liquidación
            if (pantalla.filtrosLiquidacion) {
                setFiltrosLiq(pantalla.filtrosLiquidacion);
            }

            // Restaurar datos de liquidación al state global
            if (restoredLiquidaciones.size > 0) {
                setLiquidaciones(restoredLiquidaciones);
            }

            setTimeout(() => fitView({ duration: 500 }), 200);
        } catch (error) {
            console.error('Error cargando pantalla:', error);
        } finally {
            setIsLoading(false);
        }
    }, [expandirConcepto, setNodes, setEdges, fitView, eliminarRango, setLiquidaciones]);

    // Eliminar pantalla guardada
    const eliminarPantalla = useCallback((id: string) => {
        if (confirm('¿Eliminar esta pantalla guardada?')) {
            pantallaStorage.delete(id);
            setPantallasGuardadas(pantallaStorage.getAll());
        }
    }, []);

    // Limpiar canvas
    const limpiarCanvas = useCallback(() => {
        setNodes([]);
        setEdges([]);
        setConceptosCargados(new Map());
        setConceptoRaiz('');
        setNombrePantalla('');
    }, [setNodes, setEdges]);

    // Agregar comentario al canvas (sin modal, edición inline inmediata)
    const agregarComentario = useCallback(() => {
        const commentId = `comment-${generateId()}`;
        const position = findAvailablePosition(
            nodes.map(n => n.position),
            { x: 100, y: 100 }
        );

        const newNode: Node = {
            id: commentId,
            type: 'comment',
            position,
            data: {
                texto: '',
                isNew: true,
                onTextoChange: (nodeId: string, nuevoTexto: string) => {
                    actualizarComentarioRef.current?.(nodeId, nuevoTexto);
                },
                onDelete: (nodeId: string) => {
                    eliminarComentarioRef.current?.(nodeId);
                },
                onCreated: (nodeId: string) => {
                    marcarComentarioCreadoRef.current?.(nodeId);
                },
            },
        };

        setNodes(prev => [...prev, newNode]);
    }, [nodes, setNodes]);

    // Actualizar texto de un comentario
    const actualizarComentario = useCallback((nodeId: string, nuevoTexto: string) => {
        setNodes(prev => prev.map(node => {
            if (node.id === nodeId && node.type === 'comment') {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        texto: nuevoTexto,
                    },
                };
            }
            return node;
        }));
    }, [setNodes]);

    // Referencia para actualizar comentarios
    const actualizarComentarioRef = useRef<(nodeId: string, nuevoTexto: string) => void>();
    useEffect(() => {
        actualizarComentarioRef.current = actualizarComentario;
    }, [actualizarComentario]);

    // Marcar comentario como ya creado (quitar flag isNew)
    const marcarComentarioCreado = useCallback((nodeId: string) => {
        setNodes(prev => prev.map(node => {
            if (node.id === nodeId && node.type === 'comment') {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        isNew: false,
                    },
                };
            }
            return node;
        }));
    }, [setNodes]);

    // Referencia para marcar comentarios como creados
    const marcarComentarioCreadoRef = useRef<(nodeId: string) => void>();
    useEffect(() => {
        marcarComentarioCreadoRef.current = marcarComentarioCreado;
    }, [marcarComentarioCreado]);

    // Eliminar comentario del canvas
    const eliminarComentario = useCallback((nodeId: string) => {
        setNodes(prev => prev.filter(n => n.id !== nodeId));
        // También eliminar edges conectados a este comentario
        setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    }, [setNodes, setEdges]);

    // Referencia para eliminar comentarios
    const eliminarComentarioRef = useRef<(nodeId: string) => void>();
    useEffect(() => {
        eliminarComentarioRef.current = eliminarComentario;
    }, [eliminarComentario]);

    return (
        <div className="app-container">
            {/* Header */}
            <header className="header">
                <h1 className="header-title">📊 Visualizador de Fórmulas RRHH</h1>
                <div className="header-actions">
                    <input
                        type="text"
                        className="search-input"
                        style={{ width: '200px' }}
                        value={nombrePantalla}
                        onChange={(e) => setNombrePantalla(e.target.value)}
                        placeholder="Nombre de pantalla"
                    />
                    <button className="btn btn-primary" onClick={guardarPantalla}>
                        💾 Guardar
                    </button>
                    <button className="btn btn-secondary" onClick={limpiarCanvas}>
                        🗑️ Limpiar
                    </button>
                    <button className="btn btn-comment" onClick={agregarComentario}>
                        📝 Comentario
                    </button>
                </div>
            </header>

            <div className="main-content">
                {/* Sidebar */}
                <aside className="sidebar">
                    {/* Búsqueda */}
                    <section className="sidebar-section">
                        <h3 className="sidebar-section-title">Buscar Concepto</h3>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Código o descripción..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchResults.length > 0 && (
                            <ul className="concepto-list" style={{ marginTop: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                                {searchResults.map((c) => (
                                    <li
                                        key={c.codigo}
                                        className="concepto-list-item"
                                        onClick={async () => {
                                            await agregarConcepto(c.codigo);
                                            setSearchQuery('');
                                            // Centrar la vista en el nuevo concepto
                                            setTimeout(() => {
                                                const nodeId = `concept-${c.codigo}`;
                                                fitView({ nodes: [{ id: nodeId }], duration: 500, padding: 0.5 });
                                            }, 100);
                                        }}
                                    >
                                        <div className="concepto-list-item-code">{c.codigo}</div>
                                        <div className="concepto-list-item-desc">{c.descripcion}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Filtros de liquidación */}
                    <section className="sidebar-section">
                        <h3 className="sidebar-section-title">Liquidación</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Año</label>
                                <select
                                    className="select-control"
                                    value={filtrosLiq.anio}
                                    onChange={(e) => setFiltrosLiq(f => ({ ...f, anio: parseInt(e.target.value) }))}
                                >
                                    {[...Array(5)].map((_, i) => {
                                        const y = new Date().getFullYear() - i;
                                        return <option key={y} value={y}>{y}</option>;
                                    })}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mes</label>
                                <select
                                    className="select-control"
                                    value={filtrosLiq.mes}
                                    onChange={(e) => setFiltrosLiq(f => ({ ...f, mes: parseInt(e.target.value) }))}
                                >
                                    {[...Array(12)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Tipo</label>
                                <select
                                    className="select-control"
                                    value={filtrosLiq.tipo}
                                    onChange={(e) => setFiltrosLiq(f => ({ ...f, tipo: e.target.value }))}
                                >
                                    {['0', '4', '7'].map((val) => (
                                        <option key={val} value={val}>{val}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Legajo</label>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder=""
                                    value={filtrosLiq.legajo || ''}
                                    onChange={(e) => setFiltrosLiq(f => ({ ...f, legajo: e.target.value || undefined }))}
                                />
                            </div>
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            onClick={cargarLiquidaciones}
                        >
                            Cargar Importes
                        </button>
                    </section>

                    {/* Pantallas guardadas */}
                    <section className="sidebar-section" style={{ borderBottom: 'none' }}>
                        <h3 className="sidebar-section-title">Pantallas Guardadas</h3>
                    </section>
                    <div className="sidebar-scroll">
                        {pantallasGuardadas.length === 0 ? (
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                No hay pantallas guardadas
                            </div>
                        ) : (
                            <ul className="saved-screens">
                                {pantallasGuardadas.map((p) => (
                                    <li key={p.id} className="saved-screen-item">
                                        <div onClick={() => cargarPantalla(p.id)}>
                                            <div className="saved-screen-name">{p.nombre}</div>
                                            <div className="saved-screen-date">
                                                {new Date(p.fechaCreacion).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-ghost btn-icon btn-sm saved-screen-delete"
                                            onClick={() => eliminarPantalla(p.id)}
                                        >
                                            ✕
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </aside>

                {/* Canvas */}
                <div className="canvas-container">
                    {/* Loading overlay */}
                    <div className={`loading-overlay ${isLoading ? 'visible' : ''}`}>
                        <div className="loading-spinner"></div>
                    </div>

                    {nodes.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <h2 className="empty-state-title">Sin conceptos</h2>
                            <p className="empty-state-desc">
                                Busca un concepto en el panel de la izquierda para comenzar a explorar las fórmulas y sus dependencias.
                            </p>
                        </div>
                    ) : (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            fitView
                            minZoom={0.1}
                            maxZoom={2}
                            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                        >
                            <Controls />
                            <MiniMap
                                nodeColor={(node) => node.data?.concepto?.color || '#334155'}
                                maskColor="rgba(15, 23, 42, 0.8)"
                            />
                            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#334155" />
                        </ReactFlow>
                    )}
                </div>
            </div>

        </div>
    );
};

/**
 * App con ReactFlowProvider
 */
const App: React.FC = () => {
    return (
        <ReactFlowProvider>
            <FlowCanvas />
        </ReactFlowProvider>
    );
};

export default App;
