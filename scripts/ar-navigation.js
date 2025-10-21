// scripts/ar-navigation.js - Versión simplificada y robusta

class ARNavigation {
    constructor() {
        this.watchId = null;
        this.arrow = null;
        this.infoDiv = null;
        this.destino = null;
        this.GUIDE_AHEAD_METERS = 15;
        
        this.init();
    }

    async init() {
        try {
            console.log('Iniciando AR Navigation...');
            
            // Cargar destino
            await this.cargarDestino();
            
            // Configurar elementos
            this.arrow = document.getElementById('arrow');
            this.infoDiv = document.getElementById('info');
            
            if (!this.arrow) {
                throw new Error('No se encontró la flecha AR');
            }
            
            // Iniciar geolocalización
            this.iniciarGPS();
            
            console.log('AR Navigation inicializado correctamente');
            
        } catch (error) {
            this.mostrarError('Error: ' + error.message);
            console.error('Error en AR Navigation:', error);
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
                this.actualizarInfo(`Destino: ${this.destino.Nombre}<br>Buscando ubicación...`);
                resolve();
            } catch (error) {
                reject(new Error('Error cargando datos del destino'));
            }
        });
    }

    iniciarGPS() {
        if (!navigator.geolocation) {
            this.mostrarError('Geolocalización no soportada');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.actualizarPosicion(position),
            (error) => this.manejarErrorGPS(error),
            options
        );
    }

    actualizarPosicion(position) {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        
        const distancia = this.calcularDistancia(userLat, userLon, this.destino.Latitud, this.destino.Longitud);
        const rumbo = this.calcularRumbo(userLat, userLon, this.destino.Latitud, this.destino.Longitud);
        
        this.actualizarInterfaz(distancia, rumbo);
        
        // Llegada al destino
        if (distancia < 8) {
            this.llegadaDestino();
            return;
        }
        
        // Actualizar flecha AR
        this.actualizarFlecha(userLat, userLon, rumbo, distancia);
    }

    calcularDistancia(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
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
        let distanciaTexto;
        if (distancia < 1000) {
            distanciaTexto = `${Math.round(distancia)} metros`;
        } else {
            distanciaTexto = `${(distancia/1000).toFixed(1)} km`;
        }

        const infoHTML = `
            <strong>${this.destino.Nombre}</strong><br>
            Distancia: ${distanciaTexto}<br>
            Dirección: ${Math.round(rumbo)}°<br>
            <small>Mueve el dispositivo para ver la flecha</small>
        `;
        
        this.actualizarInfo(infoHTML);
    }

    actualizarFlecha(userLat, userLon, rumbo, distancia) {
        try {
            // Calcular punto guía adelante
            const puntoGuia = this.calcularPuntoGuia(userLat, userLon, rumbo, this.GUIDE_AHEAD_METERS);
            
            // Actualizar posición GPS de la flecha
            this.arrow.setAttribute('gps-entity-place', {
                latitude: puntoGuia.lat,
                longitude: puntoGuia.lon
            });
            
            // Rotar flecha (ajuste para orientación de cámara)
            const rotacion = (rumbo + 180) % 360;
            this.arrow.setAttribute('rotation', {
                x: -90,  // Apuntar hacia adelante
                y: rotacion,
                z: 0
            });
            
            // Escala basada en distancia
            const escalaBase = 2;
            const escalaDistancia = Math.min(3, Math.max(1, distancia / 50));
            const escalaFinal = escalaBase * escalaDistancia;
            
            this.arrow.setAttribute('scale', {
                x: escalaFinal,
                y: escalaFinal, 
                z: escalaFinal
            });
            
            // Hacer visible
            this.arrow.setAttribute('visible', 'true');
            
        } catch (error) {
            console.warn('Error actualizando flecha:', error);
        }
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
        this.actualizarInfo(`
            <div style="color: #4CAF50;">
                <strong>¡Has llegado!</strong><br>
                ${this.destino.Nombre}
            </div>
        `);
        
        this.arrow.setAttribute('visible', 'false');
        
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        // Vibración en dispositivos móviles
        if (navigator.vibrate) {
            navigator.vibrate([300, 100, 300]);
        }
    }

    manejarErrorGPS(error) {
        let mensaje = 'Error de GPS: ';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                mensaje = 'Permiso de ubicación denegado. Activa la ubicación en tu dispositivo.';
                break;
            case error.POSITION_UNAVAILABLE:
                mensaje = 'Ubicación no disponible. Verifica tu conexión GPS.';
                break;
            case error.TIMEOUT:
                mensaje = 'Tiempo de espera agotado. Intenta nuevamente.';
                break;
            default:
                mensaje = 'Error desconocido: ' + error.message;
        }
        
        this.mostrarError(mensaje);
    }

    actualizarInfo(mensaje) {
        if (this.infoDiv) {
            this.infoDiv.innerHTML = mensaje;
        }
    }

    mostrarError(mensaje) {
        console.error('AR Error:', mensaje);
        this.actualizarInfo(`<div style="color: #ff4444;">${mensaje}</div>`);
    }

    // Cleanup
    destruir() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
    }
}

// Inicialización cuando todo esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para asegurar que AFRAME esté cargado
    setTimeout(() => {
        if (typeof AFRAME !== 'undefined') {
            window.arNav = new ARNavigation();
        } else {
            console.error('AFRAME no está disponible');
            document.getElementById('loading').innerHTML = 
                '<p>Error: No se pudo cargar la librería AR. Recarga la página.</p>';
        }
    }, 1000);
});

// Cleanup al salir
window.addEventListener('beforeunload', () => {
    if (window.arNav) {
        window.arNav.destruir();
    }
});