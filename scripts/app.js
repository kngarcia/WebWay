// En app.js - Modifica la función irAAR()
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

    localStorage.setItem('ar-destino', JSON.stringify(destino));
    window.location.href = 'ar.html';
}

esDispositivoMovil() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}