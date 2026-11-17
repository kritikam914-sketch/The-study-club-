import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TrendingUp } from 'lucide-react';
import { POINTS_PER_HOUR } from '../constants';
import type { UserProfile } from '../types';

interface WeeklyTrendsChartProps {
  profile: UserProfile;
}

interface DayFocusPoint {
  dateKey: string;
  dateObj: Date;
  shortLabel: string;
  dateLabel: string;
  fullLabel: string;
  seconds: number;
  hours: number;
  isToday: boolean;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function WeeklyTrendsChart({ profile }: WeeklyTrendsChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(720);
  const [hoveredDay, setHoveredDay] = useState<{
    point: DayFocusPoint;
    x: number;
    y: number;
  } | null>(null);

  const chartData = useMemo<DayFocusPoint[]>(() => {
    const dailyMap = profile.dailyFocusSeconds ?? {};
    const hasDailyEntries = Object.keys(dailyMap).length > 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const points: DayFocusPoint[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const key = toLocalDateKey(d);
      const isToday = offset === 0;

      // If user has legacy totalFocusSeconds before daily tracking started, attribute to today
      const seconds =
        dailyMap[key] ?? (isToday && !hasDailyEntries ? profile.totalFocusSeconds : 0);

      points.push({
        dateKey: key,
        dateObj: d,
        shortLabel: isToday
          ? 'Today'
          : d.toLocaleDateString(undefined, { weekday: 'short' }),
        dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        fullLabel: d.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        seconds,
        hours: Math.round((seconds / 3600) * 100) / 100,
        isToday,
      });
    }
    return points;
  }, [profile.dailyFocusSeconds, profile.totalFocusSeconds]);

  const totalWeekHours = useMemo(
    () => chartData.reduce((sum, p) => sum + p.seconds, 0) / 3600,
    [chartData]
  );
  const dailyAvgHours = totalWeekHours / 7;
  const peakDayHours = useMemo(
    () => Math.max(0, ...chartData.map((p) => p.hours)),
    [chartData]
  );

  // Responsive container measurement
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const nextWidth = el.clientWidth;
      if (nextWidth > 0) {
        setContainerWidth(nextWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // D3 Chart Rendering
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || containerWidth <= 0) return;

    const height = 270;
    const margin = { top: 20, right: 20, bottom: 38, left: 46 };
    const innerWidth = Math.max(200, containerWidth - margin.left - margin.right);
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg
      .attr('width', containerWidth)
      .attr('height', height)
      .attr('viewBox', `0 0 ${containerWidth} ${height}`);

    const defs = svg.append('defs');
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'weekly-trend-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'var(--accent)')
      .attr('stop-opacity', 0.2);
    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'var(--accent)')
      .attr('stop-opacity', 0.01);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand<string>()
      .domain(chartData.map((d) => d.dateKey))
      .range([0, innerWidth])
      .padding(0.32);

    const maxDataHours = d3.max(chartData, (d) => d.hours) ?? 0;
    const yMax = Math.max(2, Math.ceil(maxDataHours * 1.25 * 2) / 2);

    const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

    // Horizontal Gridlines
    const yGrid = d3
      .axisLeft(y)
      .ticks(4)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'y-grid')
      .call(yGrid)
      .call((grid) => {
        grid.select('.domain').remove();
        grid
          .selectAll('line')
          .attr('stroke', 'var(--border)')
          .attr('stroke-dasharray', '3,3');
      });

    // 1.0 hr (+5 pts) Milestone Reference Line
    if (yMax >= 1) {
      const yMilestone = y(1);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yMilestone)
        .attr('y2', yMilestone)
        .attr('stroke', 'var(--secondary)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,4')
        .attr('opacity', 0.65);

