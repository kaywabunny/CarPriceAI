import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Search, 
  TrendingUp, 
  Clock,
  Download,
  Trash2,
  Car,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getAnalyticsSummary, exportEvents, clearEvents } from '@/lib/analytics';
import { formatRelativeTime } from '@/lib/utils';
import { EVENT_TYPES } from '@/lib/types';

export const AnalyticsDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    const data = getAnalyticsSummary();
    setSummary(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    const data = exportEvents();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
      clearEvents();
      loadData();
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  // Prepare chart data
  const eventChartData = Object.entries(summary.eventCounts)
    .map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topMakesData = Object.entries(summary.topMakes)
    .map(([name, count]) => ({ name, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];

  const getEventIcon = (eventName) => {
    switch (eventName) {
      case EVENT_TYPES.PAGE_VIEW:
        return <Eye className="w-3 h-3" />;
      case EVENT_TYPES.PREDICT_SUBMITTED:
      case EVENT_TYPES.PREDICT_SUCCESS:
        return <Search className="w-3 h-3" />;
      case EVENT_TYPES.PREDICT_ERROR:
        return <AlertCircle className="w-3 h-3 text-destructive" />;
      case EVENT_TYPES.GRAPH_OPENED:
      case EVENT_TYPES.GRAPH_LOADED:
        return <BarChart3 className="w-3 h-3" />;
      case EVENT_TYPES.CTA_CLICKED:
        return <TrendingUp className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="analytics-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track user behavior and predictions</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadData}
            data-testid="refresh-analytics"
          >
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            data-testid="export-analytics"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClear}
            className="text-destructive hover:text-destructive"
            data-testid="clear-analytics"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={summary.totalEvents}
          icon={<BarChart3 className="w-4 h-4" />}
          testId="stat-total-events"
        />
        <StatCard
          title="Unique Sessions"
          value={summary.uniqueSessions}
          icon={<Users className="w-4 h-4" />}
          testId="stat-sessions"
        />
        <StatCard
          title="Predictions"
          value={summary.predictions.total}
          icon={<Search className="w-4 h-4" />}
          subtext={`${summary.predictions.successful} successful`}
          testId="stat-predictions"
        />
        <StatCard
          title="Success Rate"
          value={summary.predictions.total > 0 
            ? `${Math.round((summary.predictions.successful / summary.predictions.total) * 100)}%`
            : 'N/A'}
          icon={<TrendingUp className="w-4 h-4" />}
          testId="stat-success-rate"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events by Type */}
        <Card data-testid="events-chart">
          <CardHeader>
            <CardTitle className="text-base font-heading">Events by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {eventChartData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No event data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Makes */}
        <Card data-testid="top-makes-chart">
          <CardHeader>
            <CardTitle className="text-base font-heading">Top Searched Makes</CardTitle>
          </CardHeader>
          <CardContent>
            {topMakesData.length > 0 ? (
              <div className="h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topMakesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={false}
                    >
                      {topMakesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No searches yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Events Table */}
      <Card data-testid="recent-events">
        <CardHeader>
          <CardTitle className="text-base font-heading">Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.recentEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentEvents.slice(0, 15).map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventIcon(event.event_name)}
                          <Badge variant="outline" className="text-xs font-normal">
                            {event.event_name.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {event.payload?.make && `${event.payload.make} ${event.payload.model || ''}`}
                        {event.payload?.button_name && `Button: ${event.payload.button_name}`}
                        {event.payload?.page_name && `Page: ${event.payload.page_name}`}
                        {!event.payload?.make && !event.payload?.button_name && !event.payload?.page_name && '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatRelativeTime(event.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No events recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Note */}
      <p className="text-xs text-muted-foreground text-center">
        All analytics data is stored locally in your browser. This is a demo implementation.
      </p>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, subtext, testId }) => (
  <Card data-testid={testId}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-heading font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </div>
    </CardContent>
  </Card>
);
