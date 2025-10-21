class ARNavigation {
    constructor() {
        this.watchId = null;
        this.arrowEntity = null;
        this.infoDiv = null;
        this.destino = null;
        this.GUIDE_AHEAD_METERS = 10;
        this.ultimaPosicion = null;
        
        this.init();
    }

    async init() {
        try {
            await this.cargarDestino();
            this.configurarEscenaAR();
            this.iniciarGeolocalizacion();
            this.configurarControles();
        } catch (error) {
            this.mostrarError('Error inicializando AR: ' + error.message);
        }
    }

    cargarDestino() {
        return new Promise((resolve, reject) => {
            const destinoData = localStorage.getItem('ar-destino');
            if (!destinoData) {
                reject(new Error('No se encontró destino seleccionado'));
                return;
            }

            try {
                this.destino = JSON.parse(destinoData);
                resolve();
            } catch (error) {
                reject(new Error('Error parseando datos del destino'));
            }
        });
    }

    configurarEscenaAR() {
        this.arrowEntity = document.getElementById('arrow');
        this.infoDiv = document.getElementById('info');
        
        if (!this.arrowEntity || !this.infoDiv) {
            throw new Error('Elementos AR no encontrados');
        }

        // Ocultar loading cuando la escena esté lista
        const scene = document.querySelector('a-scene');
        scene.addEventListener('loaded', () => {
            setTimeout(() => {
                const loading = document.getElementById('loading');
                if (loading) loading.style.display = 'none';
            }, 2000);
        });
    }

    configurarControles() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
    }

    iniciarGeolocalizacion() {
        if (!navigator.geolocation) {
            this.mostrarError('Geolocalización no soportada en este navegador');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.actualizarPosicion(position),
            (error) => this.manejarErrorGPS(error),
            options
        );

        this.infoDiv.innerHTML = `Buscando ubicación...<br>Destino: ${this.destino.Nombre}`;
    }

    actualizarPosicion(posicion) {
        this.ultimaPosicion = posicion;
        const userLat = posicion.coords.latitude;
        const userLon = posicion.coords.longitude;
        
        const distancia = this.calcularDistancia(userLat, userLon, this.destino.Latitud, this.destino.Longitud);
        const rumbo = this.calcularRumbo(userLat, userLon, this.destino.Latitud, this.destino.Longitud);
        
        this.actualizarInterfaz(distancia, rumbo);
        
        if (distancia < 5) { // 5 metros de llegada
            this.llegadaDestino();
            return;
        }
        
        this.actualizarFlecha(userLat, userLon, rumbo, distancia);
    }

    calcularDistancia(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Radio de la Tierra en metros
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    calcularRumbo(lat1, lon1, lat2, lon2) {
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const θ = Math.atan2(y, x);

        return (θ * 180 / Math.PI + 360) % 360;
    }

    actualizarInterfaz(distancia, rumbo) {
        const distanciaTexto = distancia < 1000 ? 
            `${Math.round(distancia)}m` : 
            `${(distancia/1000).toFixed(1)}km`;
            
        this.infoDiv.innerHTML = `
            <strong>${this.destino.Nombre}</strong><br>
            Distancia: ${distanciaTexto}<br>
            Rumbo: ${Math.round(rumbo)}°
        `;
    }

    actualizarFlecha(userLat, userLon, rumbo, distancia) {
        // Calcular punto guía adelante
        const puntoGuia = this.calcularPuntoGuia(userLat, userLon, rumbo, this.GUIDE_AHEAD_METERS);
        
        // Actualizar posición de la flecha
        this.arrowEntity.setAttribute('gps-entity-place', {
            latitude: puntoGuia.lat,
            longitude: puntoGuia.lon
        });
        
        // Rotar flecha hacia el destino (ajustar según la orientación de la cámara)
        const rotacionFlecha = (rumbo + 180) % 360;
        this.arrowEntity.setAttribute('rotation', {
            x: 0,
            y: rotacionFlecha,
            z: 0
        });
        
        // Escalar flecha basado en distancia
        const escala = Math.min(3, Math.max(1, distancia / 50));
        this.arrowEntity.setAttribute('scale', {
            x: escala,
            y: escala,
            z: escala
        });
        
        this.arrowEntity.setAttribute('visible', 'true');
    }

    calcularPuntoGuia(lat, lon, rumbo, distancia) {
        const R = 6371e3;
        const δ = distancia / R;
        const φ1 = lat * Math.PI / 180;
        const λ1 = lon * Math.PI / 180;
        const θ = rumbo * Math.PI / 180;

        const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) +
                           Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
        const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
                                 Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));

        return {
            lat: φ2 * 180 / Math.PI,
            lon: λ2 * 180 / Math.PI
        };
    }

    llegadaDestino() {
        this.infoDiv.innerHTML = `
            <div class="success">
                <strong>¡Has llegado!</strong><br>
                ${this.destino.Nombre}
            </div>
        `;
        
        this.arrowEntity.setAttribute('visible', 'false');
        
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        // Vibración si está disponible
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    }

    manejarErrorGPS(error) {
        let mensaje = 'Error de GPS: ';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                mensaje += 'Permiso denegado. Activa la ubicación.';
                break;
            case error.POSITION_UNAVAILABLE:
                mensaje += 'Ubicación no disponible.';
                break;
            case error.TIMEOUT:
                mensaje += 'Tiempo de espera agotado.';
                break;
            default:
                mensaje += error.message;
        }
        
        this.mostrarError(mensaje);
    }

    mostrarError(mensaje) {
        this.infoDiv.innerHTML = `<div class="error">${mensaje}</div>`;
        console.error('AR Navigation Error:', mensaje);
    }

    // Cleanup
    destruir() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.arNavigation = new ARNavigation();
});

// Cleanup al salir de la página
window.addEventListener('beforeunload', () => {
    if (window.arNavigation) {
        window.arNavigation.destruir();
    }
});