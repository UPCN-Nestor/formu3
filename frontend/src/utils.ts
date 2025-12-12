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
    hash = Math.abs(hash);

    const hue = hash % 360;
    const saturation = 65 + (hash % 20);
    const lightness = 80 + (hash % 10);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Genera un color más oscuro para bordes
 */
export function hashToBorderColor(input: string): string {
    if (!input) return 'hsl(0, 0%, 60%)';

    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = 31 * hash + input.charCodeAt(i);
    }
    hash = Math.abs(hash);

    const hue = hash % 360;
    const saturation = 50 + (hash % 20);
    const lightness = 40 + (hash % 15);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Formatea un importe como moneda
 */
export function formatCurrency(value: number | undefined | null): string {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
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
 * Calcula la posición para un nuevo nodo basado en su origen
 */
/**
 * Calcula la posición para un nuevo nodo basado en su origen
 * Evita superposiciones verificando existingPositions
 */
export function calculateNodePosition(
    sourcePosition: { x: number; y: number },
    direction: 'up' | 'down',
    index: number,
    total: number,
    existingPositions: { x: number; y: number }[] = []
): { x: number; y: number } {
    // Dimensiones estimadas del nodo + gap
    const NODE_WIDTH = 350; // Ancho (320px max) + margen
    const NODE_HEIGHT = 150; // Alto variable, pero usamos un paso fijo para niveles
    const LEVEL_HEIGHT = 220; // Separación vertical entre niveles

    const verticalOffset = direction === 'up' ? -LEVEL_HEIGHT : LEVEL_HEIGHT;
    const targetY = sourcePosition.y + verticalOffset;

    // Calcular ancho total del grupo para centrarlo
    const totalWidth = total * NODE_WIDTH;
    const groupStartX = sourcePosition.x - totalWidth / 2 + NODE_WIDTH / 2;

    // Posición ideal X
    const idealX = groupStartX + index * NODE_WIDTH;

    // Verificar si una posición colisiona con nodos existentes
    const isColliding = (x: number, y: number) => {
        return existingPositions.some(pos =>
            Math.abs(pos.y - y) < LEVEL_HEIGHT / 2 && // Misma fila (aprox)
            Math.abs(pos.x - x) < NODE_WIDTH * 0.9 // Solapamiento horizontal significativo
        );
    };

    // Si la posición ideal está libre, usarla
    if (!isColliding(idealX, targetY)) {
        return { x: idealX, y: targetY };
    }

    // Si hay colisión, buscar hueco alternando derecha e izquierda
    let offset = 1;
    let finalX = idealX;
    let found = false;

    // Límite de búsqueda para evitar loop infinito
    while (!found && offset < 50) {
        // Intentar derecha
        const rightX = idealX + offset * NODE_WIDTH;
        if (!isColliding(rightX, targetY)) {
            finalX = rightX;
            found = true;
            break;
        }

        // Intentar izquierda
        const leftX = idealX - offset * NODE_WIDTH;
        if (!isColliding(leftX, targetY)) {
            finalX = leftX;
            found = true;
            break;
        }

        offset++;
    }

    return { x: finalX, y: targetY };
}

/**
 * Trunca texto si es muy largo
 */
export function truncate(text: string | undefined | null, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}
