/**
 * API client para comunicación con el backend.
 * Centraliza todas las llamadas HTTP.
 */

import type { Concepto, RangoConceptos, Liquidacion, FiltrosLiquidacion } from './types';

const API_BASE = '/api';

/**
 * Maneja errores de la API
 */
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error ${response.status}: ${error}`);
    }
    return response.json();
}

/**
 * API de Conceptos
 */
export const conceptoApi = {
    /**
     * Obtiene todos los conceptos (resumen)
     */
    async getAll(): Promise<Concepto[]> {
        const response = await fetch(`${API_BASE}/conceptos`);
        return handleResponse(response);
    },

    /**
     * Busca conceptos por texto
     */
    async buscar(query: string): Promise<Concepto[]> {
        const response = await fetch(`${API_BASE}/conceptos/buscar?q=${encodeURIComponent(query)}`);
        return handleResponse(response);
    },

    /**
     * Obtiene un concepto con dependencias
     */
    async getById(codigo: string): Promise<Concepto> {
        const response = await fetch(`${API_BASE}/conceptos/${codigo}`);
        return handleResponse(response);
    },

    /**
     * Obtiene múltiples conceptos
     */
    async getBatch(codigos: string[]): Promise<Concepto[]> {
        const response = await fetch(`${API_BASE}/conceptos/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(codigos),
        });
        return handleResponse(response);
    },

    /**
     * Obtiene conceptos en un rango
     */
    async getRango(inicio: string, fin: string, tipoRango: string = ''): Promise<RangoConceptos> {
        const response = await fetch(
            `${API_BASE}/conceptos/rango/${inicio}/${fin}?tipoRango=${encodeURIComponent(tipoRango)}`
        );
        return handleResponse(response);
    },

    /**
     * Obtiene dependencias de un concepto
     */
    async getDependencias(codigo: string): Promise<string[]> {
        const response = await fetch(`${API_BASE}/conceptos/${codigo}/dependencias`);
        return handleResponse(response);
    },

    /**
     * Obtiene dependientes de un concepto
     */
    async getDependientes(codigo: string): Promise<string[]> {
        const response = await fetch(`${API_BASE}/conceptos/${codigo}/dependientes`);
        return handleResponse(response);
    },

    /**
     * Refresca el caché de dependencias
     */
    async refreshCache(): Promise<Record<string, unknown>> {
        const response = await fetch(`${API_BASE}/conceptos/cache/refresh`, { method: 'POST' });
        return handleResponse(response);
    },
};

/**
 * API de Liquidaciones
 */
export const liquidacionApi = {
    /**
     * Obtiene liquidaciones por período
     */
    async getByPeriodo(filtros: FiltrosLiquidacion): Promise<Record<string, Liquidacion>> {
        const params = new URLSearchParams();
        if (filtros.anio) params.append('anio', filtros.anio.toString());
        if (filtros.mes) params.append('mes', filtros.mes.toString());
        if (filtros.tipo) params.append('tipo', filtros.tipo.toString());
        if (filtros.legajo) params.append('legajo', filtros.legajo);

        const response = await fetch(`${API_BASE}/liquidacion?${params}`);
        return handleResponse(response);
    },

    /**
     * Obtiene tipos de liquidación disponibles
     */
    async getTipos(): Promise<Record<number, string>> {
        const response = await fetch(`${API_BASE}/liquidacion/tipos`);
        return handleResponse(response);
    },

    /**
     * Obtiene legajos disponibles
     */
    async getLegajos(anio: number, mes: number): Promise<string[]> {
        const response = await fetch(`${API_BASE}/liquidacion/legajos?anio=${anio}&mes=${mes}`);
        return handleResponse(response);
    },

    /**
     * Obtiene años disponibles
     */
    async getAnios(): Promise<number[]> {
        const response = await fetch(`${API_BASE}/liquidacion/anios`);
        return handleResponse(response);
    },
};
