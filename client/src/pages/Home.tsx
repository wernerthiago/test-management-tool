import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3Icon, 
  PlayIcon, 
  TestTubeIcon, 
  ArrowLeftIcon 
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
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

  const { data: project } = trpc.projects.get.useQuery(
    { id: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const { data: testCases } = trpc.testCases.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const { data: testRuns } = trpc.testRuns.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const { data: executionStats } = trpc.analytics.executionStats.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const handleChangeProject = () => {
    localStorage.removeItem("selectedProjectId");
    setLocation("/");
  };

  // Calculate pass rate
  const calculatePassRate = () => {
    if (!executionStats || executionStats.length === 0) return "-";
    
    const passed = executionStats.find(s => s.status === "passed")?.count || 0;
    const total = executionStats.reduce((sum, s) => sum + s.count, 0);
    
    if (total === 0) return "-";
    return `${Math.round((passed / total) * 100)}%`;
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
          <h1 className="text-3xl font-bold">{project?.name || "Dashboard"}</h1>
          <p className="text-muted-foreground">Welcome to your test management dashboard</p>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Cases</CardTitle>
            <TestTubeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testCases?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total test cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Runs</CardTitle>
            <PlayIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testRuns?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total test runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculatePassRate()}</div>
            <p className="text-xs text-muted-foreground">From all executions</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              className="w-full" 
              size="sm" 
              onClick={() => setLocation("/test-cases")}
            >
              View Test Cases
            </Button>
            <Button 
              className="w-full" 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/test-runs")}
            >
              View Test Runs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Test Runs</CardTitle>
          <CardDescription>Your most recent test executions</CardDescription>
        </CardHeader>
        <CardContent>
          {testRuns && testRuns.length > 0 ? (
            <div className="space-y-4">
              {testRuns.slice(0, 5).map(run => (
                <div 
                  key={run.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/test-runs/${run.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <PlayIcon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">TR-{run.runNumber} {run.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {run.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {run.createdAt ? new Date(run.createdAt).toLocaleDateString() : "N/A"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No test runs yet</p>
              <Button 
                className="mt-4" 
                onClick={() => setLocation("/test-runs")}
              >
                Create Your First Test Run
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

