document.addEventListener("DOMContentLoaded", async () => {
  const select = document.getElementById("destino");
  if (select) {
    const lugares = await fetch("data/pois.json").then(r => r.json());
    lugares.forEach(l => {
      const opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = l.Nombre;
      select.appendChild(opt);
    });

    document.getElementById("btnMap").onclick = () => {
      const destino = select.value;
      if (!destino) return alert("Selecciona un destino");
      window.location.href = `map.html?destino=${destino}`;
    };

    document.getElementById("btnAR").onclick = () => {
      const destino = select.value;
      if (!destino) return alert("Selecciona un destino");
      localStorage.setItem("destino", destino);
      window.location.href = "ar.html";
    };
  }
});
