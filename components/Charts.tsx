import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// --- Types ---
export interface ChartDataPoint {
    label: string;
    value: number;
    color: string;
}

export interface StackedBarDataPoint {
    label: string;
    total: number;
    segments: {
        key: string;
        value: number;
        color: string;
        label: string;
    }[];
}

// --- Utils ---
const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
};

// --- Pie Chart ---
export const PieChart: React.FC<{ data: ChartDataPoint[]; size?: number; donut?: boolean; valueFormatter?: (v: number) => string }> = ({
    data,
    size = 200,
    donut = true,
    valueFormatter = (v) => `${Math.round(v)}`
}) => {
    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    let cumulativePercent = 0;
    const slices = data.map((slice, i) => {
        if (slice.value === 0) return null;

        // Ensure we handle single item 100% case correctly (needs distinct path)
        const isSingle = data.filter(d => d.value > 0).length === 1;
        if (isSingle) {
            return (
                <circle
                    key={slice.label}
                    cx={100} // viewbox center
                    cy={100}
                    r={100}
                    fill={slice.color}
                />
            );
        }

        const startPercent = cumulativePercent;
        const endPercent = cumulativePercent + (slice.value / total);
        cumulativePercent = endPercent;

        const [startX, startY] = getCoordinatesForPercent(startPercent);
        const [endX, endY] = getCoordinatesForPercent(endPercent);

        const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;

        const pathData = [
            `M 100 100`, // Center
            `L ${100 + 100 * startX} ${100 + 100 * startY}`, // Line to start
            `A 100 100 0 ${largeArcFlag} 1 ${100 + 100 * endX} ${100 + 100 * endY}`, // Arc
            `L 100 100`, // Line back to center
        ].join(' ');

        return (
            <motion.path
                key={slice.label}
                d={pathData}
                fill={slice.color}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                stroke="var(--color-bg)" // Separation line using CSS logic if needed (handled by viewbox color usually)
                strokeWidth="2"
            />
        );
    });

    // Calculate center hole (donut)
    // Actually simpler: Mask it or overlay a circle.

    return (
        <div className="relative flex justify-center items-center" style={{ width: size, height: size }}>
            <svg viewBox="-1 -1 202 202" className="transform -rotate-90 w-full h-full text-transparent">
                {slices}
            </svg>
            {donut && (
                <div
                    className="absolute bg-surface rounded-full flex flex-col items-center justify-center p-2 text-center z-10"
                    style={{ width: size * 0.6, height: size * 0.6 }}
                >
                    {/* Slot for center content */}
                    <span className="text-xs text-textMuted uppercase tracking-wider">Total</span>
                    {/* Use formatter */}
                    <span className="text-xl font-bold text-textMain">
                        {valueFormatter(total)}
                    </span>
                </div>
            )}
        </div>
    );
};


// --- Stacked Bar Chart ---
export const StackedBarChart: React.FC<{ data: StackedBarDataPoint[]; height?: number; valueFormatter?: (v: number) => string }> = ({
    data,
    height = 200,
    valueFormatter = (v) => `${Math.round(v)}`
}) => {
    const maxTotal = Math.max(...data.map(d => d.total), 1); // Avoid div/0

    return (
        <div className="w-full flex items-end justify-between gap-2" style={{ height }}>
            {data.map((col, i) => {
                const heightPercent = (col.total / maxTotal) * 100;

                return (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                        {/* Tooltip placeholder (simple browser title for now, could be advanced custom tooltip) */}
                        <div className="relative w-full rounded-t-lg overflow-hidden flex flex-col-reverse justify-start transition-transform hover:scale-105" title={`${col.label}: ${valueFormatter(col.total)}`} style={{ height: `${heightPercent}%` }}>
                            {col.segments.map((seg, idx) => {
                                const segHeightPercent = (seg.value / col.total) * 100;
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${segHeightPercent}%` }}
                                        transition={{ duration: 0.5, delay: i * 0.05 }}
                                        style={{ backgroundColor: seg.color }}
                                        className="w-full"
                                    />
                                )
                            })}
                        </div>
                        <div className="mt-2 text-[10px] text-textMuted truncate w-full text-center font-mono">
                            {col.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
