   // Inicializa o mapa centrado na costa do Rio de Janeiro
   var map = L.map('map').setView([-22.9, -43.2], 8);

   // Adiciona um tile layer ao mapa
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
       maxZoom: 18,
       attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
   }).addTo(map);

   // Carrega dados do CSV
   Papa.parse('data.csv', {
       download: true,
       header: true,
       complete: function(results) {
           var data = results.data;
           var states = [...new Set(data.map(d => d.OtherArea))].sort();
           var taxons = [...new Set(data.map(d => d.Taxon))].sort();

           // Preenche o seletor de espécies
           var taxonSelect = document.getElementById('taxon');
           taxons.forEach(taxon => {
               var option = document.createElement('option');
               option.value = taxon;
               option.textContent = taxon;
               taxonSelect.appendChild(option);
           });

           // Preenche o seletor de estados
           var stateSelect = document.getElementById('state');
           states.forEach(state => {
               var option = document.createElement('option');
               option.value = state;
               option.textContent = state;
               stateSelect.appendChild(option);
           });

           // Atualiza o seletor de anos dinamicamente
           function updateYearOptions() {
               var selectedTaxon = taxonSelect.value;
               var years = [...new Set(data
                   .filter(d => d.Taxon === selectedTaxon)
                   .map(d => d.Year))].sort((a, b) => a - b);

               var yearSelect = document.getElementById('year');
               yearSelect.innerHTML = '<option value="">Todos</option>';
               years.forEach(year => {
                   var option = document.createElement('option');
                   option.value = year;
                   option.textContent = year;
                   yearSelect.appendChild(option);
               });
           }

           // Calcula os dados agregados
           function calculateAggregates(taxon, year, type, state) {
               var filteredData = data.filter(d =>
                   d.Taxon === taxon &&
                   (!year || d.Year === year) &&
                   (!state || d.OtherArea === state)
               );

               var values = {
                   artesanal: filteredData
                       .filter(d => d.Variable.includes('_art'))
                       .reduce((sum, d) => sum + Math.round(parseFloat(d["CatchAmount (tonnes)"].replace(',', '.'))), 0),

                   industrial: filteredData
                       .filter(d => d.Variable.includes('_ind'))
                       .reduce((sum, d) => sum + Math.round(parseFloat(d["CatchAmount (tonnes)"].replace(',', '.'))), 0)
               };
               values.agregado = values.artesanal + values.industrial;

               return values[type.toLowerCase()];
           }

           // Coordenadas precisas para o litoral do Rio de Janeiro
           var rioCoastalRegion = L.polygon([
           [-21.40768,-40.85618], // Angra dos Reis
               [-22.18708,-41.9234], // Ilha Grande
               [-22.88123,-43.36415], // Niterói
               [-22.99806,-44.25697], // Cabo Frio
               [-23.87775,-44.04419], // Arraial do Cabo
               [-24.11499,-43.01495],  // Paraty
               [-23.83026,-41.80993],
               [-23.42273,-41.32954],
               [-22.89254,-40.67336],
               [-21.90753,-39.62468],
           ], {
               color: 'blue',
               fillColor: '#add8e6',
               fillOpacity: 0.5
           });

           // Coordenadas precisas para o litoral de São Paulo
           var spCoastalRegion = L.polygon([
           [-23.31766,-44.85521], // Cananeia
               [-23.44072,-45.52065], // Ilha do Cardoso
               [-23.64421,-46.09821], // Iguape
               [-24.06825,-46.73069], // Santos
               [-24.65076,-47.14345], // Ilhabela
               [-24.766,-48.03626], // São Sebastião
               [-25.63355,-47.82349],
               [-25.51103,-46.97003],
               [-25.07036,-46.3363],
               [-24.78654,-45.50434],
               [-24.34201,-44.89211],
               [-24.09176,-44.45867], 
           ], {
               color: 'green',
               fillColor: '#90ee90',
               fillOpacity: 0.5
           });

           var overlays = {
               "Rio de Janeiro": rioCoastalRegion,
               "São Paulo": spCoastalRegion
           };

           function updateVisibility() {
               var selectedState = stateSelect.value;

               Object.keys(overlays).forEach(state => {
                   if (!selectedState || selectedState === state) {
                       map.addLayer(overlays[state]);
                   } else {
                       map.removeLayer(overlays[state]);
                   }
               });
           }

           function updatePopup() {
var selectedState = stateSelect.value;
var selectedTaxon = taxonSelect.value;
var selectedType = document.getElementById('type').value;
var selectedYear = document.getElementById('year').value;

Object.entries(overlays).forEach(([state, layer]) => {
   layer.off(); // Remove eventos anteriores para evitar duplicações

   if (selectedState && state !== selectedState) return;

   var total = calculateAggregates(selectedTaxon, selectedYear, selectedType, state);

   var info = `Estado: ${state}<br>
       Espécie: ${selectedTaxon || 'Todas'}<br>
       Tipo de Pesca: ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1) || 'Todos'}<br>
       Ano: ${selectedYear || 'Todos'}<br>
       Quantidade: ${total || 0} toneladas`;

   // Evento para desktop (hover)
   layer.on('mouseover', function (e) {
       var popup = L.popup({ maxWidth: 400, keepInView: true })
           .setLatLng(e.latlng)
           .setContent(info)
           .openOn(map);
   });

   layer.on('mouseout', function () {
       map.closePopup();
   });

   // Evento para dispositivos móveis (click)
   layer.on('click', function (e) {
       var popup = L.popup({ maxWidth: 400, keepInView: true })
           .setLatLng(e.latlng)
           .setContent(info)
           .openOn(map);
   });
});
}



           document.getElementById('download').addEventListener('click', () => {
               var csvContent = Papa.unparse(data);
               var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
               var link = document.createElement('a');
               link.href = URL.createObjectURL(blob);
               link.download = 'dados_pesca.csv';
               link.click();
           });

           taxonSelect.addEventListener('change', () => {
               updateYearOptions();
               updatePopup();
           });
           stateSelect.addEventListener('change', () => {
               updateVisibility();
               updatePopup();
           });
           document.getElementById('year').addEventListener('change', updatePopup);
           document.getElementById('type').addEventListener('change', updatePopup);

           // Inicializa os overlays e popups
           updateVisibility();
           updateYearOptions();
           updatePopup();
       }
   });