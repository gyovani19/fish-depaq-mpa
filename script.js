// Inicializa o mapa centrado na costa do Rio de Janeiro
var map = L.map('map').setView([-22.9, -43.2], 8);

// Adiciona um tile layer ao mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
}).addTo(map);

// Variáveis globais para armazenar todos os dados e os dados filtrados
var allData = [];
var filteredData = [];

// Variáveis de overlays (exemplo de RJ e SP)
var rioCoastalRegion, spCoastalRegion;
var overlays = {};

// -------------- Carrega dados CSV com PapaParse --------------//
Papa.parse('data.csv', {
    download: true,
    header: true,
    complete: function(results) {
        // Filtra linhas válidas (com Year e CatchAmount)
        allData = results.data.filter(row => row.Year && row["CatchAmount (tonnes)"]);
        filteredData = allData; // Inicialmente, sem filtros

        // Preenche selects (espécies, estados, anos) com base em allData
        populateSelects();

        // Inicializa regiões no mapa (exemplo para RJ e SP)
        initPolygons();

        // Atualiza a tabela com os dados iniciais
        updateTable();
        // Atualiza sobreposições e popups do mapa
        updateVisibility();
        updatePopups();

        // Inicializa e atualiza o gráfico Plotly
        initPlotlyChart();
        updatePlotlyChart();
    }
});

// -------------- Preenche <select> para Taxon, State e Year --------------//
function populateSelects() {
    var taxons = [...new Set(allData.map(d => d.Taxon))].sort();
    var states = [...new Set(allData.map(d => d.OtherArea))].sort();
    var years = [...new Set(allData.map(d => parseInt(d.Year)))].sort((a, b) => a - b);

    // Seletores desktop
    var taxonSelect = document.getElementById('taxon');
    var stateSelect = document.getElementById('state');
    var yearSelect = document.getElementById('year');

    // Seletores mobile
    var taxonMobileSelect = document.getElementById('taxon-mobile');
    var stateMobileSelect = document.getElementById('state-mobile');
    var yearMobileSelect = document.getElementById('year-mobile');

    // Preenche taxon (espécie)
    taxons.forEach(taxon => {
        var optionDesk = document.createElement('option');
        optionDesk.value = taxon;
        optionDesk.textContent = taxon;
        taxonSelect.appendChild(optionDesk);

        var optionMob = optionDesk.cloneNode(true);
        taxonMobileSelect.appendChild(optionMob);
    });

    // Preenche estado
    states.forEach(state => {
        var optionDesk = document.createElement('option');
        optionDesk.value = state;
        optionDesk.textContent = state;
        stateSelect.appendChild(optionDesk);

        var optionMob = optionDesk.cloneNode(true);
        stateMobileSelect.appendChild(optionMob);
    });

    // Preenche ano
    years.forEach(year => {
        var optionDesk = document.createElement('option');
        optionDesk.value = year;
        optionDesk.textContent = year;
        yearSelect.appendChild(optionDesk);

        var optionMob = optionDesk.cloneNode(true);
        yearMobileSelect.appendChild(optionMob);
    });
}

// -------------- Evento de Filtro (Desktop) --------------//
document.getElementById('taxon').addEventListener('change', applyFilters);
document.getElementById('type').addEventListener('change', applyFilters);
document.getElementById('state').addEventListener('change', applyFilters);
document.getElementById('year').addEventListener('change', applyFilters);

// -------------- Evento de Filtro (Mobile) --------------//
document.getElementById('apply-filters').addEventListener('click', () => {
    applyFilters();
    closeModal();
});

// -------------- Aplica Filtros --------------//
function applyFilters() {
    var selectedTaxon = document.getElementById('taxon').value || document.getElementById('taxon-mobile').value;
    var selectedType = document.getElementById('type').value || document.getElementById('type-mobile').value;
    var selectedState = document.getElementById('state').value || document.getElementById('state-mobile').value;
    var selectedYear = document.getElementById('year').value || document.getElementById('year-mobile').value;

    filteredData = allData.filter(d => {
        var match = true;
        if (selectedTaxon) {
            match = match && (d.Taxon === selectedTaxon);
        }
        if (selectedState) {
            match = match && (d.OtherArea === selectedState);
        }
        if (selectedYear) {
            match = match && (parseInt(d.Year) === parseInt(selectedYear));
        }
        if (selectedType) {
            if (selectedType === 'agregado') {
                // Tipo "agregado" => soma de '_art' + '_ind'
                match = match && (d.Variable.includes('_art') || d.Variable.includes('_ind'));
            } else if (selectedType === 'artesanal') {
                match = match && d.Variable.includes('_art');
            } else if (selectedType === 'industrial') {
                match = match && d.Variable.includes('_ind');
            }
        }
        return match;
    });

    // Atualiza tabela, mapa e gráfico
    updateTable();
    updateMapLayers();
    updatePlotlyChart();
}

// -------------- Atualiza Tabela --------------//
function updateTable() {
    var tableBody = document.querySelector('#data-table tbody');
    tableBody.innerHTML = ''; // Limpa tabela anterior

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
        // Ordenamos as colunas no mesmo formato do <thead>
        var cells = [
            rowData.OtherArea,
            rowData.Group,
            rowData.Variable,
            rowData.Year,
            rowData.PortugueseCommonName,
            rowData.Taxon,
            rowData["CatchAmount (tonnes)"],
            rowData.Sector
        ];
        cells.forEach(value => {
            var cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });
        tableBody.appendChild(row);
    });
}

