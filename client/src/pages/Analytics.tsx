import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon, DownloadIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { domToPng } from "modern-screenshot";

interface Widget {
  id: string;
  name: string;
  graphType: "pie" | "bar";
  metricType: "custom_fields" | "test_cases" | "test_runs";
  metricOption: string; // customFieldId, "by_folder", "execution_status"
}

const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function Analytics() {
  const [, setLocation] = useLocation();
  const selectedProjectId = localStorage.getItem("selectedProjectId");

  const [widgets, setWidgets] = useState<Widget[]>([
    { id: "1", name: "Test Execution Status", graphType: "pie", metricType: "test_runs", metricOption: "execution_status" },
    { id: "2", name: "Test Cases by Folder", graphType: "pie", metricType: "test_cases", metricOption: "by_folder" },
  ]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [widgetName, setWidgetName] = useState("");
  const [graphType, setGraphType] = useState<"pie" | "bar">("pie");
  const [metricType, setMetricType] = useState<"custom_fields" | "test_cases" | "test_runs">("test_runs");
  const [metricOption, setMetricOption] = useState("");

  // Fetch data
  const { data: project } = trpc.projects.get.useQuery(
    { id: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: executionStats } = trpc.analytics.executionStats.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: folderStats } = trpc.analytics.testCasesByFolder.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: customFields } = trpc.customFields.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: testCases } = trpc.testCases.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: folders } = trpc.folders.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const handleChangeProject = () => {
    localStorage.removeItem("selectedProjectId");
    setLocation("/");
  };

  const handleCreateWidget = () => {
    if (!widgetName.trim()) {
      toast.error("Widget name is required");
      return;
    }
    if (!metricOption) {
      toast.error("Please select a metric option");
      return;
    }

    const newWidget: Widget = {
      id: Date.now().toString(),
      name: widgetName,
      graphType,
      metricType,
      metricOption,
    };

    setWidgets([...widgets, newWidget]);
    setCreateDialogOpen(false);
    setWidgetName("");
    setMetricOption("");
    toast.success("Widget created successfully");
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    toast.success("Widget removed");
  };

  const handleDownloadWidget = async (widgetId: string, widgetName: string) => {
    const element = document.getElementById(`widget-${widgetId}`);
    if (!element) {
      toast.error("Widget element not found");
      return;
    }

    try {
      const dataUrl = await domToPng(element, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      
      const link = document.createElement("a");
      link.download = `${widgetName.replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Widget downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error(`Failed to download widget: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const getWidgetData = (widget: Widget) => {
    if (widget.metricType === "test_runs" && widget.metricOption === "execution_status") {
      if (!executionStats) return [];
      
      const statusMap: Record<string, { name: string; color: string }> = {
        passed: { name: "Passed", color: "#10b981" },
        failed: { name: "Failed", color: "#ef4444" },
        blocked: { name: "Blocked", color: "#f59e0b" },
        not_run: { name: "Not Run", color: "#94a3b8" },
        skipped: { name: "Skipped", color: "#64748b" },
      };

      return executionStats.map(stat => ({
        name: statusMap[stat.status]?.name || stat.status,
        value: stat.count,
        color: statusMap[stat.status]?.color || "#94a3b8",
      })).filter(item => item.value > 0);
    }

    if (widget.metricType === "test_cases" && widget.metricOption === "by_folder") {
      if (!folderStats || !folders) return [];
      return folderStats.map((stat, index) => {
        const folder = folders.find(f => f.id === stat.folderId);
        return {
          name: folder?.name || "No Folder",
          value: stat.count,
          color: COLORS[index % COLORS.length],
        };
      });
    }

    if (widget.metricType === "custom_fields") {
      if (!testCases) return [];
      const customFieldId = widget.metricOption;
      const distribution: Record<string, number> = {};

      testCases.forEach(tc => {
        const value = tc.customFieldValues[customFieldId] || "Not Set";
        distribution[value] = (distribution[value] || 0) + 1;
      });

      return Object.entries(distribution).map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
      }));
    }

    return [];
  };

  const renderWidget = (widget: Widget) => {
    const data = getWidgetData(widget);

    return (
      <Card key={widget.id} id={`widget-${widget.id}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>{widget.name}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownloadWidget(widget.id, widget.name)}
              >
                <DownloadIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveWidget(widget.id)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              {widget.graphType === "pie" ? (
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#3b82f6">
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!selectedProjectId) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {/* Project selection moved to user menu */}
          </div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">{project?.name} - Visualize your test data</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Widget
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {widgets.map(widget => renderWidget(widget))}
      </div>

      {widgets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No widgets yet. Create your first analytics widget!</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Analytics Widget</DialogTitle>
            <DialogDescription>Configure your custom analytics widget</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="widgetName">Widget Name *</Label>
              <Input
                id="widgetName"
                value={widgetName}
                onChange={(e) => setWidgetName(e.target.value)}
                placeholder="e.g., Priority Distribution"
              />
            </div>

            <div>
              <Label htmlFor="graphType">Graph Type *</Label>
              <Select value={graphType} onValueChange={(value: "pie" | "bar") => setGraphType(value)}>
                <SelectTrigger id="graphType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="metricType">Metric Type *</Label>
              <Select
                value={metricType}
                onValueChange={(value: "custom_fields" | "test_cases" | "test_runs") => {
                  setMetricType(value);
                  setMetricOption("");
                }}
              >
                <SelectTrigger id="metricType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom_fields">Custom Fields</SelectItem>
                  <SelectItem value="test_cases">Test Cases</SelectItem>
                  <SelectItem value="test_runs">Test Runs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="metricOption">Metric Option *</Label>
              {metricType === "custom_fields" ? (
                <Select value={metricOption} onValueChange={setMetricOption}>
                  <SelectTrigger id="metricOption">
                    <SelectValue placeholder="Select a custom field" />
                  </SelectTrigger>
                  <SelectContent>
                    {customFields?.map(field => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : metricType === "test_cases" ? (
                <Select value={metricOption} onValueChange={setMetricOption}>
                  <SelectTrigger id="metricOption">
                    <SelectValue placeholder="Select a metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="by_folder">Test Cases by Folder</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Select value={metricOption} onValueChange={setMetricOption}>
                  <SelectTrigger id="metricOption">
                    <SelectValue placeholder="Select a metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="execution_status">Execution Status</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWidget}>Create Widget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

