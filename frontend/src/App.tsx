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
    useReactFlow,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import ConceptNode from './components/ConceptNode';
import RangeNode from './components/RangeNode';
import { conceptoApi, liquidacionApi } from './api';
import { pantallaStorage, generateId, calculateNodePosition, hashToColor, findAvailablePosition } from './utils';
import type { Concepto, FiltrosLiquidacion, Liquidacion, PantallaGuardada, Variable, RangoConceptos, DependencySource } from './types';

// Tipos de nodos personalizados
const nodeTypes: NodeTypes = {
    concept: ConceptNode,
    range: RangeNode,
};

/**
 * Obtiene el estilo del edge según el origen de la dependencia
 */
const getEdgeStyle = (source: DependencySource, color: string): React.CSSProperties => {
    switch (source) {
        case 'formula':
            return { stroke: color, strokeWidth: 2 };
        case 'condicion':
            return { stroke: color, strokeWidth: 2, strokeDasharray: '5,5' };
        case 'ambas':
            return { stroke: color, strokeWidth: 4 };
        default:
            return { stroke: color };
    }
};

/**
 * Componente principal del visualizador
 */
const FlowCanvas: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView, getNode } = useReactFlow();

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

    // Manejar click en una variable de la fórmula
    const manejarClickVariable = useCallback(async (variable: Variable, sourceNodeId: string, depSource: DependencySource) => {
        const sourceNode = getNode(sourceNodeId);
        if (!sourceNode) return;

        setIsLoading(true);
        try {
            if (variable.tipo === 'SINGLE_CONCEPT' && variable.conceptoReferenciado) {
                // Para variables que referencian un solo concepto (CALC, INFO, etc.)
                const initialPos = calculateNodePosition(sourceNode.position, 'up', 0, 1);
                const position = findAvailablePosition(nodes.map(n => n.position), initialPos);
                await agregarConcepto(variable.conceptoReferenciado, position);

                // Crear edge desde el concepto referenciado hacia el concepto actual
                const edgeId = `edge-${variable.conceptoReferenciado}-${sourceNode.data.concepto.codigo}`;
                const newEdge: Edge = {
                    id: edgeId,
                    source: `concept-${variable.conceptoReferenciado}`,
                    target: sourceNodeId,
                    type: 'smoothstep',
                    animated: true,
                    style: getEdgeStyle(depSource, variable.color),
                    data: { depSource },
                };

                setEdges(prev => {
                    const existingEdge = prev.find(e => e.id === edgeId);
                    if (existingEdge) {
                        // Si ya existe y viene de otra fuente, actualizar a "ambas"
                        if (existingEdge.data?.depSource && existingEdge.data.depSource !== depSource) {
                            return prev.map(e => e.id === edgeId ? {
                                ...e,
                                style: getEdgeStyle('ambas', variable.color),
                                data: { depSource: 'ambas' },
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

                    // Si ya existe el nodo de rango, solo actualizar edge si viene de otra fuente
                    if (getNode(rangoNodeId)) {
                        const edgeId = `edge-${rangoNodeId}-${sourceNode.data.concepto.codigo}`;
                        setEdges(prev => {
                            const existingEdge = prev.find(e => e.id === edgeId);
                            if (existingEdge && existingEdge.data?.depSource && existingEdge.data.depSource !== depSource) {
                                return prev.map(e => e.id === edgeId ? {
                                    ...e,
                                    style: getEdgeStyle('ambas', variable.color),
                                    data: { depSource: 'ambas' },
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
                            liquidaciones,
                            liquidacionCargada: liquidaciones.size > 0,
                        },
                    };

                    setNodes(prev => [...prev, rangoNode]);

                    // Crear edge desde el rango hacia el concepto actual
                    const edgeId = `edge-${rangoNodeId}-${sourceNode.data.concepto.codigo}`;
                    const newEdge: Edge = {
                        id: edgeId,
                        source: rangoNodeId,
                        target: sourceNodeId,
                        type: 'smoothstep',
                        animated: true,
                        style: getEdgeStyle(depSource, variable.color),
                        data: { depSource },
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
        if (rangeNode) {
            const initialPos = calculateNodePosition(rangeNode.position, 'up', 0, 1);
            const pos = findAvailablePosition(nodes.map(n => n.position), initialPos);
            await agregarConcepto(codigo, pos);

            // Crear edge desde el concepto hacia el rango
            const edgeToRange = `edge-${codigo}-${rangoNodeId}`;
            setEdges(prev => {
                if (prev.find(e => e.id === edgeToRange)) return prev;
                return [...prev, {
                    id: edgeToRange,
                    source: `concept-${codigo}`,
                    target: rangoNodeId,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: hashToColor(codigo) },
                }];
            });
        }
    }, [getNode, nodes, agregarConcepto, setEdges]);

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
        } catch (error) {
            console.error('Error cargando liquidaciones:', error);
        } finally {
            setIsLoading(false);
        }
    }, [filtrosLiq, setNodes]);

    // Guardar pantalla
    const guardarPantalla = useCallback(() => {
        const pantalla: PantallaGuardada = {
            id: generateId(),
            nombre: nombrePantalla || `Concepto ${conceptoRaiz}`,
            conceptoRaiz,
            fechaCreacion: new Date().toISOString(),
            nodos: nodes.map(n => ({
                id: n.id,
                type: n.type || 'concept',
                data: { codigo: n.data?.concepto?.codigo, rangoId: n.data?.rango?.id },
                position: n.position,
            })),
            aristas: edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                type: e.type,
            })),
            viewport: { x: 0, y: 0, zoom: 1 },
            filtrosLiquidacion: filtrosLiq,
        };

        pantallaStorage.save(pantalla);
        setPantallasGuardadas(pantallaStorage.getAll());
        alert('Pantalla guardada!');
    }, [nombrePantalla, conceptoRaiz, nodes, edges, filtrosLiq]);

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

            // Recrear nodos
            const newNodes: Node[] = pantalla.nodos.map(n => ({
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
                },
            }));

            // Recrear edges
            const newEdges: Edge[] = pantalla.aristas.map(e => ({
                ...e,
                type: 'smoothstep',
                animated: true,
            }));

            setNodes(newNodes);
            setEdges(newEdges);
            setConceptoRaiz(pantalla.conceptoRaiz);
            setNombrePantalla(pantalla.nombre);

            if (pantalla.filtrosLiquidacion) {
                setFiltrosLiq(pantalla.filtrosLiquidacion);
            }

            setTimeout(() => fitView({ duration: 500 }), 200);
        } catch (error) {
            console.error('Error cargando pantalla:', error);
        } finally {
            setIsLoading(false);
        }
    }, [expandirConcepto, setNodes, setEdges, fitView]);

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
                                        onClick={() => {
                                            agregarConcepto(c.codigo);
                                            setSearchQuery('');
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
                                    style={{ width: '100%' }}
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
