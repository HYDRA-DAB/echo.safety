import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Card } from './ui/card';
import { BarChart3 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CrimeStatisticsChart = ({ crimes }) => {
  const chartData = useMemo(() => {
    if (!crimes || !Array.isArray(crimes)) {
      return {
        labels: ['Women Safety', 'Drugs', 'Theft'],
        datasets: [
          {
            label: 'Crime Reports',
            data: [0, 0, 0],
            backgroundColor: ['#ec4899', '#3b82f6', '#dc2626'],
            borderColor: ['#ec4899', '#3b82f6', '#dc2626'],
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      };
    }

    // Count crimes by type
    const womenSafetyCount = crimes.filter(crime => crime.crime_type === 'women_safety').length;
    const drugsCount = crimes.filter(crime => crime.crime_type === 'drugs').length;
    const theftCount = crimes.filter(crime => crime.crime_type === 'theft').length;

    return {
      labels: ['Women Safety', 'Drugs', 'Theft'],
      datasets: [
        {
          label: 'Crime Reports',
          data: [womenSafetyCount, drugsCount, theftCount],
          backgroundColor: [
            'rgba(236, 72, 153, 0.8)', // Pink for Women Safety
            'rgba(59, 130, 246, 0.8)',  // Blue for Drugs
            'rgba(220, 38, 38, 0.8)'    // Red for Theft
          ],
          borderColor: [
            '#ec4899', // Pink border
            '#3b82f6', // Blue border
            '#dc2626'  // Red border
          ],
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          hoverBackgroundColor: [
            'rgba(236, 72, 153, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(220, 38, 38, 1)'
          ],
          hoverBorderWidth: 3,
        },
      ],
    };
  }, [crimes]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend as we have colored bars
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
            return `${context.parsed.y} reports (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
        border: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          borderDash: [5, 5],
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            size: 11,
          },
          stepSize: 1,
        },
        border: {
          display: false,
        },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart',
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  const totalReports = chartData.datasets[0].data.reduce((a, b) => a + b, 0);

  return (
    <Card className="feature-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 className="w-6 h-6 text-purple-500 mr-2" />
          <h2 className="text-xl font-bold text-white">Crime Statistics</h2>
        </div>
        <div className="text-sm text-gray-400">
          Total: {totalReports} reports
        </div>
      </div>
      
      <div className="h-64 w-full">
        <Bar data={chartData} options={options} />
      </div>
      
      {/* Legend */}
      <div className="flex justify-center mt-4 space-x-6">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-pink-600 rounded mr-2"></div>
          <span className="text-sm text-white">Women Safety</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-600 rounded mr-2"></div>
          <span className="text-sm text-white">Drugs</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
          <span className="text-sm text-white">Theft</span>
        </div>
      </div>

      {totalReports === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-lg">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-500 opacity-50" />
            <p className="text-gray-400">No crime data available</p>
            <p className="text-sm text-gray-500">Statistics will appear as reports are submitted</p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CrimeStatisticsChart;