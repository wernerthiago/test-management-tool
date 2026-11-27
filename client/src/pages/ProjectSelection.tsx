import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusIcon, FolderIcon, TrashIcon, ArrowRightIcon, ShieldIcon, LogOutIcon, KeyRoundIcon } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { APP_TITLE } from "@/const";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ProjectSelection() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.projects.list.useQuery();

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      utils.projects.list.invalidate();
      toast.success("Project created successfully");
      setCreateDialogOpen(false);
      setName("");
      setDescription("");
      // Automatically navigate to the new project
      localStorage.setItem("selectedProjectId", data.id);
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast.error("Failed to create project: " + error.message);
    },
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success("Project deleted successfully");
      // Clear selected project if it was deleted
      const selectedProjectId = localStorage.getItem("selectedProjectId");
      if (selectedProjectId) {
        localStorage.removeItem("selectedProjectId");
      }
    },
    onError: (error) => {
      toast.error("Failed to delete project: " + error.message);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    createMutation.mutate({ name, description });
  };

  const handleDelete = (id: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${projectName}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSelectProject = (projectId: string) => {
    localStorage.setItem("selectedProjectId", projectId);
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-6xl py-12">
        {user && (
          <div className="flex items-center justify-end gap-2 mb-6">
            <span className="text-sm text-muted-foreground mr-2" data-testid="signed-in-user">
              {user.name || user.email}
            </span>
            {user.role === "admin" && (
              <Button variant="outline" size="sm" onClick={() => setLocation("/admin")} data-testid="open-admin-panel">
                <ShieldIcon className="h-4 w-4 mr-2" />
                Admin panel
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setLocation("/change-password")}>
              <KeyRoundIcon className="h-4 w-4 mr-2" />
              Change password
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await logout();
                window.location.href = "/login";
              }}
              data-testid="sign-out"
            >
              <LogOutIcon className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        )}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{APP_TITLE}</h1>
          <p className="text-lg text-muted-foreground">
            Select a project to get started or create a new one
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg">
                <PlusIcon className="h-5 w-5 mr-2" />
                Create New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>Add a new project to organize your test cases</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    placeholder="My Test Project"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Project description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-xl transition-all cursor-pointer group relative"
                onClick={() => handleSelectProject(project.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FolderIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl truncate">{project.name}</CardTitle>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(project.id, project.name, e)}
                      disabled={deleteMutation.isPending}
                    >
                      <TrashIcon className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <CardDescription className="line-clamp-2 mt-2">
                    {project.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      Open
                      <ArrowRightIcon className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-md mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FolderIcon className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Create your first project to start organizing test cases
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} size="lg">
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
