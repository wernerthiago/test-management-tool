import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, EditIcon, CheckCircle2Icon, XCircleIcon, MinusCircleIcon, BanIcon, DownloadIcon, CheckIcon, PieChart as PieChartIcon, X as XIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { TestCaseSelectionModal } from "@/components/TestCaseSelectionModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { domToPng } from "modern-screenshot";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const statusIcons: Record<string, React.ReactElement> = {
  passed: <CheckCircle2Icon className="h-4 w-4 text-green-600" />,
  failed: <XCircleIcon className="h-4 w-4 text-red-600" />,
  blocked: <BanIcon className="h-4 w-4 text-orange-600" />,
  not_run: <MinusCircleIcon className="h-4 w-4 text-gray-400" />,
  skipped: <MinusCircleIcon className="h-4 w-4 text-gray-400" />,
};

const statusColors: Record<string, string> = {
  passed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  blocked: "bg-orange-100 text-orange-800",
  not_run: "bg-gray-100 text-gray-800",
  skipped: "bg-gray-100 text-gray-800",
};

export default function TestRunDetail() {
  const [, params] = useRoute("/test-runs/:id");
  const [, setLocation] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTestCases, setEditTestCases] = useState<string[]>([]);
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [selectedExecutions, setSelectedExecutions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) {
      setLocation("/");
    } else {
      setSelectedProjectId(projectId);
    }
  }, [setLocation]);

  const utils = trpc.useUtils();
  const { data: testRun, isLoading } = trpc.testRuns.get.useQuery(
    { id: params?.id! },
    { enabled: !!params?.id }
  );

  const { data: testCases } = trpc.testCases.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId && editDialogOpen }
  );

  const { data: folders } = trpc.folders.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId && editDialogOpen }
  );

  const { data: customFields } = trpc.customFields.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId && editDialogOpen }
  );

  const updateExecutionMutation = trpc.testRuns.updateExecution.useMutation({
    onSuccess: () => {
      utils.testRuns.get.invalidate();
      toast.success("Execution updated");
    },
    onError: (error) => {
      toast.error("Failed to update execution: " + error.message);
    },
  });

  const updateTestRunMutation = trpc.testRuns.update.useMutation({
    onSuccess: () => {
      utils.testRuns.get.invalidate();
      toast.success("Test run updated");
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to update test run: " + error.message);
    },
  });

  const toggleExecutionSelection = (executionId: string) => {
    const newSelected = new Set(selectedExecutions);
    if (newSelected.has(executionId)) {
      newSelected.delete(executionId);
    } else {
      newSelected.add(executionId);
    }
    setSelectedExecutions(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedExecutions.size === testRun?.executions.length) {
      setSelectedExecutions(new Set());
    } else {
      setSelectedExecutions(new Set(testRun?.executions.map(e => e.id) || []));
    }
  };

  const handleBulkStatusChange = async (newStatus: "passed" | "failed" | "blocked" | "not_run" | "skipped") => {
    for (const executionId of Array.from(selectedExecutions)) {
      await updateExecutionMutation.mutateAsync({
        id: executionId,
        status: newStatus,
      });
    }
    setSelectedExecutions(new Set());
    toast.success(`Updated ${selectedExecutions.size} execution(s) to ${newStatus}`);
  };

  const handleStatusChange = (executionId: string, newStatus: string) => {
    updateExecutionMutation.mutate({
      id: executionId,
      status: newStatus as "passed" | "failed" | "blocked" | "not_run" | "skipped",
    });
  };

  const exportToPDF = () => {
    if (!testRun) return;

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(`Test Run Report: TR-${testRun.runNumber} ${testRun.name}`, 14, 20);
    
    // Add metadata
    doc.setFontSize(11);
    doc.text(`Description: ${testRun.description || "No description"}`, 14, 30);
    doc.text(`Created: ${testRun.createdAt ? new Date(testRun.createdAt).toLocaleDateString() : "N/A"}`, 14, 36);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);
    
    // Add statistics
    doc.setFontSize(12);
    doc.text("Summary Statistics", 14, 52);
    doc.setFontSize(10);
    doc.text(`Total: ${totalExecutions} | Passed: ${passedCount} | Failed: ${failedCount} | Blocked: ${blockedCount} | Not Run: ${notRunCount}`, 14, 58);
    
    // Prepare table data
    const tableData = testRun.executions.map(exec => [
      `TC-${exec.testCaseNumber}`,
      exec.testCaseTitle,
      exec.status.replace("_", " ").toUpperCase(),
      exec.executedAt ? new Date(exec.executedAt).toLocaleString() : "Not executed",
    ]);
    
    // Add table
    autoTable(doc, {
      startY: 65,
      head: [["Test Case ID", "Title", "Status", "Executed"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 80 },
        2: { cellWidth: 30 },
        3: { cellWidth: 45 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const status = data.cell.raw as string;
          if (status.includes("PASSED")) {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = "bold";
          } else if (status.includes("FAILED")) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          } else if (status.includes("BLOCKED")) {
            data.cell.styles.textColor = [249, 115, 22];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    
    // Save PDF
    doc.save(`TR-${testRun.runNumber}_${testRun.name.replace(/\s+/g, "_")}.pdf`);
    toast.success("PDF exported successfully");
  };

  const graphData = testRun
    ? [
        { name: "Passed", value: testRun.executions.filter((e) => e.status === "passed").length, color: "#10b981" },
        { name: "Failed", value: testRun.executions.filter((e) => e.status === "failed").length, color: "#ef4444" },
        { name: "Blocked", value: testRun.executions.filter((e) => e.status === "blocked").length, color: "#f59e0b" },
        { name: "Not Run", value: testRun.executions.filter((e) => e.status === "not_run").length, color: "#94a3b8" },
        { name: "Skipped", value: testRun.executions.filter((e) => e.status === "skipped").length, color: "#64748b" },
      ].filter((d) => d.value > 0)
    : [];

  const handleEdit = () => {
    if (!testRun) return;
    setEditName(testRun.name);
    setEditDescription(testRun.description || "");
    setEditTestCases(testRun.executions.map(e => e.testCaseId));
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!testRun) return;
    updateTestRunMutation.mutate({
      id: testRun.id,
      name: editName,
      description: editDescription,
      testCaseIds: editTestCases,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!testRun) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Test run not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/test-runs")}>
          Back to Test Runs
        </Button>
      </div>
    );
  }

  const totalExecutions = testRun.executions.length;
  const passedCount = testRun.executions.filter(e => e.status === "passed").length;
  const failedCount = testRun.executions.filter(e => e.status === "failed").length;
  const blockedCount = testRun.executions.filter(e => e.status === "blocked").length;
  const notRunCount = testRun.executions.filter(e => e.status === "not_run").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/test-runs")}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              TR-{testRun.runNumber} {testRun.name}
            </h1>
            <p className="text-muted-foreground">
              {testRun.description || "No description"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Created {testRun.createdAt ? new Date(testRun.createdAt).toLocaleDateString() : "N/A"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToPDF}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => setGraphModalOpen(true)}>
            <PieChartIcon className="h-4 w-4 mr-2" />
            View Graph
          </Button>
          <Button onClick={handleEdit}>
            <EditIcon className="h-4 w-4 mr-2" />
            Edit Test Run
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{passedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Not Run</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{notRunCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Test Executions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Test Executions</CardTitle>
              <CardDescription>Execute and track test case results</CardDescription>
            </div>
            {selectedExecutions.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedExecutions.size} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-green-50 text-green-700 hover:bg-green-100"
                  onClick={() => handleBulkStatusChange("passed")}
                >
                  <CheckCircle2Icon className="h-4 w-4 mr-1" />
                  Passed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-red-50 text-red-700 hover:bg-red-100"
                  onClick={() => handleBulkStatusChange("failed")}
                >
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  Failed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-orange-50 text-orange-700 hover:bg-orange-100"
                  onClick={() => handleBulkStatusChange("blocked")}
                >
                  <BanIcon className="h-4 w-4 mr-1" />
                  Blocked
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-gray-50 text-gray-700 hover:bg-gray-100"
                  onClick={() => handleBulkStatusChange("skipped")}
                >
                  <MinusCircleIcon className="h-4 w-4 mr-1" />
                  Skipped
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedExecutions(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedExecutions.size === testRun?.executions.length && testRun?.executions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Test Case ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Executed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testRun.executions.map(exec => (
                <TableRow key={exec.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedExecutions.has(exec.id)}
                      onCheckedChange={() => toggleExecutionSelection(exec.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="p-0 h-auto font-mono"
                      onClick={() => setLocation(`/test-cases/${exec.testCaseId}`)}
                    >
                      TC-{exec.testCaseNumber}
                    </Button>
                  </TableCell>
                  <TableCell>{exec.testCaseTitle}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[exec.status]}>
                      <span className="flex items-center gap-1">
                        {statusIcons[exec.status]}
                        {exec.status.replace("_", " ")}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {exec.executedAt ? new Date(exec.executedAt).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={exec.status}
                      onValueChange={(value) => handleStatusChange(exec.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passed">Passed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="not_run">Not Run</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Test Run</DialogTitle>
            <DialogDescription>Update test run name, description, and selected test cases</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Selected Test Cases *</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setSelectionModalOpen(true)}
              >
                {editTestCases.length === 0 
                  ? "Click to select test cases" 
                  : `${editTestCases.length} test case(s) selected`}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateTestRunMutation.isPending}>
              {updateTestRunMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Graph Modal */}
      <Dialog open={graphModalOpen} onOpenChange={setGraphModalOpen}>
          <DialogContent className="max-w-xl" showCloseButton={false}>
          <div>
            <Card id="test-run-graph">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>Test Run Results</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        const el = document.getElementById("test-run-graph");
                        if (!el) {
                          toast.error("Graph element not found");
                          return;
                        }
                        try {
                          const dataUrl = await domToPng(el, { scale: 2, backgroundColor: "#ffffff" });
                          const a = document.createElement("a");
                          a.href = dataUrl;
                          a.download = `${testRun ? `TR-${testRun.runNumber}_${testRun.name.replace(/\s+/g, "_")}` : "test-run-graph"}.png`;
                          a.click();
                          toast.success("Chart downloaded");
                        } catch (err) {
                          toast.error(`Failed to download chart: ${err instanceof Error ? err.message : String(err)}`);
                        }
                      }}
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setGraphModalOpen(false)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {graphData.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={graphData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {graphData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Case Selection Modal */}
      {testCases && folders && customFields && (
        <TestCaseSelectionModal
          open={selectionModalOpen}
          onOpenChange={setSelectionModalOpen}
          testCases={testCases}
          folders={folders}
          customFields={customFields}
          selectedTestCases={editTestCases}
          onSelectionChange={setEditTestCases}
          onConfirm={() => setSelectionModalOpen(false)}
        />
      )}
    </div>
  );
}

