// Inicializa o mapa centrado na costa do Rio de Janeiro
var map = L.map('map').setView([-22.9, -43.2], 8);

// Adiciona um tile layer ao mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
}).addTo(map);

// Variável para armazenar todos os dados
var allData = [];
// Variável para armazenar dados filtrados
var filteredData = [];

// Carrega dados do CSV
Papa.parse('data.csv', {
    download: true,
    header: true,
    complete: function(results) {
        allData = results.data.filter(row => row.Year && row["CatchAmount (tonnes)"]); // Filtra linhas válidas
        filteredData = allData; // Inicialmente, todos os dados são filtrados

        var states = [...new Set(allData.map(d => d.OtherArea))].sort();
        var taxons = [...new Set(allData.map(d => d.Taxon))].sort();
        var years = [...new Set(allData.map(d => parseInt(d.Year)))].sort((a, b) => a - b);

        // Preenche o seletor de espécies
        var taxonSelect = document.getElementById('taxon');
        var taxonMobileSelect = document.getElementById('taxon-mobile');
        taxons.forEach(taxon => {
            var option = document.createElement('option');
            option.value = taxon;
            option.textContent = taxon;
            taxonSelect.appendChild(option);

            // Clonar para o mobile
            var mobileOption = option.cloneNode(true);
            taxonMobileSelect.appendChild(mobileOption);
        });

        // Preenche o seletor de estados
        var stateSelect = document.getElementById('state');
        var stateMobileSelect = document.getElementById('state-mobile');
        states.forEach(state => {
            var option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            stateSelect.appendChild(option);

            // Clonar para o mobile
            var mobileOption = option.cloneNode(true);
            stateMobileSelect.appendChild(mobileOption);
        });

        // Preenche o seletor de anos
        var yearSelect = document.getElementById('year');
        var yearMobileSelect = document.getElementById('year-mobile');
        years.forEach(year => {
            var option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);

            // Clonar para o mobile
            var mobileOption = option.cloneNode(true);
            yearMobileSelect.appendChild(mobileOption);
        });

        // Preenche o seletor de anos dinamicamente para mobile baseado na espécie selecionada
        function updateYearOptions() {
            var selectedTaxon = taxonSelect.value;
            var relevantYears = [...new Set(allData
                .filter(d => !selectedTaxon || d.Taxon === selectedTaxon)
                .map(d => parseInt(d.Year)))].sort((a, b) => a - b);

            var yearSelect = document.getElementById('year');
            yearSelect.innerHTML = '<option value="">Todos</option>';
            relevantYears.forEach(year => {
                var option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
        }

        // Função para aplicar filtros
        function applyFilters() {
            var selectedState = stateSelect.value || document.getElementById('state-mobile').value;
            var selectedTaxon = taxonSelect.value || document.getElementById('taxon-mobile').value;
            var selectedType = document.getElementById('type').value || document.getElementById('type-mobile').value;
            var selectedYear = document.getElementById('year').value || document.getElementById('year-mobile').value;

            filteredData = allData.filter(d => {
                var match = true;
                if (selectedState) {
                    match = match && (d.OtherArea === selectedState);
                }
                if (selectedTaxon) {
                    match = match && (d.Taxon === selectedTaxon);
                }
                if (selectedYear) {
                    match = match && (parseInt(d.Year) === parseInt(selectedYear));
                }
                if (selectedType) {
                    if (selectedType === 'agregado') {
                        // Agregado inclui tanto artesanal quanto industrial
                        match = match && (d.Variable.includes('_art') || d.Variable.includes('_ind'));
                    } else if (selectedType === 'artesanal') {
                        match = match && d.Variable.includes('_art');
                    } else if (selectedType === 'industrial') {
                        match = match && d.Variable.includes('_ind');
                    }
                }
                return match;
            });

            updateTable();
            updateMapLayers();
        }

        // Função para atualizar a tabela com dados filtrados
        function updateTable() {
            var tableBody = document.querySelector('#data-table tbody');
            tableBody.innerHTML = ''; // Limpa a tabela

            if (filteredData.length === 0) {
                var row = document.createElement('tr');
                var cell = document.createElement('td');
                cell.colSpan = 8;
                cell.textContent = 'Nenhum dado encontrado para os filtros selecionados.';
                row.appendChild(cell);
                tableBody.appendChild(row);
                return;
            }

            filteredData.forEach(rowData => {
                var row = document.createElement('tr');
                Object.values(rowData).forEach(cellData => {
                    var cell = document.createElement('td');
                    cell.textContent = cellData;
                    row.appendChild(cell);
                });
                tableBody.appendChild(row);
            });
        }

        // Calcula os dados agregados
        function calculateAggregates(taxon, year, type, state) {
            var dataToAggregate = allData.filter(d =>
                (!taxon || d.Taxon === taxon) &&
                (!year || d.Year === year) &&
                (!state || d.OtherArea === state)
            );

            var artes = dataToAggregate
                .filter(d => d.Variable.includes('_art'))
                .reduce((sum, d) => sum + (parseFloat(d["CatchAmount (tonnes)"].replace(',', '.')) || 0), 0);

            var indus = dataToAggregate
                .filter(d => d.Variable.includes('_ind'))
                .reduce((sum, d) => sum + (parseFloat(d["CatchAmount (tonnes)"].replace(',', '.')) || 0), 0);

            var agregado = artes + indus;

            if (type === 'artesanal') return artes;
            if (type === 'industrial') return indus;
            if (type === 'agregado') return agregado;
            return 0;
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

        // Adiciona os overlays ao mapa
        Object.values(overlays).forEach(layer => {
            layer.addTo(map);
        });

        // Função para atualizar a visibilidade dos overlays
        function updateVisibility() {
            var selectedState = stateSelect.value || document.getElementById('state-mobile').value;

            Object.entries(overlays).forEach(([state, layer]) => {
                if (!selectedState || selectedState === state) {
                    if (!map.hasLayer(layer)) {
                        map.addLayer(layer);
                    }
                } else {
                    if (map.hasLayer(layer)) {
                        map.removeLayer(layer);
                    }
                }
            });
        }

        // Função para atualizar popups no mapa
        function updatePopups() {
            map.eachLayer(function(layer) {
                if (layer instanceof L.Polygon) {
                    layer.off('mouseover');
                    layer.off('mouseout');
                    layer.off('click');

                    var state = Object.keys(overlays).find(key => overlays[key] === layer);
                    if (!state) return;

                    layer.on('mouseover', function (e) {
                        var total = calculateAggregates(
                            taxonSelect.value || document.getElementById('taxon-mobile').value,
                            document.getElementById('year').value || document.getElementById('year-mobile').value,
                            document.getElementById('type').value || document.getElementById('type-mobile').value,
                            state
                        ).toFixed(2);

                        var info = `Estado: ${state}<br>
                            Espécie: ${taxonSelect.value || document.getElementById('taxon-mobile').value || 'Todas'}<br>
                            Tipo de Pesca: ${document.getElementById('type').value ? document.getElementById('type').value.charAt(0).toUpperCase() + document.getElementById('type').value.slice(1) : 'Todos'}<br>
                            Ano: ${document.getElementById('year').value || document.getElementById('year-mobile').value || 'Todos'}<br>
                            Quantidade: ${total || 0} toneladas`;

                        var popup = L.popup({ maxWidth: 400, keepInView: true })
                            .setLatLng(e.latlng)
                            .setContent(info)
                            .openOn(map);
                    });

                    layer.on('mouseout', function () {
                        map.closePopup();
                    });

                    layer.on('click', function (e) {
                        var total = calculateAggregates(
                            taxonSelect.value || document.getElementById('taxon-mobile').value,
                            document.getElementById('year').value || document.getElementById('year-mobile').value,
                            document.getElementById('type').value || document.getElementById('type-mobile').value,
                            state
                        ).toFixed(2);

                        var info = `Estado: ${state}<br>
                            Espécie: ${taxonSelect.value || document.getElementById('taxon-mobile').value || 'Todas'}<br>
                            Tipo de Pesca: ${document.getElementById('type').value ? document.getElementById('type').value.charAt(0).toUpperCase() + document.getElementById('type').value.slice(1) : 'Todos'}<br>
                            Ano: ${document.getElementById('year').value || document.getElementById('year-mobile').value || 'Todos'}<br>
                            Quantidade: ${total || 0} toneladas`;

                        var popup = L.popup({ maxWidth: 400, keepInView: true })
                            .setLatLng(e.latlng)
                            .setContent(info)
                            .openOn(map);
                    });
                }
            });
        }

        // Função para atualizar os layers do mapa
        function updateMapLayers() {
            updateVisibility();
            updatePopups();
        }

        // Evento de download para baixar os dados filtrados
        document.getElementById('download').addEventListener('click', () => {
            if (filteredData.length === 0) {
                alert('Nenhum dado para baixar com os filtros selecionados.');
                return;
            }

            var csvContent = Papa.unparse(filteredData);
            var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'dados_pesca_filtrados.csv';
            link.click();
        });

        // Eventos de mudança nos filtros (Desktop)
        taxonSelect.addEventListener('change', () => {
            applyFilters();
        });
        stateSelect.addEventListener('change', () => {
            applyFilters();
        });
        document.getElementById('year').addEventListener('change', () => {
            applyFilters();
        });
        document.getElementById('type').addEventListener('change', () => {
            applyFilters();
        });

        // Eventos de mudança nos filtros (Mobile)
        var taxonMobileSelect = document.getElementById('taxon-mobile');
        var stateMobileSelect = document.getElementById('state-mobile');
        var yearMobileSelect = document.getElementById('year-mobile');
        var typeMobileSelect = document.getElementById('type-mobile');

        document.getElementById('apply-filters').addEventListener('click', () => {
            applyFilters();
            closeModal();
        });

        // Função para abrir o modal
        function openModal() {
            document.getElementById('filter-modal').style.display = 'block';
        }

        // Função para fechar o modal
        function closeModal() {
            document.getElementById('filter-modal').style.display = 'none';
        }

        // Eventos para abrir e fechar o modal
        var filterButton = document.getElementById('filter-button');
        var closeButton = document.querySelector('.close-button');

        filterButton.addEventListener('click', openModal);
        closeButton.addEventListener('click', closeModal);

        // Fecha o modal se clicar fora do conteúdo
        window.addEventListener('click', function(event) {
            var modal = document.getElementById('filter-modal');
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        });

        // Função para atualizar a tabela com dados filtrados
        function updateTable() {
            var tableBody = document.querySelector('#data-table tbody');
            tableBody.innerHTML = ''; // Limpa a tabela

            if (filteredData.length === 0) {
                var row = document.createElement('tr');
                var cell = document.createElement('td');
                cell.colSpan = 8;
                cell.textContent = 'Nenhum dado encontrado para os filtros selecionados.';
                row.appendChild(cell);
                tableBody.appendChild(row);
                return;
            }

            filteredData.forEach(rowData => {
                var row = document.createElement('tr');
                Object.values(rowData).forEach(cellData => {
                    var cell = document.createElement('td');
                    cell.textContent = cellData;
                    row.appendChild(cell);
                });
                tableBody.appendChild(row);
            });
        }

        // Inicializa os overlays, popups e tabela
        updateVisibility();
        updatePopups();
        updateTable();
    }
});
