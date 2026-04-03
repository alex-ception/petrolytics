import * as echarts from 'echarts';
import { data } from './data.js';
import { HISTORICAL_EVENTS } from '../data/HistoricalEvents.js';
import { RETAILER_PROFILES } from '../data/RetailerProfiles.js';

let chart = null;
let currentFuelType = 'Gazole';
let currentRetailer = 'National';
let isPercentageMode = false;

function initChart() {
    const chartDom = document.getElementById('mainChart');
    if (chart) chart.dispose();
    chart = echarts.init(chartDom, document.body.getAttribute('data-theme'));
    populateSidebar();
    updateChart();
}

function populateSidebar() {
    const list = document.getElementById('eventList');
    list.innerHTML = '';
    [...HISTORICAL_EVENTS].reverse().forEach(ev => {
        const card = document.createElement('div');
        card.className = 'event-card';
        if (ev.title === 'Alignement des Taxes ⚖️') card.style.borderLeftColor = 'var(--accent-color)';
        card.innerHTML = `
            <div class="date">${ev.date}</div>
            <div class="title">${ev.title}</div>
            <div class="description">${ev.desc}</div>
        `;
        card.onclick = () => {
            const index = data.findIndex(d => d.date === ev.date || d.date === ev.label);
            if (index !== -1) {
                const start = Math.max(0, (index / data.length) * 100 - 5);
                const end = Math.min(100, (index / data.length) * 100 + 5);
                chart.setOption({ dataZoom: [{ start, end }, { start, end }] });
            }
        };
        list.appendChild(card);
    });
}

function updateChart() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const profile = RETAILER_PROFILES[currentRetailer];

    const fuelData = data.map(d => {
        const raw = d[currentFuelType];
        if (!raw) return null;
        const adjTTC = raw.total_ttc + profile.priceDelta;
        const adjDistro = Math.max(0.01, raw.marge_distribution + profile.marginDelta);

        if (!isPercentageMode) {
            return { ...raw, total_ttc: adjTTC, marge_distribution: adjDistro };
        }
        const total = adjTTC || 1;
        return {
            label: raw.label,
            brut: (raw.brut / total) * 100,
            ticpe: (raw.ticpe / total) * 100,
            cee: (raw.cee / total) * 100,
            tva: (raw.tva / total) * 100,
            marge_raffinage: (raw.marge_raffinage / total) * 100,
            marge_distribution: (adjDistro / total) * 100,
            total_ttc: 100
        };
    }).filter(d => d !== null);

    const markerStyle = {
        symbol: ['none', 'none'],
        lineStyle: { type: 'dashed', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)', width: 2 },
        label: {
            position: 'end', fontSize: 10, fontWeight: 'bold', borderRadius: 4, padding: [4, 6],
            backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: isDark ? '#fff' : '#1e293b'
        },
        data: HISTORICAL_EVENTS.map((ev, i) => ({
            xAxis: ev.label || ev.date,
            label: {
                formatter: ev.markerLabel,
                distance: ev.offsetLeft ? [-60, 10] : (i % 2 === 0 ? [0, 10] : [0, 50])
            }
        }))
    };

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis', axisPointer: { type: 'cross' },
            formatter: (p) => {
                let res = `<strong>${p[0].name}</strong><br/>`;
                p.forEach(s => {
                    if (s.seriesName === 'Prix à la Pompe (TTC)' && isPercentageMode) return;
                    res += `${s.marker} ${s.seriesName}: <b>${s.value.toFixed(3)}${isPercentageMode ? '%' : '€'}</b><br/>`;
                });
                return res;
            }
        },
        grid: { left: '2%', right: '5%', bottom: '15%', top: '8%', containLabel: true },
        dataZoom: [
            { type: 'inside', start: 70, end: 100 },
            {
                show: true, type: 'slider', bottom: '2%', start: 70, end: 100,
                height: 25, borderColor: 'transparent',
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                fillerColor: 'rgba(37, 99, 235, 0.2)',
                handleStyle: { color: '#2563eb', shadowBlur: 3, shadowColor: 'rgba(0,0,0,0.3)' },
                moveHandleStyle: { color: 'rgba(37, 99, 235, 0.4)' },
                textStyle: { color: 'transparent' },
                showDetail: false
            }
        ],
        xAxis: { type: 'category', boundaryGap: false, data: fuelData.map(d => d.label) },
        yAxis: { type: 'value', min: 0, max: isPercentageMode ? 100 : null },
        series: [
            { name: 'Pétrole (Brut)',         type: 'line', stack: 'base', itemStyle: { color: isDark ? '#64748b' : '#4b5563' }, areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.brut) },
            { name: 'Taxe État (TICPE)',       type: 'line', stack: 'base', itemStyle: { color: '#2563eb' },                     areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.ticpe) },
            { name: 'Taxe Écolo (CEE)',        type: 'line', stack: 'base', itemStyle: { color: '#0ea5e9' },                     areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.cee) },
            { name: 'TVA',                     type: 'line', stack: 'base', itemStyle: { color: '#ef4444' },                     areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.tva) },
            { name: 'Marge Raffinage',         type: 'line', stack: 'base', itemStyle: { color: '#f59e0b' },                     areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.marge_raffinage) },
            { name: 'Distribution & Logistique', type: 'line', stack: 'base', itemStyle: { color: '#10b981' },                   areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.marge_distribution) }
        ]
    };

    if (!isPercentageMode) {
        option.series.push({
            name: 'Prix à la Pompe (TTC)', type: 'line', symbol: 'none',
            itemStyle: { color: isDark ? '#ffffff' : '#000000' },
            lineStyle: { width: 3 },
            markLine: markerStyle,
            data: fuelData.map(d => d.total_ttc)
        });
    }

    chart.setOption(option, true);
    updateStats(fuelData[fuelData.length - 1]);
}

function updateStats(current) {
    document.getElementById('currentPriceCard').querySelector('.value').innerText = `${current.total_ttc.toFixed(2)}€`;
    const taxShare = ((current.ticpe + current.cee + current.tva) / current.total_ttc * 100).toFixed(0);
    document.getElementById('taxShareCard').querySelector('.value').innerText = `${taxShare}%`;
    document.getElementById('marginTrendCard').querySelector('.value').innerText = `${(current.marge_raffinage + current.marge_distribution).toFixed(3)}€`;
}

document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.setAttribute('data-theme', document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    initChart();
});

document.getElementById('scaleToggle').addEventListener('click', (e) => {
    isPercentageMode = !isPercentageMode;
    e.target.innerText = isPercentageMode ? 'Mode €' : 'Mode %';
    updateChart();
});

document.getElementById('fuelTypeSwitcher').addEventListener('click', (e) => {
    if (e.target.dataset.type) {
        document.querySelectorAll('#fuelTypeSwitcher .control-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFuelType = e.target.dataset.type;
        updateChart();
    }
});

document.getElementById('retailerSwitcher').addEventListener('click', (e) => {
    if (e.target.dataset.retailer) {
        document.querySelectorAll('#retailerSwitcher .control-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRetailer = e.target.dataset.retailer;
        updateChart();
    }
});

window.addEventListener('resize', () => { if (chart) chart.resize(); });
initChart();
lucide.createIcons();