// -------------- Inicializa Polígonos no Mapa --------------//
function initPolygons() {
    // Exemplo: Polígono do litoral do Rio de Janeiro
    rioCoastalRegion = L.polygon([
        [-21.40768, -40.85618],
        [-22.18708, -41.9234],
        [-22.88123, -43.36415],
        [-22.99806, -44.25697],
        [-23.87775, -44.04419],
        [-24.11499, -43.01495],
        [-23.83026, -41.80993],
        [-23.42273, -41.32954],
        [-22.89254, -40.67336],
        [-21.90753, -39.62468],
    ], {
        color: 'blue',
        fillColor: '#add8e6',
        fillOpacity: 0.5
    }).addTo(map);

    // Exemplo: Polígono do litoral de São Paulo
    spCoastalRegion = L.polygon([
        [-23.31766,-44.85521],
        [-23.44072,-45.52065],
        [-23.64421,-46.09821],
        [-24.06825,-46.73069],
        [-24.65076,-47.14345],
        [-24.766,-48.03626],
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
    }).addTo(map);

    // Cria objeto overlays para manipular depois
    overlays["Rio de Janeiro"] = rioCoastalRegion;
    overlays["São Paulo"] = spCoastalRegion;
}

// -------------- Atualiza Sobreposições e Popups --------------//
function updateMapLayers() {
    updateVisibility();
    updatePopups();
}

// Mostra/esconde polígonos conforme estado selecionado
function updateVisibility() {
    var selectedState = document.getElementById('state').value || document.getElementById('state-mobile').value;

    Object.entries(overlays).forEach(([state, layer]) => {
        // Se não houver estado selecionado, mostra todos
        if (!selectedState || selectedState === state) {
            if (!map.hasLayer(layer)) map.addLayer(layer);
        } else {
            if (map.hasLayer(layer)) map.removeLayer(layer);
        }
    });
}

// Cria popups ao passar ou clicar nos polígonos
function updatePopups() {
    map.eachLayer(layer => {
        if (layer instanceof L.Polygon) {
            layer.off('mouseover');
            layer.off('mouseout');
            layer.off('click');

            // Identifica qual estado esse layer representa
            var state = Object.keys(overlays).find(key => overlays[key] === layer);
            if (!state) return;

            layer.on('mouseover', function(e) {
                var total = calculateAggregates(state).toFixed(2);
                var info = `
                    <strong>Estado:</strong> ${state}<br>
                    <strong>Quantidade:</strong> ${total} toneladas
                `;
                var popup = L.popup({ maxWidth: 400, keepInView: true })
                    .setLatLng(e.latlng)
                    .setContent(info)
                    .openOn(map);
            });

            layer.on('mouseout', function() {
                map.closePopup();
            });

            layer.on('click', function(e) {
                var total = calculateAggregates(state).toFixed(2);
                var info = `
                    <strong>Estado:</strong> ${state}<br>
                    <strong>Quantidade:</strong> ${total} toneladas
                `;
                var popup = L.popup({ maxWidth: 400, keepInView: true })
                    .setLatLng(e.latlng)
                    .setContent(info)
                    .openOn(map);
            });
        }
    });
}

// Função de cálculo agregado (exemplo: soma das capturas no estado X, respeitando os filtros)
function calculateAggregates(state) {
    var dataToAggregate = filteredData.filter(d => d.OtherArea === state);

    var total = dataToAggregate.reduce((sum, d) => {
        var val = parseFloat((d["CatchAmount (tonnes)"] || "0").replace(",", "."));
        return sum + (val || 0);
    }, 0);

    return total;
}

// -------------- Download CSV Filtrado --------------//
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

// -------------- Modal de Filtros (Mobile) --------------//
var filterButton = document.getElementById('filter-button');
var closeButton = document.querySelector('.close-button');
filterButton.addEventListener('click', openModal);
closeButton.addEventListener('click', closeModal);
window.addEventListener('click', function(event) {
    var modal = document.getElementById('filter-modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
});

function openModal() {
    document.getElementById('filter-modal').style.display = 'block';
}
function closeModal() {
    document.getElementById('filter-modal').style.display = 'none';
}

// -------------- Plotly: inicializar e atualizar gráfico --------------//
var plotlyChartInitialized = false;

// Inicializa o gráfico Plotly (chamado uma única vez, após CSV estar carregado)
function initPlotlyChart() {
    // Cria algo inicial, só para não ficar vazio
    Plotly.newPlot('plotly-chart', [], {title: 'Série Temporal de Pesca'});
    plotlyChartInitialized = true;
}

// Atualiza o gráfico com base em `filteredData`
function updatePlotlyChart() {
    if (!plotlyChartInitialized) return;

    // Se não houver dados filtrados, limpa
    if (filteredData.length === 0) {
        Plotly.react("plotly-chart", [], {title: "Nenhum dado para exibir"});
        return;
    }

    // 1) Agrega por ano
    var yearTotals = {};
    filteredData.forEach(d => {
        var year = parseInt(d.Year);
        var amount = parseFloat((d["CatchAmount (tonnes)"] || "0").replace(",", "."));
        if (!yearTotals[year]) {
            yearTotals[year] = 0;
        }
        yearTotals[year] += amount;
    });

    // 2) Ordena anos
    var sortedYears = Object.keys(yearTotals).sort((a, b) => parseInt(a) - parseInt(b));
    var totals = sortedYears.map(year => yearTotals[year]);

    // 3) Define traço do Plotly (gráfico de linha)
    var trace = {
        x: sortedYears,
        y: totals,
        mode: "lines+markers",
        type: "scatter",
        line: { shape: "linear", color: "#0d6efd" },
        marker: { size: 6, color: "#0d6efd" },
        name: "Toneladas pescadas"
    };

    // 4) Layout
    var layout = {
        title: "Série Temporal de Pesca",
        xaxis: { title: "Ano" },
        yaxis: { title: "Toneladas" }
    };

    // 5) Atualiza o gráfico
    Plotly.react("plotly-chart", [trace], layout, { responsive: true });
}
