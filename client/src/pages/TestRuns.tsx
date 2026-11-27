import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, PlayIcon, TrashIcon, CheckCircle2Icon, XCircleIcon, MinusCircleIcon, BanIcon, ArrowLeftIcon } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { TestCaseSelectionModal } from "@/components/TestCaseSelectionModal";

export default function TestRuns() {
  const [, setLocation] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  useEffect(() => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) {
      setLocation("/");
    } else {
      setSelectedProjectId(projectId);
    }
  }, [setLocation]);


  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: project } = trpc.projects.get.useQuery(
    { id: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: testRuns, isLoading } = trpc.testRuns.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: testCases } = trpc.testCases.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId && createDialogOpen }
  );
  const { data: folders } = trpc.folders.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId && createDialogOpen }
  );
  const { data: customFields } = trpc.customFields.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId && createDialogOpen }
  );


  const createMutation = trpc.testRuns.create.useMutation({
    onSuccess: () => {
      utils.testRuns.list.invalidate();
      toast.success("Test run created successfully");
      setCreateDialogOpen(false);
      setName("");
      setDescription("");
      setSelectedTestCases([]);
    },
    onError: (error: any) => {
      toast.error("Failed to create test run: " + error.message);
    },
  });



  const deleteMutation = trpc.testRuns.delete.useMutation({
    onSuccess: () => {
      utils.testRuns.list.invalidate();
      toast.success("Test run deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete test run: " + error.message);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Run name is required");
      return;
    }
    if (selectedTestCases.length === 0) {
      toast.error("Please select at least one test case");
      return;
    }

    createMutation.mutate({
      projectId: selectedProjectId!,
      name,
      description,
      testCaseIds: selectedTestCases,
    });
  };

  const handleDelete = (id: string, runName: string) => {
    if (confirm(`Are you sure you want to delete "${runName}"?`)) {
      deleteMutation.mutate({ id });
    }
  };



  const handleChangeProject = () => {
    localStorage.removeItem("selectedProjectId");
    setLocation("/");
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
          <h1 className="text-3xl font-bold">Test Runs</h1>
          <p className="text-muted-foreground">{project?.name} - Execute and track test runs</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Test Run
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Test Run</DialogTitle>
              <DialogDescription>Select test cases to include in this run</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Run Name *</Label>
                <Input
                  id="name"
                  placeholder="Sprint 1 - Regression Tests"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Test run description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Select Test Cases *</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setSelectionModalOpen(true)}
                >
                  {selectedTestCases.length === 0 
                    ? "Click to select test cases" 
                    : `${selectedTestCases.length} test case(s) selected`}
                </Button>
                {selectedTestCases.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Click the button above to modify your selection
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Test Run"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Test Runs List */}
      {selectedProjectId && (
        <div className="grid gap-4">
          {isLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)
          ) : testRuns && testRuns.length > 0 ? (
            testRuns.map((run: any) => (
              <Card key={run.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <PlayIcon className="h-5 w-5 text-primary" />
                        <Button
                          variant="link"
                          className="p-0 h-auto text-2xl font-bold"
                          onClick={() => setLocation(`/test-runs/${run.id}`)}
                        >
                          TR-{run.runNumber} {run.name}
                        </Button>
                      </CardTitle>
                      <CardDescription>{run.description || "No description"}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(run.id, run.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <TrashIcon className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Created {run.createdAt ? new Date(run.createdAt).toLocaleDateString() : "N/A"}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <PlayIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No test runs yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first test run to start executing tests
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Test Run
                </Button>
              </CardContent>
            </Card>
          )}
        

      {/* Test Case Selection Modal */}
      <TestCaseSelectionModal
        open={selectionModalOpen}
        onOpenChange={setSelectionModalOpen}
        testCases={testCases || []}
        folders={folders || []}
        customFields={customFields || []}
        selectedTestCases={selectedTestCases}
        onSelectionChange={setSelectedTestCases}
        onConfirm={() => setSelectionModalOpen(false)}
      /></div>
      )}
    </div>
  );
}
