/**
 * API client para comunicación con el backend.
 * Centraliza todas las llamadas HTTP.
 */

import type { Concepto, RangoConceptos, Liquidacion, FiltrosLiquidacion, PantallaGuardada } from './types';

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
        if (filtros.tipo !== undefined && filtros.tipo !== null) params.append('tipo', filtros.tipo.toString());
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

/**
 * Tipo interno para la respuesta del backend (con campos JSON como strings)
 */
interface PantallaBackendDTO {
    id: string;
    nombre: string;
    conceptoRaiz: string;
    fechaCreacion: string;
    fechaModificacion?: string;
    nodos: string | null;
    aristas: string | null;
    viewport: string | null;
    filtrosLiquidacion: string | null;
    liquidacionCargada: boolean | null;
    liquidaciones: string | null;
}

/**
 * Convierte la respuesta del backend al formato del frontend
 */
function parseBackendPantalla(dto: PantallaBackendDTO): PantallaGuardada {
    return {
        id: dto.id,
        nombre: dto.nombre,
        conceptoRaiz: dto.conceptoRaiz,
        fechaCreacion: dto.fechaCreacion,
        nodos: dto.nodos ? JSON.parse(dto.nodos) : [],
        aristas: dto.aristas ? JSON.parse(dto.aristas) : [],
        viewport: dto.viewport ? JSON.parse(dto.viewport) : { x: 0, y: 0, zoom: 1 },
        filtrosLiquidacion: dto.filtrosLiquidacion ? JSON.parse(dto.filtrosLiquidacion) : undefined,
        liquidacionCargada: dto.liquidacionCargada ?? undefined,
        liquidaciones: dto.liquidaciones ? JSON.parse(dto.liquidaciones) : undefined,
    };
}

/**
 * Convierte el formato del frontend al formato del backend
 */
function toBackendPantalla(pantalla: PantallaGuardada): PantallaBackendDTO {
    return {
        id: pantalla.id,
        nombre: pantalla.nombre,
        conceptoRaiz: pantalla.conceptoRaiz,
        fechaCreacion: pantalla.fechaCreacion,
        nodos: JSON.stringify(pantalla.nodos),
        aristas: JSON.stringify(pantalla.aristas),
        viewport: JSON.stringify(pantalla.viewport),
        filtrosLiquidacion: pantalla.filtrosLiquidacion ? JSON.stringify(pantalla.filtrosLiquidacion) : null,
        liquidacionCargada: pantalla.liquidacionCargada ?? null,
        liquidaciones: pantalla.liquidaciones ? JSON.stringify(pantalla.liquidaciones) : null,
    };
}

/**
 * API de Pantallas guardadas
 */
export const pantallaApi = {
    /**
     * Obtiene todas las pantallas guardadas
     */
    async getAll(): Promise<PantallaGuardada[]> {
        const response = await fetch(`${API_BASE}/pantallas`);
        const dtos: PantallaBackendDTO[] = await handleResponse(response);
        return dtos.map(parseBackendPantalla);
    },

    /**
     * Obtiene una pantalla por ID
     */
    async getById(id: string): Promise<PantallaGuardada> {
        const response = await fetch(`${API_BASE}/pantallas/${id}`);
        const dto: PantallaBackendDTO = await handleResponse(response);
        return parseBackendPantalla(dto);
    },

    /**
     * Guarda una pantalla (crear o actualizar)
     */
    async save(pantalla: PantallaGuardada): Promise<PantallaGuardada> {
        const response = await fetch(`${API_BASE}/pantallas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toBackendPantalla(pantalla)),
        });
        const dto: PantallaBackendDTO = await handleResponse(response);
        return parseBackendPantalla(dto);
    },

    /**
     * Elimina una pantalla
     */
    async delete(id: string): Promise<void> {
        const response = await fetch(`${API_BASE}/pantallas/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${await response.text()}`);
        }
    },

    /**
     * Busca pantallas por nombre
     */
    async search(nombre: string): Promise<PantallaGuardada[]> {
        const response = await fetch(`${API_BASE}/pantallas/search?nombre=${encodeURIComponent(nombre)}`);
        const dtos: PantallaBackendDTO[] = await handleResponse(response);
        return dtos.map(parseBackendPantalla);
    },
};
