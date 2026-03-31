-- Script para crear la tabla formu3_pantallas en UPCN_REPORTES
-- Ejecutar con usuario que tenga permisos de CREATE TABLE

USE UPCN_REPORTES;
GO

-- Crear tabla si no existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'formu3_pantallas' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.formu3_pantallas (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        nombre NVARCHAR(200) NOT NULL,
        concepto_raiz NVARCHAR(20) NULL,
        fecha_creacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        fecha_modificacion DATETIME2 NULL,
        datos_json NVARCHAR(MAX) NULL,
        
        -- Índices para búsquedas frecuentes
        INDEX IX_formu3_pantallas_nombre (nombre),
        INDEX IX_formu3_pantallas_concepto_raiz (concepto_raiz),
        INDEX IX_formu3_pantallas_fecha_mod (fecha_modificacion DESC)
    );
    
    PRINT 'Tabla formu3_pantallas creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La tabla formu3_pantallas ya existe.';
END
GO

-- Verificar estructura
SELECT 
    c.name AS columna,
    t.name AS tipo,
    c.max_length AS longitud,
    c.is_nullable AS nullable
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('dbo.formu3_pantallas')
ORDER BY c.column_id;
GO
