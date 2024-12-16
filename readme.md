// ADIÇÃO DE LINHA 130 COM FAKEDATA NO DATA.CSV PARA EXEMPLO DE SP

cords RJ:
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


cords SP:
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
                    [-24.09176,-44.45867],  // Cananeia novamente
                ], {
                    color: 'green',
                    fillColor: '#90ee90',
                    fillOpacity: 0.5
                });