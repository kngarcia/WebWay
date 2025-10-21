class MapView {
    constructor() {
        this.destino = null;
        this.init();
    }

    async init() {
        try {
            await this.cargarDestino();
            this.mostrarInformacionDestino();
            this.configurarNavegacion();
        } catch (error) {
            this.mostrarError('Error cargando destino: ' + error.message);
        }
    }

    cargarDestino() {
        return new Promise((resolve, reject) => {
            const urlParams = new URLSearchParams(window.location.search);
            const destinoId = urlParams.get('destino');
            
            if (!destinoId) {
                reject(new Error('No se especificó destino'));
                return;
            }

            fetch('data/pois.json')
                .then(response => {
                    if (!response.ok) throw new Error('Error cargando datos');
                    return response.json();
                })
                .then(pois => {
                    this.destino = pois.find(p => p.id == destinoId);
                    if (!this.destino) throw new Error('Destino no encontrado');
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    mostrarInformacionDestino() {
        document.getElementById('destination-name').textContent = this.destino.Nombre;
        
        const coordsInfo = document.getElementById('coordinates-info');
        coordsInfo.innerHTML = `
            Latitud: <strong>${this.destino.Latitud.toFixed(6)}</strong><br>
            Longitud: <strong>${this.destino.Longitud.toFixed(6)}</strong>
        `;
    }

    configurarNavegacion() {
        // Aquí integrarías con Google Maps o Leaflet en una implementación real
        console.log('Integrar con API de mapas aquí');
    }

    mostrarError(mensaje) {
        const mapDiv = document.getElementById('map');
        mapDiv.innerHTML = `<div class="error">${mensaje}</div>`;
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new MapView();
});