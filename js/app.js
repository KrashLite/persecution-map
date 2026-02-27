// Конфигурация
const CONFIG = {
    dataUrl: 'data/events.json',
    colors: {
        murder: '#c0392b',
        attack: '#e74c3c',
        kidnapping: '#f39c12',
        arrest: '#8e44ad',
        discrimination: '#3498db',
        other: '#95a5a6'
    }
};

let map;
let markers = [];
let allEvents = [];

// Инициализация
async function init() {
    initMap();
    await loadData();
}

function initMap() {
    map = L.map('map', {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
}

async function loadData() {
    try {
        const response = await fetch(CONFIG.dataUrl + '?t=' + Date.now());
        const data = await response.json();
        allEvents = data.events || data;
        renderEvents(allEvents);
        updateStats(allEvents);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        // Fallback данные
        allEvents = getFallbackData();
        renderEvents(allEvents);
        updateStats(allEvents);
    }
}

function getFallbackData() {
    return [
        {date: "2026-02-15", lat: 9.0810, lng: 7.4895, country: "Нигерия", city: "Абуja", type: "attack", title: "Атака на церковь", victims: 12, source: "Open Doors"},
        {date: "2026-02-10", lat: 10.5105, lng: 7.4165, country: "Нигерия", city: "Кадуна", type: "kidnapping", title: "Похищение 23 христиан", victims: 23, source: "ICC"},
        {date: "2026-02-20", lat: 20.9517, lng: 85.0985, country: "Индия", city: "Одиша", type: "murder", title: "Убийство семьи", victims: 3, source: "ICC"},
        {date: "2026-02-14", lat: 39.0392, lng: 125.7625, country: "Северная Корея", city: "Пхеньян", type: "murder", title: "Казнь за Библию", victims: 9, source: "Open Doors"},
        {date: "2026-02-16", lat: 2.0469, lng: 45.3182, country: "Сомали", city: "Могадишо", type: "murder", title: "Честное убийство", victims: 1, source: "Open Doors"},
        {date: "2026-02-17", lat: 35.6892, lng: 51.3890, country: "Иран", city: "Тегеран", type: "arrest", title: "Рейд на церковь", victims: 8, source: "Open Doors"},
        {date: "2026-02-03", lat: 15.3229, lng: 38.9251, country: "Эритрея", city: "Асмэра", type: "arrest", title: "Массовые аресты", victims: 30, source: "Open Doors"},
        {date: "2026-02-21", lat: -1.6585, lng: 29.2203, country: "ДР Конго", city: "Киву", type: "attack", title: "Атака на деревню", victims: 15, source: "Open Doors"}
    ];
}

function renderEvents(events) {
    // Очистка старых маркеров
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const listContainer = document.getElementById('events-list');
    listContainer.innerHTML = '';

    events.forEach((event, index) => {
        // Добавление маркера на карту
        const color = CONFIG.colors[event.type] || CONFIG.colors.other;
        const marker = L.circleMarker([event.lat, event.lng], {
            radius: event.victims > 10 ? 10 : (event.victims > 0 ? 7 : 5),
            fillColor: color,
            color: '#fff',
            weight: 2,
            fillOpacity: 0.8
        }).addTo(map);

        const popup = `
            <div style="min-width: 250px;">
                <h3 style="color: ${color}; margin: 0 0 10px 0;">${event.title}</h3>
                <p><strong>📅</strong> ${formatDate(event.date)}</p>
                <p><strong>📍</strong> ${event.city}, ${event.country}</p>
                <p><strong>⚠️</strong> ${getTypeName(event.type)}</p>
                ${event.victims > 0 ? `<p><strong>💀</strong> ${event.victims} жертв</p>` : ''}
                <p style="font-size: 0.9em; color: #888; margin-top: 10px;">Источник: ${event.source}</p>
            </div>
        `;
        
        marker.bindPopup(popup);
        markers.push(marker);

        // Добавление в список
        const card = document.createElement('div');
        card.className = 'event-card';
        card.style.setProperty('--color', color);
        card.innerHTML = `
            <div class="event-date">${formatDate(event.date)}</div>
            <div class="event-title">${event.title}</div>
            <div class="event-location">📍 ${event.city}, ${event.country}</div>
        `;
        card.onclick = () => {
            map.setView([event.lat, event.lng], 8);
            marker.openPopup();
        };
        listContainer.appendChild(card);
    });
}

function filterEvents(type) {
    // Обновление кнопок
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(getTypeName(type)) || (type === 'all' && btn.textContent === 'Все')) {
            btn.classList.add('active');
        }
    });

    // Фильтрация
    const filtered = type === 'all' ? allEvents : allEvents.filter(e => e.type === type);
    renderEvents(filtered);
    updateStats(filtered);
}

function updateStats(events) {
    document.getElementById('total-events').textContent = events.length;
    document.getElementById('total-countries').textContent = new Set(events.map(e => e.country)).size;
    document.getElementById('total-victims').textContent = events.reduce((sum, e) => sum + (e.victims || 0), 0);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getTypeName(type) {
    const names = {
        murder: 'Убийство',
        attack: 'Атака',
        kidnapping: 'Похищение',
        arrest: 'Арест',
        discrimination: 'Дискриминация',
        other: 'Другое'
    };
    return names[type] || type;
}

// Запуск
window.addEventListener('load', init);
