#!/bin/bash
# Script para iniciar el frontend (Vite + React)
echo "================================"
echo "Iniciando Frontend React"
echo "================================"

# Navegar al directorio del script y luego a 'frontend'
cd "$(dirname "$0")/frontend" || exit

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Fallo la instalacion de dependencias"
        exit 1
    fi
fi

echo ""
echo "Iniciando servidor de desarrollo..."
echo "(Abrir http://localhost:5173 en el navegador)"
echo "(Presionar Ctrl+C para detener)"
echo ""

npm run dev
