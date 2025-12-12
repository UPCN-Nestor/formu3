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
export function calculateNodePosition(
    sourcePosition: { x: number; y: number },
    direction: 'up' | 'down',
    index: number,
    total: number
): { x: number; y: number } {
    const verticalOffset = direction === 'up' ? -180 : 180;
    const horizontalSpacing = 280;
    const startX = sourcePosition.x - ((total - 1) * horizontalSpacing) / 2;

    return {
        x: startX + index * horizontalSpacing,
        y: sourcePosition.y + verticalOffset,
    };
}

/**
 * Trunca texto si es muy largo
 */
export function truncate(text: string | undefined | null, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}
