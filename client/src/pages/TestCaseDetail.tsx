import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Edit, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams, useRouter } from "wouter";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TestCaseDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const router = useRouter();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preconditions, setPreconditions] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();

  // Fetch test case details
  const { data: testCase, isLoading } = trpc.testCases.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  // Fetch custom fields
  const { data: customFields } = trpc.customFields.list.useQuery(
    { projectId: testCase?.projectId || "" },
    { enabled: !!testCase?.projectId }
  );

  // Fetch audit log
  const { data: auditLog } = trpc.testCases.getAuditLog.useQuery(
    { testCaseId: id! },
    { enabled: !!id }
  );

  // Fetch execution results
  const { data: executions } = trpc.testCases.getExecutions.useQuery(
    { testCaseId: id! },
    { enabled: !!id }
  );

  // Update mutation
  const updateMutation = trpc.testCases.update.useMutation({
    onSuccess: () => {
      utils.testCases.getById.invalidate({ id: id! });
      utils.testCases.getAuditLog.invalidate({ testCaseId: id! });
      utils.testCases.list.invalidate();
      toast.success("Test case updated successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Failed to update test case: " + error.message);
    },
  });

  // Initialize form when test case loads
  useEffect(() => {
    if (testCase) {
      setTitle(testCase.title);
      setDescription(testCase.description || "");
      setPreconditions(testCase.preconditions || "");
      
      // Initialize custom field values
      const fieldValues: Record<string, string> = {};
      if ((testCase as any).customFieldValues) {
        Object.entries((testCase as any).customFieldValues).forEach(([key, value]) => {
          fieldValues[key] = String(value);
        });
      }
      setCustomFieldValues(fieldValues);
    }
  }, [testCase]);

  const handleSave = () => {
    if (!testCase || !title.trim()) {
      toast.error("Title is required");
      return;
    }

    const customFieldValuesArray = Object.entries(customFieldValues)
      .filter(([_, value]) => value !== "")
      .map(([fieldId, value]) => ({
        customFieldId: fieldId,
        value,
      }));

    updateMutation.mutate({
      id: testCase.id,
      title: title.trim(),
      description: description.trim() || undefined,
      preconditions: preconditions.trim() || undefined,
      customFieldValues: customFieldValuesArray,
    });
  };

  const handleCancel = () => {
    if (testCase) {
      setTitle(testCase.title);
      setDescription(testCase.description || "");
      setPreconditions(testCase.preconditions || "");
      
      const fieldValues: Record<string, string> = {};
      if ((testCase as any).customFieldValues) {
        Object.entries((testCase as any).customFieldValues).forEach(([key, value]) => {
          fieldValues[key] = String(value);
        });
      }
      setCustomFieldValues(fieldValues);
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!testCase) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Test case not found</p>
          <Button className="mt-4" onClick={() => setLocation("/test-cases")}>
            Back to Test Cases
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              title="Go back"
              data-testid="tc-detail-back-button"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground">
                  TC-{testCase.testCaseNumber}
                </span>
                <h1 className="text-2xl font-bold">{testCase.title}</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Created {new Date(testCase.createdAt!).toLocaleDateString()} • 
                Last updated {new Date(testCase.updatedAt!).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} data-testid="tc-detail-cancel-edit">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="tc-detail-save-changes">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} data-testid="tc-detail-edit-button">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Details</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  {isEditing ? (
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Test case title"
                      data-testid="tc-detail-title-input"
                    />
                  ) : (
                    <p className="text-sm mt-1" data-testid="tc-detail-title-display">{testCase.title}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  {isEditing ? (
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this test case validates"
                      rows={4}
                      data-testid="tc-detail-description-input"
                    />
                  ) : (
                    <p className="text-sm mt-1 whitespace-pre-wrap" data-testid="tc-detail-description-display">
                      {testCase.description || <span className="text-muted-foreground">No description</span>}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="preconditions">Preconditions</Label>
                  {isEditing ? (
                    <Textarea
                      id="preconditions"
                      value={preconditions}
                      onChange={(e) => setPreconditions(e.target.value)}
                      placeholder="Prerequisites before running this test"
                      rows={3}
                      data-testid="tc-detail-preconditions-input"
                    />
                  ) : (
                    <p className="text-sm mt-1 whitespace-pre-wrap" data-testid="tc-detail-preconditions-display">
                      {testCase.preconditions || <span className="text-muted-foreground">No preconditions</span>}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Custom Fields */}
            {customFields && customFields.length > 0 && (
              <Card className="p-6" data-testid="tc-detail-custom-fields-card">
                <h2 className="text-lg font-semibold mb-4">Custom Fields</h2>
                <div className="grid grid-cols-2 gap-4">
                  {customFields.map((field) => {
                    const value = customFieldValues[field.id] || "";
                    return (
                      <div key={field.id} data-testid={`tc-detail-custom-field-${field.name.toLowerCase().replace(/\s+/g, "-")}`}>
                        <Label htmlFor={field.id}>{field.name}</Label>
                        {isEditing ? (
                          field.fieldType === "dropdown" ? (
                            <Select
                              value={value}
                              onValueChange={(val) =>
                                setCustomFieldValues((prev) => ({ ...prev, [field.id]: val }))
                              }
                            >
                              <SelectTrigger data-testid={`tc-detail-custom-field-dropdown-${field.name.toLowerCase().replace(/\s+/g, "-")}`}>
                                <SelectValue placeholder={`Select ${field.name}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.split(",").map((opt) => (
                                  <SelectItem key={opt.trim()} value={opt.trim()}>
                                    {opt.trim()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.fieldType === "multiselect" ? (
                            <div className="flex flex-col gap-2 mt-2" data-testid={`tc-detail-custom-field-multiselect-${field.name.toLowerCase().replace(/\s+/g, "-")}`}>
                              {field.options?.split(",").map((opt) => {
                                const option = opt.trim();
                                const selected = (value || "").split(",").map(s => s.trim()).filter(Boolean).includes(option);
                                return (
                                  <label key={option} className="inline-flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      data-testid={`tc-detail-custom-field-multiselect-option-${field.name.toLowerCase().replace(/\s+/g, "-")}-${option.toLowerCase().replace(/\s+/g, "-")}`}
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
                          ) : field.fieldType === "checkbox" ? (
                            <div className="flex items-center space-x-2 mt-2">
                              <input
                                type="checkbox"
                                id={field.id}
                                checked={value === "true"}
                                data-testid={`tc-detail-custom-field-checkbox-${field.name.toLowerCase().replace(/\s+/g, "-")}`}
                                onChange={(e) =>
                                  setCustomFieldValues((prev) => ({
                                    ...prev,
                                    [field.id]: e.target.checked ? "true" : "false",
                                  }))
                                }
                                className="h-4 w-4"
                              />
                            </div>
                          ) : (
                            <Input
                              id={field.id}
                              type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
                              value={value}
                              data-testid={`tc-detail-custom-field-input-${field.name.toLowerCase().replace(/\s+/g, "-")}`}
                              onChange={(e) =>
                                setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                              }
                              placeholder={field.name}
                            />
                          )
                        ) : (
                          value ? (
                            <div className="flex flex-wrap gap-2 mt-2" data-testid={`tc-detail-custom-field-display-${field.name.toLowerCase().replace(/\s+/g, "-")}`}>
                              {(value || "").split(",").map(v => v.trim()).filter(Boolean).map(v => (
                                <Badge key={v} variant="secondary">{v}</Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm mt-1" data-testid={`tc-detail-custom-field-display-${field.name.toLowerCase().replace(/\s+/g, "-")}`}>
                              <span className="text-muted-foreground">Not set</span>
                            </p>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - History & Results */}
          <div className="space-y-6">
            <Card className="p-6">
              <Tabs defaultValue="results">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="results">Results</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="results" className="space-y-4 mt-4">
                  <h3 className="font-semibold">Execution Results</h3>
                  {executions && executions.length > 0 ? (
                    <div className="space-y-3">
                      {executions.map((exec: any) => (
                        <div key={exec.id} className="border rounded-lg p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-muted-foreground">
                              Run #{(exec as any).testRunId?.slice(-6)}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                exec.status === "passed"
                                  ? "bg-green-100 text-green-800"
                                  : exec.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {exec.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(exec.executedAt!).toLocaleString()}
                          </p>
                          {exec.comment && (
                            <p className="text-xs mt-2">{exec.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No execution results yet</p>
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4 mt-4">
                  <h3 className="font-semibold">Change History</h3>
                  {auditLog && auditLog.length > 0 ? (
                    <div className="space-y-3">
                      {auditLog.map((log: any) => (
                        <div key={log.id} className="border-l-2 border-blue-500 pl-3 py-2">
                          <p className="text-sm font-medium">
                            {log.action === "created" ? "Created" : `Changed ${log.fieldName}`}
                          </p>
                          {log.oldValue && log.newValue && (
                            <p className="text-xs text-muted-foreground mt-1">
                              From: {log.oldValue} → To: {log.newValue}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(log.timestamp!).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No change history</p>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
