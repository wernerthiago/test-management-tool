import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FolderIcon, TestTubeIcon, ChevronRightIcon, ChevronDownIcon, SearchIcon, FilterIcon, XIcon } from "lucide-react";

interface TestCase {
  id: string;
  title: string;
  description: string | null;
  testType: "manual" | "automated";
  priority: "low" | "medium" | "high" | "critical" | null;
  folderId: string | null;
  customFieldValues?: Record<string, string>;
}

interface Folder {
  id: string;
  name: string;
}

interface CustomField {
  id: string;
  name: string;
  fieldType: string;
  options: string | null;
}

interface TestCaseSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCases: TestCase[];
  folders: Folder[];
  customFields?: CustomField[];
  selectedTestCases: string[];
  onSelectionChange: (selected: string[]) => void;
  onConfirm: () => void;
}

export function TestCaseSelectionModal({
  open,
  onOpenChange,
  testCases,
  folders,
  customFields = [],
  selectedTestCases,
  onSelectionChange,
  onConfirm,
}: TestCaseSelectionModalProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [customFieldFilters, setCustomFieldFilters] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(true);

  const toggleTestCase = (testCaseId: string) => {
    if (selectedTestCases.includes(testCaseId)) {
      onSelectionChange(selectedTestCases.filter(id => id !== testCaseId));
    } else {
      onSelectionChange([...selectedTestCases, testCaseId]);
    }
  };

  const toggleFolderSelection = (folderId: string, testCasesInFolder: TestCase[]) => {
    const folderTestCaseIds = testCasesInFolder.map(tc => tc.id);
    const allSelected = folderTestCaseIds.every(id => selectedTestCases.includes(id));
    
    if (allSelected) {
      onSelectionChange(selectedTestCases.filter(id => !folderTestCaseIds.includes(id)));
    } else {
      const newSelection = Array.from(new Set([...selectedTestCases, ...folderTestCaseIds]));
      onSelectionChange(newSelection);
    }
  };

  const toggleExpandFolder = (folderId: string) => {
    const newExpanded = new Set(Array.from(expandedFolders));
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const filteredTestCases = useMemo(() => {
    return testCases.filter(tc => {
      // Search filter
      if (searchQuery && !tc.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Custom field filters
      for (const [fieldId, filterValue] of Object.entries(customFieldFilters)) {
        if (filterValue === "all") continue;
        
        const tcValue = tc.customFieldValues?.[fieldId];
        if (tcValue !== filterValue) {
          return false;
        }
      }
      
      return true;
    });
  }, [testCases, searchQuery, customFieldFilters]);

  const filteredGroupedTestCases = useMemo(() => {
    const grouped: Record<string, TestCase[]> = { root: [] };
    filteredTestCases.forEach(tc => {
      const key = tc.folderId || "root";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tc);
    });
    return grouped;
  }, [filteredTestCases]);

  const clearFilters = () => {
    setSearchQuery("");
    setCustomFieldFilters({});
  };

  const hasActiveFilters = searchQuery || Object.values(customFieldFilters).some(v => v !== "all");
  const activeFilterCount = (searchQuery ? 1 : 0) + Object.values(customFieldFilters).filter(v => v !== "all").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col" style={{ maxWidth: "fit-content" }}>
        <DialogHeader>
          <DialogTitle>Select Test Cases</DialogTitle>
          <DialogDescription>
            Choose test cases to include in this test run. Select individual test cases or entire folders.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Filter Panel */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="w-64 flex-shrink-0">
            <div className="border rounded-lg">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-4 py-3 h-auto">
                  <div className="flex items-center gap-2">
                    <FilterIcon className="h-4 w-4" />
                    <span className="font-semibold">Filters</span>
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
                    )}
                  </div>
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <ScrollArea className="h-[400px] px-4 pb-4">
                  <div className="space-y-4">
                    {/* Search */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">SEARCH</Label>
                      <div className="relative">
                        <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* Dynamic Custom Field Filters */}
                    {customFields?.map(field => (
                      <div key={field.id} className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">{field.name.toUpperCase()}</Label>
                        {field.fieldType === "dropdown" && field.options ? (
                          <Select 
                            value={customFieldFilters[field.id] || "all"} 
                            onValueChange={(value) => setCustomFieldFilters(prev => ({ ...prev, [field.id]: value }))}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All {field.name}</SelectItem>
                              {field.options.split(",").map(opt => (
                                <SelectItem key={opt.trim()} value={opt.trim()}>
                                  {opt.trim()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder={`Filter by ${field.name.toLowerCase()}...`}
                            value={customFieldFilters[field.id] || ""}
                            onChange={(e) => setCustomFieldFilters(prev => ({ ...prev, [field.id]: e.target.value }))}
                            className="h-9 text-sm"
                          />
                        )}
                      </div>
                    ))}

                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
                        <XIcon className="h-3.5 w-3.5 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Test Cases List */}
          <div className="flex-1 min-w-0 flex flex-col">
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-4 space-y-2">
                {/* Root folder */}
                {filteredGroupedTestCases.root && filteredGroupedTestCases.root.length > 0 && (
                  <div className="border rounded-lg">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleExpandFolder("root")}
                      >
                        {expandedFolders.has("root") ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <Checkbox
                        checked={filteredGroupedTestCases.root.every(tc => selectedTestCases.includes(tc.id))}
                        onCheckedChange={() => toggleFolderSelection("root", filteredGroupedTestCases.root)}
                      />
                      <FolderIcon className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">Root</span>
                      <Badge variant="secondary" className="ml-auto">{filteredGroupedTestCases.root.length}</Badge>
                    </div>

                    {expandedFolders.has("root") && (
                      <div className="p-2 space-y-1">
                        {filteredGroupedTestCases.root.map(tc => (
                          <div
                            key={tc.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                            onClick={() => toggleTestCase(tc.id)}
                          >
                            <Checkbox checked={selectedTestCases.includes(tc.id)} />
                            <TestTubeIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1">{tc.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Custom folders */}
                {folders.map(folder => {
                  const folderTestCases = filteredGroupedTestCases[folder.id] || [];
                  if (folderTestCases.length === 0) return null;

                  return (
                    <div key={folder.id} className="border rounded-lg">
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleExpandFolder(folder.id)}
                        >
                          {expandedFolders.has(folder.id) ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </Button>
                        <Checkbox
                          checked={folderTestCases.every(tc => selectedTestCases.includes(tc.id))}
                          onCheckedChange={() => toggleFolderSelection(folder.id, folderTestCases)}
                        />
                        <FolderIcon className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">{folder.name}</span>
                        <Badge variant="secondary" className="ml-auto">{folderTestCases.length}</Badge>
                      </div>

                      {expandedFolders.has(folder.id) && (
                        <div className="p-2 space-y-1">
                          {folderTestCases.map(tc => (
                            <div
                              key={tc.id}
                              className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                              onClick={() => toggleTestCase(tc.id)}
                            >
                              <Checkbox checked={selectedTestCases.includes(tc.id)} />
                              <TestTubeIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm flex-1">{tc.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredTestCases.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <TestTubeIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No test cases found</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{selectedTestCases.length} test case(s) selected</span>
              <span>{filteredTestCases.length} of {testCases.length} shown</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={selectedTestCases.length === 0}>
            Add {selectedTestCases.length} Test Case(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
