import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface CommentNodeData {
    texto: string;
    isNew?: boolean;
    onTextoChange?: (nodeId: string, nuevoTexto: string) => void;
    onDelete?: (nodeId: string) => void;
    onCreated?: (nodeId: string) => void;
}

/**
 * Componente de nodo para comentarios tipo post-it
 * Amarillo con bordes cuadrados y esquina doblada
 */
const CommentNode: React.FC<NodeProps<CommentNodeData>> = ({ id, data }) => {
    const { texto, isNew, onTextoChange, onDelete, onCreated } = data;
    const [isEditing, setIsEditing] = useState(isNew || false);
    const [localTexto, setLocalTexto] = useState(texto);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const hasNotifiedCreated = useRef(false);

    useEffect(() => {
        setLocalTexto(texto);
    }, [texto]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        setIsEditing(false);
        if (localTexto !== texto) {
            onTextoChange?.(id, localTexto);
        }
        // Notificar que el nodo ya no es nuevo después de la primera edición
        if (isNew && !hasNotifiedCreated.current) {
            hasNotifiedCreated.current = true;
            onCreated?.(id);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setLocalTexto(texto);
            setIsEditing(false);
        } else if (e.key === 'Enter' && e.ctrlKey) {
            handleSave();
        }
    };

    return (
        <div className="comment-node">
            {/* Esquina doblada */}
            <div className="comment-node-fold"></div>

            {/* Handle para conexiones */}
            <Handle
                type="target"
                position={Position.Top}
                style={{ background: '#c9a227', opacity: 0.5 }}
            />

            {/* Header con botón de eliminar */}
            <div className="comment-node-header">
                <div style={{ flex: 1 }}></div>
                <button
                    className="concept-node-delete"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Eliminar comentario"
                >
                    🗑️
                </button>
            </div>

            {/* Contenido */}
            <div className="comment-node-body">
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        className="comment-node-textarea nodrag"
                        value={localTexto}
                        onChange={(e) => setLocalTexto(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribí tu comentario..."
                    />
                ) : (
                    <div
                        className="comment-node-text nodrag"
                        onDoubleClick={() => setIsEditing(true)}
                        title="Doble click para editar"
                    >
                        {localTexto || 'Hacé doble click para escribir...'}
                    </div>
                )}
            </div>

            {/* Handle inferior */}
            <Handle
                type="source"
                position={Position.Bottom}
                style={{ background: '#c9a227', opacity: 0.5 }}
            />
        </div>
    );
};

export default memo(CommentNode);
