class App {
    constructor() {
        this.lugares = [];
        this.init();
    }

    async init() {
        try {
            await this.cargarLugares();
            this.configurarInterfaz();
        } catch (error) {
            this.mostrarError('Error al cargar los destinos: ' + error.message);
        }
    }

    async cargarLugares() {
        try {
            const response = await fetch('data/pois.json');
            if (!response.ok) throw new Error('No se pudo cargar los datos');
            this.lugares = await response.json();
        } catch (error) {
            console.error('Error cargando lugares:', error);
            // Datos de respaldo en caso de error
            this.lugares = [
                { "id": 0, "Nombre": "Bloque A", "Latitud": 4.6609819622582, "Longitud": -74.0596161549797 },
                { "id": 1, "Nombre": "Bloque B", "Latitud": 4.6612256555812, "Longitud": -74.0595379523924 },
                { "id": 4, "Nombre": "Bloque F", "Latitud": 4.6611701025415, "Longitud": -74.0597040270357 }
            ];
        }
    }

    configurarInterfaz() {
        const select = document.getElementById('destino');
        if (!select) return;

        // Limpiar opciones existentes (excepto la primera)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // Llenar con lugares
        this.lugares.forEach(lugar => {
            const option = document.createElement('option');
            option.value = lugar.id;
            option.textContent = lugar.Nombre;
            select.appendChild(option);
        });

        // Configurar botones
        document.getElementById('btnMap').addEventListener('click', () => this.irAMapa());
        document.getElementById('btnAR').addEventListener('click', () => this.irAAR());
    }

    obtenerDestinoSeleccionado() {
        const select = document.getElementById('destino');
        const destinoId = select.value;
        
        if (!destinoId) {
            this.mostrarError('Por favor selecciona un destino');
            return null;
        }

        const destino = this.lugares.find(l => l.id == destinoId);
        if (!destino) {
            this.mostrarError('Destino no encontrado');
            return null;
        }

        return destino;
    }

    irAMapa() {
        const destino = this.obtenerDestinoSeleccionado();
        if (!destino) return;

        window.location.href = `map.html?destino=${destino.id}`;
    }

    // En app.js - función irAAR()
    irAAR() {
        const destino = this.obtenerDestinoSeleccionado();
        if (!destino) return;

        // Verificar si estamos en un entorno móvil
        if (!this.esDispositivoMovil()) {
            if (confirm('El modo AR funciona mejor en dispositivos móviles. ¿Continuar?')) {
                localStorage.setItem('ar-destino', JSON.stringify(destino));
                window.location.href = 'ar.html';
            }
            return;
        }

        // Para AR real, necesitamos HTTPS
        if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
            alert('Para AR necesitas HTTPS. Usando Vercel que ya lo tiene.');
        }

        localStorage.setItem('ar-destino', JSON.stringify(destino));
        window.location.href = 'ar.html';
    }

    esDispositivoMovil() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    mostrarError(mensaje) {
        // Remover errores anteriores
        const errorExistente = document.querySelector('.error');
        if (errorExistente) errorExistente.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = mensaje;
        
        const main = document.querySelector('main');
        main.insertBefore(errorDiv, main.firstChild);

        // Auto-remover después de 5 segundos
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new App();
});