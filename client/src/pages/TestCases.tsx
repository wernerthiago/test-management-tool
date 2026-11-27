import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  PlusIcon, TestTubeIcon, TrashIcon, UploadIcon, FolderIcon, FolderPlusIcon, 
  ChevronRightIcon, ChevronDownIcon, ArrowLeftIcon, ColumnsIcon, 
  MoveIcon, DownloadIcon 
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function TestCases() {
  const [, setLocation] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // Test case form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preconditions, setPreconditions] = useState("");
  const [folderId, setFolderId] = useState<string>("__root__");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [folderName, setFolderName] = useState("");
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(["id", "title"]));
  
  // Bulk operations
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [targetFolderId, setTargetFolderId] = useState<string>("__root__");

  useEffect(() => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) {
      setLocation("/");
    } else {
      setSelectedProjectId(projectId);
    }
  }, [setLocation]);

  const utils = trpc.useUtils();
  const { data: project } = trpc.projects.get.useQuery(
    { id: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: testCases, isLoading } = trpc.testCases.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: folders } = trpc.folders.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: customFields } = trpc.customFields.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const createMutation = trpc.testCases.create.useMutation({
    onSuccess: () => {
      utils.testCases.list.invalidate();
      toast.success("Test case created successfully");
      resetForm();
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to create test case: " + error.message);
    },
  });

  const deleteMutation = trpc.testCases.delete.useMutation({
    onSuccess: () => {
      utils.testCases.list.invalidate();
      toast.success("Test case deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete test case: " + error.message);
    },
  });
  
  const updateMutation = trpc.testCases.update.useMutation({
    onSuccess: () => {
      utils.testCases.list.invalidate();
      toast.success("Test cases moved successfully");
      setSelectedTestCases(new Set());
      setMoveDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to move test cases: " + error.message);
    },
  });

  const createFolderMutation = trpc.folders.create.useMutation({
    onSuccess: () => {
      utils.folders.list.invalidate();
      toast.success("Folder created successfully");
      setFolderName("");
      setFolderDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to create folder: " + error.message);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPreconditions("");
    setFolderId("__root__");
    setCustomFieldValues({});
  };

  const handleCreate = () => {
    if (!selectedProjectId || !title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const actualFolderId = folderId === "__root__" ? undefined : folderId;

    createMutation.mutate({
      projectId: selectedProjectId,
      title: title.trim(),
      description: description.trim() || undefined,
      preconditions: preconditions.trim() || undefined,
      folderId: actualFolderId,
      customFieldValues: Object.entries(customFieldValues).map(([customFieldId, value]) => ({
        customFieldId,
        value,
      })),
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const generateCsvTemplate = () => {
    // Generate CSV template dynamically based on custom fields
    const baseColumns = ["title", "description", "preconditions"];
    const customFieldColumns = customFields?.map(f => f.name.toLowerCase().replace(/\s+/g, "")) || [];
    const allColumns = [...baseColumns, ...customFieldColumns];
    
    // Create example rows
    const exampleRow1 = [
      "Login Test",
      "Test user login functionality",
      "User account exists",
      ...customFields?.map(f => {
        if (f.name.toLowerCase() === "type") return "manual";
        if (f.name.toLowerCase() === "priority") return "high";
        return "";
      }) || []
    ];
    
    const exampleRow2 = [
      "API Test",
      "Test API endpoint response",
      "Server running",
      ...customFields?.map(f => {
        if (f.name.toLowerCase() === "type") return "automated";
        if (f.name.toLowerCase() === "priority") return "medium";
        return "";
      }) || []
    ];
    
    const csvContent = [
      allColumns.join(","),
      exampleRow1.map(cell => `"${cell}"`).join(","),
      exampleRow2.map(cell => `"${cell}"`).join(",")
    ].join("\n");
    
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
  };

  const handleCsvUpload = async () => {
    if (!csvFile || !selectedProjectId) return;

    const text = await csvFile.text();
    const lines = text.split("\n").filter(line => line.trim());
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

    let importedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      if (row.title) {
        // Map CSV columns to custom fields dynamically
        const customFieldValuesArray: Array<{ customFieldId: string; value: string }> = [];
        
        // Iterate through all custom fields and match with CSV columns
        customFields?.forEach(field => {
          const fieldNameNormalized = field.name.toLowerCase().replace(/\s+/g, "");
          
          // Try multiple matching strategies
          let value: string | undefined;
          
          // Strategy 1: Direct match (e.g., "type" matches "type")
          if (row[fieldNameNormalized]) {
            value = row[fieldNameNormalized];
          }
          
          // Strategy 2: Match with "test" prefix (e.g., "testtype" matches "type")
          const withTestPrefix = `test${fieldNameNormalized}`;
          if (!value && row[withTestPrefix]) {
            value = row[withTestPrefix];
          }
          
          // Strategy 3: Try original field name as-is
          const originalName = field.name.toLowerCase();
          if (!value && row[originalName]) {
            value = row[originalName];
          }
          
          if (value && value.trim()) {
            customFieldValuesArray.push({
              customFieldId: field.id,
              value: value.trim(),
            });
          }
        });

        try {
          // Import sequentially to ensure unique TC-# IDs
          await createMutation.mutateAsync({
            projectId: selectedProjectId,
            title: row.title,
            description: row.description || undefined,
            preconditions: row.preconditions || undefined,
            folderId: undefined,
            customFieldValues: customFieldValuesArray,
          });
          importedCount++;
        } catch (error) {
          console.error(`Failed to import test case: ${row.title}`, error);
        }
      }
    }

    toast.success(`Imported ${importedCount} test cases`);
    setCsvFile(null);
    setCsvDialogOpen(false);
  };

  const handleCreateFolder = () => {
    if (!selectedProjectId || !folderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    createFolderMutation.mutate({
      projectId: selectedProjectId,
      name: folderName.trim(),
    });
  };

  const toggleColumnVisibility = (columnId: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(columnId)) {
      newVisible.delete(columnId);
    } else {
      newVisible.add(columnId);
    }
    setVisibleColumns(newVisible);
  };

  const toggleTestCaseSelection = (testCaseId: string) => {
    const newSelected = new Set(selectedTestCases);
    if (newSelected.has(testCaseId)) {
      newSelected.delete(testCaseId);
    } else {
      newSelected.add(testCaseId);
    }
    setSelectedTestCases(newSelected);
  };

  const toggleFolderSelection = (folderId: string) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(folderId)) {
      newSelected.delete(folderId);
    } else {
      newSelected.add(folderId);
    }
    setSelectedFolders(newSelected);
    
    // Also select/deselect all test cases in this folder
    const folderTestCases = testCases?.filter(tc => 
      (folderId === "__root__" && !tc.folderId) || tc.folderId === folderId
    ) || [];
    
    const newTestCaseSelection = new Set(selectedTestCases);
    folderTestCases.forEach(tc => {
      if (newSelected.has(folderId)) {
        newTestCaseSelection.add(tc.id);
      } else {
        newTestCaseSelection.delete(tc.id);
      }
    });
    setSelectedTestCases(newTestCaseSelection);
  };

  const handleBulkMove = async () => {
    const actualTargetFolderId = targetFolderId === "__root__" ? undefined : targetFolderId;
    
    for (const testCaseId of Array.from(selectedTestCases)) {
      await updateMutation.mutateAsync({
        id: testCaseId,
        folderId: actualTargetFolderId,
      });
    }
    
    setSelectedTestCases(new Set());
    setSelectedFolders(new Set());
    setMoveDialogOpen(false);
  };

  const handleBulkDelete = async () => {
    for (const testCaseId of Array.from(selectedTestCases)) {
      await deleteMutation.mutateAsync({ id: testCaseId });
    }
    
    setSelectedTestCases(new Set());
    setSelectedFolders(new Set());
    setDeleteDialogOpen(false);
  };

  const handleExportCSV = () => {
    const selectedTestCasesList = testCases?.filter(tc => selectedTestCases.has(tc.id)) || [];
    
    if (selectedTestCasesList.length === 0) {
      toast.error("No test cases selected");
      return;
    }

    // Create CSV content dynamically based on custom fields
    const baseHeaders = ["title", "description", "preconditions"];
    const customFieldHeaders = customFields?.map(f => f.name.toLowerCase().replace(/\s+/g, "")) || [];
    const headers = [...baseHeaders, ...customFieldHeaders];
    
    const rows = selectedTestCasesList.map(tc => {
      const baseValues = [
        tc.title,
        tc.description || "",
        tc.preconditions || ""
      ];
      
      const customFieldValues = customFields?.map(field => {
        return (tc as any).customFieldValues?.[field.id] || "";
      }) || [];
      
      return [...baseValues, ...customFieldValues];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test_cases_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedTestCasesList.length} test cases`);
    setSelectedTestCases(new Set());
    setSelectedFolders(new Set());
  };

  const filteredTestCases = selectedFolderId === null
    ? testCases || []
    : testCases?.filter(tc => 
        (selectedFolderId === "__root__" && !tc.folderId) || tc.folderId === selectedFolderId
      ) || [];

  // Group test cases by folder when showing all
  const groupedTestCases = (testCases || []).reduce((acc, tc) => {
    const key = tc.folderId || "__root__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(tc);
    return acc;
  }, {} as Record<string, Array<NonNullable<typeof testCases>[number]>>);

  const hasSelection = selectedTestCases.size > 0;

  if (!selectedProjectId) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Test Cases</h1>
            <p className="text-muted-foreground mt-1">
              {project?.name || "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ColumnsIcon className="h-4 w-4 mr-2" />
                  <span data-testid="tc-columns-button">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.has("id")}
                  onCheckedChange={() => toggleColumnVisibility("id")}
                >
                  ID
                </DropdownMenuCheckboxItem>
                {customFields?.map(field => (
                  <DropdownMenuCheckboxItem
                    key={field.id}
                    checked={visibleColumns.has(field.id)}
                    onCheckedChange={() => toggleColumnVisibility(field.id)}
                  >
                    {field.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="tc-new-folder-button">
                  <FolderPlusIcon className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Folder</DialogTitle>
                </DialogHeader>
                  <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="folderName">Folder Name</Label>
                    <Input
                      id="folderName"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="e.g., Login Tests"
                      data-testid="tc-folder-name-input"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFolderDialogOpen(false)} data-testid="tc-folder-cancel">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateFolder} data-testid="tc-folder-create">Create Folder</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="tc-import-csv-button">
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Test Cases from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file with columns: title, description, preconditions, and your custom fields ({customFields?.map(f => f.name).join(", ") || "none"}).
                    <br />
                    <a
                      href={generateCsvTemplate()}
                      download="test_cases_template.csv"
                      className="text-primary hover:underline font-medium"
                    >
                      Download CSV Template
                    </a>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    data-testid="tc-csv-input"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCsvDialogOpen(false)} data-testid="tc-csv-cancel">
                    Cancel
                  </Button>
                  <Button onClick={handleCsvUpload} disabled={!csvFile} data-testid="tc-csv-import">
                    Import
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="tc-new-testcase-button">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Test Case
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Test Case</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Test case title"
                      data-testid="tc-title-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="folder">Folder</Label>
                    <div className="flex gap-2">
                      <Select value={folderId} onValueChange={setFolderId} data-testid="tc-folder-select">
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select folder" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__root__">Root (No folder)</SelectItem>
                          {folders?.map(folder => (
                            <SelectItem key={folder.id} value={folder.id} data-testid={`tc-folder-option-${folder.id}`}>
                              {folder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFolderDialogOpen(true)}
                      >
                        <FolderPlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Test case description"
                      rows={3}
                      data-testid="tc-description-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preconditions">Preconditions</Label>
                    <Textarea
                      id="preconditions"
                      value={preconditions}
                      onChange={(e) => setPreconditions(e.target.value)}
                      placeholder="Prerequisites for this test"
                      rows={2}
                      data-testid="tc-preconditions-input"
                    />
                  </div>

                  {customFields && customFields.length > 0 && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="font-semibold">Custom Fields</h3>
                      {customFields.map(field => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={`custom-${field.id}`}>{field.name}</Label>
                          {field.fieldType === "dropdown" ? (
                            <Select
                              value={customFieldValues[field.id] || ""}
                              onValueChange={(value) => 
                                setCustomFieldValues(prev => ({ ...prev, [field.id]: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${field.name}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.split(",").map(option => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.fieldType === "multiselect" ? (
                            <div className="flex flex-col gap-2 mt-2">
                              {field.options?.split(",").map(opt => {
                                const option = opt.trim();
                                const selected = (customFieldValues[field.id] || "").split(",").map(s => s.trim()).filter(Boolean).includes(option);
                                return (
                                  <label key={option} className="inline-flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={(e) => {
                                        setCustomFieldValues(prev => {
                                          const current = (prev[field.id] || "").split(",").map(s => s.trim()).filter(Boolean);
                                          let next: string[];
                                          if (e.target.checked) {
                                            next = Array.from(new Set([...current, option]));
                                          } else {
                                            next = current.filter(v => v !== option);
                                          }
                                          return { ...prev, [field.id]: next.join(",") };
                                        });
                                      }}
                                      className="h-4 w-4"
                                    />
                                    <span className="text-sm">{option}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <Input
                              id={`custom-${field.id}`}
                              type={field.fieldType === "number" ? "number" : "text"}
                              value={customFieldValues[field.id] || ""}
                              onChange={(e) => 
                                setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))
                              }
                              placeholder={`Enter ${field.name}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="tc-create-cancel">
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} data-testid="tc-create-submit">Create Test Case</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Bulk Action Buttons */}
        {hasSelection && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedTestCases.size} test case{selectedTestCases.size !== 1 ? "s" : ""} selected
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setMoveDialogOpen(true)}>
                  <MoveIcon className="h-4 w-4 mr-2" />
                  Move
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedTestCases(new Set());
                    setSelectedFolders(new Set());
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Move Dialog */}
        <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move Test Cases</DialogTitle>
              <DialogDescription>
                Select the destination folder for {selectedTestCases.size} test case{selectedTestCases.size !== 1 ? "s" : ""}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>From: Current Folders</Label>
                <Label>To:</Label>
                <div className="flex gap-2">
                  <Select value={targetFolderId} onValueChange={setTargetFolderId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select destination folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__root__">Root (No folder)</SelectItem>
                      {folders?.map(folder => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFolderDialogOpen(true)}
                  >
                    <FolderPlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkMove}>Move</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Test Cases</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedTestCases.size} test case{selectedTestCases.size !== 1 ? "s" : ""}? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-6">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ) : selectedFolderId === null ? (
            <div className="space-y-4">
              {Object.entries(groupedTestCases).map(([folderId, cases]) => {
                const folderName = folderId === "__root__" 
                  ? "Root" 
                  : folders?.find(f => f.id === folderId)?.name || "Unknown";
                const isFolderSelected = selectedFolders.has(folderId);
                
                return (
                  <Card key={folderId}>
                    <div className="p-4 border-b bg-muted/50 flex items-center gap-3">
                      <Checkbox
                        checked={isFolderSelected}
                        onCheckedChange={() => toggleFolderSelection(folderId)}
                      />
                      <h3 className="font-semibold flex items-center gap-2">
                        <FolderIcon className="h-4 w-4" />
                        {folderName}
                        <span className="text-sm text-muted-foreground font-normal">
                          ({cases.length} test case{cases.length !== 1 ? "s" : ""})
                        </span>
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          {visibleColumns.has("id") && <TableHead className="w-24">ID</TableHead>}
                          <TableHead>Title</TableHead>
                          {customFields?.filter(f => visibleColumns.has(f.id)).map(field => (
                            <TableHead key={field.id}>{field.name}</TableHead>
                          ))}
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cases.map(tc => (
                          <TableRow key={tc.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTestCases.has(tc.id)}
                                onCheckedChange={() => toggleTestCaseSelection(tc.id)}
                              />
                            </TableCell>
                            {visibleColumns.has("id") && (
                              <TableCell className="font-mono text-sm">
                                <button
                                  onClick={() => setLocation(`/test-cases/${tc.id}`)}
                                  className="text-blue-600 hover:underline cursor-pointer"
                                >
                                  TC-{tc.testCaseNumber}
                                </button>
                              </TableCell>
                            )}
                            <TableCell className="font-medium">{tc.title}</TableCell>
                            {customFields?.filter(f => visibleColumns.has(f.id)).map(field => (
                              <TableCell key={field.id}>
                                {field.fieldType === "multiselect" ? (
                                  <div className="flex flex-wrap gap-2">
                                    {((tc as any).customFieldValues?.[field.id] || "").split(",").map((v: string) => v.trim()).filter(Boolean).map((v: string) => (
                                      <span key={v} className="inline-block">
                                        <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium">{v}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  (tc as any).customFieldValues?.[field.id] || "-"
                                )}
                              </TableCell>
                            ))}
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(tc.id, tc.title)}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                );
              })}
              {Object.values(groupedTestCases).every(cases => cases.length === 0) && (
                <Card className="p-12 text-center text-muted-foreground">
                  <TestTubeIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No test cases found</p>
                </Card>
              )}
            </div>
          ) : filteredTestCases.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <TestTubeIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No test cases found</p>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    {visibleColumns.has("id") && <TableHead className="w-24">ID</TableHead>}
                    <TableHead>Title</TableHead>
                    {customFields?.filter(f => visibleColumns.has(f.id)).map(field => (
                      <TableHead key={field.id}>{field.name}</TableHead>
                    ))}
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTestCases.map(tc => (
                    <TableRow key={tc.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTestCases.has(tc.id)}
                          onCheckedChange={() => toggleTestCaseSelection(tc.id)}
                        />
                      </TableCell>
                      {visibleColumns.has("id") && (
                        <TableCell className="font-mono text-sm">
                          <button
                            onClick={() => setLocation(`/test-cases/${tc.id}`)}
                            className="text-blue-600 hover:underline cursor-pointer"
                          >
                            TC-{tc.testCaseNumber}
                          </button>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{tc.title}</TableCell>
                      {customFields?.filter(f => visibleColumns.has(f.id)).map(field => (
                        <TableCell key={field.id}>
                          {(tc as any).customFieldValues?.[field.id] || "-"}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tc.id, tc.title)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