      g.append('text')
        .attr('x', innerWidth - 4)
        .attr('y', yMilestone - 6)
        .attr('text-anchor', 'end')
        .attr('fill', 'var(--secondary)')
        .attr('font-size', '10px')
        .attr('font-family', 'var(--font-mono)')
        .attr('font-weight', '600')
        .text('1 hr (+5 pts)');
    }

    // Y Axis
    const yAxis = d3
      .axisLeft(y)
      .ticks(4)
      .tickFormat((val) => `${Number(val).toFixed(1)}h`);

    g.append('g')
      .call(yAxis)
      .call((axis) => {
        axis.select('.domain').remove();
        axis.selectAll('line').remove();
        axis
          .selectAll('text')
          .attr('fill', 'var(--ink-faint)')
          .attr('font-size', '11px')
          .attr('font-family', 'var(--font-mono)');
      });

    // X Axis
    const xAxis = d3.axisBottom(x).tickFormat((key) => {
      const match = chartData.find((d) => d.dateKey === key);
      return match ? `${match.shortLabel} · ${match.dateLabel}` : key;
    });

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((axis) => {
        axis.select('.domain').attr('stroke', 'var(--border)');
        axis.selectAll('line').remove();
        axis
          .selectAll('text')
          .attr('fill', 'var(--ink-muted)')
          .attr('font-size', '11px')
          .attr('dy', '1.1em')
          .attr('font-family', 'var(--font-sans)');
      });

    // Area under the trend curve
    const areaGen = d3
      .area<DayFocusPoint>()
      .x((d) => (x(d.dateKey) ?? 0) + x.bandwidth() / 2)
      .y0(innerHeight)
      .y1((d) => y(d.hours))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chartData)
      .attr('fill', 'url(#weekly-trend-area-grad)')
      .attr('d', areaGen);

    // Bars for each day
    g.selectAll('.focus-bar')
      .data(chartData)
      .join('rect')
      .attr('class', 'focus-bar')
      .attr('x', (d) => x(d.dateKey) ?? 0)
      .attr('y', (d) => y(d.hours))
      .attr('width', x.bandwidth())
      .attr('height', (d) => Math.max(0, innerHeight - y(d.hours)))
      .attr('rx', 6)
      .attr('fill', (d) => (d.isToday ? 'var(--accent)' : 'var(--secondary)'))
      .attr('opacity', (d) => (d.hours > 0 ? (d.isToday ? 0.85 : 0.35) : 0));

    // Smooth Trend Line
    const lineGen = d3
      .line<DayFocusPoint>()
      .x((d) => (x(d.dateKey) ?? 0) + x.bandwidth() / 2)
      .y((d) => y(d.hours))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', 'var(--accent)')
      .attr('stroke-width', 2.5)
      .attr('d', lineGen);

    // Data Nodes
    g.selectAll('.trend-dot')
      .data(chartData)
      .join('circle')
      .attr('class', 'trend-dot')
      .attr('cx', (d) => (x(d.dateKey) ?? 0) + x.bandwidth() / 2)
      .attr('cy', (d) => y(d.hours))
      .attr('r', (d) => (d.isToday ? 5 : 4))
      .attr('fill', 'var(--surface)')
      .attr('stroke', 'var(--accent)')
      .attr('stroke-width', 2.5);

    // Interactive Invisible Hover Targets per Day Column
    g.selectAll('.hover-band')
      .data(chartData)
      .join('rect')
      .attr('class', 'hover-band')
      .attr('x', (d) => x(d.dateKey) ?? 0)
      .attr('y', 0)
      .attr('width', x.bandwidth())
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseenter', function (_event, d) {
        const cx = margin.left + (x(d.dateKey) ?? 0) + x.bandwidth() / 2;
        const cy = margin.top + y(d.hours);
        setHoveredDay({ point: d, x: cx, y: cy });
      })
      .on('mouseleave', () => {
        setHoveredDay(null);
      });
  }, [chartData, containerWidth, profile.themeId]);

  return (
    <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
            Weekly Productivity Trends
          </h2>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">
            Total focus hours logged over the last 7 days · Every 1.0 hr earns +{POINTS_PER_HOUR} points
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          <div>
            <p className="text-xs text-[var(--ink-faint)]">7-Day Total</p>
            <p className="text-xl font-bold font-mono tabular-nums text-[var(--ink)]">
              {totalWeekHours.toFixed(2)} hrs
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-faint)]">Daily Avg</p>
            <p className="text-xl font-bold font-mono tabular-nums text-[var(--ink)]">
              {dailyAvgHours.toFixed(2)} hrs
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-faint)]">Peak Day</p>
            <p className="text-xl font-bold font-mono tabular-nums text-[var(--accent)]">
              {peakDayHours.toFixed(2)} hrs
            </p>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Weekly Productivity Trends chart showing focus hours over the last 7 days"
          className="w-full block overflow-visible"
        />

        {hoveredDay && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full pb-2"
            style={{
              left: `${Math.min(Math.max(hoveredDay.x, 85), containerWidth - 85)}px`,
              top: `${Math.max(hoveredDay.y, 48)}px`,
            }}
          >
            <div className="bg-[var(--ink)] text-white rounded-xl px-3 py-2 text-xs shadow-lg whitespace-nowrap space-y-0.5">
              <p className="font-semibold">{hoveredDay.point.fullLabel}</p>
              <p className="font-mono tabular-nums text-white/90">
                {hoveredDay.point.hours.toFixed(2)} hrs ({Math.floor(hoveredDay.point.seconds / 60)} min)
              </p>
              <p className="font-mono tabular-nums text-[var(--accent)]">
                +{Math.floor(hoveredDay.point.seconds / 3600) * POINTS_PER_HOUR} pts earned
              </p>
            </div>
          </div>
        )}
      </div>

      {totalWeekHours === 0 && (
        <p className="text-xs text-[var(--ink-faint)] text-center pt-1">
          Start a focus session above to watch your 7-day productivity curve grow in real time.
        </p>
      )}
    </section>
  );
}
