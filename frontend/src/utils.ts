/**
 * Utilidades para el frontend del visualizador.
 */

import type { PantallaGuardada } from './types';

const STORAGE_KEY = 'formu-pantallas-guardadas';

/**
 * Genera un color HSL basado en hash (igual que el backend)
 */
export function hashToColor(input: string): string {
    if (!input) return 'hsl(0, 0%, 90%)';

    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = 31 * hash + input.charCodeAt(i);
    }

    // Bit mixing para mejor distribución de colores
    hash = hash ^ (hash >>> 16);
    hash = Math.imul(hash, 0x85ebca6b);
    hash = hash ^ (hash >>> 13);
    hash = Math.imul(hash, 0xc2b2ae35);
    hash = hash ^ (hash >>> 16);
    hash = Math.abs(hash);

    const hue = hash % 360;
    const saturation = 65 + (hash % 20);
    const lightness = 80 + (hash % 10);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Formatea un importe como número (sin símbolo de moneda)
 */
export function formatCurrency(value: number | undefined | null): string {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('es-AR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

/**
 * Storage de pantallas guardadas
 */
export const pantallaStorage = {
    getAll(): PantallaGuardada[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    },

    save(pantalla: PantallaGuardada): void {
        const pantallas = this.getAll().filter(p => p.id !== pantalla.id);
        pantallas.unshift(pantalla);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pantallas.slice(0, 20))); // Max 20 pantallas
    },

    delete(id: string): void {
        const pantallas = this.getAll().filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pantallas));
    },

    getById(id: string): PantallaGuardada | undefined {
        return this.getAll().find(p => p.id === id);
    },
};

/**
 * Genera un ID único
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Constantes para el espaciado de nodos
 */
const NODE_HORIZONTAL_SPACING = 350; // Espaciado horizontal entre nodos
const NODE_VERTICAL_SPACING = 350;   // Espaciado vertical entre nodos
const NODE_WIDTH = 320;              // Ancho aproximado del nodo para detección de colisiones
const NODE_HEIGHT = 320;             // Alto aproximado del nodo para detección de colisiones

/**
 * Calcula la posición para un nuevo nodo basado en su origen
 */
export function calculateNodePosition(
    sourcePosition: { x: number; y: number },
    direction: 'up' | 'down',
    index: number,
    total: number
): { x: number; y: number } {
    const verticalOffset = direction === 'up' ? -NODE_VERTICAL_SPACING : NODE_VERTICAL_SPACING;
    const startX = sourcePosition.x - ((total - 1) * NODE_HORIZONTAL_SPACING) / 2;

    return {
        x: startX + index * NODE_HORIZONTAL_SPACING,
        y: sourcePosition.y + verticalOffset,
    };
}

/**
 * Encuentra una posición disponible evitando colisiones
 */
export function findAvailablePosition(
    existingPositions: { x: number; y: number }[],
    candidate: { x: number; y: number }
): { x: number; y: number } {
    let finalPos = { ...candidate };

    let collision = true;
    let attempts = 0;
    const MAX_ATTEMPTS = 50; // Evitar loop infinito

    while (collision && attempts < MAX_ATTEMPTS) {
        collision = false;
        for (const pos of existingPositions) {
            // Verificar solapamiento simple (bounding box)
            if (
                Math.abs(pos.x - finalPos.x) < NODE_WIDTH &&
                Math.abs(pos.y - finalPos.y) < NODE_HEIGHT
            ) {
                collision = true;
                break;
            }
        }

        if (collision) {
            // Si hay colisión, mover hacia la derecha usando el spacing
            finalPos.x += NODE_HORIZONTAL_SPACING;
            attempts++;
        }
    }

    return finalPos;
}

/**
 * Trunca texto si es muy largo
 */
export function truncate(text: string | undefined | null, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}
