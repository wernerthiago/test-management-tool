import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeftIcon, KeyRoundIcon, ShieldIcon, TrashIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TemporaryPasswordInput } from "@/components/TemporaryPasswordInput";

type Role = "admin" | "user";
type TargetUser = { id: string; label: string };

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { user: me, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const isAdmin = me?.role === "admin" && !me.mustChangePassword;

  const { data: users, isLoading } = trpc.admin.listUsers.useQuery(undefined, { enabled: isAdmin });

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("user");
  const [newPassword, setNewPassword] = useState("");
  const [resetTarget, setResetTarget] = useState<TargetUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TargetUser | null>(null);

  const refresh = () => utils.admin.listUsers.invalidate();

  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      toast.success(`User created. Share the temporary password with ${newEmail}; they must change it at first login.`);
      setCreateOpen(false);
      setNewName("");
      setNewEmail("");
      setNewRole("user");
      setNewPassword("");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateRole = trpc.admin.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const resetUserPassword = trpc.admin.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Temporary password set; the user must change it at next login");
      setResetTarget(null);
      setResetPassword("");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted");
      setDeleteTarget(null);
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  if (loading || !me) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center" data-testid="admin-access-denied">
          <CardHeader>
            <CardTitle>Admins only</CardTitle>
            <CardDescription>You don't have access to the admin panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>Back to projects</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-6xl py-12 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" className="mb-2 -ml-3" onClick={() => setLocation("/")}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to projects
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldIcon className="h-7 w-7" />
              Admin panel
            </h1>
            <p className="text-muted-foreground mt-1">Add users and choose who can administer QualityLoom</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="admin-add-user">
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Add user
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Admins can open this panel. Users can do everything else in QualityLoom.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading users...</p>
            ) : (
              <Table data-testid="admin-users-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email / username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last sign in</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => {
                    const isMe = user.id === me.id;
                    const label = user.name || user.email || "this user";
                    return (
                      <TableRow key={user.id} data-testid={`admin-user-row-${user.email}`}>
                        <TableCell className="font-medium">
                          {user.name || "—"} {isMe && <Badge variant="outline" className="ml-1">You</Badge>}
                        </TableCell>
                        <TableCell>{user.email || "—"}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(role) => updateRole.mutate({ userId: user.id, role: role as Role })}
                            disabled={isMe || updateRole.isPending}
                          >
                            <SelectTrigger className="w-28" data-testid="admin-role-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {user.mustChangePassword ? (
                            <Badge variant="secondary">Must change password</Badge>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastSignedIn ? formatDistanceToNow(new Date(user.lastSignedIn), { addSuffix: true }) : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setResetTarget({ id: user.id, label })}
                            data-testid="admin-reset-password"
                          >
                            <KeyRoundIcon className="h-4 w-4 mr-1" />
                            Reset password
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMe}
                            onClick={() => setDeleteTarget({ id: user.id, label })}
                            data-testid="admin-delete-user"
                          >
                            <TrashIcon className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Set a temporary password and share it with the person. They must choose their own password at first login.
            </DialogDescription>
          </DialogHeader>
          <form
            id="create-user-form"
            className="space-y-4 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              createUser.mutate({ name: newName, email: newEmail, role: newRole, temporaryPassword: newPassword });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Name</Label>
              <Input id="new-user-name" data-testid="new-user-name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email</Label>
              <Input id="new-user-email" data-testid="new-user-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(role) => setNewRole(role as Role)}>
                <SelectTrigger data-testid="new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password">Temporary password</Label>
              <TemporaryPasswordInput
                id="new-user-password"
                testIdPrefix="new-user-password"
                value={newPassword}
                onChange={setNewPassword}
              />
              <p className="text-xs text-muted-foreground">At least 8 characters. Generate one, then copy it to share with the user.</p>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-user-form" disabled={createUser.isPending} data-testid="new-user-submit">
              {createUser.isPending ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {resetTarget?.label}</DialogTitle>
            <DialogDescription>They must replace this temporary password at their next login.</DialogDescription>
          </DialogHeader>
          <form
            id="reset-password-form"
            className="space-y-2 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (resetTarget) resetUserPassword.mutate({ userId: resetTarget.id, temporaryPassword: resetPassword });
            }}
          >
            <Label htmlFor="reset-password">Temporary password</Label>
            <TemporaryPasswordInput
              id="reset-password"
              testIdPrefix="reset-password"
              value={resetPassword}
              onChange={setResetPassword}
            />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button type="submit" form="reset-password-form" disabled={resetUserPassword.isPending} data-testid="reset-password-submit">
              Set temporary password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.label}?</AlertDialogTitle>
            <AlertDialogDescription>They will no longer be able to sign in. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteUser.mutate({ userId: deleteTarget.id })}
              data-testid="admin-delete-confirm"
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
