import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusIcon, TrashIcon, CodeIcon, FolderIcon, SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Settings() {
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


  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<string>("text");
  const [fieldOptions, setFieldOptions] = useState("");
  
  const [folderName, setFolderName] = useState("");
  
  // Edit custom field state
  const [editFieldDialogOpen, setEditFieldDialogOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState("");
  const [editFieldType, setEditFieldType] = useState<string>("text");
  const [editFieldOptions, setEditFieldOptions] = useState("");

  const utils = trpc.useUtils();
  const { data: project } = trpc.projects.get.useQuery(
    { id: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: customFields } = trpc.customFields.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: folders } = trpc.folders.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const createCustomFieldMutation = trpc.customFields.create.useMutation({
    onSuccess: () => {
      utils.customFields.list.invalidate();
      utils.testCases.list.invalidate();
      toast.success("Custom field created successfully");
      setCustomFieldDialogOpen(false);
      setFieldName("");
      setFieldType("text");
      setFieldOptions("");
    },
    onError: (error: any) => {
      toast.error("Failed to create custom field: " + error.message);
    },
  });


  const updateCustomFieldMutation = trpc.customFields.update.useMutation({
    onSuccess: () => {
      utils.customFields.list.invalidate();
      utils.testCases.list.invalidate();
      toast.success("Custom field updated successfully");
      setEditFieldDialogOpen(false);
      setEditingFieldId(null);
      setEditFieldName("");
      setEditFieldType("text");
      setEditFieldOptions("");
    },
    onError: (error: any) => {
      toast.error("Failed to update custom field: " + error.message);
    },
  });

  const deleteCustomFieldMutation = trpc.customFields.delete.useMutation({
    onSuccess: () => {
      utils.customFields.list.invalidate();
      utils.testCases.list.invalidate();
      toast.success("Custom field deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete custom field: " + error.message);
    },
  });

  const createFolderMutation = trpc.folders.create.useMutation({
    onSuccess: () => {
      utils.folders.list.invalidate();
      toast.success("Folder created successfully");
      setFolderDialogOpen(false);
      setFolderName("");
    },
    onError: (error: any) => {
      toast.error("Failed to create folder: " + error.message);
    },
  });

  const deleteFolderMutation = trpc.folders.delete.useMutation({
    onSuccess: () => {
      utils.folders.list.invalidate();
      toast.success("Folder deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete folder: " + error.message);
    },
  });

  const handleCreateCustomField = () => {
    if (!fieldName.trim()) {
      toast.error("Field name is required");
      return;
    }
    if ((fieldType === "dropdown" || fieldType === "multiselect") && !fieldOptions.trim()) {
      toast.error("Options are required for dropdown/multiselect fields");
      return;
    }

    createCustomFieldMutation.mutate({
      projectId: selectedProjectId!,
      name: fieldName,
      fieldType: fieldType as any,
      options: fieldOptions || undefined,
    });
  };


  const handleEditCustomField = (field: any) => {
    setEditingFieldId(field.id);
    setEditFieldName(field.name);
    setEditFieldType(field.fieldType);
    setEditFieldOptions(field.options || "");
    setEditFieldDialogOpen(true);
  };

  const handleUpdateCustomField = () => {
    if (!editFieldName.trim()) {
      toast.error("Field name is required");
      return;
    }

    if ((editFieldType === "dropdown" || editFieldType === "multiselect") && !editFieldOptions.trim()) {
      toast.error("Options are required for dropdown and multi-select fields");
      return;
    }

    updateCustomFieldMutation.mutate({
      id: editingFieldId!,
      name: editFieldName,
      fieldType: editFieldType as any,
      options: (editFieldType === "dropdown" || editFieldType === "multiselect") ? editFieldOptions : null,
    });
  };

  const handleCreateFolder = () => {
    if (!folderName.trim()) {
      toast.error("Folder name is required");
      return;
    }

    createFolderMutation.mutate({
      projectId: selectedProjectId!,
      name: folderName,
    });
  };

  const playwrightReporterCode = `// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['./custom-reporter.ts']
  ],
});

// custom-reporter.ts
import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class TestManagementReporter implements Reporter {
  private results: any[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.results.push({
      testCaseTitle: test.title,
      status: result.status === 'passed' ? 'passed' : 
              result.status === 'failed' ? 'failed' : 
              result.status === 'skipped' ? 'skipped' : 'not_run',
      duration: result.duration,
      errorMessage: result.error?.message,
    });
  }

  async onEnd() {
    const response = await fetch('YOUR_APP_URL/api/playwright/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'YOUR_PROJECT_ID',
        runName: \`Automated Run - \${new Date().toISOString()}\`,
        results: this.results,
      }),
    });
    
    const data = await response.json();
    console.log('Test results uploaded:', data);
  }
}

export default TestManagementReporter;`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your test management settings</p>
      </div>

{selectedProjectId && (
        <Tabs defaultValue="custom-fields" className="space-y-4">
          <TabsList>
            <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
            <TabsTrigger value="folders">Folders</TabsTrigger>
            <TabsTrigger value="playwright">Playwright Reporter</TabsTrigger>
          </TabsList>

          <TabsContent value="custom-fields" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Custom Fields</CardTitle>
                    <CardDescription>Define custom fields for test cases</CardDescription>
                  </div>
                  <Dialog open={customFieldDialogOpen} onOpenChange={setCustomFieldDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Custom Field</DialogTitle>
                        <DialogDescription>Add a new custom field for test cases</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="fieldName">Field Name *</Label>
                          <Input
                            id="fieldName"
                            placeholder="e.g., Browser, Environment"
                            value={fieldName}
                            onChange={(e) => setFieldName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fieldType">Field Type *</Label>
                          <Select value={fieldType} onValueChange={setFieldType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="dropdown">Dropdown</SelectItem>
                              <SelectItem value="multiselect">Multi-select</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(fieldType === "dropdown" || fieldType === "multiselect") && (
                          <div className="space-y-2">
                            <Label htmlFor="fieldOptions">Options (comma-separated) *</Label>
                            <Input
                              id="fieldOptions"
                              placeholder="Chrome, Firefox, Safari"
                              value={fieldOptions}
                              onChange={(e) => setFieldOptions(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCustomFieldDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateCustomField} disabled={createCustomFieldMutation.isPending}>
                          {createCustomFieldMutation.isPending ? "Creating..." : "Create Field"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
              
              {/* Edit Custom Field Dialog */}
              <Dialog open={editFieldDialogOpen} onOpenChange={setEditFieldDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Custom Field</DialogTitle>
                    <DialogDescription>Update the custom field properties</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="editFieldName">Field Name *</Label>
                      <Input
                        id="editFieldName"
                        placeholder="e.g., Browser, Environment"
                        value={editFieldName}
                        onChange={(e) => setEditFieldName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editFieldType">Field Type *</Label>
                      <Select value={editFieldType} onValueChange={setEditFieldType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="dropdown">Dropdown</SelectItem>
                          <SelectItem value="multiselect">Multi-select</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(editFieldType === "dropdown" || editFieldType === "multiselect") && (
                      <div className="space-y-2">
                        <Label htmlFor="editFieldOptions">Options (comma-separated) *</Label>
                        <Input
                          id="editFieldOptions"
                          placeholder="Chrome, Firefox, Safari"
                          value={editFieldOptions}
                          onChange={(e) => setEditFieldOptions(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditFieldDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateCustomField} disabled={updateCustomFieldMutation.isPending}>
                      {updateCustomFieldMutation.isPending ? "Updating..." : "Update Field"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {customFields && customFields.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Options</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customFields.map((field: any) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">{field.name}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {field.fieldType}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {field.options || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCustomField(field)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm(`Delete custom field "${field.name}"? This will remove this field from all test cases.`)) {
                                    deleteCustomFieldMutation.mutate({ id: field.id });
                                  }
                                }}
                                disabled={deleteCustomFieldMutation.isPending}
                              >
                                <TrashIcon className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <SettingsIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No custom fields yet. Create your first custom field!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="folders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Folders</CardTitle>
                    <CardDescription>Organize test cases into folders</CardDescription>
                  </div>
                  <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Folder
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Folder</DialogTitle>
                        <DialogDescription>Add a new folder to organize test cases</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="folderName">Folder Name *</Label>
                          <Input
                            id="folderName"
                            placeholder="e.g., Login Tests, API Tests"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateFolder} disabled={createFolderMutation.isPending}>
                          {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {folders && folders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {folders.map((folder: any) => (
                        <TableRow key={folder.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <FolderIcon className="h-4 w-4 text-primary" />
                            {folder.name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {folder.createdAt ? new Date(folder.createdAt).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteFolderMutation.mutate({ id: folder.id })}
                              disabled={deleteFolderMutation.isPending}
                            >
                              <TrashIcon className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No folders yet. Create your first folder!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="playwright" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CodeIcon className="h-5 w-5" />
                  Playwright Reporter Integration
                </CardTitle>
                <CardDescription>
                  Automatically send test results from Playwright to this test management tool
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">API Endpoint</h4>
                  <code className="block p-3 bg-muted rounded-md text-sm">
                    POST {window.location.origin}/api/playwright/report
                  </code>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Project ID</h4>
                  <code className="block p-3 bg-muted rounded-md text-sm">
                    {selectedProjectId}
                  </code>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Custom Reporter Implementation</h4>
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
                    {playwrightReporterCode}
                  </pre>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Copy the custom reporter code above</li>
                    <li>Create a file named <code>custom-reporter.ts</code> in your Playwright project</li>
                    <li>Replace <code>YOUR_APP_URL</code> with your app URL</li>
                    <li>Replace <code>YOUR_PROJECT_ID</code> with the project ID shown above</li>
                    <li>Add the reporter to your <code>playwright.config.ts</code></li>
                    <li>Run your tests - results will be automatically uploaded!</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
