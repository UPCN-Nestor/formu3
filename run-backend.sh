#!/bin/bash
# Script para iniciar el backend (Spring Boot)
echo "================================"
echo "Iniciando Backend Spring Boot"
echo "================================"

cd "$(dirname "$0")"

# Verificar si Maven está disponible
if ! command -v mvn &> /dev/null; then
    echo "ERROR: Maven no encontrado. Asegurate de tener Maven instalado y en el PATH."
    exit 1
fi

echo ""
echo "Compilando y ejecutando..."
echo "(Presionar Ctrl+C para detener)"
echo ""

mvn spring-boot:run
