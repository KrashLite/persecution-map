// archive-events.js — Улучшенная архивация с дедупликацией
const fs = require('fs');
const path = require('path');

const EVENTS_FILE = path.join(__dirname, 'data', 'events.json');
const ARCHIVE_FILE = path.join(__dirname, 'data', 'events-archive.json');

function loadJSON(file) {
    try {
        if (!fs.existsSync(file)) return null;
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`Error loading ${file}:`, e.message);
        return null;
    }
}

function saveJSON(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function createEventKey(event) {
    // Уникальный ключ для дедупликации
    return `${event.date}_${event.country}_${event.city}_${event.title.substring(0, 30)}`.toLowerCase();
}

function archiveEvents() {
    console.log('📦 Starting archive process...\n');
    
    const current = loadJSON(EVENTS_FILE);
    const archive = loadJSON(ARCHIVE_FILE);
    
    if (!current || !current.events) {
        console.log('❌ No current events found');
        return;
    }
    
    // Инициализируем архив если нужно
    let archivedEvents = [];
    let archiveMetadata = {
        created: new Date().toISOString(),
        description: 'Архив событий за последний год',
        lastUpdated: new Date().toISOString(),
        totalEvents: 0
    };
    
    if (archive && archive.events) {
        archivedEvents = archive.events;
        archiveMetadata = { ...archive.metadata, lastUpdated: new Date().toISOString() };
    }
    
    // Создаём Set для быстрой проверки дубликатов
    const existingKeys = new Set(archivedEvents.map(createEventKey));
    
    // Добавляем новые события
    let added = 0;
    let duplicates = 0;
    
    for (const event of current.events) {
        const key = createEventKey(event);
        if (!existingKeys.has(key)) {
            archivedEvents.push(event);
            existingKeys.add(key);
            added++;
        } else {
            duplicates++;
        }
    }
    
    // Сортируем по дате (новые сверху)
    archivedEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Ограничиваем архив (храним только последние 365 дней или 500 событий)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const cutoffDate = oneYearAgo.toISOString().split('T')[0];
    const filteredEvents = archivedEvents.filter(e => e.date >= cutoffDate).slice(0, 500);
    
    const removed = archivedEvents.length - filteredEvents.length;
    
    // Обновляем метаданные
    archiveMetadata.totalEvents = filteredEvents.length;
    archiveMetadata.lastUpdated = new Date().toISOString();
    
    // Сохраняем
    const output = {
        metadata: archiveMetadata,
        events: filteredEvents
    };
    
    saveJSON(ARCHIVE_FILE, output);
    
    console.log('✅ Archive updated:');
    console.log(`   Added: ${added}`);
    console.log(`   Duplicates skipped: ${duplicates}`);
    console.log(`   Old events removed: ${removed}`);
    console.log(`   Total in archive: ${filteredEvents.length}`);
    
    // Обновляем current.events с пометкой об архивации
    current.metadata.archivedTotal = filteredEvents.length;
    current.metadata.archiveUpdated = new Date().toISOString();
    saveJSON(EVENTS_FILE, current);
    
    console.log('\n📋 Current file updated with archive reference');
}

archiveEvents();
